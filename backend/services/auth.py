from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
from typing import Optional, Tuple
from models.user import User
# logging removed
from schemas.auth import LoginRequest, RegisterRequest
from utils.security import (
    verify_password, get_password_hash, create_access_token, create_refresh_token,
    verify_token, generate_2fa_secret, generate_2fa_qr_code, verify_2fa_code
)
import re
from config.settings import settings
# Basit doğrulama yardımcıları (dış bağımlılık olmadan)
def validate_email(email: str) -> bool:
    if not isinstance(email, str) or not email:
        return False
    # Basit e-posta doğrulama
    return re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email) is not None

def validate_password(password: str):
    if not isinstance(password, str) or len(password) < 8:
        return False, "Şifre en az 8 karakter olmalı"
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return False, "Şifre harf ve sayı içermeli"
    return True, "OK"

def validate_name(name: str) -> bool:
    if not isinstance(name, str):
        return False
    name = name.strip()
    if len(name) < 2:
        return False
    # Türkçe karakterleri de kapsayan basit isim kontrolü
    return re.match(r"^[A-Za-zÇçĞğİıÖöŞşÜü\s'-]+$", name) is not None
import redis
import json

# Initialize Redis client
try:
    redis_client = redis.from_url(settings.REDIS_URL)
    # Test connection
    redis_client.ping()
except:
    # Rate limiting will use in-memory fallback
    redis_client = None

