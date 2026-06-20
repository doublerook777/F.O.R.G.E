"""
simulator/physics_math.py — Mathematical Physics Core
Implements harmonic oscillation, Gaussian noise, thermal drift,
and compound waveform synthesis to simulate realistic sensor telemetry.
"""

import math
import random
import numpy as np
from typing import Union


def harmonic_oscillation(
    t: float,
    baseline: float,
    amplitude: float,
    frequency: float,
    phase_offset: float = 0.0
) -> float:
    """
    Simulate periodic sensor variation using a sine wave.

    Args:
        t:            Current time in seconds (monotonic).
        baseline:     The center value around which the sensor oscillates.
        amplitude:    Peak deviation from baseline.
        frequency:    Oscillation frequency in Hz.
        phase_offset: Phase shift in radians (for decorrelating sensors).

    Returns:
        The oscillated value at time t.
    """
    return baseline + amplitude * math.sin(2 * math.pi * frequency * t + phase_offset)


def gaussian_noise(value: float, std_dev: float) -> float:
    """
    Inject realistic Gaussian (normal distribution) sensor noise.

    Args:
        value:   The clean signal value.
        std_dev: Standard deviation of the noise distribution.

    Returns:
        The value with random noise applied.
    """
    return value + random.gauss(0, std_dev)


def compound_drift(t: float, baseline: float, rate: float) -> float:
    """
    Simulate slow thermal drift — a gradual linear increase in a baseline
    value over time (e.g., spindle temperature rising during long runs).

    Args:
        t:        Current time in seconds.
        baseline: Original baseline value.
        rate:     Drift rate (units per second).

    Returns:
        Drifted baseline value.
    """
    return baseline + (rate * t)


def synthesize_sensor(
    t: float,
    profile: dict,
    sensor_key: str,
    phase_offset: float = 0.0
) -> float:
    """
    Generate a single sensor reading by combining harmonic oscillation,
    Gaussian noise, and optional thermal drift.

    Args:
        t:           Current simulation time in seconds.
        profile:     Machine profile dict (loaded from JSON).
        sensor_key:  Key in profile dict (e.g. 'rpm', 'temperature').
        phase_offset: Phase offset to decorrelate sensors.

    Returns:
        Clamped, realistic sensor reading.
    """
    cfg = profile[sensor_key]

    # Step 1: Apply thermal drift to baseline (temperature has drift_rate)
    drift_rate = cfg.get("drift_rate", 0.0)
    effective_baseline = compound_drift(t, cfg["baseline"], drift_rate)

    # Step 2: Apply harmonic oscillation
    oscillated = harmonic_oscillation(
        t,
        effective_baseline,
        cfg["oscillation_amplitude"],
        cfg["oscillation_frequency"],
        phase_offset
    )

    # Step 3: Apply Gaussian noise
    noisy = gaussian_noise(oscillated, cfg["noise_std"])

    # Step 4: Clamp to physical limits
    return float(np.clip(noisy, cfg["min"], cfg["max"]))


def generate_normal_reading(t: float, profile: dict) -> dict:
    """
    Generate a complete telemetry snapshot for all sensors under normal conditions.
    Each sensor gets a unique phase offset to prevent perfect correlation.

    Returns:
        Dict with keys: rpm, temperature, vibration, current
    """
    return {
        "rpm":         synthesize_sensor(t, profile, "rpm",         phase_offset=0.0),
        "temperature": synthesize_sensor(t, profile, "temperature", phase_offset=1.1),
        "vibration":   synthesize_sensor(t, profile, "vibration",   phase_offset=2.3),
        "current":     synthesize_sensor(t, profile, "current",     phase_offset=0.7),
    }
