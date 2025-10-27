"""
Merkezi Logging Sistemi
Tüm uygulama logları tek yerden yönetilir
"""

import logging
import logging.config
import os
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path
from core.config import settings

class ColoredFormatter(logging.Formatter):
    """Colored log formatter"""
    
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
    }
    RESET = '\033[0m'
    
    def format(self, record):
        log_color = self.COLORS.get(record.levelname, self.RESET)
        record.levelname = f"{log_color}{record.levelname}{self.RESET}"
        return super().format(record)

class StructuredFormatter(logging.Formatter):
    """Structured log formatter for JSON output"""
    
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # Add extra fields
        if hasattr(record, 'user_id'):
            log_entry['user_id'] = record.user_id
        if hasattr(record, 'request_id'):
            log_entry['request_id'] = record.request_id
        if hasattr(record, 'duration'):
            log_entry['duration'] = record.duration
        if hasattr(record, 'status_code'):
            log_entry['status_code'] = record.status_code
        
        # Add exception info
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
        
        return log_entry

def setup_logging():
    """Setup centralized logging configuration"""
    
    # Create logs directory
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)
    
    # Logging configuration
    config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'standard': {
                'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            },
            'colored': {
                '()': ColoredFormatter,
                'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            },
            'structured': {
                '()': StructuredFormatter,
            },
            'detailed': {
                'format': '%(asctime)s - %(name)s - %(levelname)s - %(module)s.%(funcName)s:%(lineno)d - %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S'
            }
        },
        'handlers': {
            'console': {
                'class': 'logging.StreamHandler',
                'level': 'INFO',
                'formatter': 'colored' if settings.is_development() else 'standard',
                'stream': 'ext://sys.stdout',
                'encoding': 'utf-8'
            },
            'file_app': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'INFO',
                'formatter': 'detailed',
                'filename': str(logs_dir / 'app.log'),
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5
            },
            'file_error': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'ERROR',
                'formatter': 'detailed',
                'filename': str(logs_dir / 'error.log'),
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5
            },
            'file_performance': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'INFO',
                'formatter': 'structured',
                'filename': str(logs_dir / 'performance.log'),
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5
            },
            'file_security': {
                'class': 'logging.handlers.RotatingFileHandler',
                'level': 'WARNING',
                'formatter': 'structured',
                'filename': str(logs_dir / 'security.log'),
                'maxBytes': 10485760,  # 10MB
                'backupCount': 5
            }
        },
        'loggers': {
            '': {  # Root logger
                'handlers': ['console', 'file_app'],
                'level': 'INFO',
                'propagate': False
            },
            'app': {
                'handlers': ['console', 'file_app'],
                'level': 'INFO',
                'propagate': False
            },
            'app.error': {
                'handlers': ['console', 'file_error'],
                'level': 'ERROR',
                'propagate': False
            },
            'app.performance': {
                'handlers': ['file_performance'],
                'level': 'INFO',
                'propagate': False
            },
            'app.security': {
                'handlers': ['file_security'],
                'level': 'WARNING',
                'propagate': False
            },
            'uvicorn': {
                'handlers': ['console', 'file_app'],
                'level': 'INFO',
                'propagate': False
            },
            'uvicorn.error': {
                'handlers': ['console', 'file_error'],
                'level': 'ERROR',
                'propagate': False
            },
            'uvicorn.access': {
                'handlers': ['file_app'],
                'level': 'INFO',
                'propagate': False
            }
        }
    }
    
    # Apply configuration
    logging.config.dictConfig(config)
    
    # Set environment-specific log levels
    if settings.is_development():
        logging.getLogger('app').setLevel(logging.DEBUG)
        logging.getLogger('uvicorn').setLevel(logging.DEBUG)
    else:
        logging.getLogger('app').setLevel(logging.INFO)
        logging.getLogger('uvicorn').setLevel(logging.INFO)

def get_logger(name: str) -> logging.Logger:
    """Get logger instance"""
    return logging.getLogger(f'app.{name}')

def log_business_event(
    event_type: str,
    user_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None,
    level: str = 'INFO'
):
    """Log business event"""
    logger = get_logger('business')
    log_data = {
        'event_type': event_type,
        'user_id': user_id,
        'details': details or {}
    }
    
    if level == 'ERROR':
        logger.error(f"Business event: {event_type}", extra=log_data)
    elif level == 'WARNING':
        logger.warning(f"Business event: {event_type}", extra=log_data)
    else:
        logger.info(f"Business event: {event_type}", extra=log_data)

def log_performance_metric(
    operation: str,
    duration: float,
    user_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None
):
    """Log performance metric"""
    logger = get_logger('performance')
    log_data = {
        'operation': operation,
        'duration': duration,
        'user_id': user_id,
        'details': details or {}
    }
    logger.info(f"Performance metric: {operation}", extra=log_data)

def log_security_event(
    event_type: str,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
):
    """Log security event"""
    logger = get_logger('security')
    log_data = {
        'event_type': event_type,
        'user_id': user_id,
        'ip_address': ip_address,
        'details': details or {}
    }
    logger.warning(f"Security event: {event_type}", extra=log_data)

def log_api_request(
    method: str,
    path: str,
    status_code: int,
    duration: float,
    user_id: Optional[int] = None,
    request_id: Optional[str] = None
):
    """Log API request"""
    logger = get_logger('api')
    log_data = {
        'method': method,
        'path': path,
        'status_code': status_code,
        'duration': duration,
        'user_id': user_id,
        'request_id': request_id
    }
    logger.info(f"API request: {method} {path} - {status_code}", extra=log_data)
