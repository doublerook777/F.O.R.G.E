"""
ml_engine/models/isolation_forest.py — Real-Time Anomaly Detector
Scikit-learn Isolation Forest wrapped for streaming inference.
Trains on synthetic normal data at startup, then scores each new point.
"""

import numpy as np
import logging
from sklearn.ensemble import IsolationForest

logger = logging.getLogger("forge.ml.isolation_forest")


class ForgeIsolationForest:
    """
    Wrapper around sklearn IsolationForest optimized for real-time streaming.

    Scoring pipeline:
        raw anomaly score → normalized → mapped to 0-100% Risk Score

    The sklearn decision_function returns:
        - Positive values: normal (higher = more normal)
        - Negative values: anomaly (more negative = more anomalous)

    We map this to [0, 100] using a sigmoid-like normalization so:
        - Normal data → Risk Score 0-30%
        - Mild anomalies → 30-70%
        - Severe anomalies → 70-100%
    """

    def __init__(
        self,
        n_estimators:    int   = 120,
        contamination:   float = 0.01,   # Expected anomaly rate (~1% for tight normal boundary)
        max_features:    float = 0.85,   # Feature subsampling for diversity
        random_state:    int   = 42,
    ):
        self._model = IsolationForest(
            n_estimators    = n_estimators,
            contamination   = contamination,
            max_features    = max_features,
            random_state    = random_state,
            n_jobs          = -1,           # Use all CPU cores
            warm_start      = False,
        )
        self._is_trained  = False
        self._score_min   = None   # Calibration: min observed score
        self._score_max   = None   # Calibration: max observed score
        logger.debug("ForgeIsolationForest created (untrained).")

    def fit(self, X: np.ndarray):
        """
        Train the model on normal baseline data.

        Args:
            X: (n_samples, n_features) array of normal feature vectors.
        """
        logger.info(f"Training Isolation Forest on {X.shape[0]} samples "
                    f"({X.shape[1]} features)...")
        self._model.fit(X)

        # Calibrate score range on training data for consistent normalization
        scores = self._model.decision_function(X)
        self._score_min = float(np.percentile(scores, 1))   # 1st percentile
        self._score_max = float(np.percentile(scores, 99))  # 99th percentile
        self._is_trained = True

        logger.info(f"Training complete. Score range: [{self._score_min:.4f}, "
                    f"{self._score_max:.4f}]")

    def score(self, x: np.ndarray) -> float:
        """
        Score a single feature vector and return a Risk Score in [0, 100].

        Args:
            x: 1D feature vector (n_features,).

        Returns:
            Risk Score as float in [0.0, 100.0].
        """
        if not self._is_trained:
            return 0.0

        # sklearn expects 2D input
        raw_score = self._model.decision_function(x.reshape(1, -1))[0]
        return self._normalize_score(raw_score)

    def _normalize_score(self, raw_score: float) -> float:
        """
        Map the raw decision function output to [0, 100] Risk Score using a progressive
        distance-based mapping.
        
        This prevents false alert spikes under normal conditions while climbing
        proportionally for true anomalies.
        """
        if self._score_min is None or self._score_max is None:
            return 0.0

        score_range = self._score_max - self._score_min
        if score_range < 1e-8:
            return 0.0

        if raw_score >= self._score_max:
            risk_fraction = 0.0
        elif raw_score >= self._score_min:
            # Normal zone: scale smoothly from 0.0 to 0.15
            normalized = (raw_score - self._score_min) / score_range
            risk_fraction = 0.15 * (1.0 - normalized)
        else:
            # Anomaly zone: scale from 0.15 to 1.0 based on distance from score_min
            # An anomaly range slightly smaller than normal score range is highly decisive
            anomaly_range = 0.8 * score_range
            distance = self._score_min - raw_score
            risk_fraction = 0.15 + 0.85 * min(1.0, distance / anomaly_range)

        # Apply mild sharpening to give the scores a premium, decisive feel
        risk_fraction = self._sharpen(risk_fraction)

        return round(float(np.clip(risk_fraction * 100.0, 0.0, 100.0)), 2)

    @staticmethod
    def _sharpen(x: float) -> float:
        """
        Refined power curve to make risk scores premium and decisive:
        - For normal zone (x < 0.5): shrinks values using x^1.5 (super-linear)
          to keep nominal operation risk extremely low and prevent false alerts.
        - For anomaly zone (x >= 0.5): expands values using x^1.8
          to ensure decisive, strong alert signaling.
        """
        if x < 0.5:
            return 0.5 * (2 * x) ** 1.5
        else:
            return 1.0 - 0.5 * (2 * (1 - x)) ** 1.8

    @property
    def is_trained(self) -> bool:
        return self._is_trained
