"""
Security Middleware
Güvenlik header'ları ve güvenlik kontrolleri
"""

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from core.logging import get_logger
import time
import hashlib
import hmac
from typing import Dict, Any, Optional

logger = get_logger('security_middleware')

class SecurityMiddleware:
    """Güvenlik middleware sınıfı"""
    
    def __init__(self):
        self.blocked_ips: Dict[str, float] = {}
        self.suspicious_ips: Dict[str, int] = {}
        self.request_patterns: Dict[str, list] = {}
        
        # Güvenlik ayarları
        self.security_config = {
            'max_requests_per_minute': 100,
            'block_duration': 300,  # 5 dakika
            'suspicious_threshold': 10,
            'allowed_user_agents': [
                'Mozilla', 'Chrome', 'Safari', 'Firefox', 'Edge', 'python-requests'
            ],
            'blocked_user_agents': [
                'curl', 'wget', 'bot', 'crawler'
            ]
        }

    def get_client_ip(self, request: Request) -> str:
        """İstemci IP adresini al"""
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else 'unknown'

    def is_ip_blocked(self, ip: str) -> bool:
        """IP engelli mi?"""
        if ip in self.blocked_ips:
            if time.time() < self.blocked_ips[ip]:
                return True
            else:
                del self.blocked_ips[ip]
        return False

    def block_ip(self, ip: str, duration: int = None):
        """IP'yi engelle"""
        if duration is None:
            duration = self.security_config['block_duration']
        
        self.blocked_ips[ip] = time.time() + duration
        logger.warning(f"IP blocked: {ip} for {duration} seconds")

    def check_user_agent(self, user_agent: str) -> bool:
        """User agent kontrolü"""
        if not user_agent:
            return False
        
        user_agent_lower = user_agent.lower()
        
        # Engelli user agent'ları kontrol et
        for blocked_ua in self.security_config['blocked_user_agents']:
            if blocked_ua in user_agent_lower:
                return False
        
        # İzin verilen user agent'ları kontrol et
        for allowed_ua in self.security_config['allowed_user_agents']:
            if allowed_ua in user_agent_lower:
                return True
        
        # Default olarak izin ver (geliştirme ortamı için)
        # Production'da daha sıkı kontrol yapılabilir
        return True

    def check_request_pattern(self, ip: str, path: str) -> bool:
        """İstek deseni kontrolü"""
        current_time = time.time()
        key = f"{ip}:{path}"
        
        if key not in self.request_patterns:
            self.request_patterns[key] = []
        
        # Eski istekleri temizle
        self.request_patterns[key] = [
            req_time for req_time in self.request_patterns[key]
            if current_time - req_time < 60
        ]
        
        # Şüpheli aktivite kontrolü
        if len(self.request_patterns[key]) > self.security_config['max_requests_per_minute']:
            self.suspicious_ips[ip] = self.suspicious_ips.get(ip, 0) + 1
            
            if self.suspicious_ips[ip] >= self.security_config['suspicious_threshold']:
                self.block_ip(ip)
                return False
        
        # Yeni isteği ekle
        self.request_patterns[key].append(current_time)
        return True

    def add_security_headers(self, response: Response) -> Response:
        """Güvenlik header'larını ekle"""
        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https:; "
            "frame-ancestors 'none';"
        )
        
        # X-Frame-Options
        response.headers["X-Frame-Options"] = "DENY"
        
        # X-Content-Type-Options
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # X-XSS-Protection
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions Policy
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "speaker=()"
        )
        
        # Strict-Transport-Security (HTTPS için)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response

    def validate_request(self, request: Request) -> bool:
        """İstek doğrulama"""
        # IP kontrolü
        client_ip = self.get_client_ip(request)
        if self.is_ip_blocked(client_ip):
            return False
        
        # User agent kontrolü
        user_agent = request.headers.get('User-Agent', '')
        if not self.check_user_agent(user_agent):
            logger.warning(f"Suspicious user agent: {user_agent} from {client_ip}")
            return False
        
        # İstek deseni kontrolü
        if not self.check_request_pattern(client_ip, request.url.path):
            return False
        
        return True

    def get_stats(self) -> Dict[str, Any]:
        """Güvenlik istatistiklerini al"""
        current_time = time.time()
        
        # Aktif engelli IP'ler
        active_blocked = len([
            ip for ip, block_time in self.blocked_ips.items()
            if current_time < block_time
        ])
        
        # Şüpheli IP'ler
        suspicious_count = len(self.suspicious_ips)
        
        return {
            'blocked_ips': active_blocked,
            'suspicious_ips': suspicious_count,
            'total_patterns': len(self.request_patterns)
        }

# Singleton instance
security_middleware = SecurityMiddleware()

async def security_headers_middleware(request: Request, call_next):
    """Güvenlik header'ları middleware"""
    try:
        # OPTIONS isteklerini bypass et (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # İstek doğrulama
        if security_middleware and not security_middleware.validate_request(request):
            return JSONResponse(
                status_code=403,
                content={"detail": "Request blocked by security policy"}
            )
        
        # İsteği işle
        response = await call_next(request)
        
        # Güvenlik header'larını ekle
        if security_middleware:
            response = security_middleware.add_security_headers(response)
        
        return response
        
    except Exception as e:
        logger.error(f"Security middleware error: {e}")
        return await call_next(request)
