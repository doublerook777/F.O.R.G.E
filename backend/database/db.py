"""
database/db.py — SQLite Connection Factory
Enforces WAL mode on every connection for concurrent read/write support.
Uses thread-local storage so each thread gets its own connection.
"""

import sqlite3
import threading
import os
import logging
from pathlib import Path

logger = logging.getLogger("forge.db")

_thread_local = threading.local()


def _get_db_path() -> str:
    path = os.getenv("DB_PATH", "./database/forge.db")
    # Resolve relative to backend/ directory
    base = Path(__file__).parent.parent
    resolved = (base / path).resolve()
    resolved.parent.mkdir(parents=True, exist_ok=True)
    return str(resolved)


def get_connection() -> sqlite3.Connection:
    """
    Returns a thread-local SQLite connection with WAL mode enforced.
    Creates the connection if it doesn't exist for this thread.
    """
    if not hasattr(_thread_local, "conn") or _thread_local.conn is None:
        db_path = _get_db_path()
        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row  # Access columns by name

        # --- CRITICAL: Enable WAL mode for concurrent telemetry writes ---
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")   # Fast writes, safe
        conn.execute("PRAGMA cache_size=-64000;")    # 64MB page cache
        conn.execute("PRAGMA temp_store=MEMORY;")    # Temp tables in RAM
        conn.execute("PRAGMA foreign_keys=ON;")
        conn.commit()

        _thread_local.conn = conn
        logger.debug(f"New DB connection opened (WAL) for thread {threading.current_thread().name}")

    return _thread_local.conn


def close_connection():
    """Close and discard the thread-local connection."""
    if hasattr(_thread_local, "conn") and _thread_local.conn:
        _thread_local.conn.close()
        _thread_local.conn = None


def init_db():
    """
    Initialize the database schema from schema.sql.
    Called once at app startup.
    """
    schema_path = Path(__file__).parent / "schema.sql"
    conn = get_connection()
    with open(schema_path, "r") as f:
        schema_sql = f.read()
    conn.executescript(schema_sql)
    conn.commit()
    logger.info("Database initialized with WAL mode.")


def execute(query: str, params: tuple = (), commit: bool = False):
    """Convenience wrapper for single-query execution."""
    conn = get_connection()
    cursor = conn.execute(query, params)
    if commit:
        conn.commit()
    return cursor


def fetchall(query: str, params: tuple = ()) -> list:
    return execute(query, params).fetchall()


def fetchone(query: str, params: tuple = ()):
    return execute(query, params).fetchone()
