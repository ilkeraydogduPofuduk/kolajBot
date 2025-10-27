from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class SocialMediaMessage(Base):
    __tablename__ = "social_media_messages"

    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("social_media_channels.id"), nullable=False)
    message_id = Column(String(255), nullable=True)  # Platform-specific message ID
    message_text = Column(Text, nullable=True)
    sender_id = Column(String(255), nullable=True)  # Platform-specific user ID
    sender_name = Column(String(255), nullable=True)
    recipient_id = Column(String(255), nullable=True)  # Platform-specific recipient ID
    message_type = Column(String(50), default="text")  # text, image, video, document, etc.
    media_url = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)
    is_sent = Column(Boolean, default=True)  # True if sent by bot, False if received
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationship
    channel = relationship("SocialMediaChannel", back_populates="messages")