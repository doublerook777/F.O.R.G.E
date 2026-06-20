"""
simulator/fault_injection.py — Mechanical Fault Simulation Engine
Defines fault presets that override normal physics parameters to simulate
realistic mechanical failure modes. Each fault has a duration and intensity ramp.
"""

import time
import math
import logging
from typing import Optional

logger = logging.getLogger("forge.simulator.fault")


# ---------------------------------------------------------------------------
# Fault Presets — each defines how it distorts raw telemetry readings
# ---------------------------------------------------------------------------

FAULT_DEFINITIONS = {
    "bearing_failure": {
        "label":       "Bearing Failure",
        "description": "Rapid vibration spike with progressive RPM instability.",
        "duration_s":  45,
        # Multipliers/adders applied on top of the normal reading
        "effects": {
            "vibration_multiplier": 3.8,
            "rpm_noise_multiplier": 4.0,
            "temperature_add":      12.0,
            "current_multiplier":   1.25,
        }
    },
    "thermal_runaway": {
        "label":       "Thermal Runaway",
        "description": "Exponential temperature rise with power draw spike.",
        "duration_s":  60,
        "effects": {
            "temperature_multiplier": 1.0,   # handled via ramp below
            "temperature_add":        28.0,
            "current_multiplier":     1.4,
            "vibration_add":          0.3,
            "rpm_noise_multiplier":   1.5,
        }
    },
    "spindle_unbalance": {
        "label":       "Spindle Unbalance",
        "description": "Periodic vibration harmonic with RPM drop.",
        "duration_s":  50,
        "effects": {
            "vibration_multiplier": 2.6,
            "rpm_add":              -220.0,
            "current_multiplier":   1.15,
            "temperature_add":      5.0,
        }
    },
    "electrical_surge": {
        "label":       "Electrical Surge",
        "description": "High current spike with voltage-induced RPM instability.",
        "duration_s":  30,
        "effects": {
            "current_multiplier":   2.2,
            "rpm_noise_multiplier": 5.0,
            "vibration_add":        0.5,
            "temperature_add":      8.0,
        }
    },
    "coolant_loss": {
        "label":       "Coolant Loss",
        "description": "Rapid thermal rise as cooling system fails.",
        "duration_s":  55,
        "effects": {
            "temperature_add":      35.0,
            "temperature_multiplier": 1.1,
            "vibration_add":        0.2,
            "current_add":          1.8,
        }
    },
}


class FaultInjector:
    """
    Manages active fault state per machine.
    Thread-safe via simple time-based expiry (no locks needed for read path).
    """

    def __init__(self, machine_id: str):
        self.machine_id  = machine_id
        self._fault_name: Optional[str] = None
        self._fault_start: float        = 0.0
        self._fault_duration: float     = 0.0
        logger.debug(f"FaultInjector initialized for machine '{machine_id}'.")

    def inject(self, fault_name: str) -> dict:
        """
        Activate a named fault. Returns the fault definition dict.
        Raises ValueError if fault_name is unknown.
        """
        if fault_name not in FAULT_DEFINITIONS:
            valid = list(FAULT_DEFINITIONS.keys())
            raise ValueError(f"Unknown fault '{fault_name}'. Valid faults: {valid}")

        self._fault_name     = fault_name
        self._fault_start    = time.monotonic()
        self._fault_duration = FAULT_DEFINITIONS[fault_name]["duration_s"]
        logger.warning(f"[{self.machine_id}] Fault INJECTED: '{fault_name}' "
                       f"(duration: {self._fault_duration}s)")
        return FAULT_DEFINITIONS[fault_name]

    def clear(self):
        """Manually clear any active fault."""
        if self._fault_name:
            logger.info(f"[{self.machine_id}] Fault '{self._fault_name}' cleared manually.")
        self._fault_name = None

    def is_active(self) -> bool:
        """Returns True if a fault is currently active (not expired)."""
        if self._fault_name is None:
            return False
        elapsed = time.monotonic() - self._fault_start
        if elapsed >= self._fault_duration:
            logger.info(f"[{self.machine_id}] Fault '{self._fault_name}' expired after "
                        f"{self._fault_duration}s.")
            self._fault_name = None
            return False
        return True

    def get_active_fault(self) -> Optional[str]:
        return self._fault_name if self.is_active() else None

    def apply(self, reading: dict) -> dict:
        """
        Apply fault effects to a normal telemetry reading.
        Uses a linear intensity ramp-up over the first 10% of fault duration
        to simulate gradual degradation (not instantaneous jump).

        Args:
            reading: Dict with keys rpm, temperature, vibration, current.

        Returns:
            Modified reading dict (new copy, original unchanged).
        """
        if not self.is_active():
            return reading

        fault    = FAULT_DEFINITIONS[self._fault_name]
        effects  = fault["effects"]
        elapsed  = time.monotonic() - self._fault_start
        ramp_end = self._fault_duration * 0.10   # 10% ramp-up period

        # Linear ramp from 0.0 → 1.0 during ramp period, then hold at 1.0
        intensity = min(1.0, elapsed / max(ramp_end, 0.001))

        r = dict(reading)  # shallow copy

        def _apply(key: str, multiplier_key: str, add_key: str, noise_key: str):
            val = r.get(key, 0.0)
            mult  = 1.0 + (effects.get(multiplier_key, 1.0) - 1.0) * intensity
            add   = effects.get(add_key, 0.0) * intensity
            noise = effects.get(noise_key, 1.0)

            # Noise multiplier: increase gaussian variance during fault
            if noise > 1.0:
                import random
                extra_noise = random.gauss(0, (noise - 1.0) * abs(val) * 0.02) * intensity
                val += extra_noise

            r[key] = val * mult + add

        _apply("rpm",         "rpm_multiplier",         "rpm_add",         "rpm_noise_multiplier")
        _apply("temperature", "temperature_multiplier", "temperature_add", "temperature_noise")
        _apply("vibration",   "vibration_multiplier",   "vibration_add",   "vibration_noise")
        _apply("current",     "current_multiplier",     "current_add",     "current_noise")

        return r

    def status(self) -> dict:
        """Returns a status dict for the API response."""
        active = self.is_active()
        elapsed = (time.monotonic() - self._fault_start) if active else 0.0
        remaining = max(0.0, self._fault_duration - elapsed) if active else 0.0
        return {
            "active":         active,
            "fault_name":     self._fault_name,
            "elapsed_s":      round(elapsed, 1),
            "remaining_s":    round(remaining, 1),
            "label":          FAULT_DEFINITIONS[self._fault_name]["label"] if active else None,
            "description":    FAULT_DEFINITIONS[self._fault_name]["description"] if active else None,
        }


def list_faults() -> list:
    """Return all available fault definitions for the API."""
    return [
        {
            "name":        name,
            "label":       defn["label"],
            "description": defn["description"],
            "duration_s":  defn["duration_s"],
        }
        for name, defn in FAULT_DEFINITIONS.items()
    ]
