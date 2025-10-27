"""
Permission Service
Kullanıcı izinlerini yöneten servis
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from core.logging import get_logger
from core.exceptions import BaseAppException
from models.user import User
from models.role import Role
from models.brand import Brand
from models.permissions import Permission
from models.role_permissions import RolePermission

logger = get_logger('permission_service')

class PermissionService:
    """İzin yönetim servisi"""
    
    def __init__(self, db: Session):
        self.db = db
        self.permission_cache = {}
        
        # İzin tanımları
        self.permissions = {
            'user': {
                'create': 'Kullanıcı oluşturma',
                'read': 'Kullanıcı görüntüleme',
                'update': 'Kullanıcı güncelleme',
                'delete': 'Kullanıcı silme'
            },
            'brand': {
                'create': 'Marka oluşturma',
                'read': 'Marka görüntüleme',
                'update': 'Marka güncelleme',
                'delete': 'Marka silme'
            },
            'product': {
                'create': 'Ürün oluşturma',
                'read': 'Ürün görüntüleme',
                'update': 'Ürün güncelleme',
                'delete': 'Ürün silme',
                'upload': 'Ürün yükleme'
            },
            'template': {
                'create': 'Şablon oluşturma',
                'read': 'Şablon görüntüleme',
                'update': 'Şablon güncelleme',
                'delete': 'Şablon silme',
                'share': 'Şablon paylaşma'
            },
            'channel': {
                'create': 'Kanal oluşturma',
                'read': 'Kanal görüntüleme',
                'update': 'Kanal güncelleme',
                'delete': 'Kanal silme',
                'manage': 'Kanal yönetimi'
            },
            'system': {
                'admin': 'Sistem yönetimi',
                'settings': 'Ayarlar yönetimi',
                'logs': 'Log görüntüleme'
            }
        }
        
        # Rol-izin eşleştirmesi
        self.role_permissions = {
            'Super Admin': list(self.permissions.keys()) + [
                'view_brands', 'view_users', 'view_roles', 'view_categories',
                'create_users', 'edit_users', 'delete_users',
                'manage_brands', 'manage_users', 'manage_roles', 'manage_categories',
                'send_messages'  # Tüm kanallara mesaj gönderebilir
            ],
            'Mağaza Yöneticisi': [
                'brand', 'product', 'template', 'channel', 
                'view_brands', 'view_users',
                'create_users', 'edit_users', 'delete_users',
                'send_messages'
            ],
            'Mağaza Çalışanı': [
                'product.create', 'product.read', 'product.update', 'product.upload',  # Kendi ürünleri
                'template.create', 'template.read', 'template.update', 'template.delete', 'template.share',  # Tam şablon yetkileri
                'channel.read',  # Sadece kendi markasının kanallarını görür
                'send_messages'  # Kanallarına mesaj gönderebilir
            ],
            'Müşteri': ['product.read']
        }

    def has_permission(self, user_id: int, permission: str) -> bool:
        """Kullanıcının belirli bir izni olup olmadığını kontrol et"""
        try:
            # Cache kontrolü
            cache_key = f"{user_id}_{permission}"
            if cache_key in self.permission_cache:
                return self.permission_cache[cache_key]
            
            from models.permissions import Permission
            from models.role_permissions import RolePermission
            
            # Kullanıcıyı al
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return False
            
            # Kullanıcının rolünden izinleri kontrol et - DİNAMİK
            has_perm = self.db.query(Permission).join(RolePermission).filter(
                RolePermission.role_id == user.role_id,
                Permission.name == permission
            ).first() is not None
            
            # Cache'e kaydet
            self.permission_cache[cache_key] = has_perm
            return has_perm
            
        except Exception as e:
            logger.error(f"Permission check error: {e}")
            return False
    
    def has_brand_permission(self, user_id: int, brand_id: int, action: str) -> bool:
        """Kullanıcının belirli bir marka için izni olup olmadığını kontrol et - DİNAMİK"""
        try:
            # Kullanıcıyı al
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return False
            
            # brands.manage yetkisi varsa tüm markalara erişebilir
            if self.has_permission(user_id, 'brands.manage'):
                return True
            
            # Kullanıcının brand_ids listesinde var mı?
            if not user.brand_ids or brand_id not in user.brand_ids:
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Brand permission check error: {e}")
            return False
    
    def has_resource_permission(self, user_id: int, resource_type: str, resource_id: int, action: str) -> bool:
        """Kullanıcının belirli bir kaynak için izni olup olmadığını kontrol et"""
        try:
            # Kullanıcıyı al
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return False
            
            # Kaynak tipine göre kontrol - DİNAMİK
            if resource_type == 'product':
                from models.product import Product
                product = self.db.query(Product).filter(Product.id == resource_id).first()
                if not product:
                    return False
                
                # Marka izni kontrolü
                return self.has_brand_permission(user_id, product.brand_id, action)
            
            elif resource_type == 'template':
                from models.template import Template
                template = self.db.query(Template).filter(Template.id == resource_id).first()
                if not template:
                    return False
                
                # Kendi şablonu mu kontrolü
                if template.created_by == user_id:
                    return True
                
                # Marka izni kontrolü
                return self.has_brand_permission(user_id, template.brand_id, action)
            
            elif resource_type == 'channel':
                from models.social_media_channel import SocialMediaChannel
                channel = self.db.query(SocialMediaChannel).filter(SocialMediaChannel.id == resource_id).first()
                if not channel:
                    return False
                
                # Marka izni kontrolü
                return self.has_brand_permission(user_id, channel.brand_id, action)
            
            return False
            
        except Exception as e:
            logger.error(f"Resource permission check error: {e}")
            return False

    def get_user_permissions(self, user_id: int) -> List[Permission]:
        """Kullanıcının tüm izinlerini döndür"""
        try:
            from models.permissions import Permission
            from models.role_permissions import RolePermission
            
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return []
            
            # Kullanıcının rolünden izinleri al
            permissions = self.db.query(Permission).join(RolePermission).filter(
                RolePermission.role_id == user.role_id
            ).all()
            
            return permissions
            
        except Exception as e:
            logger.error(f"Get user permissions error: {e}")
            return []

    def get_user_brands(self, user_id: int) -> List[int]:
        """Kullanıcının erişebileceği markaları döndür - DİNAMİK"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return []
            
            # brands.manage yetkisi varsa tüm markalara erişebilir
            if self.has_permission(user_id, 'brands.manage'):
                brands = self.db.query(Brand).filter(Brand.is_active == True).all()
                return [brand.id for brand in brands]
            
            # Diğer roller sadece kendi markalarına erişebilir
            return user.brand_ids or []
            
        except Exception as e:
            logger.error(f"Get user brands error: {e}")
            return []

    def clear_cache(self, user_id: Optional[int] = None):
        """İzin cache'ini temizle"""
        if user_id:
            # Belirli kullanıcının cache'ini temizle
            keys_to_remove = [key for key in self.permission_cache.keys() if key.startswith(f"{user_id}_")]
            for key in keys_to_remove:
                del self.permission_cache[key]
        else:
            # Tüm cache'i temizle
            self.permission_cache.clear()

    def validate_permission(self, permission: str) -> bool:
        """İzin adının geçerli olup olmadığını kontrol et"""
        return permission in self.permissions

    def get_all_permissions(self) -> Dict[str, Any]:
        """Tüm izinleri döndür"""
        return self.permissions

    def get_role_permissions(self) -> Dict[str, List[str]]:
        """Rol-izin eşleştirmesini döndür"""
        return self.role_permissions
