from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class SettingsCreate(BaseModel):
    category: str
    key: str
    value: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    is_sensitive: bool = False

class SettingsUpdate(BaseModel):
    value: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class SettingsResponse(BaseModel):
    id: int
    category: str
    key: str
    value: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    is_sensitive: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class SettingsListResponse(BaseModel):
    settings: List[SettingsResponse]
    total: int

class SettingsCategoryResponse(BaseModel):
    category: str
    settings: Dict[str, Any]  # key-value pairs
