"""
Telegram Bot Model
Manages telegram bot tokens separately from channels
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class TelegramBot(Base):
    __tablename__ = "telegram_bots"
    
    id = Column(Integer, primary_key=True, index=True)
    bot_name = Column(String(255), nullable=False, comment="Bot'un display adı (örn: 'KolajBot')")
    bot_username = Column(String(255), nullable=False, unique=True, index=True, comment="Bot'un Telegram username'i (@kolajbot)")
    bot_token = Column(Text, nullable=False, unique=True, comment="Telegram bot token")
    bot_user_id = Column(String(100), nullable=True, comment="Telegram bot user ID")
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    is_verified = Column(Boolean, default=False, comment="Bot token'ı doğrulandı mı?")
    last_verified_at = Column(DateTime, nullable=True)
    
    # Admin tarafından eklendi
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    creator = relationship("User", foreign_keys=[created_by])
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # İlişkiler - Bu bot'a bağlı kanallar
    channels = relationship("SocialMediaChannel", back_populates="telegram_bot", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<TelegramBot(id={self.id}, username='{self.bot_username}', name='{self.bot_name}')>"

