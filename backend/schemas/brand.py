from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class BrandBase(BaseModel):
    name: str
    category_id: Optional[int] = None
    logo_url: str

class BrandCreate(BrandBase):
    pass

class BrandCreateWithFile(BaseModel):
    name: str
    category_id: Optional[int] = None
    logo_url: str = "temp"  # Geçici değer

class BrandUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    logo_url: Optional[str] = None
    product_ids: Optional[List[int]] = None
    template_ids: Optional[List[int]] = None
    is_active: Optional[bool] = None

class BrandResponse(BrandBase):
    id: int
    product_ids: Optional[List[int]] = None
    template_ids: Optional[List[int]] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    category: Optional[dict] = None

    class Config:
        from_attributes = True

class BrandRequestBase(BaseModel):
    name: str
    category_id: Optional[int] = None
    logo_url: str
    request_message: Optional[str] = None

class BrandRequestCreate(BrandRequestBase):
    pass

class BrandRequestUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    logo_url: Optional[str] = None
    request_message: Optional[str] = None

class BrandRequestResponse(BrandRequestBase):
    id: int
    requested_by_user_id: int
    status: str  # 'pending', 'approved', 'rejected'
    admin_notes: Optional[str] = None
    approved_by_user_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    requested_by_name: Optional[str] = None
    approved_by_name: Optional[str] = None

    class Config:
        from_attributes = True

class BrandListResponse(BaseModel):
    brands: List[BrandResponse]
    total: int
    page: int
    per_page: int

class BrandRequestListResponse(BaseModel):
    requests: List[BrandRequestResponse]
    total: int
    page: int
    per_page: int