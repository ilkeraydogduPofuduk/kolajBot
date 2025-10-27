from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from database import get_db
from schemas.auth import (
    LoginRequest, RegisterRequest, TokenResponse, RefreshTokenRequest,
    TwoFASetupResponse, TwoFAVerifyRequest, ChangePasswordRequest, ForceChangePasswordRequest
)
from services.auth import AuthService
from dependencies.auth import get_current_active_user
from models.user import User
# Simple rate limiting without slowapi
import time
router = APIRouter()

@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """User login with email and password"""
    auth_service = AuthService(db)
    
    # Get client IP and user agent
    ip_address = request.client.host
    user_agent = request.headers.get("user-agent")
    
    result, message = auth_service.login(login_data, ip_address, user_agent)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=message
        )
    
    return result

@router.post("/register")
# @limiter.limit("3/minute")
async def register(
    request: Request,
    register_data: RegisterRequest,
    db: Session = Depends(get_db)
):
    """User registration with invitation token"""
    auth_service = AuthService(db)
    
    # Get client IP and user agent
    ip_address = request.client.host
    user_agent = request.headers.get("user-agent")
    
    result, message = auth_service.register(register_data, ip_address, user_agent)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return result

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    auth_service = AuthService(db)
    
    result, message = auth_service.refresh_token(refresh_data.refresh_token)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=message
        )
    
    return result

@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """User logout (client should discard tokens)"""
    # In a more sophisticated implementation, you might want to blacklist the token
    # For now, we'll just return success and let the client handle token removal
    return {"message": "Logout successful"}


@router.post("/setup-2fa", response_model=TwoFASetupResponse)
async def setup_2fa(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Setup 2FA for current user"""
    auth_service = AuthService(db)
    
    result, message = auth_service.setup_2fa(current_user.id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return result

@router.post("/verify-2fa")
async def verify_2fa_setup(
    verify_data: TwoFAVerifyRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Verify 2FA setup with code"""
    auth_service = AuthService(db)
    
    success, message = auth_service.verify_2fa_setup(current_user.id, verify_data.code)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"message": message}

@router.post("/disable-2fa")
async def disable_2fa(
    verify_data: TwoFAVerifyRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Disable 2FA for current user"""
    auth_service = AuthService(db)
    
    success, message = auth_service.disable_2fa(current_user.id, verify_data.code)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"message": message}

@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user information with permissions"""
    # Get user permissions
    auth_service = AuthService(db)
    permissions = auth_service.get_user_permissions(current_user.id)
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "phone_number": current_user.phone_number,
        "role_id": current_user.role_id,
        "role": current_user.role_display_name,
        "brand_ids": current_user.brand_ids or [],
        "is_active": current_user.is_active,
        "is_2fa_enabled": current_user.is_2fa_enabled,
        "must_change_password": current_user.must_change_password,  # Şifre değiştirme zorunluluğu
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "permissions": [perm for perm in permissions],  # Permission names listesi olarak dön
    }

@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Kullanıcı şifresini değiştir"""
    auth_service = AuthService(db)
    
    # İlk giriş durumunda eski şifre kontrolü yapılmaz
    if current_user.must_change_password:
        success, message = auth_service.force_change_password(current_user.id, password_data.new_password)
    else:
        if not password_data.old_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mevcut şifre gerekli"
            )
        success, message = auth_service.change_password(current_user.id, password_data.old_password, password_data.new_password)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"message": message}

@router.post("/force-change-password")
async def force_change_password(
    password_data: ForceChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """İlk giriş için şifre değiştirme (eski şifre kontrolü olmadan)"""
    auth_service = AuthService(db)
    
    success, message = auth_service.force_change_password(current_user.id, password_data.new_password)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"message": message}

