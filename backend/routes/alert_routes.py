"""
routes/alert_routes.py — Alert History Endpoints
GET /api/alerts              → All recent alerts (paginated)
GET /api/alerts/<machine_id> → Alerts for a specific machine
"""

import logging
from flask import Blueprint, request, jsonify
from services.diagnosis_service import get_recent_alerts

logger = logging.getLogger("forge.routes.alerts")

alert_bp = Blueprint("alerts", __name__, url_prefix="/api")


@alert_bp.get("/alerts")
def all_alerts():
    limit = min(int(request.args.get("limit", 50)), 200)
    alerts = get_recent_alerts(machine_id=None, limit=limit)
    return jsonify(alerts), 200


@alert_bp.get("/alerts/<machine_id>")
def machine_alerts(machine_id: str):
    limit = min(int(request.args.get("limit", 50)), 200)
    alerts = get_recent_alerts(machine_id=machine_id, limit=limit)
    return jsonify(alerts), 200
