"""
routes/auth_routes.py — Authentication Endpoints
POST /api/auth/login   → Returns JWT on valid credentials
GET  /api/auth/me      → Returns current user profile
"""

from flask import Blueprint, request, jsonify, g
from services.user_service import authenticate, get_user_by_id
from auth.jwt_handler import generate_token, require_auth
import logging

logger = logging.getLogger("forge.routes.auth")

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400

    user = authenticate(username, password)
    if not user:
        logger.warning(f"Failed login attempt for username: '{username}'")
        return jsonify({"error": "Invalid credentials."}), 401

    token = generate_token(user["id"], user["username"], user["role"])
    logger.info(f"User '{username}' logged in successfully (role: {user['role']}).")

    return jsonify({
        "token": token,
        "user": {
            "id":       user["id"],
            "username": user["username"],
            "role":     user["role"],
        }
    }), 200


@auth_bp.get("/me")
@require_auth
def me():
    user = get_user_by_id(int(g.user["sub"]))
    if not user:
        return jsonify({"error": "User not found."}), 404
    return jsonify(user), 200
