"""
ml_engine/feature_engineering.py — Rolling Feature Extractor
Maintains a per-machine rolling window of telemetry history.
Computes statistical features that the Isolation Forest uses for anomaly detection.
"""

import numpy as np
import logging
from collections import deque
from typing import Optional

logger = logging.getLogger("forge.ml.features")

# Sensors we extract features from
SENSOR_KEYS = ["rpm", "temperature", "vibration", "current"]

# Default rolling window size (number of samples = window_size / hz)
DEFAULT_WINDOW_SIZE = 50  # ~5 seconds at 10 Hz


class RollingFeatureExtractor:
    """
    Maintains a fixed-length rolling window of raw telemetry samples
    and computes a feature vector for the ML model on each new sample.

    Features extracted per sensor (4 sensors × 5 features = 20 features):
        1. Current raw value
        2. Rolling mean
        3. Rolling standard deviation (variance proxy)
        4. Rate of change (first derivative = diff with previous)
        5. Z-score relative to rolling mean

    Cross-sensor features (2 additional):
        6. Temperature × Vibration (compound thermal-mechanical stress)
        7. Current × RPM normalized (electrical load indicator)

    Total feature vector: 22 dimensions
    """

    def __init__(self, machine_id: str, window_size: int = DEFAULT_WINDOW_SIZE):
        self.machine_id  = machine_id
        self.window_size = window_size
        # One deque per sensor, storing raw float values
        self._windows: dict[str, deque] = {
            key: deque(maxlen=window_size) for key in SENSOR_KEYS
        }
        self._prev_values: dict[str, Optional[float]] = {key: None for key in SENSOR_KEYS}
        logger.debug(f"RollingFeatureExtractor initialized for '{machine_id}' "
                     f"(window={window_size}).")

    def update(self, telemetry: dict) -> Optional[np.ndarray]:
        """
        Add a new telemetry sample and return the feature vector.

        Returns None if the window is not yet filled (warm-up period).

        Args:
            telemetry: Dict with sensor keys (rpm, temperature, vibration, current).

        Returns:
            np.ndarray of shape (22,) or None during warm-up.
        """
        # Push new values into rolling windows
        for key in SENSOR_KEYS:
            val = float(telemetry.get(key, 0.0))
            self._windows[key].append(val)

        # Check if we have enough data
        min_samples = min(len(self._windows[k]) for k in SENSOR_KEYS)
        if min_samples < max(5, self.window_size // 4):
            return None   # Not enough history yet

        features = []

        for key in SENSOR_KEYS:
            arr = np.array(self._windows[key], dtype=np.float64)
            current_val = arr[-1]
            roll_mean   = np.mean(arr)
            roll_std    = np.std(arr) + 1e-8   # avoid division by zero
            # Rate of change (derivative)
            roc = current_val - arr[-2] if len(arr) >= 2 else 0.0
            # Z-score
            z_score = (current_val - roll_mean) / roll_std

            features.extend([current_val, roll_mean, roll_std, roc, z_score])

        # Cross-sensor features
        temp_vib_stress = (
            self._windows["temperature"][-1] * self._windows["vibration"][-1]
        )
        rpm_vals  = np.array(self._windows["rpm"])
        curr_vals = np.array(self._windows["current"])
        # Normalize to reasonable range
        electrical_load = (np.mean(curr_vals) * np.mean(rpm_vals)) / 10000.0

        features.append(temp_vib_stress)
        features.append(electrical_load)

        return np.array(features, dtype=np.float64)

    def is_ready(self) -> bool:
        """Returns True if the window has enough data to produce features."""
        return all(len(self._windows[k]) >= max(5, self.window_size // 4)
                   for k in SENSOR_KEYS)

    def sample_count(self) -> int:
        return min(len(self._windows[k]) for k in SENSOR_KEYS)

    def get_feature_names(self) -> list[str]:
        names = []
        for key in SENSOR_KEYS:
            names += [f"{key}_val", f"{key}_mean", f"{key}_std",
                      f"{key}_roc", f"{key}_zscore"]
        names += ["temp_vib_stress", "electrical_load"]
        return names
