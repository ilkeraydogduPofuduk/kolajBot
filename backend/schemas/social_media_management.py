from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime

class SocialMediaAccountResponse(BaseModel):
    id: int
    platform: str  # 'whatsapp' or 'telegram'
    account_name: str
    username: str
    phone_number: Optional[str] = None
    channel_id: Optional[str] = None
    brand_id: int
    brand_name: str
    manager_id: int
    manager_name: str
    manager_email: str
    is_active: bool
    is_verified: bool
    followers_count: Optional[int] = None
    messages_sent_today: int
    messages_sent_week: int
    last_activity: Optional[datetime] = None
    created_at: datetime
    status: str  # 'active', 'inactive', 'suspended', 'pending'
    connection_status: str  # 'connected', 'disconnected', 'error'
    last_sync: Optional[datetime] = None

    class Config:
        from_attributes = True

class SocialMediaStatsResponse(BaseModel):
    total_accounts: int
    active_accounts: int
    inactive_accounts: int
    verified_accounts: int
    total_followers: int
    total_groups: int
    total_channels: int
    messages_sent_today: int
    messages_sent_week: int
    total_employees: int
    engagement_rate: float
    platform_breakdown: Dict[str, int]
    status_breakdown: Dict[str, int]
    whatsapp_stats: Dict[str, int]
    telegram_stats: Dict[str, int]

    class Config:
        from_attributes = True

class AccountActivityResponse(BaseModel):
    id: int
    account_id: int
    account_name: str
    platform: str
    activity_type: str  # 'message_sent', 'user_joined', 'user_left', 'settings_changed', 'verification'
    description: str
    timestamp: datetime
    user_name: Optional[str] = None

    class Config:
        from_attributes = True

class BulkStatusUpdateRequest(BaseModel):
    account_ids: List[int]
    status: str  # 'active', 'inactive', 'suspended'

    class Config:
        from_attributes = True

class AccountCreateRequest(BaseModel):
    account_name: str
    username: str
    phone_number: Optional[str] = None
    channel_id: Optional[str] = None
    brand_id: int
    is_active: bool = True
    is_verified: bool = False

    class Config:
        from_attributes = True

class AccountUpdateRequest(BaseModel):
    account_name: str
    username: str
    phone_number: Optional[str] = None
    channel_id: Optional[str] = None
    brand_id: int
    is_active: bool
    is_verified: bool

    class Config:
        from_attributes = True

class SocialMediaSettingsRequest(BaseModel):
    platform: str  # 'whatsapp' or 'telegram'
    settings: Dict[str, str]  # Key-value pairs of settings
    brand_id: Optional[int] = None  # For brand-specific settings

class SocialMediaSettingsResponse(BaseModel):
    platform: str
    settings: Dict[str, str]
    brand_id: Optional[int] = None
    updated_at: datetime
    
    class Config:
        from_attributes = True

class BrandSocialMediaSettingsRequest(BaseModel):
    brand_id: int
    platform: str  # 'whatsapp' or 'telegram'
    settings: Dict[str, str]  # Key-value pairs of settings

class BrandSocialMediaSettingsResponse(BaseModel):
    brand_id: int
    brand_name: str
    platform: str
    settings: Dict[str, str]
    is_active: bool
    updated_at: datetime
    
    class Config:
        from_attributes = True

class AllBrandsSettingsResponse(BaseModel):
    brands: List[BrandSocialMediaSettingsResponse]
    total_brands: int
    
    class Config:
        from_attributes = True
