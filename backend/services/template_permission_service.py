"""
Template Permission Service
Şablon izin yönetim servisi
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from models.template import Template
from models.template_permission import TemplatePermission
from models.user import User
from models.brand import Brand

class TemplatePermissionService:
    """Şablon izin yönetimi"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def grant_permission(
        self,
        template_id: int,
        brand_id: int,
        can_view: bool = True,
        can_use: bool = True,
        can_edit: bool = False,
        can_duplicate: bool = True,
        granted_by: Optional[int] = None
    ) -> TemplatePermission:
        """Şablona marka izni ver"""
        # Var olan izni kontrol et
        existing = self.db.query(TemplatePermission).filter(
            TemplatePermission.template_id == template_id,
            TemplatePermission.brand_id == brand_id
        ).first()
        
        if existing:
            # Güncelle
            existing.can_view = can_view
            existing.can_use = can_use
            existing.can_edit = can_edit
            existing.can_duplicate = can_duplicate
            existing.is_active = True
            self.db.commit()
            return existing
        
        # Yeni izin oluştur
        permission = TemplatePermission(
            template_id=template_id,
            brand_id=brand_id,
            can_view=can_view,
            can_use=can_use,
            can_edit=can_edit,
            can_duplicate=can_duplicate,
            granted_by=granted_by
        )
        self.db.add(permission)
        self.db.commit()
        self.db.refresh(permission)
        return permission
    
    def revoke_permission(self, template_id: int, brand_id: int) -> bool:
        """Şablon izni iptal et"""
        permission = self.db.query(TemplatePermission).filter(
            TemplatePermission.template_id == template_id,
            TemplatePermission.brand_id == brand_id
        ).first()
        
        if permission:
            self.db.delete(permission)
            self.db.commit()
            return True
        return False
    
    def get_template_brands(self, template_id: int) -> List[int]:
        """Şablonun izin verilen markalarını getir"""
        permissions = self.db.query(TemplatePermission).filter(
            TemplatePermission.template_id == template_id,
            TemplatePermission.is_active == True
        ).all()
        return [p.brand_id for p in permissions]
    
    def get_brand_templates(self, brand_id: int) -> List[int]:
        """Markanın erişebildiği şablonları getir"""
        permissions = self.db.query(TemplatePermission).filter(
            TemplatePermission.brand_id == brand_id,
            TemplatePermission.is_active == True,
            TemplatePermission.can_view == True
        ).all()
        return [p.template_id for p in permissions]
    
    def can_user_access_template(self, user: User, template: Template, action: str = 'view') -> bool:
        """Kullanıcının şablona erişimi var mı"""
        # DİNAMİK: templates.manage yetkisi varsa her şeye erişebilir
        from services.permission_service import PermissionService
        permission_service = PermissionService(self.db)
        if permission_service.has_permission(user.id, 'templates.manage'):
            return True
        
        # Şablonu oluşturan kullanıcı her şeyi yapabilir
        if template.created_by == user.id:
            return True
        
        # Public şablonlar herkese açık
        if template.visibility == 'PUBLIC':
            return action in ['view', 'use', 'duplicate']
        
        # DİNAMİK: Marka tabanlı izin kontrolü
        user_brand_ids = user.brand_ids or []
        
        if not user_brand_ids:
            return False
        
        # İzinleri kontrol et
        permissions = self.db.query(TemplatePermission).filter(
            TemplatePermission.template_id == template.id,
            TemplatePermission.brand_id.in_(user_brand_ids),
            TemplatePermission.is_active == True
        ).all()
        
        for perm in permissions:
            if action == 'view' and perm.can_view:
                return True
            if action == 'use' and perm.can_use:
                return True
            if action == 'edit' and perm.can_edit:
                return True
            if action == 'duplicate' and perm.can_duplicate:
                return True
        
        return False
    
    def share_template_with_brands(
        self,
        template_id: int,
        brand_ids: List[int],
        granted_by: int,
        permissions: dict = None
    ) -> List[TemplatePermission]:
        """Şablonu birden fazla marka ile paylaş"""
        if permissions is None:
            permissions = {
                'can_view': True,
                'can_use': True,
                'can_edit': False,
                'can_duplicate': True
            }
        
        created_permissions = []
        for brand_id in brand_ids:
            perm = self.grant_permission(
                template_id=template_id,
                brand_id=brand_id,
                granted_by=granted_by,
                **permissions
            )
            created_permissions.append(perm)
        
        return created_permissions

