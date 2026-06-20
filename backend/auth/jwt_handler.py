"""
auth/jwt_handler.py — JWT Token Generation & Validation
Uses HS256 with configurable expiry. Provides a role-guard decorator.
"""

import jwt
import os
import logging
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, g

logger = logging.getLogger("forge.auth")

SECRET_KEY = os.getenv("SECRET_KEY", "forge-dev-secret")
EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "8"))


def generate_token(user_id: int, username: str, role: str) -> str:
    """Generate a signed JWT with user identity and role claims."""
    payload = {
        "sub":      str(user_id),
        "username": username,
        "role":     role,
        "iat":      datetime.now(timezone.utc),
        "exp":      datetime.now(timezone.utc) + timedelta(hours=EXPIRY_HOURS),
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    logger.debug(f"Token issued for user '{username}' with role '{role}'.")
    return token


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT. Returns the payload dict.
    Raises jwt.ExpiredSignatureError or jwt.InvalidTokenError on failure.
    """
    return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])


def _extract_token_from_request() -> str | None:
    """Extract Bearer token from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


def require_auth(f):
    """Decorator: requires a valid JWT. Sets g.user on success."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = _extract_token_from_request()
        if not token:
            return jsonify({"error": "Missing authorization token."}), 401
        try:
            payload = decode_token(token)
            g.user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired. Please log in again."}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({"error": f"Invalid token: {e}"}), 401
        return f(*args, **kwargs)
    return decorated


def require_role(*allowed_roles: str):
    """
    Decorator factory: requires auth AND a specific role.
    Usage: @require_role('engineer', 'admin')
    """
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated(*args, **kwargs):
            user_role = g.user.get("role", "")
            if user_role not in allowed_roles:
                return jsonify({
                    "error": f"Access denied. Required roles: {allowed_roles}. Your role: '{user_role}'."
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
