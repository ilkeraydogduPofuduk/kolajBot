from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from .social_media_channel import SocialMediaChannelResponse


class SocialMediaMessageBase(BaseModel):
    channel_id: int
    message_id: Optional[str] = None
    message_text: Optional[str] = None
    sender_id: Optional[str] = None
    sender_name: Optional[str] = None
    recipient_id: Optional[str] = None
    message_type: str = "text"
    media_url: Optional[str] = None
    file_name: Optional[str] = None
    timestamp: Optional[datetime] = None
    is_sent: bool = True
    is_read: bool = False


# Create schema should not require channel_id because it's in the path
class SocialMediaMessageCreate(BaseModel):
    message_text: Optional[str] = Field(None, description="The message text content")
    message_type: Optional[str] = Field("text", description="text, image, video, document")
    media_url: Optional[str] = None
    file_name: Optional[str] = None
    timestamp: Optional[datetime] = None


class SocialMediaMessageUpdate(BaseModel):
    message_text: Optional[str] = None
    is_read: Optional[bool] = None


class SocialMediaMessageResponse(SocialMediaMessageBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SocialMediaMessageListResponse(BaseModel):
    messages: list[SocialMediaMessageResponse]
    total: int
    page: int
    per_page: int
    total_pages: int