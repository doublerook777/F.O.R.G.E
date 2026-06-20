"""
routes/control_routes.py — Machine Control Endpoints
POST /api/control/<machine_id>/inject-fault  → Trigger a named fault
POST /api/control/<machine_id>/clear-fault   → Clear active fault
GET  /api/machines                            → List all machine profiles
GET  /api/control/<machine_id>/status        → Fault + ML status
GET  /api/faults                             → List all injectable fault types
"""

import json
import logging
from pathlib import Path
from flask import Blueprint, request, jsonify
from simulator.generator import get_fault_injector, get_all_profiles, update_live_profile
from simulator.fault_injection import list_faults
from ml_engine.inference import is_machine_ready, retrain_machine, reset_machine_context

logger = logging.getLogger("forge.routes.control")

control_bp = Blueprint("control", __name__, url_prefix="/api")

def _check_machine(machine_id: str):
    profiles = get_all_profiles()
    valid_ids = {p["machine_id"] for p in profiles}
    
    if machine_id not in valid_ids:
        return jsonify({
            "error": f"Unknown machine_id '{machine_id}'. Valid: {list(valid_ids)}"
        }), 404
    return None


@control_bp.get("/machines")
def machines():
    """Return all active machine profiles."""
    profiles = get_all_profiles()
    # Attach ML readiness status
    for p in profiles:
        p["ml_ready"] = is_machine_ready(p["machine_id"])
    return jsonify(profiles), 200


@control_bp.get("/faults")
def faults():
    """Return all injectable fault definitions."""
    return jsonify(list_faults()), 200


@control_bp.post("/control/<machine_id>/inject-fault")
def inject_fault(machine_id: str):
    err = _check_machine(machine_id)
    if err:
        return err

    data       = request.get_json(silent=True) or {}
    fault_name = data.get("fault", "").strip()

    if not fault_name:
        return jsonify({"error": "Missing 'fault' field in request body."}), 400

    try:
        injector   = get_fault_injector(machine_id)
        fault_info = injector.inject(fault_name)
        logger.warning(f"Fault '{fault_name}' injected on '{machine_id}' via API.")
        return jsonify({
            "success":    True,
            "machine_id": machine_id,
            "fault":      fault_name,
            "label":      fault_info["label"],
            "duration_s": fault_info["duration_s"],
            "message":    f"Fault '{fault_info['label']}' activated for {fault_info['duration_s']}s.",
        }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@control_bp.post("/control/<machine_id>/clear-fault")
def clear_fault(machine_id: str):
    err = _check_machine(machine_id)
    if err:
        return err

    injector = get_fault_injector(machine_id)
    injector.clear()
    
    # Reset ML context rolling history to instantly drop risk score back to baseline
    reset_machine_context(machine_id)
    
    return jsonify({
        "success": True, 
        "machine_id": machine_id, 
        "message": "Fault cleared and ML engine reset."
    }), 200


@control_bp.get("/control/<machine_id>/status")
def machine_status(machine_id: str):
    err = _check_machine(machine_id)
    if err:
        return err

    injector = get_fault_injector(machine_id)
    return jsonify({
        "machine_id": machine_id,
        "ml_ready":   is_machine_ready(machine_id),
        "fault":      injector.status(),
    }), 200

@control_bp.put("/control/<machine_id>/tweak")
def tweak_machine(machine_id: str):
    """Dynamically tweak the baseline configuration of a machine."""
    err = _check_machine(machine_id)
    if err:
        return err

    data = request.get_json(silent=True) or {}
    if not data:
        return jsonify({"error": "No data provided."}), 400

    profiles_dir = Path(__file__).parent.parent / "simulator" / "profiles"
    target_file = None
    profile_data = None
    
    for json_file in profiles_dir.glob("*.json"):
        try:
            p = json.loads(json_file.read_text(encoding="utf-8"))
            if p["machine_id"] == machine_id:
                target_file = json_file
                profile_data = p
                break
        except Exception:
            pass
            
    if not target_file or not profile_data:
        return jsonify({"error": "Profile file not found."}), 404
        
    # Update baselines in memory only (acting as an override)
    for key in ["rpm", "temperature", "vibration", "current"]:
        if key in data and key in profile_data:
            profile_data[key]["baseline"] = float(data[key])
            
    # Do NOT save to disk, and do NOT retrain the ML model.
    # This ensures the ML model continues to evaluate against the original baseline,
    # correctly identifying these overrides as critical anomalies!
    
    # Live update simulator only
    update_live_profile(machine_id, profile_data)
    
    return jsonify({
        "success": True,
        "message": f"Applied manual overrides for {machine_id}",
        "profile": profile_data
    }), 200


@control_bp.post("/control/<machine_id>/retrain")
def retrain_model(machine_id: str):
    """Force the ML model for a machine to retrain on its baseline profile."""
    err = _check_machine(machine_id)
    if err:
        return err

    profiles_dir = Path(__file__).parent.parent / "simulator" / "profiles"
    target_profile = None
    for json_file in profiles_dir.glob("*.json"):
        try:
            p = json.loads(json_file.read_text(encoding="utf-8"))
            if p["machine_id"] == machine_id:
                target_profile = p
                break
        except Exception:
            pass

    if not target_profile:
        return jsonify({"error": "Profile file not found."}), 404

    try:
        retrain_machine(machine_id, target_profile)
        logger.warning(f"ML model for '{machine_id}' retrained via Admin request.")
        return jsonify({
            "success": True,
            "machine_id": machine_id,
            "message": f"ML Model for {machine_id} has been retrained successfully on the nominal baseline."
        }), 200
    except Exception as e:
        logger.error(f"Failed to retrain model for '{machine_id}': {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
