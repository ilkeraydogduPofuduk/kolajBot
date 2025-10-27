"""
User-Brand Junction Table Model
Many-to-many relationship between users and brands
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class UserBrand(Base):
    """User-Brand junction table for many-to-many relationship"""
    __tablename__ = "user_brands"
    __table_args__ = (
        UniqueConstraint('user_id', 'brand_id', name='uq_user_brand'),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    brand_id = Column(Integer, ForeignKey('brands.id', ondelete='CASCADE'), nullable=False, index=True)
    access_level = Column(String(20), nullable=False, default='view')
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="user_brands")
    brand = relationship("Brand", back_populates="user_brands")

    def __repr__(self):
        return f"<UserBrand(user_id={self.user_id}, brand_id={self.brand_id})>"
