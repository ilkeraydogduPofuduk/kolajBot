"""
Enterprise Security Middleware
Kurumsal seviyede güvenlik kontrolleri
"""

import time
import hashlib
import hmac
import json
from typing import Dict, Any, Optional, List
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from core.logging import get_logger
from datetime import datetime, timedelta

logger = get_logger('enterprise_security')

class EnterpriseSecurityMiddleware:
    """Enterprise security middleware sınıfı"""
    
    def __init__(self):
        self.security_config = {
            'max_failed_attempts': 5,
            'lockout_duration': 900,  # 15 dakika
            'session_timeout': 3600,  # 1 saat
            'max_concurrent_sessions': 3,
            'api_key_rotation_days': 30,
            'password_policy': {
                'min_length': 8,
                'require_uppercase': True,
                'require_lowercase': True,
                'require_numbers': True,
                'require_special': True
            }
        }
        
        # Güvenlik durumu
        self.failed_attempts: Dict[str, int] = {}
        self.locked_accounts: Dict[str, float] = {}
        self.active_sessions: Dict[str, List[str]] = {}
        self.security_events: List[Dict[str, Any]] = []
        
        # API anahtarları
        self.api_keys: Dict[str, Dict[str, Any]] = {}
        
        # Güvenlik olayları
        self.security_thresholds = {
            'high_risk': 0.9,
            'medium_risk': 0.6,
            'low_risk': 0.3
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

    def get_user_agent(self, request: Request) -> str:
        """User agent al"""
        return request.headers.get('User-Agent', '')

    def calculate_risk_score(self, request: Request, user_id: Optional[int] = None) -> float:
        """Risk skoru hesapla"""
        risk_score = 0.0
        
        # IP riski
        client_ip = self.get_client_ip(request)
        if client_ip in self.failed_attempts:
            risk_score += 0.3
        
        if client_ip in self.locked_accounts:
            risk_score += 0.5
        
        # User agent riski
        user_agent = self.get_user_agent(request)
        if not user_agent or len(user_agent) < 5:
            risk_score += 0.2
        
        # Endpoint riski
        path = request.url.path.lower()
        high_risk_endpoints = ['/admin', '/api/auth', '/api/users']
        if any(endpoint in path for endpoint in high_risk_endpoints):
            risk_score += 0.2
        
        # HTTP method riski
        if request.method in ['DELETE', 'PUT', 'PATCH']:
            risk_score += 0.1
        
        # Kullanıcı riski
        if user_id:
            if user_id in self.active_sessions:
                session_count = len(self.active_sessions[user_id])
                if session_count > self.security_config['max_concurrent_sessions']:
                    risk_score += 0.3
        
        return min(1.0, risk_score)

    def log_security_event(self, event_type: str, details: Dict[str, Any], risk_level: str = 'medium'):
        """Güvenlik olayını logla"""
        event = {
            'timestamp': datetime.now().isoformat(),
            'event_type': event_type,
            'details': details,
            'risk_level': risk_level
        }
        
        self.security_events.append(event)
        
        # Son 1000 olayı tut
        if len(self.security_events) > 1000:
            self.security_events = self.security_events[-1000:]
        
        logger.warning(f"Security event: {event_type} - {risk_level} risk", extra=event)

    def check_account_lockout(self, identifier: str) -> bool:
        """Hesap kilidi kontrolü"""
        if identifier in self.locked_accounts:
            if time.time() < self.locked_accounts[identifier]:
                return True
            else:
                del self.locked_accounts[identifier]
                del self.failed_attempts[identifier]
        return False

    def handle_failed_attempt(self, identifier: str):
        """Başarısız deneme işle"""
        if identifier not in self.failed_attempts:
            self.failed_attempts[identifier] = 0
        
        self.failed_attempts[identifier] += 1
        
        if self.failed_attempts[identifier] >= self.security_config['max_failed_attempts']:
            self.locked_accounts[identifier] = time.time() + self.security_config['lockout_duration']
            
            self.log_security_event(
                'account_locked',
                {'identifier': identifier, 'attempts': self.failed_attempts[identifier]},
                'high'
            )

    def validate_api_key(self, api_key: str) -> bool:
        """API anahtarı doğrulama"""
        if api_key not in self.api_keys:
            return False
        
        key_info = self.api_keys[api_key]
        
        # Süre kontrolü
        if key_info.get('expires_at'):
            if time.time() > key_info['expires_at']:
                return False
        
        # Kullanım limiti kontrolü
        if key_info.get('usage_count', 0) >= key_info.get('usage_limit', 1000):
            return False
        
        # Kullanım sayısını artır
        self.api_keys[api_key]['usage_count'] = key_info.get('usage_count', 0) + 1
        
        return True

    def generate_api_key(self, user_id: int, permissions: List[str]) -> str:
        """API anahtarı oluştur"""
        key_data = {
            'user_id': user_id,
            'permissions': permissions,
            'created_at': time.time(),
            'expires_at': time.time() + (self.security_config['api_key_rotation_days'] * 24 * 3600),
            'usage_count': 0,
            'usage_limit': 1000
        }
        
        # Anahtar oluştur
        key_string = f"{user_id}:{time.time()}:{hashlib.sha256(str(key_data).encode()).hexdigest()}"
        api_key = hashlib.sha256(key_string.encode()).hexdigest()
        
        self.api_keys[api_key] = key_data
        
        return api_key

    def check_session_security(self, user_id: int, session_id: str) -> bool:
        """Oturum güvenliği kontrolü"""
        if user_id not in self.active_sessions:
            self.active_sessions[user_id] = []
        
        # Eski oturumları temizle
        current_time = time.time()
        self.active_sessions[user_id] = [
            sid for sid in self.active_sessions[user_id]
            if current_time - sid.split(':')[1] < self.security_config['session_timeout']
        ]
        
        # Yeni oturum ekle
        if session_id not in self.active_sessions[user_id]:
            self.active_sessions[user_id].append(f"{session_id}:{current_time}")
        
        # Maksimum oturum kontrolü
        if len(self.active_sessions[user_id]) > self.security_config['max_concurrent_sessions']:
            # En eski oturumu kaldır
            self.active_sessions[user_id] = self.active_sessions[user_id][-self.security_config['max_concurrent_sessions']:]
            return False
        
        return True

    def get_security_status(self) -> Dict[str, Any]:
        """Güvenlik durumu"""
        current_time = time.time()
        
        # Aktif kilidi olan hesaplar
        locked_accounts = len([
            account for account, lock_time in self.locked_accounts.items()
            if current_time < lock_time
        ])
        
        # Başarısız denemeler
        failed_attempts = sum(self.failed_attempts.values())
        
        # Aktif oturumlar
        active_sessions = sum(len(sessions) for sessions in self.active_sessions.values())
        
        # Son güvenlik olayları
        recent_events = [
            event for event in self.security_events
            if datetime.fromisoformat(event['timestamp']) > datetime.now() - timedelta(hours=24)
        ]
        
        return {
            'locked_accounts': locked_accounts,
            'failed_attempts': failed_attempts,
            'active_sessions': active_sessions,
            'recent_events': len(recent_events),
            'high_risk_events': len([e for e in recent_events if e['risk_level'] == 'high']),
            'api_keys_active': len(self.api_keys),
            'timestamp': datetime.now().isoformat()
        }

    def cleanup_expired_data(self):
        """Süresi dolmuş verileri temizle"""
        current_time = time.time()
        
        # Süresi dolmuş API anahtarları
        expired_keys = [
            key for key, info in self.api_keys.items()
            if info.get('expires_at', 0) < current_time
        ]
        
        for key in expired_keys:
            del self.api_keys[key]
        
        # Eski güvenlik olayları
        cutoff_time = datetime.now() - timedelta(days=30)
        self.security_events = [
            event for event in self.security_events
            if datetime.fromisoformat(event['timestamp']) > cutoff_time
        ]

# Singleton instance
enterprise_security = EnterpriseSecurityMiddleware()

async def enterprise_security_middleware(request: Request, call_next):
    """Enterprise security middleware"""
    try:
        # OPTIONS isteklerini bypass et (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # İstemci bilgilerini al
        client_ip = enterprise_security.get_client_ip(request)
        user_agent = enterprise_security.get_user_agent(request)
        
        # Risk skoru hesapla
        risk_score = enterprise_security.calculate_risk_score(request)
        
        # Yüksek risk kontrolü
        if risk_score > enterprise_security.security_thresholds['high_risk']:
            enterprise_security.log_security_event(
                'high_risk_request',
                {
                    'ip': client_ip,
                    'path': request.url.path,
                    'method': request.method,
                    'risk_score': risk_score
                },
                'high'
            )
            
            return JSONResponse(
                status_code=403,
                content={"detail": "Request blocked due to high security risk"}
            )
        
        # Hesap kilidi kontrolü
        if enterprise_security.check_account_lockout(client_ip):
            return JSONResponse(
                status_code=423,
                content={"detail": "Account temporarily locked due to multiple failed attempts"}
            )
        
        # API anahtarı kontrolü (eğer varsa)
        api_key = request.headers.get('X-API-Key')
        if api_key and not enterprise_security.validate_api_key(api_key):
            enterprise_security.handle_failed_attempt(client_ip)
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid API key"}
            )
        
        # İsteği işle
        response = await call_next(request)
        
        # Güvenlik header'larını ekle
        response.headers["X-Security-Risk"] = str(risk_score)
        response.headers["X-Security-Timestamp"] = datetime.now().isoformat()
        
        return response
        
    except Exception as e:
        logger.error(f"Enterprise security middleware error: {e}")
        return await call_next(request)