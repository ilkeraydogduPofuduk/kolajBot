from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class UploadJob(Base):
    """Upload tracking - async processing için"""
    __tablename__ = "upload_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # İlişkiler
    brand_id = Column(Integer, ForeignKey('brands.id'), nullable=False)
    brand = relationship("Brand")
    
    uploader_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    uploader = relationship("User", foreign_keys=[uploader_id])
    
    brand_manager_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    brand_manager = relationship("User", foreign_keys=[brand_manager_id])
    
    # Upload bilgileri
    upload_date = Column(DateTime, nullable=False)
    total_files = Column(Integer, default=0)
    processed_files = Column(Integer, default=0)
    
    # Status: pending, processing, completed, error
    status = Column(String(20), default="pending", index=True)
    
    # Klasör yapısı
    base_path = Column(Text, nullable=False)  # uploads/manager/brand/employee/date/
    
    # İşlem detayları
    file_list = Column(JSON, nullable=True)  # Yüklenen dosya listesi
    processing_log = Column(JSON, nullable=True)  # İşlem log'u
    error_message = Column(Text, nullable=True)
    
    # İstatistikler
    products_created = Column(Integer, default=0)
    templates_created = Column(Integer, default=0)
    ocr_processed = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<UploadJob(id={self.id}, status='{self.status}', files={self.total_files})>"

