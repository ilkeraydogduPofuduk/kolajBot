"""
Dynamic Permission Helper
Tüm hardcoded rol kontrollerini değiştirmek için kullanılacak helper fonksiyonlar
"""
from sqlalchemy.orm import Session
from models.user import User
from services.permission_service import PermissionService
from typing import List, Optional

class PermissionHelper:
    """Dinamik yetki kontrolü için helper sınıfı"""
    
    @staticmethod
    def has_any_permission(user: User, permissions: List[str], db: Session) -> bool:
        """
        Kullanıcının belirtilen izinlerden herhangi birine sahip olup olmadığını kontrol et
        
        Args:
            user: Kullanıcı objesi
            permissions: Kontrol edilecek izin listesi
            db: Database session
            
        Returns:
            bool: En az bir izne sahipse True
        """
        permission_service = PermissionService(db)
        
        for permission in permissions:
            if permission_service.has_permission(user.id, permission):
                return True
        
        return False
    
    @staticmethod
    def has_all_permissions(user: User, permissions: List[str], db: Session) -> bool:
        """
        Kullanıcının belirtilen tüm izinlere sahip olup olmadığını kontrol et
        
        Args:
            user: Kullanıcı objesi
            permissions: Kontrol edilecek izin listesi
            db: Database session
            
        Returns:
            bool: Tüm izinlere sahipse True
        """
        permission_service = PermissionService(db)
        
        for permission in permissions:
            if not permission_service.has_permission(user.id, permission):
                return False
        
        return True
    
    @staticmethod
    def require_permission(user: User, permission: str, db: Session) -> bool:
        """
        Kullanıcının belirli bir izne sahip olmasını zorunlu kıl
        
        Args:
            user: Kullanıcı objesi
            permission: Gerekli izin
            db: Database session
            
        Returns:
            bool: İzne sahipse True
            
        Raises:
            HTTPException: İzin yoksa 403 hatası
        """
        from fastapi import HTTPException, status
        
        permission_service = PermissionService(db)
        
        if not permission_service.has_permission(user.id, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bu işlem için '{permission}' yetkisi gereklidir"
            )
        
        return True
    
    @staticmethod
    def can_manage_brands(user: User, db: Session) -> bool:
        """Kullanıcı marka yönetimi yapabilir mi?"""
        return PermissionHelper.has_any_permission(
            user, 
            ['brands.manage', 'brands.create', 'brands.edit', 'brands.delete'],
            db
        )
    
    @staticmethod
    def can_manage_products(user: User, db: Session) -> bool:
        """Kullanıcı ürün yönetimi yapabilir mi?"""
        return PermissionHelper.has_any_permission(
            user,
            ['products.manage', 'products.create', 'products.edit', 'products.delete'],
            db
        )
    
    @staticmethod
    def can_manage_templates(user: User, db: Session) -> bool:
        """Kullanıcı şablon yönetimi yapabilir mi?"""
        return PermissionHelper.has_any_permission(
            user,
            ['templates.manage', 'templates.create', 'templates.edit', 'templates.delete'],
            db
        )
    
    @staticmethod
    def can_manage_users(user: User, db: Session) -> bool:
        """Kullanıcı kullanıcı yönetimi yapabilir mi?"""
        return PermissionHelper.has_any_permission(
            user,
            ['users.manage', 'users.create', 'users.edit', 'users.delete'],
            db
        )
    
    @staticmethod
    def can_manage_social_media(user: User, db: Session) -> bool:
        """Kullanıcı sosyal medya yönetimi yapabilir mi?"""
        return PermissionHelper.has_any_permission(
            user,
            ['social.manage', 'social.create', 'social.edit', 'social.delete'],
            db
        )
    
    @staticmethod
    def can_view_reports(user: User, db: Session) -> bool:
        """Kullanıcı raporları görüntüleyebilir mi?"""
        return PermissionHelper.has_any_permission(
            user,
            ['reports.view', 'reports.manage'],
            db
        )
    
    @staticmethod
    def can_manage_settings(user: User, db: Session) -> bool:
        """Kullanıcı sistem ayarlarını yönetebilir mi?"""
        return PermissionHelper.has_any_permission(
            user,
            ['settings.manage', 'settings.edit'],
            db
        )
    
    @staticmethod
    def can_manage_roles(user: User, db: Session) -> bool:
        """Kullanıcı rol yönetimi yapabilir mi?"""
        return PermissionHelper.has_any_permission(
            user,
            ['roles.manage', 'roles.create', 'roles.edit', 'roles.delete'],
            db
        )
    
    @staticmethod
    def can_manage_employee_requests(user: User, db: Session) -> bool:
        """Kullanıcı çalışan taleplerini yönetebilir mi?"""
        return PermissionHelper.has_any_permission(
            user,
            ['employee_requests.manage', 'view_employee_requests'],
            db
        )
    
    @staticmethod
    def get_user_brand_ids(user: User) -> List[int]:
        """
        Kullanıcının erişebileceği marka ID'lerini döndür
        
        Returns:
            List[int]: Marka ID listesi, Super Admin için None (tümü)
        """
        # Brand IDs direkt user objesinde
        return user.brand_ids or []
    
    @staticmethod
    def can_access_brand(user: User, brand_id: int, db: Session) -> bool:
        """
        Kullanıcının belirli bir markaya erişimi var mı?
        
        Args:
            user: Kullanıcı objesi
            brand_id: Kontrol edilecek marka ID
            db: Database session
            
        Returns:
            bool: Erişim varsa True
        """
        # Super Admin tüm markalara erişebilir
        permission_service = PermissionService(db)
        if permission_service.has_permission(user.id, 'brands.manage'):
            # brands.manage yetkisi varsa tüm markalara erişebilir
            return True
        
        # Kullanıcının brand_ids listesinde var mı?
        user_brand_ids = PermissionHelper.get_user_brand_ids(user)
        return brand_id in user_brand_ids
