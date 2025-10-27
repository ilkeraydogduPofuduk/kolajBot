"""
Template Manager Service
Şablon yönetimi - CRUD ve izin kontrolü
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional, Dict, Any
from models.template import Template, TemplateVisibility
from models.user import User
from models.brand import Brand
from services.template_permission_service import TemplatePermissionService
from dependencies.role_checker import BrandAccessChecker, ResourceAccessChecker
import json

class TemplateManager:
    """Şablon yönetim servisi"""
    
    def __init__(self, db: Session):
        self.db = db
        self.permission_service = TemplatePermissionService(db)
        self.brand_access = BrandAccessChecker()
        self.resource_access = ResourceAccessChecker()
    
    def get_user_templates(
        self,
        user: User,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
        template_type: Optional[str] = None,
        brand_id: Optional[int] = None
    ) -> tuple[List[Template], int]:
        """Kullanıcının erişebildiği şablonları getir"""
        query = self.db.query(Template).filter(Template.is_active == True)
        
        # DİNAMİK: Rol bazlı filtreleme
        from services.permission_service import PermissionService
        permission_service = PermissionService(self.db)
        
        if permission_service.has_permission(user.id, 'templates.manage'):
            # templates.manage yetkisi var - tüm şablonlar
            pass
        elif user.brand_ids:
            # Mağaza Yöneticisi - markalarının şablonları
            if user.brand_ids:
                query = query.filter(
                    or_(
                        Template.brand_id.in_(user.brand_ids),
                        Template.created_by == user.id,
                        Template.visibility == TemplateVisibility.PUBLIC
                    )
                )
            else:
                query = query.filter(
                    or_(
                        Template.created_by == user.id,
                        Template.visibility == TemplateVisibility.PUBLIC
                    )
                )
        else:
            # Mağaza Çalışanı - kendi şablonları ve markasının şablonları
            if user.brand_id:
                query = query.filter(
                    or_(
                        Template.created_by == user.id,
                        Template.brand_id == user.brand_id,
                        Template.visibility == TemplateVisibility.PUBLIC
                    )
                )
            else:
                query = query.filter(
                    or_(
                        Template.created_by == user.id,
                        Template.visibility == TemplateVisibility.PUBLIC
                    )
                )
        
        # Search filter
        if search:
            query = query.filter(
                or_(
                    Template.name.ilike(f"%{search}%"),
                    Template.description.ilike(f"%{search}%")
                )
            )
        
        # Template type filter
        if template_type:
            query = query.filter(Template.template_type == template_type)
        
        # Brand filter
        if brand_id:
            query = query.filter(Template.brand_id == brand_id)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        templates = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return templates, total
    
    def create_template(
        self,
        user: User,
        name: str,
        brand_id: int,
        product_id: int,
        template_data: Dict[Any, Any],
        template_type: str = 'standard',
        description: Optional[str] = None,
        visibility: TemplateVisibility = TemplateVisibility.PRIVATE,
        tags: Optional[List[str]] = None
    ) -> Template:
        """Yeni şablon oluştur"""
        # Marka erişim kontrolü
        if not self.brand_access.check_brand_access(user, brand_id):
            raise PermissionError("Bu markaya erişim yetkiniz yok")
        
        template = Template(
            name=name,
            description=description,
            product_id=product_id,
            brand_id=brand_id,
            created_by=user.id,
            template_type=template_type,
            template_data=template_data,
            visibility=visibility,
            tags=tags
        )
        
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        
        # Otomatik izin verme - aynı markaya
        if visibility == TemplateVisibility.BRAND:
            self.permission_service.grant_permission(
                template_id=template.id,
                brand_id=brand_id,
                granted_by=user.id
            )
        
        return template
    
    def update_template(
        self,
        user: User,
        template_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        template_data: Optional[Dict[Any, Any]] = None,
        template_type: Optional[str] = None,
        visibility: Optional[TemplateVisibility] = None,
        tags: Optional[List[str]] = None
    ) -> Template:
        """Şablonu güncelle"""
        template = self.db.query(Template).filter(Template.id == template_id).first()
        if not template:
            raise ValueError("Şablon bulunamadı")
        
        # İzin kontrolü
        if not self.permission_service.can_user_access_template(user, template, 'edit'):
            raise PermissionError("Bu şablonu düzenleme yetkiniz yok")
        
        if name is not None:
            template.name = name
        if description is not None:
            template.description = description
        if template_data is not None:
            template.template_data = template_data
        if template_type is not None:
            template.template_type = template_type
        if visibility is not None:
            template.visibility = visibility
        if tags is not None:
            template.tags = tags
        
        self.db.commit()
        self.db.refresh(template)
        return template
    
    def delete_template(self, user: User, template_id: int) -> bool:
        """Şablonu sil"""
        template = self.db.query(Template).filter(Template.id == template_id).first()
        if not template:
            return False
        
        # DİNAMİK: templates.manage yetkisi veya oluşturan silebilir
        from services.permission_service import PermissionService
        permission_service = PermissionService(self.db)
        has_manage_permission = permission_service.has_permission(user.id, 'templates.manage')
        
        if not has_manage_permission and template.created_by != user.id:
            raise PermissionError("Bu şablonu silme yetkiniz yok")
        
        self.db.delete(template)
        self.db.commit()
        return True
    
    def duplicate_template(self, user: User, template_id: int, new_name: Optional[str] = None) -> Template:
        """Şablonu kopyala"""
        original = self.db.query(Template).filter(Template.id == template_id).first()
        if not original:
            raise ValueError("Şablon bulunamadı")
        
        # İzin kontrolü
        if not self.permission_service.can_user_access_template(user, original, 'duplicate'):
            raise PermissionError("Bu şablonu kopyalama yetkiniz yok")
        
        # Yeni şablon oluştur
        new_template = Template(
            name=new_name or f"{original.name} (Kopya)",
            description=original.description,
            product_id=original.product_id,
            brand_id=user.brand_id or original.brand_id,
            created_by=user.id,
            template_type=original.template_type,
            template_data=original.template_data,
            visibility=TemplateVisibility.PRIVATE,  # Kopyalar varsayılan olarak private
            tags=original.tags,
            parent_template_id=original.id
        )
        
        self.db.add(new_template)
        self.db.commit()
        self.db.refresh(new_template)
        return new_template
    
    def share_template(
        self,
        user: User,
        template_id: int,
        brand_ids: List[int],
        permissions: Optional[Dict[str, bool]] = None
    ) -> List:
        """Şablonu markalarla paylaş"""
        template = self.db.query(Template).filter(Template.id == template_id).first()
        if not template:
            raise ValueError("Şablon bulunamadı")
        
        # DİNAMİK: templates.manage yetkisi veya oluşturan paylaşabilir
        from services.permission_service import PermissionService
        permission_service = PermissionService(self.db)
        has_manage_permission = permission_service.has_permission(user.id, 'templates.manage')
        
        if not has_manage_permission and template.created_by != user.id:
            raise PermissionError("Bu şablonu paylaşma yetkiniz yok")
        
        return self.permission_service.share_template_with_brands(
            template_id=template_id,
            brand_ids=brand_ids,
            granted_by=user.id,
            permissions=permissions
        )
    
    def get_template_with_permissions(self, user: User, template_id: int) -> Optional[Dict[str, Any]]:
        """Şablonu izinleriyle birlikte getir"""
        template = self.db.query(Template).filter(Template.id == template_id).first()
        if not template:
            return None
        
        # İzin kontrolü
        if not self.permission_service.can_user_access_template(user, template, 'view'):
            return None
        
        # Şablon verilerini hazırla
        brand_name = None
        if template.brand_id:
            brand = self.db.query(Brand).filter(Brand.id == template.brand_id).first()
            brand_name = brand.name if brand else None
        
        creator_name = None
        if template.created_by:
            creator = self.db.query(User).filter(User.id == template.created_by).first()
            creator_name = f"{creator.first_name} {creator.last_name}" if creator else None
        
        # İzin verilen markaları getir
        shared_brands = self.permission_service.get_template_brands(template.id)
        
        return {
            'id': template.id,
            'name': template.name,
            'description': template.description,
            'template_type': template.template_type,
            'template_data': template.template_data,
            'visibility': template.visibility,
            'brand_id': template.brand_id,
            'brand_name': brand_name,
            'product_id': template.product_id,
            'created_by': template.created_by,
            'creator_name': creator_name,
            'tags': template.tags,
            'usage_count': template.usage_count,
            'is_default': template.is_default,
            'is_auto_generated': template.is_auto_generated,
            'shared_with_brands': shared_brands,
            'created_at': template.created_at.isoformat() if template.created_at else None,
            'updated_at': template.updated_at.isoformat() if template.updated_at else None,
            'last_used_at': template.last_used_at.isoformat() if template.last_used_at else None,
            # User permissions
            'user_can_edit': self.permission_service.can_user_access_template(user, template, 'edit'),
            'user_can_delete': permission_service.has_permission(user.id, 'templates.manage') or template.created_by == user.id,
            'user_can_share': permission_service.has_permission(user.id, 'templates.manage') or template.created_by == user.id,
            'user_can_duplicate': self.permission_service.can_user_access_template(user, template, 'duplicate')
        }

