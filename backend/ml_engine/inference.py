"""
ml_engine/inference.py — Unified ML Inference Interface
Manages per-machine model instances, warm-up training, and real-time scoring.
This is the single entry point for the telemetry_service to get risk scores.
"""

import os
import numpy as np
import logging
from typing import Optional

from ml_engine.feature_engineering import RollingFeatureExtractor
from ml_engine.models.isolation_forest import ForgeIsolationForest
from simulator.physics_math import generate_normal_reading

logger = logging.getLogger("forge.ml.inference")

WARMUP_SAMPLES  = int(os.getenv("ML_WARMUP_SAMPLES", "200"))
WINDOW_SIZE     = 50
STREAM_HZ       = float(os.getenv("STREAM_HZ", "10"))


class MachineMLContext:
    """
    Holds the complete ML state for one machine:
      - RollingFeatureExtractor (feature computation)
      - ForgeIsolationForest    (anomaly scoring)
      - Warm-up sample buffer
    """

    def __init__(self, machine_id: str, profile: dict):
        self.machine_id = machine_id
        self.profile    = profile
        self.extractor  = RollingFeatureExtractor(machine_id, window_size=WINDOW_SIZE)
        self.model      = ForgeIsolationForest()
        self._is_ready  = False
        self._warmup_features: list[np.ndarray] = []
        self._last_ema_score = 0.0
        self._ema_alpha = 0.08  # Perfectly balanced smoothing over ~12 samples (1.2 seconds) for fast detection
        self._sample_count = 0
        logger.info(f"ML context created for '{machine_id}'. "
                    f"Warming up with {WARMUP_SAMPLES} samples...")
        self._run_warmup()

    def _run_warmup(self):
        """
        Train the Isolation Forest using adapted HUST bearing normal data
        or scaled synthetic baseline features.
        """
        from ml_engine.dataset_loader import load_hust_data
        
        logger.info(f"[{self.machine_id}] Loading and scaling HUST dataset/fallback normal readings...")
        raw_samples = load_hust_data(is_anomaly_detection=True, profile=self.profile, limit_files=5)
        
        collected = []
        for row in raw_samples:
            reading = {
                "rpm":         row[0],
                "temperature": row[1],
                "vibration":   row[2],
                "current":     row[3]
            }
            feature_vec = self.extractor.update(reading)
            if feature_vec is not None:
                collected.append(feature_vec)

        if not collected:
            # Absolute fallback if somehow feature extractor didn't produce enough samples
            logger.warning(f"[{self.machine_id}] Warmup feature extractor empty! Doing direct fallback...")
            for i in range(200):
                t_sec = i * 0.1
                reading = generate_normal_reading(t_sec, self.profile)
                feature_vec = self.extractor.update(reading)
                if feature_vec is not None:
                    collected.append(feature_vec)

        X = np.vstack(collected)
        self.model.fit(X)
        self._is_ready = True
        
        # Reset extractor to clear warmup state and transient boundaries for clean streaming start
        self.extractor = RollingFeatureExtractor(self.machine_id, window_size=WINDOW_SIZE)
        
        logger.info(f"[{self.machine_id}] Isolation Forest trained on {len(X)} localized samples. "
                    f"Feature dim: {X.shape[1]}. Ready for inference.")

    def retrain(self, new_profile: dict):
        """Clear the old model and retrain on a new baseline profile instantly."""
        self._is_ready = False
        self.profile = new_profile
        self.model = ForgeIsolationForest() # Reset model
        self._warmup_features = []
        self._last_ema_score = 0.0
        self._sample_count = 0
        logger.info(f"[{self.machine_id}] Baseline tweaked! Retraining ML model...")
        self._run_warmup()

    def reset_context(self):
        """Reset rolling feature extractor history and EMA smoothing on fault repair."""
        self.extractor = RollingFeatureExtractor(self.machine_id, window_size=WINDOW_SIZE)
        self._last_ema_score = 0.0
        
        # Pre-populate the extractor with continuous nominal readings from the physics simulator
        # to ensure perfect time-series continuity and prevent window size/noise mismatch anomalies
        start_count = max(0, self._sample_count - WINDOW_SIZE)
        for i in range(WINDOW_SIZE):
            t_sec = (start_count + i) * 0.1
            nominal_reading = generate_normal_reading(t_sec, self.profile)
            self.extractor.update(nominal_reading)
            
        logger.info(f"[{self.machine_id}] ML context rolling features pre-populated and EMA reset to normal.")

    def score(self, telemetry: dict) -> float:
        """
        Update the rolling window with new telemetry and return Risk Score.

        Returns:
            float in [0.0, 100.0]. Returns 0.0 during warm-up.
        """
        self._sample_count += 1
        feature_vec = self.extractor.update(telemetry)
        if feature_vec is None or not self._is_ready:
            return 0.0
            
        raw_score = self.model.score(feature_vec)
        
        # Apply Exponential Moving Average (EMA) to completely stabilize the Risk Score
        if self._last_ema_score == 0.0:
            self._last_ema_score = raw_score
        else:
            self._last_ema_score = (self._ema_alpha * raw_score) + ((1.0 - self._ema_alpha) * self._last_ema_score)
            
        return self._last_ema_score

    @property
    def is_ready(self) -> bool:
        return self._is_ready


# ---------------------------------------------------------------------------
# Module-level registry — one MachineMLContext per machine_id
# ---------------------------------------------------------------------------
_contexts: dict[str, MachineMLContext] = {}


def initialize_machine(machine_id: str, profile: dict):
    """
    Create and warm up the ML context for a machine.
    Call this at app startup before the SSE stream begins.
    """
    if machine_id in _contexts:
        logger.warning(f"ML context for '{machine_id}' already initialized. Skipping.")
        return
    _contexts[machine_id] = MachineMLContext(machine_id, profile)


def retrain_machine(machine_id: str, new_profile: dict):
    """Force an existing ML context to retrain with a new profile."""
    ctx = _contexts.get(machine_id)
    if ctx:
        ctx.retrain(new_profile)
    else:
        initialize_machine(machine_id, new_profile)


def reset_machine_context(machine_id: str):
    """Reset the rolling feature extractor and EMA score for a machine when its fault is cleared."""
    ctx = _contexts.get(machine_id)
    if ctx:
        ctx.reset_context()
    else:
        logger.warning(f"No ML context found for '{machine_id}' to reset.")


def get_risk_score(machine_id: str, telemetry: dict) -> float:
    """
    Public API: Score a telemetry packet and return Risk Score [0, 100].

    Args:
        machine_id: Identifier for the machine.
        telemetry:  Dict with rpm, temperature, vibration, current.

    Returns:
        Risk Score float. Returns 0.0 if ML context not initialized.
    """
    ctx = _contexts.get(machine_id)
    if ctx is None:
        logger.warning(f"No ML context for '{machine_id}'. Returning risk=0.")
        return 0.0
    return ctx.score(telemetry)


def is_machine_ready(machine_id: str) -> bool:
    ctx = _contexts.get(machine_id)
    return ctx.is_ready if ctx else False
