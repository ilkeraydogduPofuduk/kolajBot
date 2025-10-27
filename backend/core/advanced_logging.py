"""
Gelişmiş Hata Ayıklama ve Loglama Sistemi
Derinlemesine analiz ve ileri seviye loglama
"""

import os
import sys
import traceback
import threading
import time
import json
import uuid
from typing import Dict, List, Any, Optional, Callable, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from contextlib import contextmanager
from functools import wraps
import inspect
from core.config import settings
from core.logging import get_logger
from core.exceptions import BaseAppException

logger = get_logger('advanced_logging')

# Get backend directory for logs
BACKEND_DIR = os.path.dirname(os.path.dirname(__file__))
LOGS_DIR = os.path.join(BACKEND_DIR, "logs")

class LogLevel(str, Enum):
    """Log seviyeleri"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"
    TRACE = "trace"
    PERFORMANCE = "performance"
    SECURITY = "security"
    BUSINESS = "business"
    AUDIT = "audit"

class LogCategory(str, Enum):
    """Log kategorileri"""
    SYSTEM = "system"
    USER = "user"
    API = "api"
    DATABASE = "database"
    AUTH = "auth"
    UPLOAD = "upload"
    OCR = "ocr"
    TEMPLATE = "template"
    EMAIL = "email"
    TELEGRAM = "telegram"
    CACHE = "cache"
    PERFORMANCE = "performance"
    SECURITY = "security"
    BUSINESS = "business"
    AUDIT = "audit"

@dataclass
class LogContext:
    """Log context bilgisi"""
    request_id: str
    user_id: Optional[int] = None
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    duration: Optional[float] = None
    status_code: Optional[int] = None
    error_code: Optional[str] = None
    stack_trace: Optional[str] = None
    metadata: Dict[str, Any] = None

@dataclass
class LogEntry:
    """Log girişi"""
    id: str
    timestamp: datetime
    level: LogLevel
    category: LogCategory
    message: str
    context: LogContext
    data: Dict[str, Any]
    tags: List[str]
    source: str
    function: str
    line_number: int
    thread_id: int
    process_id: int

class AdvancedLogger:
    """Gelişmiş logger sınıfı"""
    
    def __init__(self):
        self.logs: List[LogEntry] = []
        self.max_logs = 50000
        self.context_stack: List[LogContext] = []
        self.filters: List[Callable] = []
        self.handlers: List[Callable] = []
        self.metrics: Dict[str, Any] = {}
        self.performance_tracker: Dict[str, List[float]] = {}
        self.error_patterns: Dict[str, int] = {}
        self.thread_local = threading.local()
        
        # Setup log directories
        self.setup_directories()
        
        # Initialize metrics
        self.initialize_metrics()
    
    def setup_directories(self):
        """Log dizinlerini oluştur"""
        directories = [
            os.path.join(LOGS_DIR, "advanced"),
            os.path.join(LOGS_DIR, "performance"),
            os.path.join(LOGS_DIR, "security"),
            os.path.join(LOGS_DIR, "business"),
            os.path.join(LOGS_DIR, "audit"),
            os.path.join(LOGS_DIR, "debug")
        ]
        
        for directory in directories:
            Path(directory).mkdir(parents=True, exist_ok=True)
    
    def initialize_metrics(self):
        """Metrikleri başlat"""
        self.metrics = {
            'total_logs': 0,
            'logs_by_level': {},
            'logs_by_category': {},
            'error_count': 0,
            'warning_count': 0,
            'performance_issues': 0,
            'security_events': 0,
            'business_events': 0,
            'audit_events': 0,
        }
        
        for level in LogLevel:
            self.metrics['logs_by_level'][level.value] = 0
        
        for category in LogCategory:
            self.metrics['logs_by_category'][category.value] = 0
    
    def create_context(self, **kwargs) -> LogContext:
        """Log context oluştur"""
        context = LogContext(
            request_id=kwargs.get('request_id', str(uuid.uuid4())),
            user_id=kwargs.get('user_id'),
            session_id=kwargs.get('session_id'),
            ip_address=kwargs.get('ip_address'),
            user_agent=kwargs.get('user_agent'),
            endpoint=kwargs.get('endpoint'),
            method=kwargs.get('method'),
            duration=kwargs.get('duration'),
            status_code=kwargs.get('status_code'),
            error_code=kwargs.get('error_code'),
            stack_trace=kwargs.get('stack_trace'),
            metadata=kwargs.get('metadata', {})
        )
        return context
    
    def push_context(self, context: LogContext):
        """Context stack'e ekle"""
        self.context_stack.append(context)
    
    def pop_context(self) -> Optional[LogContext]:
        """Context stack'ten çıkar"""
        if self.context_stack:
            return self.context_stack.pop()
        return None
    
    def get_current_context(self) -> Optional[LogContext]:
        """Mevcut context'i al"""
        if self.context_stack:
            return self.context_stack[-1]
        return None
    
    def log(
        self,
        level: LogLevel,
        category: LogCategory,
        message: str,
        data: Dict[str, Any] = None,
        tags: List[str] = None,
        exception: Exception = None
    ):
        """Log kaydet"""
        try:
            # Get caller information
            frame = inspect.currentframe().f_back
            source = frame.f_code.co_filename
            function = frame.f_code.co_name
            line_number = frame.f_lineno
            
            # Create log entry
            log_entry = LogEntry(
                id=str(uuid.uuid4()),
                timestamp=datetime.now(),
                level=level,
                category=category,
                message=message,
                context=self.get_current_context() or self.create_context(),
                data=data or {},
                tags=tags or [],
                source=source,
                function=function,
                line_number=line_number,
                thread_id=threading.get_ident(),
                process_id=os.getpid()
            )
            
            # Add exception information
            if exception:
                log_entry.data['exception'] = {
                    'type': type(exception).__name__,
                    'message': str(exception),
                    'traceback': traceback.format_exc()
                }
                log_entry.context.stack_trace = traceback.format_exc()
            
            # Apply filters
            if not self.apply_filters(log_entry):
                return
            
            # Add to logs
            self.logs.append(log_entry)
            
            # Maintain max logs
            if len(self.logs) > self.max_logs:
                self.logs.pop(0)
            
            # Update metrics
            self.update_metrics(log_entry)
            
            # Track performance
            if level == LogLevel.PERFORMANCE:
                self.track_performance(log_entry)
            
            # Track error patterns
            if level in [LogLevel.ERROR, LogLevel.CRITICAL]:
                self.track_error_patterns(log_entry)
            
            # Call handlers
            self.call_handlers(log_entry)
            
            # Write to file
            self.write_to_file(log_entry)
            
        except Exception as e:
            # Fallback logging
            print(f"Advanced logging error: {e}")
    
    def apply_filters(self, log_entry: LogEntry) -> bool:
        """Filtreleri uygula"""
        for filter_func in self.filters:
            try:
                if not filter_func(log_entry):
                    return False
            except Exception:
                pass
        return True
    
    def update_metrics(self, log_entry: LogEntry):
        """Metrikleri güncelle"""
        self.metrics['total_logs'] += 1
        self.metrics['logs_by_level'][log_entry.level.value] += 1
        self.metrics['logs_by_category'][log_entry.category.value] += 1
        
        if log_entry.level == LogLevel.ERROR:
            self.metrics['error_count'] += 1
        elif log_entry.level == LogLevel.WARNING:
            self.metrics['warning_count'] += 1
        
        if log_entry.category == LogCategory.PERFORMANCE:
            self.metrics['performance_issues'] += 1
        elif log_entry.category == LogCategory.SECURITY:
            self.metrics['security_events'] += 1
        elif log_entry.category == LogCategory.BUSINESS:
            self.metrics['business_events'] += 1
        elif log_entry.category == LogCategory.AUDIT:
            self.metrics['audit_events'] += 1
    
    def track_performance(self, log_entry: LogEntry):
        """Performans takibi"""
        if 'duration' in log_entry.data:
            duration = log_entry.data['duration']
            function_key = f"{log_entry.source}:{log_entry.function}"
            
            if function_key not in self.performance_tracker:
                self.performance_tracker[function_key] = []
            
            self.performance_tracker[function_key].append(duration)
            
            # Keep only last 100 measurements
            if len(self.performance_tracker[function_key]) > 100:
                self.performance_tracker[function_key].pop(0)
    
    def track_error_patterns(self, log_entry: LogEntry):
        """Hata desenlerini takip et"""
        error_key = f"{log_entry.category.value}:{log_entry.message}"
        self.error_patterns[error_key] = self.error_patterns.get(error_key, 0) + 1
    
    def call_handlers(self, log_entry: LogEntry):
        """Handler'ları çağır"""
        for handler in self.handlers:
            try:
                handler(log_entry)
            except Exception as e:
                print(f"Handler error: {e}")
    
    def write_to_file(self, log_entry: LogEntry):
        """Dosyaya yaz"""
        try:
            # Determine file based on category
            filename = os.path.join(LOGS_DIR, log_entry.category.value, f"{log_entry.timestamp.strftime('%Y-%m-%d')}.log")
            
            # Create log line
            log_line = self.format_log_line(log_entry)
            
            # Write to file
            with open(filename, 'a', encoding='utf-8') as f:
                f.write(log_line + '\n')
                
        except Exception as e:
            print(f"File write error: {e}")
    
    def format_log_line(self, log_entry: LogEntry) -> str:
        """Log satırını formatla"""
        return json.dumps({
            'id': log_entry.id,
            'timestamp': log_entry.timestamp.isoformat(),
            'level': log_entry.level.value,
            'category': log_entry.category.value,
            'message': log_entry.message,
            'context': asdict(log_entry.context),
            'data': log_entry.data,
            'tags': log_entry.tags,
            'source': log_entry.source,
            'function': log_entry.function,
            'line_number': log_entry.line_number,
            'thread_id': log_entry.thread_id,
            'process_id': log_entry.process_id
        }, ensure_ascii=False)
    
    def add_filter(self, filter_func: Callable):
        """Filtre ekle"""
        self.filters.append(filter_func)
    
    def add_handler(self, handler_func: Callable):
        """Handler ekle"""
        self.handlers.append(handler_func)
    
    def debug(self, category: LogCategory, message: str, **kwargs):
        """Debug log"""
        self.log(LogLevel.DEBUG, category, message, kwargs.get('data'), kwargs.get('tags'))
    
    def info(self, category: LogCategory, message: str, **kwargs):
        """Info log"""
        self.log(LogLevel.INFO, category, message, kwargs.get('data'), kwargs.get('tags'))
    
    def warning(self, category: LogCategory, message: str, **kwargs):
        """Warning log"""
        self.log(LogLevel.WARNING, category, message, kwargs.get('data'), kwargs.get('tags'))
    
    def error(self, category: LogCategory, message: str, **kwargs):
        """Error log"""
        self.log(LogLevel.ERROR, category, message, kwargs.get('data'), kwargs.get('tags'), kwargs.get('exception'))
    
    def critical(self, category: LogCategory, message: str, **kwargs):
        """Critical log"""
        self.log(LogLevel.CRITICAL, category, message, kwargs.get('data'), kwargs.get('tags'), kwargs.get('exception'))
    
    def performance(self, category: LogCategory, message: str, **kwargs):
        """Performance log"""
        self.log(LogLevel.PERFORMANCE, category, message, kwargs.get('data'), kwargs.get('tags'))
    
    def security(self, category: LogCategory, message: str, **kwargs):
        """Security log"""
        self.log(LogLevel.SECURITY, category, message, kwargs.get('data'), kwargs.get('tags'))
    
    def business(self, category: LogCategory, message: str, **kwargs):
        """Business log"""
        self.log(LogLevel.BUSINESS, category, message, kwargs.get('data'), kwargs.get('tags'))
    
    def audit(self, category: LogCategory, message: str, **kwargs):
        """Audit log"""
        self.log(LogLevel.AUDIT, category, message, kwargs.get('data'), kwargs.get('tags'))
    
    def get_logs(
        self,
        level: Optional[LogLevel] = None,
        category: Optional[LogCategory] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 1000
    ) -> List[LogEntry]:
        """Log'ları al"""
        filtered_logs = self.logs
        
        if level:
            filtered_logs = [log for log in filtered_logs if log.level == level]
        
        if category:
            filtered_logs = [log for log in filtered_logs if log.category == category]
        
        if start_time:
            filtered_logs = [log for log in filtered_logs if log.timestamp >= start_time]
        
        if end_time:
            filtered_logs = [log for log in filtered_logs if log.timestamp <= end_time]
        
        return filtered_logs[-limit:]
    
    def get_metrics(self) -> Dict[str, Any]:
        """Metrikleri al"""
        return self.metrics.copy()
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Performans istatistiklerini al"""
        stats = {}
        for function_key, durations in self.performance_tracker.items():
            if durations:
                stats[function_key] = {
                    'count': len(durations),
                    'avg': sum(durations) / len(durations),
                    'min': min(durations),
                    'max': max(durations),
                    'recent': durations[-10:] if len(durations) >= 10 else durations
                }
        return stats
    
    def get_error_patterns(self) -> Dict[str, int]:
        """Hata desenlerini al"""
        return self.error_patterns.copy()
    
    def clear_logs(self):
        """Log'ları temizle"""
        self.logs.clear()
        self.performance_tracker.clear()
        self.error_patterns.clear()
        self.initialize_metrics()

