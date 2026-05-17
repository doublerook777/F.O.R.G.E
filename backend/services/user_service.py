"""
services/user_service.py — User Management & Authentication
Handles password hashing, login validation, and seeding default users.
"""

import hashlib
import os
import secrets
import logging
from database import db

logger = logging.getLogger("forge.services.user")


def _hash_password(password: str) -> str:
    """Hash password using SHA-256 with a random salt (stored together)."""
    salt = secrets.token_hex(16)
    h    = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"{salt}:{h}"


def _verify_password(password: str, stored_hash: str) -> bool:
    """Verify a plaintext password against a stored salt:hash."""
    try:
        salt, h = stored_hash.split(":", 1)
        return hashlib.sha256(f"{salt}{password}".encode()).hexdigest() == h
    except Exception:
        return False


def seed_default_users():
    """
    Replace the placeholder password hashes from schema.sql with real hashes.
    Called once at app startup. Idempotent — skips users already updated.
    """
    defaults = [
        ("operator", "operator123", "operator"),
        ("engineer", "engineer123", "engineer"),
        ("admin",    "admin123",    "admin"),
    ]
    for username, password, role in defaults:
        existing = db.fetchone("SELECT password_hash FROM users WHERE username = ?", (username,))
        if existing and existing["password_hash"] == "SEED_PLACEHOLDER":
            hashed = _hash_password(password)
            db.execute(
                "UPDATE users SET password_hash = ? WHERE username = ?",
                (hashed, username),
                commit=True,
            )
            logger.info(f"Seeded user '{username}' (role: {role}).")


def authenticate(username: str, password: str) -> dict | None:
    """
    Validate credentials and return user record if valid.

    Returns:
        dict with {id, username, role} or None if invalid.
    """
    row = db.fetchone(
        "SELECT id, username, password_hash, role FROM users WHERE username = ?",
        (username,),
    )
    if row and _verify_password(password, row["password_hash"]):
        return {"id": row["id"], "username": row["username"], "role": row["role"]}
    return None


def get_user_by_id(user_id: int) -> dict | None:
    row = db.fetchone("SELECT id, username, role FROM users WHERE id = ?", (user_id,))
    return dict(row) if row else None
