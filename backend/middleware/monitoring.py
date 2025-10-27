"""
Monitoring Middleware
Sistem performansı ve sağlık durumu izleme
"""

import time
import psutil
import asyncio
from typing import Dict, Any, Optional
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from core.logging import get_logger
from datetime import datetime, timedelta

logger = get_logger('monitoring_middleware')

class MonitoringMiddleware:
    """Monitoring middleware sınıfı"""
    
    def __init__(self):
        self.request_stats: Dict[str, Any] = {}
        self.system_stats: Dict[str, Any] = {}
        self.health_checks: Dict[str, Any] = {}
        
        # Performans metrikleri
        self.metrics = {
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'average_response_time': 0,
            'peak_response_time': 0,
            'requests_per_minute': 0,
            'error_rate': 0
        }
        
        # Sistem kaynakları
        self.resource_limits = {
            'cpu_threshold': 80,  # %
            'memory_threshold': 80,  # %
            'disk_threshold': 90,  # %
            'response_time_threshold': 5.0  # saniye
        }

    def get_system_stats(self) -> Dict[str, Any]:
        """Sistem istatistiklerini al"""
        try:
            # CPU kullanımı
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Bellek kullanımı
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            
            # Disk kullanımı
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            
            # Ağ istatistikleri
            network = psutil.net_io_counters()
            
            # İşlem sayısı
            process_count = len(psutil.pids())
            
            return {
                'cpu_percent': cpu_percent,
                'memory_percent': memory_percent,
                'disk_percent': disk_percent,
                'network_bytes_sent': network.bytes_sent,
                'network_bytes_recv': network.bytes_recv,
                'process_count': process_count,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting system stats: {e}")
            return {}

    def update_request_stats(self, path: str, method: str, status_code: int, response_time: float):
        """İstek istatistiklerini güncelle"""
        key = f"{method}:{path}"
        
        if key not in self.request_stats:
            self.request_stats[key] = {
                'count': 0,
                'total_time': 0,
                'success_count': 0,
                'error_count': 0,
                'last_request': None
            }
        
        stats = self.request_stats[key]
        stats['count'] += 1
        stats['total_time'] += response_time
        stats['last_request'] = datetime.now().isoformat()
        
        if 200 <= status_code < 400:
            stats['success_count'] += 1
        else:
            stats['error_count'] += 1
        
        # Genel metrikleri güncelle
        self.metrics['total_requests'] += 1
        if 200 <= status_code < 400:
            self.metrics['successful_requests'] += 1
        else:
            self.metrics['failed_requests'] += 1
        
        # Ortalama yanıt süresi
        if self.metrics['total_requests'] > 0:
            self.metrics['average_response_time'] = (
                (self.metrics['average_response_time'] * (self.metrics['total_requests'] - 1) + response_time) /
                self.metrics['total_requests']
            )
        
        # Peak yanıt süresi
        if response_time > self.metrics['peak_response_time']:
            self.metrics['peak_response_time'] = response_time
        
        # Hata oranı
        self.metrics['error_rate'] = (
            self.metrics['failed_requests'] / self.metrics['total_requests'] * 100
            if self.metrics['total_requests'] > 0 else 0
        )

    def check_system_health(self) -> Dict[str, Any]:
        """Sistem sağlık durumunu kontrol et"""
        system_stats = self.get_system_stats()
        
        health_status = {
            'overall': 'healthy',
            'checks': {},
            'timestamp': datetime.now().isoformat()
        }
        
        # CPU kontrolü
        cpu_percent = system_stats.get('cpu_percent', 0)
        if cpu_percent > self.resource_limits['cpu_threshold']:
            health_status['checks']['cpu'] = {
                'status': 'critical',
                'value': cpu_percent,
                'threshold': self.resource_limits['cpu_threshold']
            }
            health_status['overall'] = 'degraded'
        else:
            health_status['checks']['cpu'] = {
                'status': 'healthy',
                'value': cpu_percent,
                'threshold': self.resource_limits['cpu_threshold']
            }
        
        # Bellek kontrolü
        memory_percent = system_stats.get('memory_percent', 0)
        if memory_percent > self.resource_limits['memory_threshold']:
            health_status['checks']['memory'] = {
                'status': 'critical',
                'value': memory_percent,
                'threshold': self.resource_limits['memory_threshold']
            }
            health_status['overall'] = 'degraded'
        else:
            health_status['checks']['memory'] = {
                'status': 'healthy',
                'value': memory_percent,
                'threshold': self.resource_limits['memory_threshold']
            }
        
        # Disk kontrolü
        disk_percent = system_stats.get('disk_percent', 0)
        if disk_percent > self.resource_limits['disk_threshold']:
            health_status['checks']['disk'] = {
                'status': 'critical',
                'value': disk_percent,
                'threshold': self.resource_limits['disk_threshold']
            }
            health_status['overall'] = 'degraded'
        else:
            health_status['checks']['disk'] = {
                'status': 'healthy',
                'value': disk_percent,
                'threshold': self.resource_limits['disk_threshold']
            }
        
        # Yanıt süresi kontrolü
        avg_response_time = self.metrics['average_response_time']
        if avg_response_time > self.resource_limits['response_time_threshold']:
            health_status['checks']['response_time'] = {
                'status': 'warning',
                'value': avg_response_time,
                'threshold': self.resource_limits['response_time_threshold']
            }
            if health_status['overall'] == 'healthy':
                health_status['overall'] = 'degraded'
        else:
            health_status['checks']['response_time'] = {
                'status': 'healthy',
                'value': avg_response_time,
                'threshold': self.resource_limits['response_time_threshold']
            }
        
        return health_status

    def get_performance_metrics(self) -> Dict[str, Any]:
        """Performans metriklerini al"""
        return {
            'metrics': self.metrics,
            'request_stats': self.request_stats,
            'system_stats': self.get_system_stats(),
            'health_status': self.check_system_health(),
            'timestamp': datetime.now().isoformat()
        }

    def cleanup_old_stats(self):
        """Eski istatistikleri temizle"""
        current_time = datetime.now()
        cleanup_threshold = timedelta(hours=24)
        
        # Eski istek istatistiklerini temizle
        keys_to_remove = []
        for key, stats in self.request_stats.items():
            if stats['last_request']:
                last_request_time = datetime.fromisoformat(stats['last_request'])
                if current_time - last_request_time > cleanup_threshold:
                    keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self.request_stats[key]

# Singleton instance
monitoring_middleware = MonitoringMiddleware()

class MonitoringMiddleware:
    """Monitoring middleware"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        """Middleware işlevi"""
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        start_time = time.time()
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                # Yanıt süresini hesapla
                response_time = time.time() - start_time
                
                # İstatistikleri güncelle
                request = Request(scope, receive)
                monitoring_middleware.update_request_stats(
                    request.url.path,
                    request.method,
                    message["status"],
                    response_time
                )
                
                # Yanıt header'larını ekle
                headers = dict(message.get("headers", []))
                headers[b"x-response-time"] = f"{response_time:.3f}s".encode()
                headers[b"x-request-id"] = f"req_{int(time.time() * 1000)}".encode()
                message["headers"] = list(headers.items())
            
            await send(message)
        
        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as e:
            # Hata durumunda da istatistikleri güncelle
            response_time = time.time() - start_time
            request = Request(scope, receive)
            monitoring_middleware.update_request_stats(
                request.url.path,
                request.method,
                500,
                response_time
            )
            
            logger.error(f"Request processing error: {e}")
            raise
    
class HealthCheckMiddleware:
    """Health check middleware"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        """Health check endpoint'i"""
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        if request.url.path == "/health":
            health_status = monitoring_middleware.check_system_health()
            
            if health_status['overall'] == 'healthy':
                response = JSONResponse(
                    status_code=200,
                    content=health_status
                )
            else:
                response = JSONResponse(
                    status_code=503,
                    content=health_status
                )
            
            await response(scope, receive, send)
            return
        
        await self.app(scope, receive, send)

class SecurityMonitoringMiddleware:
    """Güvenlik izleme middleware"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        """Güvenlik izleme"""
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        # Şüpheli aktivite kontrolü
        if self.is_suspicious_request(request):
            logger.warning(f"Suspicious request detected: {request.url.path} from {request.client.host}")
        
        await self.app(scope, receive, send)
    
    def is_suspicious_request(self, request: Request) -> bool:
        """Şüpheli istek kontrolü"""
        # Basit kontroller
        suspicious_patterns = [
            '/admin', '/wp-admin', '/phpmyadmin', '/.env',
            '/config', '/backup', '/test', '/debug'
        ]
        
        path = request.url.path.lower()
        
        # Allow image API requests (even with full paths)
        if path.startswith('/api/') and any(ext in path for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
            return False
        
        for pattern in suspicious_patterns:
            if pattern in path:
                return True
        
        return False
