from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime

class TemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    product_id: int
    brand_id: int
    template_type: str = 'standard'
    template_data: Any  # JSON data
    visibility: str = 'PRIVATE'
    tags: Optional[list] = None

class TemplateCreate(TemplateBase):
    pass

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    template_type: Optional[str] = None
    template_data: Optional[Any] = None
    visibility: Optional[str] = None
    tags: Optional[list] = None
    is_active: Optional[bool] = None

class TemplateResponse(TemplateBase):
    id: int
    preview_image_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    is_active: bool
    is_default: bool
    is_auto_generated: bool
    version: int
    parent_template_id: Optional[int] = None
    shared_with: Optional[list] = None
    usage_count: int
    last_used_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: int
    
    # İlişkili veriler
    product: Optional[dict] = None
    brand: Optional[dict] = None
    creator: Optional[dict] = None
    
    class Config:
        from_attributes = True
