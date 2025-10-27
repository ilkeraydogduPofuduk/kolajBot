from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from schemas.user import UserCreate, UserUpdate, UserPasswordUpdate, UserResponse, UserListResponse
from services.user import UserService, validate_password
from utils.security import get_password_hash
from dependencies.auth import get_current_active_user
from dependencies.role_checker import brand_access
from services.permission_service import PermissionService
from dependencies.permissions import require_permission
from models.user import User

router = APIRouter()

@router.get("", response_model=UserListResponse)  # Changed from "/" to ""
@router.get("/", response_model=UserListResponse)  # Keep both for compatibility
async def get_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=1000),
    role: Optional[str] = Query(None),
    brand_id: Optional[int] = Query(None),
    current_user: User = Depends(require_permission("users.view")),
    db: Session = Depends(get_db)
):
    """Get paginated list of users"""
    user_service = UserService(db)
    
    # DİNAMİK: Kullanıcının erişebileceği markalar
    accessible_brand_ids = brand_access.get_accessible_brand_ids(current_user, db)
    
    if accessible_brand_ids is None:
        # users.manage yetkisi var - tüm kullanıcılar
        users, total = user_service.get_users(page, per_page)
    elif not accessible_brand_ids:
        users, total = [], 0
    else:
        users, total = user_service.get_users_by_brands(accessible_brand_ids, page, per_page)
    
    # Convert to response format
    user_responses = [
        UserResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role_id=user.role_id,
            role=user.role_display_name,
            brand_ids=user.brand_ids,
            is_active=user.is_active,
            is_2fa_enabled=user.is_2fa_enabled,
            last_login=user.last_login,
            created_at=user.created_at,
            updated_at=user.updated_at
        ) for user in users
    ]
    
    return UserListResponse(
        users=user_responses,
        total=total,
        page=page,
        per_page=per_page
    )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user by ID"""
    user_service = UserService(db)
    
    user = user_service.get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if current user can view this user
    if not can_manage_user(user, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role_id=user.role_id,
        role=user.role_display_name,
        brand_ids=user.brand_ids,
        branch_id=user.branch_id,
        is_active=user.is_active,
        is_2fa_enabled=user.is_2fa_enabled,
        last_login=user.last_login,
        created_at=user.created_at,
        updated_at=user.updated_at
    )

@router.post("", response_model=UserResponse)
@router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_permission("users.create")),
    db: Session = Depends(get_db)
):
    """Create a new user"""
    user_service = UserService(db)
    
    # DİNAMİK: Marka erişim kontrolü
    if user_data.brand_ids:
        for brand_id in user_data.brand_ids:
            if not brand_access.check_brand_access(current_user, brand_id, db):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Marka {brand_id}'ye erişim yetkiniz yok"
                )
    
    user, message = user_service.create_user(user_data, current_user.id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role_id=user.role_id,
        role=user.role_display_name,
        brand_ids=user.brand_ids,
        branch_id=user.branch_id,
        is_active=user.is_active,
        is_2fa_enabled=user.is_2fa_enabled,
        last_login=user.last_login,
        created_at=user.created_at,
        updated_at=user.updated_at
    )

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update user information"""
    user_service = UserService(db)
    
    target_user = user_service.get_user(user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if current user can manage this user
    if not can_manage_user(target_user, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # DİNAMİK: Marka erişim kontrolü
    if user_data.brand_ids:
        for brand_id in user_data.brand_ids:
            if not brand_access.check_brand_access(current_user, brand_id, db):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Marka {brand_id}'ye erişim yetkiniz yok"
                )
    
    # Extract send_email parameter
    send_email = getattr(user_data, 'send_email', True)
    
    user, message = user_service.update_user(user_id, user_data, current_user.id, send_email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return UserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role_id=user.role_id,
        role=user.role_display_name,
        brand_ids=user.brand_ids,
        branch_id=user.branch_id,
        is_active=user.is_active,
        is_2fa_enabled=user.is_2fa_enabled,
        last_login=user.last_login,
        created_at=user.created_at,
        updated_at=user.updated_at
    )

@router.put("/{user_id}/password")
async def update_password(
    user_id: int,
    password_data: UserPasswordUpdate,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update user password with email notification and session invalidation"""
    user_service = UserService(db)
    
    # Get client IP and user agent
    ip_address = request.client.host
    user_agent = request.headers.get("user-agent", "Unknown")
    
    # DİNAMİK: Kullanıcılar sadece kendi şifrelerini değiştirebilir (users.manage yetkisi yoksa)
    permission_service = PermissionService(db)
    has_users_manage = permission_service.has_permission(current_user.id, 'users.manage')
    
    if current_user.id != user_id and not has_users_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sadece kendi şifrenizi değiştirebilirsiniz"
        )
    
    # Determine if this is an admin reset
    changed_by_admin = current_user.id != user_id and has_users_manage
    
    # Update password with email notification and session invalidation
    success, message = user_service.update_password(
        user_id, 
        password_data, 
        ip_address=ip_address,
        user_agent=user_agent,
        changed_by_admin=changed_by_admin
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"message": message}

@router.put("/{user_id}/activate")
async def activate_user(
    user_id: int,
    current_user: User = Depends(require_permission("users.manage")),
    db: Session = Depends(get_db)
):
    """Activate user account"""
    user_service = UserService(db)
    
    target_user = user_service.get_user(user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if current user can manage this user
    if not can_manage_user(target_user, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    success, message = user_service.activate_user(user_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"message": message}

@router.put("/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    current_user: User = Depends(require_permission("users.manage")),
    db: Session = Depends(get_db)
):
    """Deactivate user account"""
    user_service = UserService(db)
    
    target_user = user_service.get_user(user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if current user can manage this user
    if not can_manage_user(target_user, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    success, message = user_service.deactivate_user(user_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"message": message}

@router.post("/{user_id}/assign-brand/{brand_id}")
async def assign_brand_to_user(
    user_id: int,
    brand_id: int,
    current_user: User = Depends(require_permission("users.manage")),
    db: Session = Depends(get_db)
):
    """Assign a brand to a user"""
    user_service = UserService(db)
    
    # DİNAMİK: Marka erişim kontrolü
    if not brand_access.check_brand_access(current_user, brand_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu markaya erişim yetkiniz yok"
        )
    
    success, message = user_service.assign_brand_to_user(user_id, brand_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"message": message}

@router.delete("/{user_id}/remove-brand/{brand_id}")
async def remove_brand_from_user(
    user_id: int,
    brand_id: int,
    current_user: User = Depends(require_permission("users.manage")),
    db: Session = Depends(get_db)
):
    """Remove a brand from a user"""
    user_service = UserService(db)
    
    # DİNAMİK: Marka erişim kontrolü
    if not brand_access.check_brand_access(current_user, brand_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu markaya erişim yetkiniz yok"
        )
    
    success, message = user_service.remove_brand_from_user(user_id, brand_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"message": message}

