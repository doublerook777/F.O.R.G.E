"""
database/queries.py — High-level Database Query Helpers
Convenience functions wrapping low-level db.py operations.
"""

import time
import logging
from typing import List, Optional
from database import db
from database.models import User, Telemetry, Alert, AuditLog

logger = logging.getLogger("forge.database.queries")


# ──────────────────────────────────────────────────────────────────────────────
# TELEMETRY QUERIES
# ──────────────────────────────────────────────────────────────────────────────

def insert_telemetry(
    machine_id: str,
    timestamp: float,
    rpm: float,
    temperature: float,
    vibration: float,
    current: float,
    risk_score: float = 0.0,
    fault_active: Optional[str] = None
) -> int:
    """
    Insert a telemetry record into the database.
    
    Args:
        machine_id: The machine identifier.
        timestamp: Unix epoch timestamp.
        rpm: Rotations per minute.
        temperature: Temperature in Celsius.
        vibration: Vibration level (typically in mm/s or g).
        current: Current draw in Amperes.
        risk_score: ML-computed risk score (0-100).
        fault_active: Name of injected fault, or None.
    
    Returns:
        The inserted row's ID.
    """
    cursor = db.execute(
        """
        INSERT INTO telemetry
            (machine_id, timestamp, rpm, temperature, vibration, current, risk_score, fault_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (machine_id, timestamp, rpm, temperature, vibration, current, risk_score, fault_active),
        commit=True
    )
    return cursor.lastrowid


def fetch_recent_telemetry(machine_id: str, seconds: int = 30) -> List[dict]:
    """
    Fetch the most recent telemetry records for a machine.
    
    Args:
        machine_id: The machine identifier.
        seconds: Look back this many seconds (default: 30).
    
    Returns:
        List of telemetry dictionaries, ordered by timestamp DESC.
    """
    cutoff_time = time.time() - seconds
    rows = db.fetchall(
        """
        SELECT id, machine_id, timestamp, rpm, temperature, vibration, current, risk_score, fault_active
        FROM telemetry
        WHERE machine_id = ? AND timestamp >= ?
        ORDER BY timestamp DESC
        LIMIT 300
        """,
        (machine_id, cutoff_time)
    )
    return [dict(row) for row in rows]


def fetch_all_telemetry_for_machine(machine_id: str, limit: int = 100) -> List[dict]:
    """
    Fetch the most recent N telemetry records for a machine.
    
    Args:
        machine_id: The machine identifier.
        limit: Maximum number of records to return.
    
    Returns:
        List of telemetry dictionaries.
    """
    rows = db.fetchall(
        """
        SELECT id, machine_id, timestamp, rpm, temperature, vibration, current, risk_score, fault_active
        FROM telemetry
        WHERE machine_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
        """,
        (machine_id, limit)
    )
    return [dict(row) for row in rows]


# ──────────────────────────────────────────────────────────────────────────────
# ALERT QUERIES
# ──────────────────────────────────────────────────────────────────────────────

def log_alert(
    machine_id: str,
    severity: str,
    message: str,
    risk_score: float = 0.0,
    diagnosis_json: Optional[str] = None
) -> int:
    """
    Log an alert for a machine.
    
    Args:
        machine_id: The machine that triggered the alert.
        severity: Alert severity ('info', 'warning', 'critical').
        message: Human-readable alert message.
        risk_score: ML risk score that triggered the alert.
        diagnosis_json: Optional JSON diagnosis from LLM.
    
    Returns:
        The inserted alert's ID.
    """
    cursor = db.execute(
        """
        INSERT INTO alerts (machine_id, timestamp, severity, risk_score, message, diagnosis_json, acknowledged)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (machine_id, time.time(), severity, risk_score, message, diagnosis_json, 0),
        commit=True
    )
    logger.info(f"Alert logged for '{machine_id}': {message} (severity={severity}, risk={risk_score:.1f})")
    return cursor.lastrowid


