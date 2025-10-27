"""
Telegram Discovery Schemas
Telegram kanal keşfi için şemalar
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class TelegramChannelAddRequest(BaseModel):
    """Telegram kanal ekleme isteği (YENİ YAPI)"""
    telegram_bot_id: int = Field(..., description="Bot ID")
    channel_identifier: str = Field(..., description="Kanal identifier (username or invite)")
    brand_id: int = Field(..., description="Marka ID")
    step: str = Field("initial", description="initial or verify")
    channel_username: Optional[str] = Field(None, description="Verify step için username")

# LEGACY - Eski yapı için (geriye uyumluluk)
class TelegramChannelAddRequestLegacy(BaseModel):
    """Telegram kanal ekleme isteği (ESKİ YAPI)"""
    bot_token: str = Field(..., description="Bot token")
    chat_id: str = Field(..., description="Chat ID")
    brand_id: int = Field(..., description="Marka ID")
    channel_username: Optional[str] = Field(None, description="Kanal kullanıcı adı")

class TelegramChannelAddResponse(BaseModel):
    """Telegram kanal ekleme yanıtı"""
    success: bool = Field(..., description="İşlem başarılı mı")
    channel_id: Optional[int] = Field(None, description="Oluşturulan kanal ID")
    message: str = Field(..., description="İşlem mesajı")
    channel_info: Optional[Dict[str, Any]] = Field(None, description="Kanal bilgileri")
    requires_verification: Optional[bool] = Field(False, description="Manuel doğrulama gerekiyor mu")
    instructions: Optional[List[str]] = Field(None, description="Kullanıcı talimatları")
    step: Optional[str] = Field(None, description="Adım")

class TelegramBotInfo(BaseModel):
    """Telegram bot bilgileri"""
    id: int = Field(..., description="Bot ID")
    username: str = Field(..., description="Bot kullanıcı adı")
    first_name: str = Field(..., description="Bot adı")
    can_join_groups: bool = Field(..., description="Gruplara katılabilir mi")
    can_read_all_group_messages: bool = Field(..., description="Tüm grup mesajlarını okuyabilir mi")
    supports_inline_queries: bool = Field(..., description="Inline sorguları destekler mi")

class TelegramChatInfo(BaseModel):
    """Telegram chat bilgileri"""
    id: int = Field(..., description="Chat ID")
    title: Optional[str] = Field(None, description="Chat başlığı")
    username: Optional[str] = Field(None, description="Chat kullanıcı adı")
    type: str = Field(..., description="Chat türü")
    member_count: Optional[int] = Field(None, description="Üye sayısı")
    description: Optional[str] = Field(None, description="Chat açıklaması")

class TelegramDiscoveryResult(BaseModel):
    """Telegram keşif sonucu"""
    bot_info: TelegramBotInfo = Field(..., description="Bot bilgileri")
    chat_info: TelegramChatInfo = Field(..., description="Chat bilgileri")
    is_bot_admin: bool = Field(..., description="Bot yönetici mi")
    can_add_channel: bool = Field(..., description="Kanal eklenebilir mi")
    error_message: Optional[str] = Field(None, description="Hata mesajı")

class TelegramChannelListRequest(BaseModel):
    """Telegram kanal listesi isteği"""
    bot_token: str = Field(..., description="Bot token")
    brand_id: int = Field(..., description="Marka ID")

class TelegramChannelListResponse(BaseModel):
    """Telegram kanal listesi yanıtı"""
    success: bool = Field(..., description="İşlem başarılı mı")
    channels: List[TelegramChatInfo] = Field(..., description="Kanal listesi")
    message: str = Field(..., description="İşlem mesajı")

class TelegramTestMessageRequest(BaseModel):
    """Telegram test mesajı isteği"""
    channel_id: int = Field(..., description="Kanal ID")
    message: str = Field(..., description="Test mesajı")
    recipient: Optional[str] = Field(None, description="Alıcı")

class TelegramTestMessageResponse(BaseModel):
    """Telegram test mesajı yanıtı"""
    success: bool = Field(..., description="İşlem başarılı mı")
    message_id: Optional[int] = Field(None, description="Mesaj ID")
    error_message: Optional[str] = Field(None, description="Hata mesajı")

class TelegramBulkChannelAddRequest(BaseModel):
    telegram_bot_id: int = Field(..., description="Bot ID")
    channel_identifiers: List[str] = Field(..., description="Kanal username listesi, her satır bir kanal (@kanaladim)")
    brand_id: int = Field(..., description="Marka ID")

class BulkAddResponse(BaseModel):
    success: bool = Field(..., description="Genel işlem başarılı mı?")
    success_count: int = Field(0, description="Başarıyla eklenen kanal sayısı")
    failed_count: int = Field(0, description="Başarısız kanal sayısı")
    added_channels: List[Dict[str, Any]] = Field(default_factory=list, description="Eklenen kanallar")
    failed_channels: List[Dict[str, Any]] = Field(default_factory=list, description="Başarısız kanallar (username, reason)")
    instructions: Optional[List[str]] = Field(None, description="Manuel talimatlar (başarısız için)")
    message: str = Field(..., description="Özet mesaj")
