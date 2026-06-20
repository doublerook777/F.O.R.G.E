-- F.O.R.G.E Database Schema
-- SQLite with WAL mode (configured at connection time in db.py)

CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE,
    password_hash TEXT  NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'operator',  -- operator | engineer | admin
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telemetry (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id  TEXT    NOT NULL,
    timestamp   REAL    NOT NULL,   -- Unix epoch float for precision
    rpm         REAL    NOT NULL,
    temperature REAL    NOT NULL,
    vibration   REAL    NOT NULL,
    current     REAL    NOT NULL,
    risk_score  REAL    NOT NULL DEFAULT 0.0,
    fault_active TEXT   DEFAULT NULL,   -- NULL or fault name if injected
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id      TEXT    NOT NULL,
    timestamp       REAL    NOT NULL,
    severity        TEXT    NOT NULL DEFAULT 'warning',  -- info | warning | critical
    risk_score      REAL    NOT NULL,
    message         TEXT    NOT NULL,
    diagnosis_json  TEXT    DEFAULT NULL,  -- JSON string from LLM (Phase 2)
    acknowledged    INTEGER DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    action      TEXT    NOT NULL,
    timestamp   REAL    NOT NULL,
    details     TEXT    DEFAULT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for high-frequency telemetry reads
CREATE INDEX IF NOT EXISTS idx_telemetry_machine_time ON telemetry(machine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_machine_time    ON alerts(machine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time   ON audit_logs(user_id, timestamp DESC);

-- Seed default users (passwords are hashed in user_service.py at startup)
-- operator / operator123
-- engineer / engineer123
-- admin    / admin123
INSERT OR IGNORE INTO users (username, password_hash, role) VALUES
    ('operator', 'SEED_PLACEHOLDER', 'operator'),
    ('engineer', 'SEED_PLACEHOLDER', 'engineer'),
    ('admin',    'SEED_PLACEHOLDER', 'admin');
