"""
database/models.py — Data Models using Dataclasses
Simple ORM-like models that map to database tables.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class User:
    """User account with role-based access control."""
    id: int
    username: str
    password_hash: str
    role: str  # 'operator', 'engineer', 'admin'
    created_at: datetime
    
    def is_admin(self) -> bool:
        return self.role == 'admin'
    
    def is_engineer(self) -> bool:
        return self.role in ('engineer', 'admin')


@dataclass
class Machine:
    """Represents a monitored piece of equipment."""
    machine_id: str
    name: str
    type: str  # 'cnc_mill', 'lathe', etc.
    location: Optional[str] = None
    created_at: Optional[datetime] = None


@dataclass
class Telemetry:
    """Single sensor reading from a machine."""
    id: int
    machine_id: str
    timestamp: float  # Unix epoch
    rpm: float
    temperature: float
    vibration: float
    current: float
    risk_score: float = 0.0
    fault_active: Optional[str] = None
    created_at: Optional[datetime] = None


@dataclass
class Alert:
    """Alert triggered when risk exceeds threshold."""
    id: int
    machine_id: str
    timestamp: float
    severity: str  # 'info', 'warning', 'critical'
    risk_score: float
    message: str
    diagnosis_json: Optional[str] = None
    acknowledged: bool = False
    created_at: Optional[datetime] = None


@dataclass
class AuditLog:
    """Log of user actions for compliance and debugging."""
    id: int
    user_id: int
    action: str
    timestamp: datetime
    details: Optional[str] = None
