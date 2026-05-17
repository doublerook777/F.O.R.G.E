"""
routes/control_routes.py — Machine Control Endpoints
POST /api/control/<machine_id>/inject-fault  → Trigger a named fault
POST /api/control/<machine_id>/clear-fault   → Clear active fault
GET  /api/machines                            → List all machine profiles
GET  /api/control/<machine_id>/status        → Fault + ML status
GET  /api/faults                             → List all injectable fault types
"""

import logging
from flask import Blueprint, request, jsonify
from simulator.generator import get_fault_injector, get_all_profiles
from simulator.fault_injection import list_faults
from ml_engine.inference import is_machine_ready

logger = logging.getLogger("forge.routes.control")

control_bp = Blueprint("control", __name__, url_prefix="/api")

VALID_MACHINES = {"cnc_mill_01", "lathe_02"}


def _check_machine(machine_id: str):
    if machine_id not in VALID_MACHINES:
        return jsonify({
            "error": f"Unknown machine_id '{machine_id}'. Valid: {list(VALID_MACHINES)}"
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
    return jsonify({"success": True, "machine_id": machine_id, "message": "Fault cleared."}), 200


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
