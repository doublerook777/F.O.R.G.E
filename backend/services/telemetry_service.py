"""
services/telemetry_service.py — Pipeline Orchestrator
Wires together: Generator → ML Inference → DB Write → SSE Yield.
This is the hot path — designed to be as fast as possible.
"""

import json
import time
import os
import logging
from typing import Generator

from simulator.generator import telemetry_generator
from ml_engine.inference import get_risk_score
from database import db
from services.diagnosis_service import maybe_trigger_diagnosis

logger = logging.getLogger("forge.services.telemetry")

RISK_THRESHOLD_ALERT = float(os.getenv("RISK_THRESHOLD_ALERT", "85"))
DB_WRITE_EVERY_N     = 1   # Write every sample (WAL handles the concurrency)


def enriched_telemetry_stream(machine_id: str, hz: float = 10.0) -> Generator[str, None, None]:
    """
    The main SSE generator. Pulls from the physics simulator, scores with ML,
    persists to SQLite, and yields SSE-formatted JSON strings.

    Args:
        machine_id: Machine to stream.
        hz:         Target frequency.

    Yields:
        str: SSE-formatted event string (e.g. "data: {...}\\n\\n")
    """
    generator = telemetry_generator(machine_id, hz=hz)
    sample_count = 0

    logger.info(f"SSE stream starting for '{machine_id}'.")

    for packet in generator:
        # --- Step 1: ML Risk Scoring (fast path, microseconds) ---
        risk_score = get_risk_score(machine_id, packet)
        packet["risk_score"] = risk_score

        # --- Step 2: Persist to SQLite (WAL allows concurrent reads) ---
        try:
            db.execute(
                """
                INSERT INTO telemetry
                    (machine_id, timestamp, rpm, temperature, vibration, current, risk_score, fault_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    packet["machine_id"],
                    packet["timestamp"],
                    packet["rpm"],
                    packet["temperature"],
                    packet["vibration"],
                    packet["current"],
                    packet["risk_score"],
                    packet.get("fault_active"),
                ),
                commit=True,
            )
        except Exception as e:
            # Log but never let a DB error crash the stream
            logger.error(f"DB write failed for '{machine_id}': {e}")

        # --- Step 3: Trigger diagnosis if risk threshold exceeded ---
        if risk_score >= RISK_THRESHOLD_ALERT:
            maybe_trigger_diagnosis(machine_id, risk_score, packet)

        # --- Step 4: Yield SSE event ---
        sample_count += 1
        yield f"data: {json.dumps(packet)}\n\n"


def get_recent_telemetry(machine_id: str, seconds: int = 30) -> list[dict]:
    """
    Fetch the last N seconds of telemetry from the database.
    Used by the diagnosis service to build the LLM context window.
    """
    since_ts = time.time() - seconds
    rows = db.fetchall(
        """
        SELECT timestamp, rpm, temperature, vibration, current, risk_score, fault_active
        FROM   telemetry
        WHERE  machine_id = ? AND timestamp >= ?
        ORDER  BY timestamp ASC
        """,
        (machine_id, since_ts),
    )
    return [dict(row) for row in rows]