class AuthService:
    def __init__(self, db: Session):
        self.db = db
    
    def login(self, login_data: LoginRequest, ip_address: str = None, user_agent: str = None) -> Tuple[Optional[dict], str]:
        """Authenticate user and return tokens"""
        # Check rate limiting
        if self._is_rate_limited(login_data.email):
            return None, "Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin."
        
        # Find user
        user = self.db.query(User).filter(User.email == login_data.email).first()
        if not user:
            self._record_failed_attempt(login_data.email)
            return None, "Bu e-posta adresi sistemde kayıtlı değil"
        
        # Check if user account is active
        if not user.is_active:
            return None, "Üyeliğiniz pasif durumda. Giriş sağlayamazsınız. Lütfen yönetici ile iletişime geçin."
        
        
        # Verify password
        if not verify_password(login_data.password, user.password_hash):
            self._record_failed_attempt(login_data.email)
            self._increment_failed_attempts(user)
            return None, "Şifre hatalı. Lütfen doğru şifreyi girin"
        
        # Check 2FA if enabled
        if user.is_2fa_enabled:
            if not login_data.two_fa_code:
                return None, "2FA kodu gerekli"
            
            if not verify_2fa_code(user.two_fa_secret, login_data.two_fa_code):
                self._record_failed_attempt(login_data.email)
                return None, "Geçersiz 2FA kodu"
        
        # Reset failed attempts on successful login
        user.failed_login_attempts = 0
        user.last_login = datetime.utcnow()
        self.db.commit()
        
        # Create tokens
        access_token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role_display_name})
        refresh_token = create_refresh_token({"sub": str(user.id)})
        
        # Log successful login
        self._log_audit_event(user.id, "login", ip_address, user_agent)
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "phone_number": user.phone_number,
                "role_id": user.role_id,
                "role": user.role_display_name,
                "brand_ids": user.brand_ids or [],
                "is_active": user.is_active,
                "is_2fa_enabled": user.is_2fa_enabled,
                "must_change_password": user.must_change_password,  # Şifre değiştirme zorunluluğu
                "last_login": user.last_login.isoformat() if user.last_login else None,
                "created_at": user.created_at.isoformat(),
                "updated_at": user.updated_at.isoformat()
            }
        }, "Giriş başarılı"
    
    def register(self, register_data: RegisterRequest, ip_address: str = None, user_agent: str = None) -> Tuple[Optional[dict], str]:
        """Register new user with invitation token"""
        # Validate input
        if not validate_email(register_data.email):
            return None, "Geçersiz e-posta formatı"
        
        is_valid, password_msg = validate_password(register_data.password)
        if not is_valid:
            return None, "Geçersiz şifre formatı"
        
        if not validate_name(register_data.first_name) or not validate_name(register_data.last_name):
            return None, "Geçersiz isim formatı"
        
        # Check if user already exists
        existing_user = self.db.query(User).filter(User.email == register_data.email).first()
        if existing_user:
            return None, "Bu e-posta adresi zaten kullanılıyor"
        
        # Davetiye sistemi kaldırıldığı için davetiye kontrolünü pas geç
        # Varsayılan rol ve marka atamasıyla devam et
        user = User(
            email=register_data.email,
            password_hash=get_password_hash(register_data.password),
            first_name=register_data.first_name,
            last_name=register_data.last_name,
            role=getattr(register_data, 'role', None) or 'Mağaza Çalışanı',
            brand_ids=getattr(register_data, 'brand_ids', None) or []
        )
        
        self.db.add(user)
        self.db.flush()  # Get user ID
        
        self.db.commit()
        
        # Log registration
        self._log_audit_event(user.id, "register", ip_address, user_agent)
        
        return {
            "message": "Kayıt başarılı",
            "user": {   
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role,
                "brand_ids": user.brand_ids
            }
        }, "Kayıt başarılı"
    
    def refresh_token(self, refresh_token: str) -> Tuple[Optional[dict], str]:
        """Refresh access token using refresh token"""
        payload = verify_token(refresh_token, "refresh")
        if not payload:
            return None, "Geçersiz yenileme tokeni"
        
        user_id = payload.get("sub")
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            return None, "Kullanıcı bulunamadı veya pasif"
        
        # Create new access token and refresh token
        access_token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role_display_name})
        new_refresh_token = create_refresh_token({"sub": str(user.id)})
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "phone_number": user.phone_number,
                "role_id": user.role_id,
                "role": user.role_display_name,
                "brand_ids": user.brand_ids or [],
                "is_active": user.is_active,
                "is_2fa_enabled": user.is_2fa_enabled,
                "must_change_password": user.must_change_password,
                "last_login": user.last_login,
                "created_at": user.created_at,
                "updated_at": user.updated_at
            }
        }, "Token başarıyla yenilendi"
    
    def setup_2fa(self, user_id: int) -> Tuple[Optional[dict], str]:
        """Setup 2FA for user"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return None, "Kullanıcı bulunamadı"
        
        if user.is_2fa_enabled:
            return None, "2FA zaten etkin"
        
        # Generate secret and QR code
        secret = generate_2fa_secret()
        qr_code_url = generate_2fa_qr_code(user.email, secret)
        
        # Save secret (user needs to verify before enabling)
        user.two_fa_secret = secret
        self.db.commit()
        
        return {
            "qr_code_url": qr_code_url,
            "secret": secret
        }, "2FA setup başlatıldı"
    
    def verify_2fa_setup(self, user_id: int, code: str) -> Tuple[bool, str]:
        """Verify 2FA setup with code"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.two_fa_secret:
            return False, "2FA setup başlatılmadı"
        
        if verify_2fa_code(user.two_fa_secret, code):
            user.is_2fa_enabled = True
            self.db.commit()
            return True, "2FA başarıyla etkinleştirildi"
        else:
            return False, "Geçersiz doğrulama kodu"
    
    def disable_2fa(self, user_id: int, code: str) -> Tuple[bool, str]:
        """Disable 2FA for user"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_2fa_enabled:
                return False, "2FA etkin değil"
        
        if not verify_2fa_code(user.two_fa_secret, code):
            return False, "Geçersiz doğrulama kodu"
        
        user.is_2fa_enabled = False
        user.two_fa_secret = None
        self.db.commit()
        
        return True, "2FA başarıyla devre dışı bırakıldı"
    
    def change_password(self, user_id: int, old_password: str, new_password: str) -> Tuple[bool, str]:
        """Kullanıcı şifresini değiştir"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False, "Kullanıcı bulunamadı"
        
        # Eski şifreyi kontrol et (must_change_password durumunda eski şifre kontrolü yapılmaz)
        if not user.must_change_password:
            if not verify_password(old_password, user.password_hash):
                return False, "Mevcut şifre hatalı"
        
        # Yeni şifre validasyonu
        is_valid, password_msg = validate_password(new_password)
        if not is_valid:
            return False, password_msg
        
        # Şifreyi güncelle
        user.password_hash = get_password_hash(new_password)
        user.must_change_password = False  # Şifre değiştirildi, artık zorunluluk yok
        self.db.commit()
        
        return True, "Şifre başarıyla değiştirildi"
    
    def force_change_password(self, user_id: int, new_password: str) -> Tuple[bool, str]:
        """İlk giriş için şifre değiştirme (eski şifre kontrolü olmadan)"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False, "Kullanıcı bulunamadı"
        
        # Yeni şifre validasyonu
        is_valid, password_msg = validate_password(new_password)
        if not is_valid:
            return False, password_msg
        
        # Şifreyi güncelle
        user.password_hash = get_password_hash(new_password)
        user.must_change_password = False  # Şifre değiştirildi
        self.db.commit()
        
        return True, "Şifre başarıyla değiştirildi"
    
    def _is_rate_limited(self, email: str) -> bool:
        """Check if email is rate limited"""    
        # Temporarily disable rate limiting when Redis is not available
        return False
    
    def _record_failed_attempt(self, email: str):
        """Record failed login attempt"""
        # Temporarily disable rate limiting when Redis is not available
        pass
    
    def _increment_failed_attempts(self, user: User):
        """Increment failed attempts in database"""
        user.failed_login_attempts += 1
        
        # 5 yanlış deneme sonrası hesabı pasife al
        if user.failed_login_attempts >= 5:
            user.is_active = False
            user.failed_login_attempts = 0  # Sayaç sıfırla
        
        self.db.commit()
    
    def _log_audit_event(self, user_id: int, action: str, ip_address: str = None, user_agent: str = None):
        """Logging disabled"""
        return
    
    def get_user_permissions(self, user_id: int) -> list:
        """Get user permissions based on their role"""
        try:
            # Get user first
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return []
            
            # Get permissions through role_permissions relationship
            permissions = []
            for role_permission in user.role.role_permissions:
                if role_permission.permission.is_active:
                    permissions.append(role_permission.permission.name)
            
            return permissions
        except Exception as e:
            # Log error and return empty list
            return []