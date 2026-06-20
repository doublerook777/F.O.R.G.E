"""
logging/__init__.py — Stdlib Logging Proxy

This local package is named 'logging', which would shadow Python's stdlib.
We fix this by loading stdlib logging via importlib and injecting it into
sys.modules['logging'] so all subsequent `import logging` calls get stdlib.
"""
import sys
import importlib.util
from pathlib import Path


def _inject_stdlib():
    if '_forge_stdlib_log' in sys.modules:
        real = sys.modules['_forge_stdlib_log']
    else:
        backend_dir = str(Path(__file__).parent.parent.resolve())
        real = None
        for p in sys.path:
            if not p:
                continue
            if str(Path(p).resolve()) == backend_dir:
                continue
            candidate = Path(p) / 'logging' / '__init__.py'
            if candidate.exists():
                spec = importlib.util.spec_from_file_location('_forge_stdlib_log', str(candidate))
                mod = importlib.util.module_from_spec(spec)
                sys.modules['_forge_stdlib_log'] = mod
                spec.loader.exec_module(mod)
                real = mod
                break

    if real is not None:
        # Replace ourselves in sys.modules with the real stdlib logging
        sys.modules['logging'] = real
        # Re-export key attrs into this module's namespace for safety
        globals().update({k: getattr(real, k) for k in dir(real) if not k.startswith('__')})


_inject_stdlib()
