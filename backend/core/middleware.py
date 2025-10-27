"""
Merkezi Middleware Sistemi
Tüm middleware'ler tek yerden yönetilir
"""

import time
import uuid
from typing import Callable, Optional
from fastapi import Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from core.config import settings
from core.logging import log_api_request, log_security_event, get_logger

logger = get_logger('middleware')

class RequestIDMiddleware(BaseHTTPMiddleware):
    """Request ID middleware"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        
        return response

class LoggingMiddleware(BaseHTTPMiddleware):
    """API request logging middleware"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Get user info if available
        user_id = None
        if hasattr(request.state, 'user'):
            user_id = getattr(request.state.user, 'id', None)
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Log API request
        log_api_request(
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration=duration,
            user_id=user_id,
            request_id=getattr(request.state, 'request_id', None)
        )
        
        return response

class SecurityMiddleware(BaseHTTPMiddleware):
    """Security middleware"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check for suspicious patterns
        suspicious_patterns = [
            '..',  # Directory traversal
            '<script',  # XSS
            'javascript:',  # XSS
            'data:',  # Data URI
            'vbscript:',  # VBScript
        ]
        
        # Check URL path
        path = request.url.path.lower()
        for pattern in suspicious_patterns:
            if pattern in path:
                log_security_event(
                    event_type='suspicious_request',
                    ip_address=request.client.host if request.client else None,
                    details={'pattern': pattern, 'path': path}
                )
                return Response(
                    content="Suspicious request detected",
                    status_code=400
                )
        
        # Check query parameters
        for param_name, param_value in request.query_params.items():
            param_value_lower = param_value.lower()
            for pattern in suspicious_patterns:
                if pattern in param_value_lower:
                    log_security_event(
                        event_type='suspicious_query',
                        ip_address=request.client.host if request.client else None,
                        details={'pattern': pattern, 'param': param_name, 'value': param_value}
                    )
                    return Response(
                        content="Suspicious query parameter detected",
                        status_code=400
                    )
        
        return await call_next(request)

class PerformanceMiddleware(BaseHTTPMiddleware):
    """Performance monitoring middleware"""
    
    def __init__(self, app, slow_request_threshold: float = 2.0):
        super().__init__(app)
        self.slow_request_threshold = slow_request_threshold
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        response = await call_next(request)
        
        duration = time.time() - start_time
        
        # Log slow requests
        if duration > self.slow_request_threshold:
            logger.warning(
                f"Slow request detected: {request.method} {request.url.path} - {duration:.2f}s",
                extra={
                    'duration': duration,
                    'method': request.method,
                    'path': request.url.path,
                    'threshold': self.slow_request_threshold
                }
            )
        
        # Add performance headers
        response.headers["X-Response-Time"] = f"{duration:.3f}s"
        
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware"""
    
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests = {}  # In production, use Redis
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()
        
        # Clean old entries
        self.requests = {
            ip: timestamps for ip, timestamps in self.requests.items()
            if any(ts > current_time - 60 for ts in timestamps)
        }
        
        # Check rate limit
        if client_ip in self.requests:
            # Remove timestamps older than 1 minute
            self.requests[client_ip] = [
                ts for ts in self.requests[client_ip]
                if ts > current_time - 60
            ]
            
            if len(self.requests[client_ip]) >= self.requests_per_minute:
                log_security_event(
                    event_type='rate_limit_exceeded',
                    ip_address=client_ip,
                    details={'requests': len(self.requests[client_ip]), 'limit': self.requests_per_minute}
                )
                return Response(
                    content="Rate limit exceeded",
                    status_code=429,
                    headers={"Retry-After": "60"}
                )
        else:
            self.requests[client_ip] = []
        
        # Add current request
        self.requests[client_ip].append(current_time)
        
        return await call_next(request)

def setup_cors_middleware(app):
    """Setup CORS middleware"""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

def setup_trusted_host_middleware(app):
    """Setup trusted host middleware"""
    if settings.is_production():
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=["aibrands.com", "*.aibrands.com"]
        )

def setup_security_middleware(app):
    """Setup security middleware"""
    app.add_middleware(SecurityMiddleware)

def setup_logging_middleware(app):
    """Setup logging middleware"""
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(LoggingMiddleware)

def setup_performance_middleware(app):
    """Setup performance middleware"""
    app.add_middleware(PerformanceMiddleware)

def setup_rate_limit_middleware(app):
    """Setup rate limit middleware"""
    app.add_middleware(RateLimitMiddleware)

def setup_all_middleware(app):
    """Setup all middleware"""
    setup_cors_middleware(app)
    setup_trusted_host_middleware(app)
    setup_security_middleware(app)
    setup_logging_middleware(app)
    setup_performance_middleware(app)
    setup_rate_limit_middleware(app)
    
    logger.info("All middleware setup completed")
