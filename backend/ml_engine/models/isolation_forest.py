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
        contamination:   float = 0.05,   # Expected anomaly rate (~5%)
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
        Map the raw decision function output to [0, 100] Risk Score.

        Uses calibrated min/max for consistent range regardless of feature scale.
        High raw_score (normal) → low Risk Score
        Low raw_score (anomaly) → high Risk Score
        """
        if self._score_min is None or self._score_max is None:
            return 0.0

        # Invert and normalize: anomalous = high score
        score_range = self._score_max - self._score_min
        if score_range < 1e-8:
            return 0.0

        # Clamp raw score to calibrated range
        clamped = max(self._score_min, min(self._score_max, raw_score))
        # Normalize 0→1 (1 = very normal, 0 = very anomalous)
        normalized = (clamped - self._score_min) / score_range
        # Invert so 1.0 = max risk
        risk_fraction = 1.0 - normalized
        # Apply mild sigmoid-like sharpening to spread the middle
        risk_fraction = self._sharpen(risk_fraction)

        return round(float(np.clip(risk_fraction * 100.0, 0.0, 100.0)), 2)

    @staticmethod
    def _sharpen(x: float) -> float:
        """
        Mild power curve to make scores more decisive:
        - Pushes normal readings toward 0
        - Pushes anomalies toward 100
        Uses x^0.7 (sub-linear) for normal zone, x^1.3 (super-linear) for anomaly zone.
        """
        if x < 0.5:
            return 0.5 * (2 * x) ** 0.7
        else:
            return 1.0 - 0.5 * (2 * (1 - x)) ** 0.7

    @property
    def is_trained(self) -> bool:
        return self._is_trained
