"""
DİNAMİK YETKİ SİSTEMİ - Veritabanı bazlı yetki kontrolü
Role-based access control checker
Rol bazlı erişim kontrolü
"""
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import List, Optional, Callable
from functools import wraps
from models.user import User
from dependencies.auth import get_current_active_user
from database import get_db
from services.permission_service import PermissionService

class PermissionChecker:
    """DİNAMİK: Permission bazlı erişim kontrolü"""
    
    def __init__(self, required_permissions: List[str], require_all: bool = False):
        """
        Args:
            required_permissions: Gerekli izinler listesi
            require_all: True ise tüm izinler gerekli, False ise herhangi biri yeterli
        """
        self.required_permissions = required_permissions
        self.require_all = require_all
    
    def __call__(
        self, 
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db)
    ):
        """Dinamik yetki kontrolü - veritabanından"""
        permission_service = PermissionService(db)
        
        if self.require_all:
            # Tüm izinler gerekli
            for perm in self.required_permissions:
                if not permission_service.has_permission(current_user.id, perm):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Bu işlem için '{perm}' yetkisi gereklidir"
                    )
        else:
            # Herhangi bir izin yeterli
            has_any = any(
                permission_service.has_permission(current_user.id, perm)
                for perm in self.required_permissions
            )
            if not has_any:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Bu işlem için şu yetkilerden biri gereklidir: {', '.join(self.required_permissions)}"
                )
        
        return current_user


class BrandAccessChecker:
    """DİNAMİK: Marka erişim kontrolü"""
    
    @staticmethod
    def check_brand_access(user: User, brand_id: int, db: Session) -> bool:
        """Kullanıcının markaya erişimi var mı kontrol et - DİNAMİK"""
        permission_service = PermissionService(db)
        
        # brands.manage yetkisi varsa tüm markalara erişebilir
        if permission_service.has_permission(user.id, 'brands.manage'):
            return True
        
        # Kullanıcının brand_ids listesinde var mı?
        return brand_id in (user.brand_ids or [])
    
    @staticmethod
    def get_accessible_brand_ids(user: User, db: Session) -> Optional[List[int]]:
        """Kullanıcının erişebileceği marka ID'lerini getir - DİNAMİK"""
        permission_service = PermissionService(db)
        
        # brands.manage yetkisi varsa tüm markalar (None = filtreleme yok)
        if permission_service.has_permission(user.id, 'brands.manage'):
            return None
        
        # Kullanıcının brand_ids listesi
        return user.brand_ids or []


class ResourceAccessChecker:
    """DİNAMİK: Kaynak erişim kontrolü (ürün, şablon, vb.)"""
    
    @staticmethod
    def check_product_access(user: User, product_brand_id: int, product_creator_id: int, db: Session) -> bool:
        """Kullanıcının ürüne erişimi var mı kontrol et - DİNAMİK"""
        permission_service = PermissionService(db)
        
        # products.manage yetkisi varsa tüm ürünlere erişebilir
        if permission_service.has_permission(user.id, 'products.manage'):
            return True
        
        # Kendi oluşturduğu ürünler
        if product_creator_id == user.id:
            return True
        
        # Markasının ürünleri
        return product_brand_id in (user.brand_ids or [])
    
    @staticmethod
    def check_template_access(user: User, template_brand_id: Optional[int], template_creator_id: int, db: Session) -> bool:
        """Kullanıcının şablona erişimi var mı kontrol et - DİNAMİK"""
        permission_service = PermissionService(db)
        
        # templates.manage yetkisi varsa tüm şablonlara erişebilir
        if permission_service.has_permission(user.id, 'templates.manage'):
            return True
        
        # Marka olmayan şablonlar herkese açık
        if not template_brand_id:
            return True
        
        # Kendi oluşturduğu şablonlar
        if template_creator_id == user.id:
            return True
        
        # Markasının şablonları
        return template_brand_id in (user.brand_ids or [])
    
    @staticmethod
    def check_channel_access(user: User, channel_brand_id: int, db: Session) -> bool:
        """Kullanıcının kanala erişimi var mı kontrol et - DİNAMİK"""
        permission_service = PermissionService(db)
        
        # social.manage yetkisi varsa tüm kanallara erişebilir
        if permission_service.has_permission(user.id, 'social.manage'):
            return True
        
        # Markasının kanalları
        return channel_brand_id in (user.brand_ids or [])


# DİNAMİK Permission checkers
require_brands_manage = PermissionChecker(['brands.manage'])
require_products_manage = PermissionChecker(['products.manage'])
require_templates_manage = PermissionChecker(['templates.manage'])
require_social_manage = PermissionChecker(['social.manage'])
require_users_manage = PermissionChecker(['users.manage'])
require_roles_manage = PermissionChecker(['roles.manage'])
require_settings_manage = PermissionChecker(['settings.manage'])
require_employee_requests = PermissionChecker(['employee_requests.manage', 'view_employee_requests'])

# Access checkers
brand_access = BrandAccessChecker()
resource_access = ResourceAccessChecker()

