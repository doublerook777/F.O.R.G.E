"""
simulator/generator.py — Telemetry Generator
Python generator that yields enriched telemetry dicts at ~10 Hz.
Reads machine profiles, applies physics math, and supports live fault injection.
"""

import time
import json
import logging
from pathlib import Path
from typing import Generator

from simulator.physics_math import generate_normal_reading
from simulator.fault_injection import FaultInjector

logger = logging.getLogger("forge.simulator.generator")

# Registry: machine_id -> active FaultInjector instance
_fault_injectors: dict[str, FaultInjector] = {}


def _load_profile(profile_filename: str) -> dict:
    """Load a machine profile JSON from the profiles/ directory."""
    profiles_dir = Path(__file__).parent / "profiles"
    path = profiles_dir / profile_filename
    with open(path, "r") as f:
        return json.load(f)


def get_all_profiles() -> list[dict]:
    """Return metadata for all machine profiles (used by /api/machines)."""
    profiles_dir = Path(__file__).parent / "profiles"
    machines = []
    for json_file in profiles_dir.glob("*.json"):
        try:
            profile = json.loads(json_file.read_text())
            machines.append({
                "machine_id": profile["machine_id"],
                "name":       profile["name"],
                "type":       profile["type"],
                "location":   profile["location"],
            })
        except Exception as e:
            logger.error(f"Failed to load profile {json_file.name}: {e}")
    return machines


def get_fault_injector(machine_id: str) -> FaultInjector:
    """Get or create a FaultInjector for a specific machine."""
    if machine_id not in _fault_injectors:
        _fault_injectors[machine_id] = FaultInjector(machine_id)
    return _fault_injectors[machine_id]


def _profile_filename_for(machine_id: str) -> str:
    """Map machine_id to its profile JSON filename."""
    mapping = {
        "cnc_mill_01": "mill.json",
        "lathe_02":    "lathe.json",
    }
    if machine_id not in mapping:
        raise ValueError(f"Unknown machine_id: '{machine_id}'. "
                         f"Valid IDs: {list(mapping.keys())}")
    return mapping[machine_id]


def telemetry_generator(machine_id: str, hz: float = 10.0) -> Generator[dict, None, None]:
    """
    Infinite generator that yields telemetry dicts at the specified frequency.

    Each yielded dict contains:
        machine_id, timestamp, rpm, temperature, vibration, current, fault_active

    The dict does NOT contain risk_score — that is added by the ML inference layer.

    Args:
        machine_id: The machine to simulate.
        hz:         Target output frequency (default 10 Hz = 100ms interval).

    Yields:
        dict: One telemetry snapshot per iteration.
    """
    profile_file = _profile_filename_for(machine_id)
    profile      = _load_profile(profile_file)
    injector     = get_fault_injector(machine_id)
    interval     = 1.0 / hz
    start_time   = time.monotonic()

    logger.info(f"Generator started for '{machine_id}' @ {hz} Hz.")

    while True:
        loop_start = time.monotonic()
        t          = loop_start - start_time   # seconds since generator start

        # 1. Generate baseline normal reading using physics math
        reading = generate_normal_reading(t, profile)

        # 2. Apply fault distortions if a fault is active
        fault_name = injector.get_active_fault()
        if fault_name:
            reading = injector.apply(reading)

        # 3. Assemble telemetry packet
        packet = {
            "machine_id":  machine_id,
            "timestamp":   time.time(),         # Unix epoch (absolute wall time)
            "rpm":         round(reading["rpm"],         2),
            "temperature": round(reading["temperature"], 2),
            "vibration":   round(reading["vibration"],   4),
            "current":     round(reading["current"],     3),
            "fault_active": fault_name,
        }

        yield packet

        # 4. Sleep precisely to maintain target Hz (account for processing time)
        elapsed = time.monotonic() - loop_start
        sleep_time = max(0.0, interval - elapsed)
        time.sleep(sleep_time)
