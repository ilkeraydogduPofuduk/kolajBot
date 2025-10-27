from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.security.utils import get_authorization_scheme_param
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from database import get_db
from models.user import User
from utils.security import verify_token
from config.settings import settings
from typing import Optional

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    payload = verify_token(token, "access")

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


def require_role(required_role: str):
    """DEPRECATED: Use require_permission instead - DİNAMİK sistem için"""
    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        # Eski sistem uyumluluğu için - artık permission kullanın
        if current_user.role_display_name != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{required_role}' required - Lütfen permission bazlı sistem kullanın"
            )
        return current_user
    return role_checker


def require_roles(required_roles: list):
    """DEPRECATED: Use require_any_permission instead - DİNAMİK sistem için"""
    def roles_checker(current_user: User = Depends(get_current_active_user)) -> User:
        # Eski sistem uyumluluğu için - artık permission kullanın
        if current_user.role_display_name not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"One of these roles required: {', '.join(required_roles)} - Lütfen permission bazlı sistem kullanın"
            )
        return current_user
    return roles_checker


def require_super_admin(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)) -> User:
    """Require Super Admin role - DİNAMİK"""
    from services.permission_service import PermissionService
    permission_service = PermissionService(db)
    # Super Admin tüm yetkilere sahip olmalı, herhangi bir manage yetkisi kontrol edilebilir
    if not permission_service.has_permission(current_user.id, 'users.manage'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yönetici yetkisi gerekli"
        )
    return current_user


def require_admin_or_manager(current_user: User = Depends(get_current_active_user)) -> User:
    """DEPRECATED: Use permission system - DİNAMİK sistem için"""
    # Eski sistem uyumluluğu için - artık permission kullanın
    if current_user.role_display_name not in ["Super Admin", "Mağaza Yöneticisi"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Manager role required - Lütfen permission bazlı sistem kullanın"
        )
    return current_user


def can_manage_user(target_user: User, current_user: User, db: Session) -> bool:
    """Check if current user can manage target user - DİNAMİK"""
    from services.permission_service import PermissionService
    permission_service = PermissionService(db)
    
    # users.manage yetkisi varsa herkesi yönetebilir
    if permission_service.has_permission(current_user.id, 'users.manage'):
        return True

    # Aynı markaları paylaşıyorlarsa yönetebilir
    if current_user.brand_ids and target_user.brand_ids:
        return bool(set(current_user.brand_ids) & set(target_user.brand_ids))

    return False


def require_user_management_permission():
    """DEPRECATED: Use require_permission('users.manage') - DİNAMİK sistem için"""
    def permission_checker(current_user: User = Depends(get_current_active_user)) -> User:
        # Eski sistem uyumluluğu için - artık require_permission('users.manage') kullanın
        if current_user.role_display_name not in ["Super Admin", "Mağaza Yöneticisi"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User management permission required - Lütfen require_permission('users.manage') kullanın"
            )
        return current_user
    return permission_checker


def require_brand_management_permission():
    """DEPRECATED: Use require_permission('brands.manage') - DİNAMİK sistem için"""
    def permission_checker(current_user: User = Depends(get_current_active_user)) -> User:
        # Eski sistem uyumluluğu için - artık require_permission('brands.manage') kullanın
        if current_user.role_display_name not in ["Super Admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Brand management permission required - Lütfen require_permission('brands.manage') kullanın"
            )
        return current_user
    return permission_checker


def get_optional_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    try:
        # Try to get the current user, but don't raise exception if not authenticated
        authorization: str = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            return None
            
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            return None
            
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            return None
            
        return user
    except Exception:
        # If any error occurs (invalid token, expired, etc.), return None
        return None
