"""
Telegram Bot Schemas
Pydantic models for Telegram bot management
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TelegramBotBase(BaseModel):
    """Base schema for Telegram Bot"""
    bot_name: str = Field(..., description="Bot'un display adı")
    bot_username: str = Field(..., description="Bot'un Telegram username'i (@kolajbot)")


class TelegramBotCreate(BaseModel):
    """Schema for creating a new Telegram bot - Sadece token yeterli!"""
    bot_token: str = Field(..., description="Telegram bot token (API key)")


class TelegramBotUpdate(BaseModel):
    """Schema for updating a Telegram bot"""
    bot_name: Optional[str] = None
    bot_username: Optional[str] = None
    bot_token: Optional[str] = None
    is_active: Optional[bool] = None


class TelegramBotResponse(TelegramBotBase):
    """Schema for Telegram bot response"""
    id: int
    bot_user_id: Optional[str] = None
    is_active: bool
    is_verified: bool
    last_verified_at: Optional[datetime] = None
    created_by: int
    creator_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    channel_count: Optional[int] = 0  # Kaç kanal bu bot'a bağlı
    message: Optional[str] = None  # Bot creation/update message
    discovered_channels_count: Optional[int] = None  # Auto-discovered channels on creation

    class Config:
        from_attributes = True


class TelegramBotListResponse(BaseModel):
    """Schema for list of Telegram bots"""
    bots: list[TelegramBotResponse]
    total: int


class TelegramBotVerifyResponse(BaseModel):
    """Schema for bot token verification"""
    success: bool
    message: str
    bot_info: Optional[dict] = None

