"""
Template Permission Model
Şablon izin yönetimi - hangi markaların hangi şablonları kullanabileceği
"""
from sqlalchemy import Column, Integer, ForeignKey, DateTime, Boolean, Table
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class TemplatePermission(Base):
    """Şablon izin modeli - Bir şablonun hangi markalara açık olduğu"""
    __tablename__ = "template_permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey('templates.id', ondelete='CASCADE'), nullable=False, index=True)
    brand_id = Column(Integer, ForeignKey('brands.id', ondelete='CASCADE'), nullable=False, index=True)
    
    # Permissions
    can_view = Column(Boolean, default=True)
    can_use = Column(Boolean, default=True)
    can_edit = Column(Boolean, default=False)  # Sadece şablon sahibi veya Super Admin
    can_duplicate = Column(Boolean, default=True)
    
    # Metadata
    granted_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    granted_at = Column(DateTime, default=func.now())
    is_active = Column(Boolean, default=True)
    
    # Relationships
    template = relationship("Template", back_populates="template_permissions")
    brand = relationship("Brand")
    granter = relationship("User", foreign_keys=[granted_by])
    
    def __repr__(self):
        return f"<TemplatePermission(template_id={self.template_id}, brand_id={self.brand_id})>"