# Global advanced logger
advanced_logger = AdvancedLogger()

# Decorators
def log_function_call(level: LogLevel = LogLevel.DEBUG, category: LogCategory = LogCategory.SYSTEM):
    """Fonksiyon çağrısını logla"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            function_name = f"{func.__module__}.{func.__name__}"
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                advanced_logger.log(
                    level,
                    category,
                    f"Function {function_name} completed successfully",
                    data={
                        'function': function_name,
                        'duration': duration,
                        'args_count': len(args),
                        'kwargs_count': len(kwargs)
                    },
                    tags=['function_call', 'success']
                )
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                
                advanced_logger.log(
                    LogLevel.ERROR,
                    category,
                    f"Function {function_name} failed",
                    data={
                        'function': function_name,
                        'duration': duration,
                        'error': str(e),
                        'args_count': len(args),
                        'kwargs_count': len(kwargs)
                    },
                    tags=['function_call', 'error'],
                    exception=e
                )
                
                raise
        
        return wrapper
    return decorator

def log_performance(category: LogCategory = LogCategory.PERFORMANCE):
    """Performans logla"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            function_name = f"{func.__module__}.{func.__name__}"
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                advanced_logger.performance(
                    category,
                    f"Performance: {function_name}",
                    data={
                        'function': function_name,
                        'duration': duration,
                        'args_count': len(args),
                        'kwargs_count': len(kwargs)
                    },
                    tags=['performance', 'function']
                )
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                
                advanced_logger.error(
                    category,
                    f"Performance error: {function_name}",
                    data={
                        'function': function_name,
                        'duration': duration,
                        'error': str(e)
                    },
                    tags=['performance', 'error'],
                    exception=e
                )
                
                raise
        
        return wrapper
    return decorator

