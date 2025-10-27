"""
Logging Service
Merkezi loglama servisi
"""

import logging
import logging.handlers
import os
import json
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

class LoggingService:
    """Merkezi loglama servisi"""
    
    def __init__(self):
        self.loggers: Dict[str, logging.Logger] = {}
        self.log_dir = Path("logs")
        self.log_dir.mkdir(exist_ok=True)
        
        # Log formatları
        self.formatters = {
            'standard': logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            ),
            'detailed': logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
            ),
            'json': logging.Formatter(
                '%(message)s'
            )
        }
        
        # Log seviyeleri
        self.log_levels = {
            'DEBUG': logging.DEBUG,
            'INFO': logging.INFO,
            'WARNING': logging.WARNING,
            'ERROR': logging.ERROR,
            'CRITICAL': logging.CRITICAL
        }
    
    def setup_logging(self, level: str = 'INFO', log_to_file: bool = True, log_to_console: bool = True):
        """Loglama sistemini kur"""
        try:
            # Ana logger'ı ayarla
            root_logger = logging.getLogger()
            root_logger.setLevel(self.log_levels.get(level, logging.INFO))
            
            # Mevcut handler'ları temizle
            for handler in root_logger.handlers[:]:
                root_logger.removeHandler(handler)
            
            # Console handler
            if log_to_console:
                console_handler = logging.StreamHandler()
                console_handler.setFormatter(self.formatters['standard'])
                root_logger.addHandler(console_handler)
            
            # File handler
            if log_to_file:
                # Genel log dosyası
                general_handler = logging.handlers.RotatingFileHandler(
                    self.log_dir / 'app.log',
                    maxBytes=10*1024*1024,  # 10MB
                    backupCount=5
                )
                general_handler.setFormatter(self.formatters['detailed'])
                root_logger.addHandler(general_handler)
                
                # Hata log dosyası
                error_handler = logging.handlers.RotatingFileHandler(
                    self.log_dir / 'error.log',
                    maxBytes=5*1024*1024,  # 5MB
                    backupCount=3
                )
                error_handler.setLevel(logging.ERROR)
                error_handler.setFormatter(self.formatters['detailed'])
                root_logger.addHandler(error_handler)
                
                # JSON log dosyası (analiz için)
                json_handler = logging.handlers.RotatingFileHandler(
                    self.log_dir / 'app.json',
                    maxBytes=20*1024*1024,  # 20MB
                    backupCount=10
                )
                json_handler.setFormatter(self.formatters['json'])
                root_logger.addHandler(json_handler)
            
            # Uyarı mesajı
            root_logger.info("Logging system initialized successfully")
            
        except Exception as e:
            print(f"Error setting up logging: {e}")
    
    def get_logger(self, name: str) -> logging.Logger:
        """Logger al"""
        if name not in self.loggers:
            self.loggers[name] = logging.getLogger(name)
        return self.loggers[name]
    
    def log_structured(self, logger_name: str, level: str, message: str, extra: Optional[Dict[str, Any]] = None):
        """Yapılandırılmış log"""
        logger = self.get_logger(logger_name)
        
        log_data = {
            'timestamp': datetime.now().isoformat(),
            'level': level,
            'logger': logger_name,
            'message': message,
            'extra': extra or {}
        }
        
        if level.upper() == 'DEBUG':
            logger.debug(json.dumps(log_data))
        elif level.upper() == 'INFO':
            logger.info(json.dumps(log_data))
        elif level.upper() == 'WARNING':
            logger.warning(json.dumps(log_data))
        elif level.upper() == 'ERROR':
            logger.error(json.dumps(log_data))
        elif level.upper() == 'CRITICAL':
            logger.critical(json.dumps(log_data))
    
    def log_performance(self, operation: str, duration: float, details: Optional[Dict[str, Any]] = None):
        """Performans logu"""
        self.log_structured(
            'performance',
            'INFO',
            f"Performance: {operation}",
            {
                'operation': operation,
                'duration': duration,
                'details': details or {}
            }
        )
    
    def log_security(self, event: str, details: Optional[Dict[str, Any]] = None):
        """Güvenlik logu"""
        self.log_structured(
            'security',
            'WARNING',
            f"Security event: {event}",
            {
                'event': event,
                'details': details or {}
            }
        )
    
    def log_api_request(self, method: str, path: str, status_code: int, duration: float, user_id: Optional[int] = None):
        """API istek logu"""
        self.log_structured(
            'api',
            'INFO',
            f"API Request: {method} {path}",
            {
                'method': method,
                'path': path,
                'status_code': status_code,
                'duration': duration,
                'user_id': user_id
            }
        )
    
    def log_database_query(self, query: str, duration: float, rows_affected: int = 0):
        """Veritabanı sorgu logu"""
        self.log_structured(
            'database',
            'DEBUG',
            f"Database Query: {query[:100]}...",
            {
                'query': query,
                'duration': duration,
                'rows_affected': rows_affected
            }
        )
    
    def log_upload(self, filename: str, size: int, user_id: int, success: bool, error: Optional[str] = None):
        """Upload logu"""
        self.log_structured(
            'upload',
            'INFO' if success else 'ERROR',
            f"Upload: {filename}",
            {
                'filename': filename,
                'size': size,
                'user_id': user_id,
                'success': success,
                'error': error
            }
        )
    
    def log_ocr_processing(self, filename: str, success: bool, confidence: Optional[float] = None, error: Optional[str] = None):
        """OCR işlem logu"""
        self.log_structured(
            'ocr',
            'INFO' if success else 'ERROR',
            f"OCR Processing: {filename}",
            {
                'filename': filename,
                'success': success,
                'confidence': confidence,
                'error': error
            }
        )
    
    def log_template_generation(self, template_id: int, product_id: int, success: bool, error: Optional[str] = None):
        """Şablon oluşturma logu"""
        self.log_structured(
            'template',
            'INFO' if success else 'ERROR',
            f"Template Generation: {template_id}",
            {
                'template_id': template_id,
                'product_id': product_id,
                'success': success,
                'error': error
            }
        )
    
    def get_log_stats(self) -> Dict[str, Any]:
        """Log istatistiklerini al"""
        try:
            stats = {
                'total_loggers': len(self.loggers),
                'log_files': [],
                'log_dir': str(self.log_dir)
            }
            
            # Log dosyalarını listele
            if self.log_dir.exists():
                for log_file in self.log_dir.glob('*.log'):
                    stats['log_files'].append({
                        'name': log_file.name,
                        'size': log_file.stat().st_size,
                        'modified': datetime.fromtimestamp(log_file.stat().st_mtime).isoformat()
                    })
            
            return stats
            
        except Exception as e:
            return {'error': str(e)}
    
    def cleanup_old_logs(self, days: int = 30):
        """Eski log dosyalarını temizle"""
        try:
            cutoff_time = datetime.now().timestamp() - (days * 24 * 3600)
            
            for log_file in self.log_dir.glob('*.log*'):
                if log_file.stat().st_mtime < cutoff_time:
                    log_file.unlink()
                    self.log_structured(
                        'system',
                        'INFO',
                        f"Cleaned up old log file: {log_file.name}"
                    )
            
        except Exception as e:
            self.log_structured(
                'system',
                'ERROR',
                f"Error cleaning up logs: {e}"
            )

# Singleton instance
logging_service = LoggingService()
