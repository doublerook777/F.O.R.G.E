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
        logger.info(f"ML context created for '{machine_id}'. "
                    f"Warming up with {WARMUP_SAMPLES} samples...")
        self._run_warmup()

    def _run_warmup(self):
        """
        Generate synthetic normal telemetry and train the Isolation Forest.
        This runs synchronously at startup so the model is ready before
        the first SSE client connects.
        """
        import time
        collected = []
        t = 0.0
        dt = 1.0 / STREAM_HZ  # simulated time step

        while len(collected) < WARMUP_SAMPLES:
            # Generate a normal (no-fault) reading
            reading = generate_normal_reading(t, self.profile)
            feature_vec = self.extractor.update(reading)
            if feature_vec is not None:
                collected.append(feature_vec)
            t += dt

        X = np.vstack(collected)
        self.model.fit(X)
        self._is_ready = True
        logger.info(f"[{self.machine_id}] Isolation Forest trained. "
                    f"Feature dim: {X.shape[1]}. Ready for inference.")

    def score(self, telemetry: dict) -> float:
        """
        Update the rolling window with new telemetry and return Risk Score.

        Returns:
            float in [0.0, 100.0]. Returns 0.0 during warm-up.
        """
        feature_vec = self.extractor.update(telemetry)
        if feature_vec is None or not self._is_ready:
            return 0.0
        return self.model.score(feature_vec)

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