def fetch_recent_alerts(machine_id: str, seconds: int = 300) -> List[dict]:
    """
    Fetch recent alerts for a machine.
    
    Args:
        machine_id: The machine identifier.
        seconds: Look back this many seconds.
    
    Returns:
        List of alert dictionaries.
    """
    cutoff_time = time.time() - seconds
    rows = db.fetchall(
        """
        SELECT id, machine_id, timestamp, severity, risk_score, message, diagnosis_json, acknowledged
        FROM alerts
        WHERE machine_id = ? AND timestamp >= ?
        ORDER BY timestamp DESC
        """,
        (machine_id, cutoff_time)
    )
    return [dict(row) for row in rows]


def acknowledge_alert(alert_id: int) -> bool:
    """
    Mark an alert as acknowledged.
    
    Args:
        alert_id: The alert ID to acknowledge.
    
    Returns:
        True if successful.
    """
    db.execute("UPDATE alerts SET acknowledged = 1 WHERE id = ?", (alert_id,), commit=True)
    logger.debug(f"Alert {alert_id} acknowledged.")
    return True


# ──────────────────────────────────────────────────────────────────────────────
# MACHINE QUERIES
# ──────────────────────────────────────────────────────────────────────────────

def fetch_machine_status(machine_id: str) -> Optional[dict]:
    """
    Get the latest status of a machine (most recent telemetry).
    
    Args:
        machine_id: The machine identifier.
    
    Returns:
        Dictionary with latest telemetry, or None if no data.
    """
    row = db.fetchone(
        """
        SELECT id, machine_id, timestamp, rpm, temperature, vibration, current, risk_score, fault_active
        FROM telemetry
        WHERE machine_id = ?
        ORDER BY timestamp DESC
        LIMIT 1
        """,
        (machine_id,)
    )
    return dict(row) if row else None


# ──────────────────────────────────────────────────────────────────────────────
# USER QUERIES
# ──────────────────────────────────────────────────────────────────────────────

def fetch_user_by_username(username: str) -> Optional[dict]:
    """
    Fetch user by username.
    
    Args:
        username: The username to look up.
    
    Returns:
        User dictionary, or None if not found.
    """
    row = db.fetchone(
        "SELECT id, username, password_hash, role, created_at FROM users WHERE username = ?",
        (username,)
    )
    return dict(row) if row else None


def fetch_user_by_id(user_id: int) -> Optional[dict]:
    """
    Fetch user by ID.
    
    Args:
        user_id: The user ID to look up.
    
    Returns:
        User dictionary, or None if not found.
    """
    row = db.fetchone(
        "SELECT id, username, password_hash, role, created_at FROM users WHERE id = ?",
        (user_id,)
    )
    return dict(row) if row else None


def update_user_password(user_id: int, password_hash: str) -> bool:
    """
    Update a user's password hash.
    
    Args:
        user_id: The user ID.
        password_hash: The new bcrypt-hashed password.
    
    Returns:
        True if successful.
    """
    db.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        (password_hash, user_id),
        commit=True
    )
    logger.debug(f"Password updated for user {user_id}.")
    return True


# ──────────────────────────────────────────────────────────────────────────────
# AUDIT LOG QUERIES
# ──────────────────────────────────────────────────────────────────────────────

def log_audit(user_id: int, action: str, details: Optional[str] = None) -> int:
    """
    Log an audit event.
    
    Args:
        user_id: The user who performed the action.
        action: Action description (e.g., 'login', 'config_change', 'alert_acknowledged').
        details: Optional additional details.
    
    Returns:
        The inserted audit log's ID.
    """
    cursor = db.execute(
        "INSERT INTO audit_logs (user_id, action, timestamp, details) VALUES (?, ?, ?, ?)",
        (user_id, action, time.time(), details),
        commit=True
    )
    logger.debug(f"Audit: user {user_id} → {action}")
    return cursor.lastrowid
