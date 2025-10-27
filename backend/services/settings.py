from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from models.settings import Settings
from schemas.settings import SettingsCreate, SettingsUpdate
from utils.security import encrypt_sensitive_data, decrypt_sensitive_data
import json

class SettingsService:
    def __init__(self, db: Session):
        self.db = db
        
    def get_setting(self, category: str, key: str) -> Optional[str]:
        """Tek bir ayar değerini al"""
        setting = self.db.query(Settings).filter(
            Settings.category == category,
            Settings.key == key,
            Settings.is_active == True
        ).first()
        
        if not setting:
            return None
            
        if setting.is_sensitive and setting.value:
            # Şifrelenmiş veriyi çöz
            return decrypt_sensitive_data(setting.value)
        
        return setting.value
    
    def get_category_settings(self, category: str) -> Dict[str, Any]:
        """Bir kategorideki tüm ayarları al"""
        settings = self.db.query(Settings).filter(
            Settings.category == category,
            Settings.is_active == True
        ).all()
        
        result = {}
        for setting in settings:
            value = setting.value
            if setting.is_sensitive and value:
                value = decrypt_sensitive_data(value)
            
            # JSON değerleri parse et
            try:
                if value and (value.startswith('{') or value.startswith('[')):
                    value = json.loads(value)
            except:
                pass  # JSON değilse string olarak bırak
                
            result[setting.key] = value
            
        return result
    
    def set_setting(self, category: str, key: str, value: str, 
                   description: Optional[str] = None, is_sensitive: bool = False) -> Settings:
        """Ayar değerini güncelle veya oluştur"""
        setting = self.db.query(Settings).filter(
            Settings.category == category,
            Settings.key == key
        ).first()
        
        # Değeri şifrele (gerekirse)
        stored_value = value
        if is_sensitive and value:
            stored_value = encrypt_sensitive_data(value)
        
        if setting:
            # Güncelle
            setting.value = stored_value
            setting.description = description or setting.description
            setting.is_sensitive = is_sensitive
        else:
            # Oluştur
            setting = Settings(
                category=category,
                key=key,
                value=stored_value,
                description=description,
                is_sensitive=is_sensitive
            )
            self.db.add(setting)
        
        self.db.commit()
        self.db.refresh(setting)
        return setting
    
    def get_all_settings(self) -> List[Settings]:
        """Tüm ayarları al"""
        return self.db.query(Settings).filter(Settings.is_active == True).all()
    
    def delete_setting(self, category: str, key: str) -> bool:
        """Ayarı sil (soft delete)"""
        setting = self.db.query(Settings).filter(
            Settings.category == category,
            Settings.key == key
        ).first()
        
        if setting:
            setting.is_active = False
            self.db.commit()
            return True
        
        return False
    
    def init_default_settings(self):
        """Varsayılan ayarları oluştur"""
        defaults = [
                    # E-posta Ayarları
                    ("email", "smtp_server", "smtp.gmail.com", "SMTP Sunucu", False),
                    ("email", "smtp_port", "587", "SMTP Port", False),
                    ("email", "smtp_username", "ilker@pfdk.me", "SMTP Kullanıcı Adı", False),
                    ("email", "smtp_password", "your_gmail_app_password_here", "SMTP Şifre", True),
                    ("email", "smtp_use_ssl", "false", "SMTP SSL Kullan", False),
                    ("email", "smtp_use_tls", "true", "SMTP TLS Kullan", False),
                    ("email", "from_email", "ilker@pfdk.me", "Gönderen E-posta", False),
                    ("email", "from_name", "Pofuduk Digital", "Gönderen Adı", False),
            
                    # Google AI / OCR Ayarları
                    ("ocr", "google_ai_api_key", "", "Google AI Vision API Anahtarı", True),
                    ("ocr", "parallel_workers", "10", "Paralel OCR İşçi Sayısı", False),
                    ("ocr", "ocr_timeout", "30", "OCR Zaman Aşımı (saniye)", False),
                    ("ocr", "ocr_retry_count", "3", "OCR Yeniden Deneme Sayısı", False),
            
                    # Dosya Yükleme Ayarları
                    ("upload", "max_file_count", "500", "Maksimum Dosya Sayısı (tek seferde)", False),
                    ("upload", "max_file_size_mb", "10", "Maksimum Dosya Boyutu (MB)", False),
                    ("upload", "allowed_extensions", "jpg,jpeg,png,webp", "İzin Verilen Dosya Türleri (virgülle ayırın)", False),
                    ("upload", "total_upload_size_mb", "500", "Toplam Yükleme Boyutu Limiti (MB)", False),
                    ("upload", "storage_path", "uploads", "Dosya Depolama Yolu", False),
            
                    # Temel Web Sitesi Ayarları
                    ("general", "index_title", "Pofuduk Digital AI - Dijital Marka Yönetimi", "Ana Sayfa Başlığı", False),
                    ("general", "logo_url", "/assets/images/logo.svg", "Logo URL", False),
                    ("general", "meta_description", "AI destekli dijital marka yönetim platformu", "Meta Açıklama", False),
                    ("general", "meta_keywords", "dijital marka, AI, yapay zeka, marka yönetimi", "Meta Anahtar Kelimeleri", False),
            
        ]
        
        for category, key, value, description, is_sensitive in defaults:
            existing = self.db.query(Settings).filter(
                Settings.category == category,
                Settings.key == key
            ).first()
            
            if not existing:
                self.set_setting(category, key, value, description, is_sensitive)
