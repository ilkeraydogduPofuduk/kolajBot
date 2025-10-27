from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from enum import Enum

class RequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class EmployeeRequestBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone_number: Optional[str] = None
    role_id: int
    brand_ids: List[int] = []
    request_message: Optional[str] = None

class EmployeeRequestCreate(EmployeeRequestBase):
    pass

class EmployeeRequestUpdate(BaseModel):
    status: RequestStatus
    admin_notes: Optional[str] = None

class EmployeeRequestResponse(EmployeeRequestBase):
    id: int
    requested_by_user_id: int
    status: RequestStatus
    admin_notes: Optional[str] = None
    approved_by_user_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Related data
    requested_by_name: Optional[str] = None
    approved_by_name: Optional[str] = None
    role_name: Optional[str] = None
    brand_names: List[str] = []
    
    # Talep sahibinin marka bilgileri
    requested_by_brand_ids: List[int] = []
    
    class Config:
        from_attributes = True

class EmployeeRequestListResponse(BaseModel):
    requests: List[EmployeeRequestResponse]
    total: int
    page: int
    per_page: int
