from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Brand(Base):
    __tablename__ = "brands"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    category_id = Column(Integer, ForeignKey('categories.id', ondelete='SET NULL'), nullable=True)
    logo_url = Column(String(500), nullable=False, comment="Marka logosu URL")
    
    # İlişkili veriler (JSON olarak saklanacak)
    product_ids = Column(JSON, nullable=True, comment="Bu markaya ait ürün ID'leri")
    template_ids = Column(JSON, nullable=True, comment="Bu markaya ait şablon ID'leri")
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    category = relationship("Category", back_populates="brands")
    products = relationship("Product", back_populates="brand")
    users = relationship("User", back_populates="brand")
    user_brands = relationship("UserBrand", back_populates="brand", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Brand(id={self.id}, name='{self.name}')>"


class BrandRequest(Base):
    __tablename__ = "brand_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    requested_by_user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(255), nullable=False)
    category_id = Column(Integer, ForeignKey('categories.id', ondelete='SET NULL'), nullable=True)
    logo_url = Column(String(500), nullable=False, comment="Marka logosu URL")
    request_message = Column(String(500), nullable=True)
    status = Column(String(20), default='pending', index=True)  # 'pending', 'approved', 'rejected'
    admin_notes = Column(String(500), nullable=True)
    approved_by_user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<BrandRequest(id={self.id}, name='{self.name}', status='{self.status}')>"
