from pydantic import BaseModel, create_model
from typing import Optional, List, Any
from datetime import datetime

# Define base model without dynamic creation to avoid complexity
class SocialMediaChannelBase(BaseModel):
    name: str
    platform: str
    type: str  # 'group' or 'channel'
    channel_id: str
    member_count: Optional[int] = 0
    is_active: Optional[bool] = True
    # Telegram specific fields
    bot_token: Optional[str] = None
    chat_id: Optional[str] = None

    # Add validation through model methods if needed
    def validate_platform(self):
        valid_platforms = ['telegram']  # Only telegram for now
        if self.platform not in valid_platforms:
            raise ValueError(f'Platform must be one of: {", ".join(valid_platforms)}')
    
    def validate_type(self):
        if self.type not in ['group', 'channel']:
            raise ValueError('Type must be either group or channel')

class SocialMediaChannelCreate(SocialMediaChannelBase):
    brand_id: int

class SocialMediaChannelUpdate(BaseModel):
    name: Optional[str] = None
    platform: Optional[str] = None
    type: Optional[str] = None
    channel_id: Optional[str] = None
    member_count: Optional[int] = None
    is_active: Optional[bool] = None
    bot_token: Optional[str] = None
    chat_id: Optional[str] = None

class SocialMediaChannelResponse(SocialMediaChannelBase):
    id: int
    brand_id: int
    brand_name: str
    assigned_user_ids: Optional[List[int]] = None
    last_activity: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    created_by: int
    creator_name: str
    updated_by: Optional[int]
    updater_name: Optional[str]

    class Config:
        from_attributes = True

class SocialMediaChannelListResponse(BaseModel):
    channels: List[SocialMediaChannelResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class ChannelStatistics(BaseModel):
    total_channels: int
    telegram_channels: int
    active_channels: int
    total_members: int

class ChannelAssignUsersRequest(BaseModel):
    user_ids: List[int]

class ChannelAssignUsersResponse(BaseModel):
    message: str
    assigned_user_ids: List[int]

