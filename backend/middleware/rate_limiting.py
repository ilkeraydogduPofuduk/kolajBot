"""
Rate Limiting Middleware
API isteklerini sınırlayan middleware
"""

import time
from typing import Dict, Any, Optional
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from core.logging import get_logger

logger = get_logger('rate_limiting')

class RateLimiter:
    """Rate limiter sınıfı"""
    
    def __init__(self):
        self.requests: Dict[str, list] = {}
        self.blocked_ips: Dict[str, float] = {}
        
        # Rate limit ayarları (development için gevşetildi)
        self.default_limits = {
            'auth': {'requests': 50, 'window': 60},  # 50 istek/dakika
            'api': {'requests': 1000, 'window': 60},  # 1000 istek/dakika
            'upload': {'requests': 100, 'window': 60},  # 100 istek/dakika
            'template': {'requests': 200, 'window': 60},  # 200 istek/dakika
            'default': {'requests': 500, 'window': 60}  # 500 istek/dakika
        }
        
        # IP bazlı limitler
        self.ip_limits: Dict[str, Dict[str, Any]] = {}
        
        # Kullanıcı bazlı limitler
        self.user_limits: Dict[int, Dict[str, Any]] = {}

    def get_client_ip(self, request: Request) -> str:
        """İstemci IP adresini al"""
        # X-Forwarded-For header'ını kontrol et
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        # X-Real-IP header'ını kontrol et
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        # Client host
        return request.client.host if request.client else 'unknown'

    def get_rate_limit_key(self, request: Request, user_id: Optional[int] = None) -> str:
        """Rate limit anahtarı oluştur"""
        client_ip = self.get_client_ip(request)
        
        if user_id:
            return f"user_{user_id}"
        else:
            return f"ip_{client_ip}"

    def get_rate_limit_config(self, endpoint: str) -> Dict[str, int]:
        """Endpoint için rate limit konfigürasyonu al"""
        # Endpoint'e göre limit belirle
        if '/auth/' in endpoint:
            return self.default_limits['auth']
        elif '/upload' in endpoint:
            return self.default_limits['upload']
        elif '/template' in endpoint:
            return self.default_limits['template']
        elif '/api/' in endpoint:
            return self.default_limits['api']
        else:
            return self.default_limits['default']

    def is_rate_limited(self, key: str, limit_config: Dict[str, int]) -> bool:
        """Rate limit kontrolü"""
        current_time = time.time()
        window = limit_config['window']
        max_requests = limit_config['requests']
        
        # İstek geçmişini al
        if key not in self.requests:
            self.requests[key] = []
        
        # Eski istekleri temizle
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if current_time - req_time < window
        ]
        
        # Limit kontrolü
        if len(self.requests[key]) >= max_requests:
            return True
        
        # Yeni isteği ekle
        self.requests[key].append(current_time)
        return False

    def get_remaining_requests(self, key: str, limit_config: Dict[str, int]) -> int:
        """Kalan istek sayısını al"""
        current_time = time.time()
        window = limit_config['window']
        max_requests = limit_config['requests']
        
        if key not in self.requests:
            return max_requests
        
        # Eski istekleri temizle
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if current_time - req_time < window
        ]
        
        return max(0, max_requests - len(self.requests[key]))

    def get_reset_time(self, key: str, limit_config: Dict[str, int]) -> float:
        """Rate limit sıfırlanma zamanını al"""
        if key not in self.requests or not self.requests[key]:
            return time.time()
        
        oldest_request = min(self.requests[key])
        return oldest_request + limit_config['window']

    def block_ip(self, ip: str, duration: int = 300):
        """IP'yi geçici olarak engelle"""
        self.blocked_ips[ip] = time.time() + duration
        logger.warning(f"IP blocked: {ip} for {duration} seconds")

    def is_ip_blocked(self, ip: str) -> bool:
        """IP engelli mi?"""
        if ip in self.blocked_ips:
            if time.time() < self.blocked_ips[ip]:
                return True
            else:
                del self.blocked_ips[ip]
        return False

    def unblock_ip(self, ip: str):
        """IP engelini kaldır"""
        if ip in self.blocked_ips:
            del self.blocked_ips[ip]
            logger.info(f"IP unblocked: {ip}")

    def get_stats(self) -> Dict[str, Any]:
        """Rate limiter istatistiklerini al"""
        current_time = time.time()
        
        # Aktif istek sayıları
        active_requests = {}
        for key, requests in self.requests.items():
            active_requests[key] = len([
                req_time for req_time in requests
                if current_time - req_time < 60  # Son 1 dakika
            ])
        
        return {
            'total_keys': len(self.requests),
            'blocked_ips': len(self.blocked_ips),
            'active_requests': active_requests,
            'memory_usage': sum(len(requests) for requests in self.requests.values())
        }

    def cleanup_old_requests(self):
        """Eski istekleri temizle"""
        current_time = time.time()
        cleanup_threshold = 3600  # 1 saat
        
        keys_to_remove = []
        for key, requests in self.requests.items():
            # Eski istekleri temizle
            self.requests[key] = [
                req_time for req_time in requests
                if current_time - req_time < cleanup_threshold
            ]
            
            # Boş anahtarları sil
            if not self.requests[key]:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self.requests[key]
        
        # Eski engelli IP'leri temizle
        expired_ips = [
            ip for ip, block_time in self.blocked_ips.items()
            if current_time > block_time
        ]
        
        for ip in expired_ips:
            del self.blocked_ips[ip]

