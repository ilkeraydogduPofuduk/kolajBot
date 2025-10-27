from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, UniqueConstraint, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class SocialMediaChannel(Base):
    __tablename__ = 'social_media_channels'
    __table_args__ = (
        # Benzersizlik: aynı marka altında aynı platform+channel_id tekrar edemez
        UniqueConstraint('platform', 'channel_id', 'brand_id', name='uq_platform_channel_brand'),
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    platform = Column(String(50), nullable=False)  # 'telegram'
    type = Column(String(50), nullable=False)  # 'group' or 'channel'
    channel_id = Column(String(255), nullable=False)  # Telegram channel ID
    member_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    last_activity = Column(DateTime)
    
    # Platform-specific settings
    # Telegram fields
    telegram_bot_id = Column(Integer, ForeignKey('telegram_bots.id'), nullable=True, comment="İlişkili Telegram bot")
    chat_id = Column(String(255))      # Telegram chat ID
    channel_username = Column(String(255), nullable=True, comment="Kanal username (@kanaladim)")
    
    # Channel management
    assigned_user_ids = Column(JSON, nullable=True)  # List of user IDs who can manage this channel
    
    # Relationships
    brand_id = Column(Integer, ForeignKey('brands.id'), nullable=False)
    brand = relationship("Brand")
    
    telegram_bot = relationship("TelegramBot", back_populates="channels")
    
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    creator = relationship("User", foreign_keys=[created_by])
    
    updated_by = Column(Integer, ForeignKey('users.id'))
    updater = relationship("User", foreign_keys=[updated_by])
    
    # Relationship with messages
    messages = relationship("SocialMediaMessage", back_populates="channel", cascade="all, delete-orphan")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
