"""
config.py — F.O.R.G.E Configuration Management
Centralized configuration for development, testing, and production modes.
"""

import os
from pathlib import Path


class Config:
    """Base configuration class."""
    
    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "forge-dev-secret")
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"
    
    # Database
    DB_PATH = os.getenv("DB_PATH", "./database/forge.db")
    DB_TIMEOUT = 30.0  # Connection timeout in seconds
    
    # JWT
    JWT_SECRET = os.getenv("SECRET_KEY", "forge-dev-secret")
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "8"))
    JWT_ALGORITHM = "HS256"
    
    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "DEBUG")
    
    # Simulator/Streaming
    STREAM_HZ = float(os.getenv("STREAM_HZ", "10"))
    ML_WARMUP_SAMPLES = int(os.getenv("ML_WARMUP_SAMPLES", "200"))
    
    # ML/Risk Scoring
    RISK_THRESHOLD_ALERT = float(os.getenv("RISK_THRESHOLD_ALERT", "85"))
    
    # LLM Configuration
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    TESTING = False


class TestingConfig(Config):
    """Testing configuration."""
    DEBUG = False
    TESTING = True
    DB_PATH = ":memory:"  # Use in-memory database for tests


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    TESTING = False
    LOG_LEVEL = "INFO"


def get_config() -> Config:
    """Get the appropriate configuration class based on FLASK_ENV."""
    env = os.getenv("FLASK_ENV", "development").lower()
    
    config_map = {
        "development": DevelopmentConfig,
        "testing": TestingConfig,
        "production": ProductionConfig,
    }
    
    return config_map.get(env, DevelopmentConfig)
