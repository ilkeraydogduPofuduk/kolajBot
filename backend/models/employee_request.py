from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import enum

class RequestStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class EmployeeRequest(Base):
    __tablename__ = "employee_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    requested_by_user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    email = Column(String(191), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone_number = Column(String(20), nullable=True)
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=False)
    brand_ids = Column(JSON, nullable=True)  # Hangi markalara atanacak
    status = Column(Enum(RequestStatus), default=RequestStatus.PENDING)
    request_message = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)
    approved_by_user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    requested_by = relationship("User", foreign_keys=[requested_by_user_id], back_populates="requested_employees")
    approved_by = relationship("User", foreign_keys=[approved_by_user_id], back_populates="approved_employee_requests")
    role = relationship("Role", back_populates="employee_requests")
    
    def __repr__(self):
        return f"<EmployeeRequest(id={self.id}, email='{self.email}', status='{self.status.value}')>"
