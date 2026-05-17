"""
services/diagnosis_service.py — AI Diagnosis Orchestrator
Phase 1: STUBBED — logs the trigger and returns a structured placeholder.
Phase 2: Will call the Gemini LLM with a 30-second context window.

The stub outputs a realistic JSON structure so the frontend alert log
works end-to-end without needing the LLM in Phase 1.
"""

import time
import logging
import json
from database import db
from llm_service import gemini_client

logger = logging.getLogger("forge.services.diagnosis")

# Cooldown: don't trigger LLM more than once per N seconds per machine
_last_trigger: dict[str, float] = {}
COOLDOWN_SECONDS = 30.0


def maybe_trigger_diagnosis(machine_id: str, risk_score: float, telemetry: dict):
    """
    Decide whether to fire an AI diagnosis for this risk event.
    Applies a per-machine cooldown to prevent alert storm.

    Phase 1: Produces a structured stub alert.
    Phase 2: Replaces stub with actual LLM call.
    """
    now = time.time()
    last = _last_trigger.get(machine_id, 0.0)

    if (now - last) < COOLDOWN_SECONDS:
        return   # Still within cooldown window

    _last_trigger[machine_id] = now

    fault_active = telemetry.get("fault_active")
    
    # Fetch 30-second context window from database (limit to recent 100 samples to avoid huge payload)
    thirty_seconds_ago = now - 30.0
    context_rows = db.fetchall(
        "SELECT timestamp, rpm, temperature, vibration, current, risk_score "
        "FROM telemetry WHERE machine_id = ? AND timestamp >= ? "
        "ORDER BY timestamp ASC LIMIT 100",
        (machine_id, thirty_seconds_ago)
    )
    telemetry_window = [dict(row) for row in context_rows]

    # Try to generate diagnosis via Gemini
    diagnosis = gemini_client.generate_diagnosis(
        machine_id=machine_id,
        risk_score=risk_score,
        fault_active=fault_active,
        telemetry_window=telemetry_window
    )
    
    # Fallback to stub if Gemini is unavailable or fails
    if not diagnosis:
        diagnosis = _generate_stub_diagnosis(machine_id, risk_score, fault_active, telemetry)

    severity = "critical" if risk_score >= 95 else "warning"

    # Persist alert to database
    try:
        db.execute(
            """
            INSERT INTO alerts (machine_id, timestamp, severity, risk_score, message, diagnosis_json)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                machine_id,
                now,
                severity,
                risk_score,
                diagnosis["summary"],
                json.dumps(diagnosis),
            ),
            commit=True,
        )
        logger.warning(
            f"[{machine_id}] ALERT TRIGGERED — Risk: {risk_score:.1f}% | "
            f"Severity: {severity.upper()} | Fault: {fault_active or 'Unknown'}"
        )
    except Exception as e:
        logger.error(f"Failed to persist alert for '{machine_id}': {e}")


def _generate_stub_diagnosis(
    machine_id: str,
    risk_score: float,
    fault_active: str | None,
    telemetry: dict,
) -> dict:
    """
    Generate a realistic-looking stub diagnosis.
    Phase 2 will replace this with an actual Gemini API call.
    """
    fault_label = fault_active.replace("_", " ").title() if fault_active else "Multi-Sensor Anomaly"

    if risk_score >= 95:
        action    = "IMMEDIATE E-STOP REQUIRED. Remove workpiece and inspect spindle assembly."
        prognosis = "Continued operation risks catastrophic mechanical failure."
    elif risk_score >= 85:
        action    = "Schedule maintenance within the next 2 operating hours."
        prognosis = "Progressive degradation detected. Monitor closely."
    else:
        action    = "Increase monitoring frequency. No immediate action required."
        prognosis = "Borderline anomaly. May self-resolve."

    return {
        "source":       "FORGE-AI-STUB",   # Changed to FORGE-AI-GEMINI in Phase 2
        "machine_id":   machine_id,
        "timestamp":    time.time(),
        "risk_score":   risk_score,
        "fault_type":   fault_active or "unknown",
        "fault_label":  fault_label,
        "summary":      f"[{fault_label}] Risk {risk_score:.0f}% detected on {machine_id}. {action}",
        "root_cause":   f"Compound sensor deviation consistent with {fault_label}. "
                        f"RPM: {telemetry.get('rpm', 0):.0f}, "
                        f"Temp: {telemetry.get('temperature', 0):.1f}°C, "
                        f"Vib: {telemetry.get('vibration', 0):.3f}g, "
                        f"Current: {telemetry.get('current', 0):.2f}A.",
        "recommended_action": action,
        "prognosis":    prognosis,
        "phase":        1,   # Will be 2 when LLM is active
    }


def get_recent_alerts(machine_id: str | None = None, limit: int = 50) -> list[dict]:
    """Fetch recent alerts from the database for the API."""
    if machine_id:
        rows = db.fetchall(
            "SELECT * FROM alerts WHERE machine_id = ? ORDER BY timestamp DESC LIMIT ?",
            (machine_id, limit),
        )
    else:
        rows = db.fetchall(
            "SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?",
            (limit,),
        )
    return [dict(row) for row in rows]
