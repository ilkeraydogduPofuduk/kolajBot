"""
Merkezi Konfigürasyon Sistemi
Tüm uygulama ayarları tek yerden yönetilir
"""

import os
from typing import Optional, List, Dict, Any
from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)

class DatabaseConfig(BaseSettings):
    """Database konfigürasyonu"""
    url: str = Field(default="mysql+pymysql://root:@localhost:3306/pfdk_ai", env="DATABASE_URL")
    pool_size: int = Field(default=20, env="DB_POOL_SIZE")
    max_overflow: int = Field(default=30, env="DB_MAX_OVERFLOW")
    pool_timeout: int = Field(default=30, env="DB_POOL_TIMEOUT")
    pool_recycle: int = Field(default=3600, env="DB_POOL_RECYCLE")
    echo: bool = Field(default=False, env="DB_ECHO")

class SecurityConfig(BaseSettings):
    """Güvenlik konfigürasyonu"""
    secret_key: str = Field(default="your-secret-key-change-in-production", env="SECRET_KEY")
    algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=15, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(default=7, env="REFRESH_TOKEN_EXPIRE_DAYS")
    bcrypt_rounds: int = Field(default=12, env="BCRYPT_ROUNDS")
    max_login_attempts: int = Field(default=5, env="MAX_LOGIN_ATTEMPTS")
    lockout_duration_minutes: int = Field(default=15, env="LOCKOUT_DURATION_MINUTES")

class CORSConfig(BaseSettings):
    """CORS konfigürasyonu"""
    allowed_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"],
        env="ALLOWED_ORIGINS"
    )
    allowed_methods: List[str] = Field(default=["GET", "POST", "PUT", "DELETE", "OPTIONS"], env="ALLOWED_METHODS")
    allowed_headers: List[str] = Field(default=["*"], env="ALLOWED_HEADERS")

class RedisConfig(BaseSettings):
    """Redis konfigürasyonu"""
    url: str = Field(default="redis://localhost:6379", env="REDIS_URL")
    enabled: bool = Field(default=True, env="REDIS_ENABLED")
    timeout: int = Field(default=5, env="REDIS_TIMEOUT")

class EmailConfig(BaseSettings):
    """Email konfigürasyonu"""
    smtp_server: Optional[str] = Field(default=None, env="SMTP_SERVER")
    smtp_port: int = Field(default=587, env="SMTP_PORT")
    smtp_username: Optional[str] = Field(default=None, env="SMTP_USERNAME")
    smtp_password: Optional[str] = Field(default=None, env="SMTP_PASSWORD")
    from_email: str = Field(default="noreply@aibrands.com", env="FROM_EMAIL")
    from_name: str = Field(default="AI Brands", env="FROM_NAME")
    use_ssl: bool = Field(default=False, env="SMTP_USE_SSL")

class GoogleAIConfig(BaseSettings):
    """Google AI konfigürasyonu"""
    api_key: Optional[str] = Field(default=None, env="GOOGLE_AI_API_KEY")
    enabled: bool = Field(default=True, env="GOOGLE_AI_ENABLED")

class OCRConfig(BaseSettings):
    """OCR konfigürasyonu"""
    google_ai_api_key: Optional[str] = Field(default=None, env="GOOGLE_AI_API_KEY")
    parallel_workers: int = Field(default=10, env="OCR_PARALLEL_WORKERS")
    timeout: int = Field(default=30, env="OCR_TIMEOUT")
    retry_count: int = Field(default=3, env="OCR_RETRY_COUNT")

class UploadConfig(BaseSettings):
    """Upload konfigürasyonu"""
    max_file_count: int = Field(default=1000, env="MAX_FILE_COUNT")  # ✅ 1000 files per upload
    max_file_size_mb: int = Field(default=10, env="MAX_FILE_SIZE_MB")
    allowed_extensions: List[str] = Field(default=["jpg", "jpeg", "png", "webp"], env="ALLOWED_EXTENSIONS")
    total_upload_size_mb: int = Field(default=500, env="TOTAL_UPLOAD_SIZE_MB")
    storage_path: str = Field(default="uploads", env="STORAGE_PATH")

class TelegramConfig(BaseSettings):
    """Telegram konfigürasyonu"""
    bot_token: Optional[str] = Field(default=None, env="TELEGRAM_BOT_TOKEN")
    chat_id: Optional[str] = Field(default=None, env="TELEGRAM_CHAT_ID")

class AppConfig(BaseSettings):
    """Ana uygulama konfigürasyonu"""
    name: str = Field(default="AI Brands", env="APP_NAME")
    version: str = Field(default="2.0.0", env="APP_VERSION")
    description: str = Field(default="AI Destekli Marka Yönetim Platformu", env="APP_DESCRIPTION")
    author: str = Field(default="AI Brands Team", env="APP_AUTHOR")
    environment: str = Field(default="development", env="ENVIRONMENT")
    debug: bool = Field(default=True, env="DEBUG")
    backend_url: str = Field(default="http://localhost:8005", env="BACKEND_URL")
    frontend_url: str = Field(default="http://localhost:3000", env="FRONTEND_URL")

