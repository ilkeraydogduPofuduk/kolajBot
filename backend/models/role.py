from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)  # 'super_admin', 'brand_manager', etc.
    display_name = Column(String(100), nullable=False)  # 'Super Admin', 'Marka Yöneticisi', etc.
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    is_system_role = Column(Boolean, default=False)  # Super Admin gibi sistem rolleri
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    users = relationship("User", back_populates="role")
    role_permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    employee_requests = relationship("EmployeeRequest", back_populates="role")
    
    def __repr__(self):
        return f"<Role(id={self.id}, name='{self.name}', display_name='{self.display_name}')>"