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
from simulator.generator import get_all_profiles

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
    Algorithmic Rule Engine: Analyzes live telemetry against machine baselines 
    to pinpoint exact component failures without requiring an LLM.
    """
    profiles = get_all_profiles()
    
    # Need full profiles to get baselines. App.py reads them, we'll read the JSON directly.
    import json
    from pathlib import Path
    profiles_dir = Path(__file__).parent.parent / "simulator" / "profiles"
    
    profile = None
    for p in profiles:
        if p["machine_id"] == machine_id:
            for json_file in profiles_dir.glob("*.json"):
                data = json.loads(json_file.read_text(encoding="utf-8"))
                if data["machine_id"] == machine_id:
                    profile = data
                    break
            break

    if not profile:
        return {"summary": f"Risk detected on {machine_id}", "phase": 1}

    # Calculate max deviation from baseline
    deviations = {}
    for sensor in ["rpm", "temperature", "vibration", "current"]:
        if sensor in telemetry and sensor in profile:
            base = profile[sensor].get("baseline", 1)
            val = telemetry[sensor]
            dev = abs(val - base) / base if base > 0 else 0
            deviations[sensor] = {"dev": dev, "val": val, "base": base}

    # Find the sensor with the highest deviation
    worst_sensor = max(deviations.keys(), key=lambda k: deviations[k]["dev"])
    worst_data = deviations[worst_sensor]
    dev_pct = worst_data["dev"] * 100

    # Map machine type + sensor to specific physical component
    m_type = profile["type"]
    component = "Motor" # default fallback
    
    if m_type in ["cnc_mill", "drill"]:
        if worst_sensor == "vibration": component = "Spindle Bearing"
        elif worst_sensor == "temperature": component = "Cooling System"
        else: component = "Drive Motor"
    elif m_type == "lathe":
        if worst_sensor == "vibration": component = "Chuck Assembly"
        else: component = "Spindle Motor"
    elif m_type == "conveyor":
        if worst_sensor in ["current", "rpm"]: component = "Drive Belt"
        elif worst_sensor == "vibration": component = "Idler Roller"
        else: component = "Conveyor Motor"
    elif m_type == "pump":
        if worst_sensor == "vibration": component = "Impeller Shaft"
        elif worst_sensor == "temperature": component = "Pump Housing"
        else: component = "Pump Motor"

    fault_label = fault_active.replace("_", " ").title() if fault_active else f"{component} Anomaly"
    urgency = "IMMEDIATE E-STOP REQUIRED." if risk_score >= 90 else "Schedule inspection."
    
    summary = f"[{fault_label}] Critical state detected in {m_type.upper()} {component.upper()}."
    root_cause = f"Sensor data shows {worst_sensor.upper()} at {worst_data['val']:.2f} (Baseline is {worst_data['base']:.2f}), a {dev_pct:.0f}% deviation indicating {component} degradation."
    action = f"{urgency} Isolate {machine_id} and physically inspect {component}."
    prognosis = f"Failure to address {worst_sensor} spike will result in catastrophic failure of the {component}."

    return {
        "source":       "FORGE-LOGIC-ENGINE",
        "machine_id":   machine_id,
        "timestamp":    time.time(),
        "risk_score":   risk_score,
        "fault_type":   fault_active or "unknown",
        "fault_label":  fault_label,
        "summary":      summary,
        "root_cause":   root_cause,
        "recommended_action": action,
        "prognosis":    prognosis,
        "phase":        1, 
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
