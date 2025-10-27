"""
Template Model
Template management for the application
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Template(Base):
    __tablename__ = "templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    template_type = Column(String(50), nullable=False, default='collage')  # collage, social_media, banner, poster
    template_data = Column(JSON, nullable=True)  # Fabric.js JSON data
    thumbnail = Column(String(500), nullable=True)  # Thumbnail image path
    
    # Status flags
    is_active = Column(Boolean, default=True)
    is_auto_generated = Column(Boolean, default=False)  # True for auto-generated collages
    is_master_template = Column(Boolean, default=False)  # True for master templates
    
    # User and brand relationships
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    visibility = Column(String(20), default='PRIVATE')  # PUBLIC, PRIVATE, BRAND_ONLY
    
    # Template structure
    placeholders = Column(JSON, nullable=True)  # Dynamic placeholders
    assigned_brands = Column(JSON, nullable=True)  # List of brand IDs
    permissions = Column(JSON, nullable=True)  # Template permissions
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    creator = relationship("User", back_populates="templates")
    template_permissions = relationship("TemplatePermission", back_populates="template", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Template(id={self.id}, name='{self.name}', type='{self.template_type}')>"