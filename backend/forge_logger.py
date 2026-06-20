"""
forge_logger.py — F.O.R.G.E Logging Setup
Placed at backend/ root (not inside a 'logging/' package) to avoid
shadowing Python's stdlib logging module.
"""
import sys
import importlib.util
import os
from pathlib import Path


def _get_stdlib_logging():
    """Load stdlib logging bypassing our local backend/ directory."""
    if '_forge_stdlib_log' in sys.modules:
        return sys.modules['_forge_stdlib_log']

    backend_dir = str(Path(__file__).parent.resolve())
    for p in sys.path:
        if not p:
            continue
        resolved = str(Path(p).resolve())
        if resolved == backend_dir:
            continue
        candidate = Path(p) / 'logging' / '__init__.py'
        if candidate.exists():
            spec = importlib.util.spec_from_file_location('_forge_stdlib_log', str(candidate))
            mod = importlib.util.module_from_spec(spec)
            sys.modules['_forge_stdlib_log'] = mod
            spec.loader.exec_module(mod)
            return mod
    return None


# Bootstrap: load real stdlib logging and register it so all subsequent
# `import logging` calls get the stdlib version, not our local package.
_real_logging = _get_stdlib_logging()
if _real_logging and 'logging' not in sys.modules:
    sys.modules['logging'] = _real_logging

import logging as _log   # now guaranteed to be stdlib

# ── ANSI colors ────────────────────────────────────────────────────────────
class _C:
    RESET = "\033[0m"; BOLD = "\033[1m"; RED = "\033[91m"
    YELLOW = "\033[93m"; GREEN = "\033[92m"; CYAN = "\033[96m"; DIM = "\033[2m"


class _ForgeFormatter(_log.Formatter):
    COLORS = {
        _log.DEBUG:    _C.DIM,
        _log.INFO:     _C.GREEN,
        _log.WARNING:  _C.YELLOW,
        _log.ERROR:    _C.RED,
        _log.CRITICAL: _C.BOLD + _C.RED,
    }

    def format(self, record):
        from datetime import datetime
        color = self.COLORS.get(record.levelno, _C.RESET)
        ts    = datetime.fromtimestamp(record.created).strftime("%H:%M:%S.%f")[:-3]
        level = f"{color}{record.levelname:<8}{_C.RESET}"
        name  = f"{_C.CYAN}[{record.name}]{_C.RESET}"
        msg   = record.getMessage()
        if record.exc_info:
            msg += "\n" + self.formatException(record.exc_info)
        return f"{_C.DIM}{ts}{_C.RESET} {level} {name} {msg}"


def setup_logging():
    """Configure the root forge logger. Call once at startup."""
    level_str = os.getenv("LOG_LEVEL", "DEBUG").upper()
    level     = getattr(_log, level_str, _log.DEBUG)

    root = _log.getLogger("forge")
    root.setLevel(level)
    if not root.handlers:
        h = _log.StreamHandler(sys.stdout)
        h.setLevel(level)
        h.setFormatter(_ForgeFormatter())
        root.addHandler(h)

    _log.getLogger("werkzeug").setLevel(_log.WARNING)
    _log.getLogger("urllib3").setLevel(_log.WARNING)
    root.info(f"F.O.R.G.E logging ready at level {level_str}.")
    return root


def get_logger(name: str):
    return _log.getLogger(f"forge.{name}")