@contextmanager
def log_context(**kwargs):
    """Log context manager"""
    context = advanced_logger.create_context(**kwargs)
    advanced_logger.push_context(context)
    
    try:
        yield context
    finally:
        advanced_logger.pop_context()

# Export commonly used functions
def get_advanced_logger() -> AdvancedLogger:
    """Advanced logger al"""
    return advanced_logger

def log_debug(category: LogCategory, message: str, **kwargs):
    """Debug log"""
    advanced_logger.debug(category, message, **kwargs)

def log_info(category: LogCategory, message: str, **kwargs):
    """Info log"""
    advanced_logger.info(category, message, **kwargs)

def log_warning(category: LogCategory, message: str, **kwargs):
    """Warning log"""
    advanced_logger.warning(category, message, **kwargs)

def log_error(category: LogCategory, message: str, **kwargs):
    """Error log"""
    advanced_logger.error(category, message, **kwargs)

def log_critical(category: LogCategory, message: str, **kwargs):
    """Critical log"""
    advanced_logger.critical(category, message, **kwargs)

def log_performance_event(category: LogCategory, message: str, **kwargs):
    """Performance log"""
    advanced_logger.performance(category, message, **kwargs)

def log_security_event(category: LogCategory, message: str, **kwargs):
    """Security log"""
    advanced_logger.security(category, message, **kwargs)

def log_business_event(category: LogCategory, message: str, **kwargs):
    """Business log"""
    advanced_logger.business(category, message, **kwargs)

def log_audit_event(category: LogCategory, message: str, **kwargs):
    """Audit log"""
    advanced_logger.audit(category, message, **kwargs)
