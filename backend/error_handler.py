"""
error_handler.py — F.O.R.G.E Error Handling & Middleware
Custom exceptions, error handlers, and request logging middleware.
"""

import logging
import json
import time
from flask import Flask, request, jsonify, g
from functools import wraps

logger = logging.getLogger("forge.error_handler")


# ──────────────────────────────────────────────────────────────────────────────
# Custom Exception Classes
# ──────────────────────────────────────────────────────────────────────────────

class ForgeException(Exception):
    """Base exception for all F.O.R.G.E errors."""
    
    def __init__(self, message: str, status_code: int = 500, error_code: str = "INTERNAL_ERROR"):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(self.message)


class DatabaseError(ForgeException):
    """Database operation failed."""
    
    def __init__(self, message: str):
        super().__init__(message, status_code=500, error_code="DATABASE_ERROR")


class SimulatorError(ForgeException):
    """Simulator/generator error."""
    
    def __init__(self, message: str):
        super().__init__(message, status_code=500, error_code="SIMULATOR_ERROR")


class APIError(ForgeException):
    """General API error (bad request, validation failure, etc.)."""
    
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message, status_code=status_code, error_code="API_ERROR")


class AuthenticationError(ForgeException):
    """Authentication failed."""
    
    def __init__(self, message: str = "Authentication required"):
        super().__init__(message, status_code=401, error_code="AUTH_ERROR")


class AuthorizationError(ForgeException):
    """User lacks required permissions."""
    
    def __init__(self, message: str = "Access denied"):
        super().__init__(message, status_code=403, error_code="AUTHZ_ERROR")


class NotFoundError(ForgeException):
    """Resource not found."""
    
    def __init__(self, message: str, resource_type: str = "resource"):
        super().__init__(
            f"{resource_type} not found: {message}",
            status_code=404,
            error_code="NOT_FOUND"
        )


# ──────────────────────────────────────────────────────────────────────────────
# Error Handler Middleware
# ──────────────────────────────────────────────────────────────────────────────

def register_error_handlers(app: Flask):
    """
    Register global error handlers on the Flask app.
    Call this after creating the app.
    """
    
    @app.errorhandler(ForgeException)
    def handle_forge_error(error: ForgeException):
        """Handle custom F.O.R.G.E exceptions."""
        response = {
            "error": error.message,
            "error_code": error.error_code,
            "status": error.status_code,
        }
        logger.warning(f"API Error [{error.error_code}]: {error.message}", exc_info=False)
        return jsonify(response), error.status_code
    
    @app.errorhandler(400)
    def handle_bad_request(error):
        """Handle 400 Bad Request."""
        return jsonify({
            "error": "Bad request",
            "error_code": "BAD_REQUEST",
            "status": 400,
        }), 400
    
    @app.errorhandler(404)
    def handle_not_found(error):
        """Handle 404 Not Found."""
        return jsonify({
            "error": "Endpoint not found",
            "error_code": "NOT_FOUND",
            "status": 404,
        }), 404
    
    @app.errorhandler(500)
    def handle_server_error(error):
        """Handle 500 Internal Server Error."""
        logger.error(f"Internal server error: {error}", exc_info=True)
        return jsonify({
            "error": "Internal server error",
            "error_code": "INTERNAL_ERROR",
            "status": 500,
        }), 500


# ──────────────────────────────────────────────────────────────────────────────
# Request Logging Middleware
# ──────────────────────────────────────────────────────────────────────────────

def register_request_logging(app: Flask):
    """
    Register before_request and after_request handlers for logging.
    Call this after creating the app.
    """
    
    @app.before_request
    def log_request_start():
        """Log the start of each request."""
        g.request_start_time = time.time()
        g.request_id = request.headers.get("X-Request-ID", f"req-{int(time.time() * 1000)}")
        
        # Log request details at debug level
        logger.debug(
            f"[{g.request_id}] {request.method} {request.path} "
            f"from {request.remote_addr}"
        )
    
    @app.after_request
    def log_request_end(response):
        """Log the result of each request."""
        if hasattr(g, 'request_start_time'):
            elapsed_ms = (time.time() - g.request_start_time) * 1000
            request_id = getattr(g, 'request_id', 'unknown')
            
            log_func = logger.warning if response.status_code >= 400 else logger.info
            log_func(
                f"[{request_id}] {request.method} {request.path} "
                f"→ {response.status_code} ({elapsed_ms:.1f}ms)"
            )
        
        return response


def trace_request(f):
    """
    Decorator: logs entry/exit of a request handler with arguments.
    Useful for debugging specific endpoints.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        request_id = getattr(g, 'request_id', 'unknown')
        logger.debug(f"[{request_id}] Entering {f.__name__}(args={args}, kwargs={kwargs})")
        try:
            result = f(*args, **kwargs)
            logger.debug(f"[{request_id}] Exiting {f.__name__} with result: {type(result)}")
            return result
        except Exception as e:
            logger.error(f"[{request_id}] Exception in {f.__name__}: {e}", exc_info=True)
            raise
    return decorated