# Singleton instance
rate_limiter = RateLimiter()

async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware"""
    try:
        # DEVELOPMENT: Rate limiting disabled
        return await call_next(request)
        
        # OPTIONS isteklerini bypass et (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # İstemci IP'sini al
        client_ip = rate_limiter.get_client_ip(request)
        
        # IP engelli mi kontrol et
        if rate_limiter.is_ip_blocked(client_ip):
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "IP address is temporarily blocked",
                    "retry_after": 300
                },
                headers={"Retry-After": "300"}
            )
        
        # Rate limit anahtarı oluştur
        rate_limit_key = rate_limiter.get_rate_limit_key(request)
        
        # Rate limit konfigürasyonu al
        limit_config = rate_limiter.get_rate_limit_config(request.url.path)
        
        # Rate limit kontrolü
        if rate_limiter.is_rate_limited(rate_limit_key, limit_config):
            # Kalan istek sayısını al
            remaining = rate_limiter.get_remaining_requests(rate_limit_key, limit_config)
            reset_time = rate_limiter.get_reset_time(rate_limit_key, limit_config)
            
            # IP'yi geçici olarak engelle (çok fazla istek)
            if remaining <= 0:
                rate_limiter.block_ip(client_ip, 300)
            
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded",
                    "retry_after": int(reset_time - time.time()),
                    "remaining": remaining
                },
                headers={
                    "Retry-After": str(int(reset_time - time.time())),
                    "X-RateLimit-Limit": str(limit_config['requests']),
                    "X-RateLimit-Remaining": str(remaining),
                    "X-RateLimit-Reset": str(int(reset_time))
                }
            )
        
        # İsteği işle
        response = await call_next(request)
        
        # Rate limit header'larını ekle
        remaining = rate_limiter.get_remaining_requests(rate_limit_key, limit_config)
        reset_time = rate_limiter.get_reset_time(rate_limit_key, limit_config)
        
        response.headers["X-RateLimit-Limit"] = str(limit_config['requests'])
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(reset_time))
        
        return response
        
    except Exception as e:
        logger.error(f"Rate limiting middleware error: {e}")
        # Hata durumunda isteği geç
        return await call_next(request)

# Rate limit decorator
def rate_limit(requests: int = 50, window: int = 60):
    """Rate limit decorator"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Request objesini bul
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if request:
                client_ip = rate_limiter.get_client_ip(request)
                rate_limit_key = rate_limiter.get_rate_limit_key(request)
                limit_config = {'requests': requests, 'window': window}
                
                if rate_limiter.is_rate_limited(rate_limit_key, limit_config):
                    raise HTTPException(
                        status_code=429,
                        detail="Rate limit exceeded"
                    )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator
