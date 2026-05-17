"""
logging/logger.py — Centralized Logging Configuration
Structured logging with color-coded console output for development.
Critical for debugging high-frequency SSE streams.
"""

import logging
import sys
import os
from datetime import datetime


# ANSI color codes for terminal output
class _Colors:
    RESET   = "\033[0m"
    BOLD    = "\033[1m"
    RED     = "\033[91m"
    YELLOW  = "\033[93m"
    GREEN   = "\033[92m"
    CYAN    = "\033[96m"
    MAGENTA = "\033[95m"
    DIM     = "\033[2m"


class _ForgeFormatter(logging.Formatter):
    """Custom formatter with color-coded log levels and module tags."""

    LEVEL_COLORS = {
        logging.DEBUG:    _Colors.DIM,
        logging.INFO:     _Colors.GREEN,
        logging.WARNING:  _Colors.YELLOW,
        logging.ERROR:    _Colors.RED,
        logging.CRITICAL: _Colors.BOLD + _Colors.RED,
    }

    def format(self, record: logging.LogRecord) -> str:
        color = self.LEVEL_COLORS.get(record.levelno, _Colors.RESET)
        ts    = datetime.fromtimestamp(record.created).strftime("%H:%M:%S.%f")[:-3]
        level = f"{color}{record.levelname:<8}{_Colors.RESET}"
        name  = f"{_Colors.CYAN}[{record.name}]{_Colors.RESET}"
        msg   = record.getMessage()

        if record.exc_info:
            msg += "\n" + self.formatException(record.exc_info)

        return f"{_Colors.DIM}{ts}{_Colors.RESET} {level} {name} {msg}"


def setup_logging():
    """
    Configure the root 'forge' logger.
    Call this once at app startup from app.py.
    """
    log_level_str = os.getenv("LOG_LEVEL", "DEBUG").upper()
    log_level = getattr(logging, log_level_str, logging.DEBUG)

    # Root forge logger
    root_logger = logging.getLogger("forge")
    root_logger.setLevel(log_level)

    if not root_logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(log_level)
        handler.setFormatter(_ForgeFormatter())
        root_logger.addHandler(handler)

    # Silence noisy third-party loggers in dev
    logging.getLogger("werkzeug").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)

    root_logger.info(f"F.O.R.G.E logging initialized at level {log_level_str}.")
    return root_logger


def get_logger(name: str) -> logging.Logger:
    """Get a child logger under the forge namespace."""
    return logging.getLogger(f"forge.{name}")
