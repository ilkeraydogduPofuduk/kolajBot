"""
Merkezi Exception Sistemi
Tüm uygulama hataları tek yerden yönetilir
"""

from typing import Optional, Dict, Any
from fastapi import HTTPException
from enum import Enum

class ErrorCode(Enum):
    """Error kodları"""
    # Authentication & Authorization
    AUTH_INVALID_CREDENTIALS = "AUTH_001"
    AUTH_TOKEN_EXPIRED = "AUTH_002"
    AUTH_TOKEN_INVALID = "AUTH_003"
    AUTH_INSUFFICIENT_PERMISSIONS = "AUTH_004"
    AUTH_ACCOUNT_LOCKED = "AUTH_005"
    
    # User Management
    USER_NOT_FOUND = "USER_001"
    USER_ALREADY_EXISTS = "USER_002"
    USER_INVALID_DATA = "USER_003"
    USER_DEACTIVATED = "USER_004"
    
    # Brand Management
    BRAND_NOT_FOUND = "BRAND_001"
    BRAND_ALREADY_EXISTS = "BRAND_002"
    BRAND_INVALID_DATA = "BRAND_003"
    BRAND_PERMISSION_DENIED = "BRAND_004"
    
    # Product Management
    PRODUCT_NOT_FOUND = "PRODUCT_001"
    PRODUCT_INVALID_DATA = "PRODUCT_002"
    PRODUCT_UPLOAD_FAILED = "PRODUCT_003"
    PRODUCT_OCR_FAILED = "PRODUCT_004"
    
    # Template Management
    TEMPLATE_NOT_FOUND = "TEMPLATE_001"
    TEMPLATE_INVALID_DATA = "TEMPLATE_002"
    TEMPLATE_GENERATION_FAILED = "TEMPLATE_003"
    
    # File Management
    FILE_NOT_FOUND = "FILE_001"
    FILE_INVALID_TYPE = "FILE_002"
    FILE_SIZE_EXCEEDED = "FILE_003"
    FILE_UPLOAD_FAILED = "FILE_004"
    
    # Database
    DATABASE_CONNECTION_FAILED = "DB_001"
    DATABASE_QUERY_FAILED = "DB_002"
    DATABASE_TRANSACTION_FAILED = "DB_003"
    
    # External Services
    OCR_SERVICE_FAILED = "OCR_001"
    EMAIL_SERVICE_FAILED = "EMAIL_001"
    TELEGRAM_SERVICE_FAILED = "TELEGRAM_001"
    
    # System
    SYSTEM_ERROR = "SYS_001"
    VALIDATION_ERROR = "SYS_002"
    CONFIGURATION_ERROR = "SYS_003"

class BaseAppException(Exception):
    """Base application exception"""
    
    def __init__(
        self,
        message: str,
        error_code: ErrorCode,
        details: Optional[Dict[str, Any]] = None,
        status_code: int = 500
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.status_code = status_code
        super().__init__(self.message)

class AuthenticationError(BaseAppException):
    """Authentication related errors"""
    
    def __init__(self, message: str = "Authentication failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, ErrorCode.AUTH_INVALID_CREDENTIALS, details, 401)

class AuthorizationError(BaseAppException):
    """Authorization related errors"""
    
    def __init__(self, message: str = "Insufficient permissions", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS, details, 403)

class ValidationError(BaseAppException):
    """Validation related errors"""
    
    def __init__(self, message: str = "Validation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, ErrorCode.VALIDATION_ERROR, details, 400)

class NotFoundError(BaseAppException):
    """Resource not found errors"""
    
    def __init__(self, message: str = "Resource not found", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, ErrorCode.SYSTEM_ERROR, details, 404)

class BusinessLogicError(BaseAppException):
    """Business logic related errors"""
    
    def __init__(self, message: str = "Business logic error", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, ErrorCode.SYSTEM_ERROR, details, 422)

class ExternalServiceError(BaseAppException):
    """External service related errors"""
    
    def __init__(self, message: str = "External service error", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, ErrorCode.SYSTEM_ERROR, details, 502)

class DatabaseError(BaseAppException):
    """Database related errors"""
    
    def __init__(self, message: str = "Database error", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, ErrorCode.DATABASE_CONNECTION_FAILED, details, 500)

class ConfigurationError(BaseAppException):
    """Configuration related errors"""
    
    def __init__(self, message: str = "Configuration error", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, ErrorCode.CONFIGURATION_ERROR, details, 500)

def create_http_exception(exception: BaseAppException) -> HTTPException:
    """Convert BaseAppException to HTTPException"""
    return HTTPException(
        status_code=exception.status_code,
        detail={
            "message": exception.message,
            "error_code": exception.error_code.value,
            "details": exception.details
        }
    )

def handle_exception(exception: Exception) -> HTTPException:
    """Handle any exception and convert to HTTPException"""
    if isinstance(exception, BaseAppException):
        return create_http_exception(exception)
    
    # Log unexpected exceptions
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"Unexpected exception: {type(exception).__name__}: {str(exception)}")
    
    return HTTPException(
        status_code=500,
        detail={
            "message": "Internal server error",
            "error_code": ErrorCode.SYSTEM_ERROR.value,
            "details": {"type": type(exception).__name__}
        }
    )
