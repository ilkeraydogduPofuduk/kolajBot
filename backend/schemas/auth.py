from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from .user import UserResponse

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    two_fa_code: Optional[str] = None

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    invitation_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TwoFASetupResponse(BaseModel):
    qr_code_url: str
    secret: str

class TwoFAVerifyRequest(BaseModel):
    code: str

class ChangePasswordRequest(BaseModel):
    old_password: Optional[str] = None  # İlk giriş için eski şifre gerekmez
    new_password: str

class ForceChangePasswordRequest(BaseModel):
    new_password: str

# WhatsApp request models removed
