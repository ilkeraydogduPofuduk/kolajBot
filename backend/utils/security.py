from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from config.settings import settings
import secrets
import pyotp
import qrcode
import io
import base64
from cryptography.fernet import Fernet
import os

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_token(token: str, token_type: str = "access") -> Optional[dict]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != token_type:
            return None
        return payload
    except JWTError:
        return None

def generate_invitation_token() -> str:
    """Generate a secure invitation token"""
    return secrets.token_urlsafe(32)

def generate_2fa_secret() -> str:
    """Generate a 2FA secret"""
    return pyotp.random_base32()

def generate_2fa_qr_code(email: str, secret: str) -> str:
    """Generate QR code for 2FA setup"""
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=email,
        issuer_name="BrandHub AI"
    )
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64 string
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"

def verify_2fa_code(secret: str, code: str) -> bool:
    """Verify 2FA code"""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)

# Encryption for sensitive settings
def get_encryption_key() -> bytes:
    """Get or create encryption key for sensitive data"""
    key_file = "encryption.key"
    
    if os.path.exists(key_file):
        with open(key_file, "rb") as f:
            return f.read()
    else:
        # Generate new key
        key = Fernet.generate_key()
        with open(key_file, "wb") as f:
            f.write(key)
        return key

def encrypt_sensitive_data(data: str) -> str:
    """Encrypt sensitive data"""
    if not data:
        return data
        
    key = get_encryption_key()
    f = Fernet(key)
    encrypted_data = f.encrypt(data.encode())
    return base64.b64encode(encrypted_data).decode()

def decrypt_sensitive_data(encrypted_data: str) -> str:
    """Decrypt sensitive data"""
    if not encrypted_data:
        return encrypted_data
        
    try:
        key = get_encryption_key()
        f = Fernet(key)
        decoded_data = base64.b64decode(encrypted_data.encode())
        decrypted_data = f.decrypt(decoded_data)
        return decrypted_data.decode()
    except Exception as e:
        print(f"Decryption error: {e}")
        return encrypted_data  # Return as-is if decryption fails
