from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class PermissionBase(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    module: str

class PermissionCreate(PermissionBase):
    pass

class PermissionResponse(PermissionBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class RoleBase(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    permission_ids: List[int] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    permission_ids: Optional[List[int]] = None

class RoleResponse(RoleBase):
    id: int
    is_active: bool
    is_system_role: bool
    user_count: Optional[int] = 0
    permissions: List[PermissionResponse] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class RolePermissionsResponse(BaseModel):
    role_id: int
    role_name: str
    role_display_name: str
    permissions: List[PermissionResponse] = []
    
    class Config:
        from_attributes = True

class RoleListResponse(BaseModel):
    roles: List[RoleResponse]
    total: int
    page: int
    per_page: int
