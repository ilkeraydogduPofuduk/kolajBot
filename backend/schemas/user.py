from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    role_id: int
    brand_ids: Optional[List[int]] = None

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    role_id: Optional[int] = None
    brand_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None
    send_email: Optional[bool] = True

class UserPasswordUpdate(BaseModel):
    current_password: Optional[str] = None
    new_password: str

class UserResponse(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    role_id: Optional[int] = None  # Make optional for token refresh
    role: Optional[str] = None  # Make optional for token refresh
    brand_ids: Optional[List[int]] = None
    is_active: bool
    is_2fa_enabled: bool
    must_change_password: bool = False  # İlk giriş şifre değiştirme zorunluluğu
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None  # Make optional
    
    class Config:
        from_attributes = True

class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    per_page: int
