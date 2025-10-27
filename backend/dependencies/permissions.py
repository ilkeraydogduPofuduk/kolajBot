"""
Dinamik İzin Kontrol Dependencies
"""
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Union
from database import get_db
from models.user import User
from services.permission_service import PermissionService
from dependencies.auth import get_current_active_user
import logging

logger = logging.getLogger(__name__)

def require_permission(permission_name: str):
    """
    Belirli bir izni gerektiren dependency
    """
    def permission_checker(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ) -> User:
        # DİNAMİK: Veritabanından izin kontrolü
        permission_service = PermissionService(db)
        
        if not permission_service.has_permission(current_user.id, permission_name):
            logger.warning(f"User {current_user.id} denied access to permission '{permission_name}'")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bu işlem için '{permission_name}' izni gereklidir"
            )
        
        return current_user
    
    return permission_checker

def require_any_permission(permission_names: List[str]):
    """
    Belirtilen izinlerden herhangi birini gerektiren dependency
    """
    def permission_checker(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ) -> User:
        # DİNAMİK: Veritabanından izin kontrolü
        permission_service = PermissionService(db)
        
        if not permission_service.has_any_permission(current_user.id, permission_names):
            logger.warning(f"User {current_user.id} denied access to any of permissions: {permission_names}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bu işlem için şu izinlerden biri gereklidir: {', '.join(permission_names)}"
            )
        
        return current_user
    
    return permission_checker

def require_all_permissions(permission_names: List[str]):
    """
    Belirtilen tüm izinleri gerektiren dependency
    """
    def permission_checker(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ) -> User:
        # permission_service = PermissionService(db)
        
        if not permission_service.has_all_permissions(current_user.id, permission_names):
            logger.warning(f"User {current_user.id} denied access to all permissions: {permission_names}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bu işlem için şu izinlerin tümü gereklidir: {', '.join(permission_names)}"
            )
        
        return current_user
    
    return permission_checker

def require_module_access(module_name: str):
    """
    Belirli bir modüle erişim gerektiren dependency
    """
    def permission_checker(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ) -> User:
        # permission_service = PermissionService(db)
        
        if not permission_service.can_access_module(current_user.id, module_name):
            logger.warning(f"User {current_user.id} denied access to module '{module_name}'")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"'{module_name}' modülüne erişim yetkiniz yok"
            )
        
        return current_user
    
    return permission_checker

def get_user_permissions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> List[str]:
    """
    Kullanıcının tüm izinlerini getiren dependency
    """
    permission_service = PermissionService(db)
    return permission_service.get_user_permission_names(current_user.id)

def get_user_permissions_by_module(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> dict:
    """
    Kullanıcının izinlerini modüle göre gruplamış şekilde getiren dependency
    """
    permission_service = PermissionService(db)
    return permission_service.get_user_permissions_by_module(current_user.id)

# Özel izin kontrol fonksiyonları
def can_manage_users(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Kullanıcı yönetimi izni kontrolü
    """
    permission_service = PermissionService(db)
    
    required_permissions = ['create_users', 'edit_users', 'delete_users']
    if not permission_service.has_any_permission(current_user.id, required_permissions):
        logger.warning(f"User {current_user.id} denied user management access")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kullanıcı yönetimi yetkiniz yok"
        )
    
    return current_user

def can_manage_roles(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Rol yönetimi izni kontrolü
    """
    permission_service = PermissionService(db)
    
    required_permissions = ['create_roles', 'edit_roles', 'delete_roles']
    if not permission_service.has_any_permission(current_user.id, required_permissions):
        logger.warning(f"User {current_user.id} denied role management access")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rol yönetimi yetkiniz yok"
        )
    
    return current_user

def can_manage_brands(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Marka yönetimi izni kontrolü
    """
    permission_service = PermissionService(db)
    
    required_permissions = ['create_brands', 'edit_brands', 'delete_brands']
    if not permission_service.has_any_permission(current_user.id, required_permissions):
        logger.warning(f"User {current_user.id} denied brand management access")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Marka yönetimi yetkiniz yok"
        )
    
    return current_user

def can_manage_employee_requests(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Çalışan talebi yönetimi izni kontrolü
    """
    permission_service = PermissionService(db)
    
    required_permissions = ['approve_employee_requests', 'edit_employee_requests']
    if not permission_service.has_any_permission(current_user.id, required_permissions):
        logger.warning(f"User {current_user.id} denied employee request management access")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Çalışan talebi yönetimi yetkiniz yok"
        )
    
    return current_user

def can_manage_brand_requests(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Marka talebi yönetimi izni kontrolü
    """
    permission_service = PermissionService(db)
    
    required_permissions = ['approve_brand_requests', 'edit_brand_requests']
    if not permission_service.has_any_permission(current_user.id, required_permissions):
        logger.warning(f"User {current_user.id} denied brand request management access")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Marka talebi yönetimi yetkiniz yok"
        )
    
    return current_user

def can_view_reports(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Rapor görüntüleme izni kontrolü
    """
    permission_service = PermissionService(db)
    
    if not permission_service.has_permission(current_user.id, 'view_reports'):
        logger.warning(f"User {current_user.id} denied report viewing access")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rapor görüntüleme yetkiniz yok"
        )
    
    return current_user

def can_manage_settings(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Ayar yönetimi izni kontrolü
    """
    permission_service = PermissionService(db)
    
    if not permission_service.has_permission(current_user.id, 'edit_settings'):
        logger.warning(f"User {current_user.id} denied settings management access")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ayar yönetimi yetkiniz yok"
        )
    
    return current_user

def can_manage_social_media(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Sosyal medya yönetimi izni kontrolü
    """
    permission_service = PermissionService(db)
    
    if not permission_service.has_permission(current_user.id, 'manage_social_media'):
        logger.warning(f"User {current_user.id} denied social media management access")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sosyal medya yönetimi yetkiniz yok"
        )
    
    return current_user

# Dinamik izin kontrolü için yardımcı fonksiyon
def check_permission(user_id: int, permission_name: str, db: Session) -> bool:
    """
    Veritabanı bağlantısı ile izin kontrolü yapan yardımcı fonksiyon
    """
    permission_service = PermissionService(db)
    return permission_service.has_permission(user_id, permission_name)

def check_any_permission(user_id: int, permission_names: List[str], db: Session) -> bool:
    """
    Veritabanı bağlantısı ile herhangi bir izin kontrolü yapan yardımcı fonksiyon
    """
    permission_service = PermissionService(db)
    return permission_service.has_any_permission(user_id, permission_names)

def check_all_permissions(user_id: int, permission_names: List[str], db: Session) -> bool:
    """
    Veritabanı bağlantısı ile tüm izin kontrolü yapan yardımcı fonksiyon
    """
    permission_service = PermissionService(db)
    return permission_service.has_all_permissions(user_id, permission_names)
