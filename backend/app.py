"""
app.py — Flask Application Factory
F.O.R.G.E: Fault Observation & Real-time Gateway Engine

Startup sequence:
  1. Load .env
  2. Bootstrap stdlib logging (must be first — fixes local package shadow)
  3. Initialize DB (WAL mode + schema)
  4. Seed default users
  5. Warm up ML models (synchronous)
  6. Register blueprints
  7. Start Flask
"""
import os
import sys
import json as _json
from pathlib import Path

# ── 1. Load environment variables ──────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

# ── 2. Bootstrap forge logger (MUST be before any other local imports) ─────
from forge_logger import setup_logging

# ── 3. All other imports after logging is bootstrapped ─────────────────────
from flask import Flask, jsonify
from flask_cors import CORS

from database.db import init_db
from services.user_service import seed_default_users
from ml_engine import inference as ml_inference

from routes.auth_routes    import auth_bp
from routes.stream_routes  import stream_bp
from routes.control_routes import control_bp
from routes.alert_routes   import alert_bp


def _load_machine_profile(machine_id: str) -> dict:
    mapping      = {"cnc_mill_01": "mill.json", "lathe_02": "lathe.json"}
    profiles_dir = Path(__file__).parent / "simulator" / "profiles"
    with open(profiles_dir / mapping[machine_id]) as f:
        return _json.load(f)


def create_app() -> Flask:
    logger = setup_logging()
    logger.info("=" * 60)
    logger.info("  F.O.R.G.E — Fault Observation & Real-time Gateway Engine")
    logger.info("=" * 60)

    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "forge-dev-secret")
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    logger.info("Initializing database (WAL mode)...")
    init_db()

    logger.info("Seeding default users...")
    seed_default_users()

    machine_ids = ["cnc_mill_01", "lathe_02"]
    for mid in machine_ids:
        try:
            profile = _load_machine_profile(mid)
            logger.info(f"Warming up ML model for '{mid}' ({os.getenv('ML_WARMUP_SAMPLES', '200')} samples)...")
            ml_inference.initialize_machine(mid, profile)
        except Exception as e:
            logger.error(f"ML warm-up FAILED for '{mid}': {e}", exc_info=True)
            sys.exit(1)

    app.register_blueprint(auth_bp)
    app.register_blueprint(stream_bp)
    app.register_blueprint(control_bp)
    app.register_blueprint(alert_bp)

    @app.get("/api/health")
    def health():
        return jsonify({
            "status":   "ok",
            "service":  "F.O.R.G.E",
            "version":  "1.0.0-phase1",
            "machines": [
                {"machine_id": mid, "ml_ready": ml_inference.is_machine_ready(mid)}
                for mid in machine_ids
            ],
        }), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found."}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error."}), 500

    logger.info("All systems GO. Flask app ready to serve.")
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=os.getenv("FLASK_DEBUG", "0") == "1",
        threaded=True,
        use_reloader=False,
    )