class Settings:
    """Merkezi konfigürasyon sınıfı"""
    
    def __init__(self):
        self.database = DatabaseConfig()
        self.security = SecurityConfig()
        self.cors = CORSConfig()
        self.redis = RedisConfig()
        self.email = EmailConfig()
        self.google_ai = GoogleAIConfig()
        self.ocr = OCRConfig()
        self.upload = UploadConfig()
        self.telegram = TelegramConfig()
        self.app = AppConfig()
        
        # Load settings from database
        self._load_database_settings()
        
        # Environment validation
        self._validate_environment()
        
    def _load_database_settings(self):
        """Load settings from database"""
        try:
            from sqlalchemy import create_engine, text
            from sqlalchemy.orm import sessionmaker
            
            # Create database connection
            engine = create_engine(self.database.url)
            SessionLocal = sessionmaker(bind=engine)
            db = SessionLocal()
            
            # Load settings from database
            result = db.execute(text("SELECT category, `key`, value FROM settings WHERE is_active = 1"))
            settings_data = {f"{row.category}_{row.key}": row.value for row in result}
            
            # Update Google AI settings
            if 'ocr_google_ai_api_key' in settings_data:
                self.google_ai.api_key = settings_data['ocr_google_ai_api_key']
                self.ocr.google_ai_api_key = settings_data['ocr_google_ai_api_key']
            
            # Update OCR settings
            if 'ocr_parallel_workers' in settings_data:
                self.ocr.parallel_workers = int(settings_data['ocr_parallel_workers'])
            if 'ocr_ocr_timeout' in settings_data:
                self.ocr.timeout = int(settings_data['ocr_ocr_timeout'])
            if 'ocr_ocr_retry_count' in settings_data:
                self.ocr.retry_count = int(settings_data['ocr_ocr_retry_count'])
            
            # Update Upload settings
            if 'upload_max_file_count' in settings_data:
                self.upload.max_file_count = int(settings_data['upload_max_file_count'])
            if 'upload_max_file_size_mb' in settings_data:
                self.upload.max_file_size_mb = int(settings_data['upload_max_file_size_mb'])
            if 'upload_allowed_extensions' in settings_data:
                self.upload.allowed_extensions = settings_data['upload_allowed_extensions'].split(',')
            if 'upload_total_upload_size_mb' in settings_data:
                self.upload.total_upload_size_mb = int(settings_data['upload_total_upload_size_mb'])
            if 'upload_storage_path' in settings_data:
                self.upload.storage_path = settings_data['upload_storage_path']
            
            # Update Email settings
            if 'email_smtp_server' in settings_data:
                self.email.smtp_server = settings_data['email_smtp_server']
            if 'email_smtp_port' in settings_data:
                self.email.smtp_port = int(settings_data['email_smtp_port'])
            if 'email_smtp_username' in settings_data:
                self.email.smtp_username = settings_data['email_smtp_username']
            if 'email_smtp_password' in settings_data:
                self.email.smtp_password = settings_data['email_smtp_password']
            if 'email_from_email' in settings_data:
                self.email.from_email = settings_data['email_from_email']
            if 'email_from_name' in settings_data:
                self.email.from_name = settings_data['email_from_name']
            if 'email_smtp_use_ssl' in settings_data:
                self.email.use_ssl = settings_data['email_smtp_use_ssl'].lower() == 'true'
            
            db.close()
            logger.info("Database settings loaded successfully")
            
        except Exception as e:
            logger.warning(f"Failed to load database settings: {e}")
        
    def _validate_environment(self):
        """Environment validation"""
        if self.app.environment == "production":
            if self.security.secret_key == "your-secret-key-change-in-production":
                logger.warning("Production environment detected but default secret key is being used!")
            
            if not self.email.smtp_server:
                logger.warning("Production environment detected but email is not configured!")
                
            if not self.ocr.google_ai_api_key:
                logger.warning("Production environment detected but OCR API key is not configured!")
    
    def get_database_url(self) -> str:
        """Database URL getter"""
        return self.database.url
    
    def get_cors_origins(self) -> List[str]:
        """CORS origins getter"""
        return self.cors.allowed_origins
    
    def get_upload_limits(self) -> Dict[str, Any]:
        """Upload limits getter"""
        return {
            "max_file_count": self.upload.max_file_count,
            "max_file_size_mb": self.upload.max_file_size_mb,
            "allowed_extensions": self.upload.allowed_extensions,
            "total_upload_size_mb": self.upload.total_upload_size_mb,
            "storage_path": self.upload.storage_path
        }
    
    def get_ocr_config(self) -> Dict[str, Any]:
        """OCR config getter"""
        return {
            "api_key": self.ocr.google_ai_api_key,
            "parallel_workers": self.ocr.parallel_workers,
            "timeout": self.ocr.timeout,
            "retry_count": self.ocr.retry_count
        }
    
    def is_production(self) -> bool:
        """Production environment check"""
        return self.app.environment == "production"
    
    def is_development(self) -> bool:
        """Development environment check"""
        return self.app.environment == "development"
    
    def get_app_info(self) -> Dict[str, str]:
        """App info getter"""
        return {
            "name": self.app.name,
            "version": self.app.version,
            "description": self.app.description,
            "author": self.app.author,
            "environment": self.app.environment
        }

@lru_cache()
def get_settings() -> Settings:
    """Settings singleton"""
    return Settings()

# Global settings instance
settings = get_settings()

# Export commonly used configs
database_config = settings.database
security_config = settings.security
cors_config = settings.cors
redis_config = settings.redis
email_config = settings.email
google_ai_config = settings.google_ai
ocr_config = settings.ocr
upload_config = settings.upload
telegram_config = settings.telegram
app_config = settings.app
