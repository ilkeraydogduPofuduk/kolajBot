"""
Merkezi Sabitler Sistemi
Tüm sabitler tek yerden yönetilir
"""

from enum import Enum
from typing import Dict, List, Any

class UserRole(str, Enum):
    """Kullanıcı rolleri"""
    SUPER_ADMIN = "super_admin"
    BRAND_MANAGER = "brand_manager"
    EMPLOYEE = "employee"
    VIEWER = "viewer"

class UserStatus(str, Enum):
    """Kullanıcı durumları"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    SUSPENDED = "suspended"

class BrandStatus(str, Enum):
    """Marka durumları"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"

class ProductStatus(str, Enum):
    """Ürün durumları"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DRAFT = "draft"
    ARCHIVED = "archived"

class TemplateStatus(str, Enum):
    """Şablon durumları"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    DRAFT = "draft"
    ARCHIVED = "archived"

class UploadStatus(str, Enum):
    """Upload durumları"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class OCRStatus(str, Enum):
    """OCR durumları"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class NotificationType(str, Enum):
    """Bildirim türleri"""
    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"
    LOADING = "loading"

class LogLevel(str, Enum):
    """Log seviyeleri"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

# API Endpoints
class APIEndpoints:
    """API endpoint sabitleri"""
    AUTH_LOGIN = "/api/auth/login"
    AUTH_LOGOUT = "/api/auth/logout"
    AUTH_ME = "/api/auth/me"
    AUTH_REFRESH = "/api/auth/refresh"
    
    USERS = "/api/users"
    USER_DETAIL = "/api/users/{id}"
    
    BRANDS = "/api/brands"
    BRAND_DETAIL = "/api/brands/{id}"
    
    PRODUCTS = "/api/products"
    PRODUCT_DETAIL = "/api/products/{id}"
    PRODUCT_UPLOAD = "/api/products/upload"
    PRODUCT_UPLOAD_V2 = "/api/products/upload-v2"
    
    TEMPLATES = "/api/templates"
    TEMPLATE_DETAIL = "/api/templates/{id}"
    
    CATEGORIES = "/api/categories"
    CATEGORY_DETAIL = "/api/categories/{id}"
    
    SETTINGS = "/api/settings"
    SYSTEM_STATS = "/api/system/stats"
    PERFORMANCE_MONITOR = "/api/performance"

# File Extensions
class FileExtensions:
    """Dosya uzantıları"""
    IMAGES = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff"]
    DOCUMENTS = [".pdf", ".doc", ".docx", ".txt", ".rtf"]
    ARCHIVES = [".zip", ".rar", ".7z", ".tar", ".gz"]
    VIDEOS = [".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm"]
    AUDIOS = [".mp3", ".wav", ".flac", ".aac", ".ogg"]

# MIME Types
class MimeTypes:
    """MIME türleri"""
    IMAGES = [
        "image/jpeg", "image/jpg", "image/png", "image/gif", 
        "image/webp", "image/bmp", "image/tiff"
    ]
    DOCUMENTS = [
        "application/pdf", "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain", "application/rtf"
    ]
    ARCHIVES = [
        "application/zip", "application/x-rar-compressed", 
        "application/x-7z-compressed", "application/x-tar", "application/gzip"
    ]

# Database Tables
class DatabaseTables:
    """Veritabanı tablo isimleri"""
    USERS = "users"
    BRANDS = "brands"
    PRODUCTS = "products"
    PRODUCT_IMAGES = "product_images"
    TEMPLATES = "templates"
    CATEGORIES = "categories"
    UPLOAD_JOBS = "upload_jobs"
    SETTINGS = "settings"
    ROLES = "roles"
    EMPLOYEE_REQUESTS = "employee_requests"
    SOCIAL_MEDIA_CHANNELS = "social_media_channels"
    SOCIAL_MEDIA_MESSAGES = "social_media_messages"

# Cache Keys
class CacheKeys:
    """Cache anahtarları"""
    USER_PROFILE = "user_profile_{user_id}"
    BRAND_LIST = "brand_list"
    PRODUCT_LIST = "product_list_{brand_id}"
    TEMPLATE_LIST = "template_list_{brand_id}"
    SETTINGS = "settings_{category}"
    OCR_RESULT = "ocr_result_{file_hash}"
    UPLOAD_STATS = "upload_stats"

# Error Messages
class ErrorMessages:
    """Hata mesajları"""
    AUTH_INVALID_CREDENTIALS = "Geçersiz kullanıcı adı veya şifre"
    AUTH_TOKEN_EXPIRED = "Token süresi dolmuş"
    AUTH_TOKEN_INVALID = "Geçersiz token"
    AUTH_INSUFFICIENT_PERMISSIONS = "Yetersiz yetki"
    
    USER_NOT_FOUND = "Kullanıcı bulunamadı"
    USER_ALREADY_EXISTS = "Kullanıcı zaten mevcut"
    USER_INVALID_DATA = "Geçersiz kullanıcı verisi"
    
    BRAND_NOT_FOUND = "Marka bulunamadı"
    BRAND_ALREADY_EXISTS = "Marka zaten mevcut"
    BRAND_INVALID_DATA = "Geçersiz marka verisi"
    
    PRODUCT_NOT_FOUND = "Ürün bulunamadı"
    PRODUCT_INVALID_DATA = "Geçersiz ürün verisi"
    PRODUCT_UPLOAD_FAILED = "Ürün yükleme başarısız"
    
    TEMPLATE_NOT_FOUND = "Şablon bulunamadı"
    TEMPLATE_INVALID_DATA = "Geçersiz şablon verisi"
    TEMPLATE_GENERATION_FAILED = "Şablon oluşturma başarısız"
    
    FILE_NOT_FOUND = "Dosya bulunamadı"
    FILE_INVALID_TYPE = "Geçersiz dosya türü"
    FILE_SIZE_EXCEEDED = "Dosya boyutu aşıldı"
    FILE_UPLOAD_FAILED = "Dosya yükleme başarısız"
    
    DATABASE_CONNECTION_FAILED = "Veritabanı bağlantısı başarısız"
    DATABASE_QUERY_FAILED = "Veritabanı sorgusu başarısız"
    
    OCR_SERVICE_FAILED = "OCR servisi başarısız"
    EMAIL_SERVICE_FAILED = "E-posta servisi başarısız"
    TELEGRAM_SERVICE_FAILED = "Telegram servisi başarısız"
    
    SYSTEM_ERROR = "Sistem hatası"
    VALIDATION_ERROR = "Doğrulama hatası"
    CONFIGURATION_ERROR = "Konfigürasyon hatası"

# Success Messages
class SuccessMessages:
    """Başarı mesajları"""
    AUTH_LOGIN_SUCCESS = "Giriş başarılı"
    AUTH_LOGOUT_SUCCESS = "Çıkış başarılı"
    
    USER_CREATED = "Kullanıcı oluşturuldu"
    USER_UPDATED = "Kullanıcı güncellendi"
    USER_DELETED = "Kullanıcı silindi"
    
    BRAND_CREATED = "Marka oluşturuldu"
    BRAND_UPDATED = "Marka güncellendi"
    BRAND_DELETED = "Marka silindi"
    
    PRODUCT_CREATED = "Ürün oluşturuldu"
    PRODUCT_UPDATED = "Ürün güncellendi"
    PRODUCT_DELETED = "Ürün silindi"
    PRODUCT_UPLOAD_SUCCESS = "Ürün yükleme başarılı"
    
    TEMPLATE_CREATED = "Şablon oluşturuldu"
    TEMPLATE_UPDATED = "Şablon güncellendi"
    TEMPLATE_DELETED = "Şablon silindi"
    TEMPLATE_GENERATION_SUCCESS = "Şablon oluşturma başarılı"
    
    FILE_UPLOAD_SUCCESS = "Dosya yükleme başarılı"
    FILE_DELETE_SUCCESS = "Dosya silme başarılı"
    
    OCR_SUCCESS = "OCR işlemi başarılı"
    EMAIL_SENT = "E-posta gönderildi"
    TELEGRAM_MESSAGE_SENT = "Telegram mesajı gönderildi"

# Validation Rules
class ValidationRules:
    """Doğrulama kuralları"""
    USERNAME_MIN_LENGTH = 3
    USERNAME_MAX_LENGTH = 50
    PASSWORD_MIN_LENGTH = 8
    PASSWORD_MAX_LENGTH = 128
    
    BRAND_NAME_MIN_LENGTH = 2
    BRAND_NAME_MAX_LENGTH = 100
    
    PRODUCT_CODE_MIN_LENGTH = 3
    PRODUCT_CODE_MAX_LENGTH = 50
    
    TEMPLATE_NAME_MIN_LENGTH = 3
    TEMPLATE_NAME_MAX_LENGTH = 100
    
    FILE_MAX_SIZE_MB = 10
    FILE_MAX_COUNT = 500
    TOTAL_UPLOAD_SIZE_MB = 500

# Pagination
class Pagination:
    """Sayfalama sabitleri"""
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100
    PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

# Timeouts
class Timeouts:
    """Zaman aşımı sabitleri"""
    API_REQUEST = 30  # seconds
    OCR_PROCESSING = 30  # seconds
    FILE_UPLOAD = 300  # seconds
    EMAIL_SEND = 10  # seconds
    TELEGRAM_SEND = 10  # seconds

# Retry Counts
class RetryCounts:
    """Yeniden deneme sayıları"""
    API_REQUEST = 3
    OCR_PROCESSING = 3
    FILE_UPLOAD = 2
    EMAIL_SEND = 3
    TELEGRAM_SEND = 3

# Colors
class Colors:
    """Renk sabitleri"""
    PRIMARY = "#3b82f6"
    SECONDARY = "#6b7280"
    SUCCESS = "#10b981"
    WARNING = "#f59e0b"
    ERROR = "#ef4444"
    INFO = "#3b82f6"
    
    # Brand colors
    BRAND_COLORS = [
        "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF",
        "#FFFF00", "#FF00FF", "#00FFFF", "#800000", "#008000",
        "#000080", "#808000", "#800080", "#008080", "#C0C0C0",
        "#808080", "#FFA500", "#FFC0CB", "#A52A2A", "#D2691E"
    ]

# Languages
class Languages:
    """Dil sabitleri"""
    TURKISH = "tr"
    ENGLISH = "en"
    SUPPORTED_LANGUAGES = ["tr", "en"]

# Currencies
class Currencies:
    """Para birimi sabitleri"""
    TRY = "TRY"
    USD = "USD"
    EUR = "EUR"
    SUPPORTED_CURRENCIES = ["TRY", "USD", "EUR"]

# Date Formats
class DateFormats:
    """Tarih formatları"""
    DATETIME = "%Y-%m-%d %H:%M:%S"
    DATE = "%Y-%m-%d"
    TIME = "%H:%M:%S"
    DISPLAY_DATETIME = "%d/%m/%Y %H:%M"
    DISPLAY_DATE = "%d/%m/%Y"
    DISPLAY_TIME = "%H:%M"

# File Paths
class FilePaths:
    """Dosya yolları"""
    UPLOADS = "uploads"
    TEMPLATES = "templates"
    LOGS = "logs"
    TEMP = "temp"
    BACKUP = "backup"

# Environment Variables
class EnvironmentVariables:
    """Environment variable isimleri"""
    DATABASE_URL = "DATABASE_URL"
    SECRET_KEY = "SECRET_KEY"
    REDIS_URL = "REDIS_URL"
    GOOGLE_AI_API_KEY = "GOOGLE_AI_API_KEY"
    TELEGRAM_BOT_TOKEN = "TELEGRAM_BOT_TOKEN"
    SMTP_SERVER = "SMTP_SERVER"
    SMTP_USERNAME = "SMTP_USERNAME"
    SMTP_PASSWORD = "SMTP_PASSWORD"
    ENVIRONMENT = "ENVIRONMENT"
    DEBUG = "DEBUG"

# HTTP Status Codes
class HTTPStatusCodes:
    """HTTP durum kodları"""
    OK = 200
    CREATED = 201
    NO_CONTENT = 204
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    METHOD_NOT_ALLOWED = 405
    CONFLICT = 409
    UNPROCESSABLE_ENTITY = 422
    INTERNAL_SERVER_ERROR = 500
    BAD_GATEWAY = 502
    SERVICE_UNAVAILABLE = 503

# Regex Patterns
class RegexPatterns:
    """Regex desenleri"""
    EMAIL = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    PHONE = r'^\+?[1-9]\d{1,14}$'
    PRODUCT_CODE = r'^[A-Z]{2,4}-?\d{3,6}$'
    COLOR_CODE = r'^#[0-9A-Fa-f]{6}$'
    URL = r'^https?://[^\s/$.?#].[^\s]*$'

# Default Values
class DefaultValues:
    """Varsayılan değerler"""
    USER_AVATAR = "/static/images/default-avatar.png"
    BRAND_LOGO = "/static/images/default-brand-logo.png"
    PRODUCT_IMAGE = "/static/images/default-product-image.png"
    TEMPLATE_PREVIEW = "/static/images/default-template-preview.png"
    
    OCR_CONFIDENCE_THRESHOLD = 0.7
    CACHE_TTL = 300  # seconds
    SESSION_TIMEOUT = 3600  # seconds
    UPLOAD_TIMEOUT = 300  # seconds

# Feature Flags
class FeatureFlags:
    """Özellik bayrakları"""
    SOCIAL_MEDIA = "social_media"
    TEMPLATES = "templates"
    AI_GENERATION = "ai_generation"
    MULTI_LANGUAGE = "multi_language"
    ANALYTICS = "analytics"
    REPORTING = "reporting"
    MONITORING = "monitoring"
    CACHING = "caching"
    OCR = "ocr"
    EMAIL = "email"
    TELEGRAM = "telegram"

# Export all constants
__all__ = [
    'UserRole', 'UserStatus', 'BrandStatus', 'ProductStatus', 'TemplateStatus',
    'UploadStatus', 'OCRStatus', 'NotificationType', 'LogLevel',
    'APIEndpoints', 'FileExtensions', 'MimeTypes', 'DatabaseTables',
    'CacheKeys', 'ErrorMessages', 'SuccessMessages', 'ValidationRules',
    'Pagination', 'Timeouts', 'RetryCounts', 'Colors', 'Languages',
    'Currencies', 'DateFormats', 'FilePaths', 'EnvironmentVariables',
    'HTTPStatusCodes', 'RegexPatterns', 'DefaultValues', 'FeatureFlags'
]
