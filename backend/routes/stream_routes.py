"""
routes/stream_routes.py — SSE Streaming Endpoint
GET /api/stream/<machine_id>  → Server-Sent Events at 10 Hz

Critical design: Uses Flask's streaming response with text/event-stream.
The generator runs in its own thread context — each SSE client gets
its own independent generator instance.
"""

import os
import logging
from flask import Blueprint, Response, jsonify, stream_with_context
from services.telemetry_service import enriched_telemetry_stream
from ml_engine.inference import is_machine_ready
from simulator.generator import get_all_profiles

logger = logging.getLogger("forge.routes.stream")

stream_bp = Blueprint("stream", __name__, url_prefix="/api")

STREAM_HZ = float(os.getenv("STREAM_HZ", "10"))

@stream_bp.get("/stream/<machine_id>")
def stream(machine_id: str):
    """
    SSE endpoint. Each GET request opens a long-lived streaming connection.
    The client receives JSON events at ~10 Hz until it disconnects.

    No auth required on SSE in Phase 1 (browser EventSource doesn't send headers easily).
    Auth will be added via query param token in Phase 2.
    """
    valid_machines = {p["machine_id"] for p in get_all_profiles()}

    if machine_id not in valid_machines:
        return jsonify({
            "error": f"Unknown machine_id '{machine_id}'. Valid: {list(valid_machines)}"
        }), 404

    if not is_machine_ready(machine_id):
        return jsonify({
            "error": f"ML model for '{machine_id}' is still warming up. Retry in a moment."
        }), 503

    logger.info(f"SSE client connected -> machine: '{machine_id}'")

    def generate():
        # Send initial heartbeat so the browser confirms the connection opened
        yield "event: connected\ndata: {\"status\": \"streaming\"}\n\n"
        try:
            yield from enriched_telemetry_stream(machine_id, hz=STREAM_HZ)
        except GeneratorExit:
            logger.info(f"SSE client disconnected from '{machine_id}'.")

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control":  "no-cache",
            "X-Accel-Buffering": "no",    # Disable nginx buffering for SSE
            "Connection":     "keep-alive",
        },
    )
