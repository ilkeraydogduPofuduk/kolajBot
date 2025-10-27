"""
Platform Configuration
Sosyal medya platformları konfigürasyonu
"""

from typing import Dict, Any, List, Optional
from core.logging import get_logger

logger = get_logger('platforms_config')

class PlatformConfig:
    """Platform konfigürasyon sınıfı"""
    
    def __init__(self, name: str, api_base_url: str, auth_url: str, scopes: List[str]):
        self.name = name
        self.api_base_url = api_base_url
        self.auth_url = auth_url
        self.scopes = scopes
        self.rate_limits = {
            'requests_per_minute': 100,
            'requests_per_hour': 1000
        }
        self.webhook_support = False
        self.file_upload_support = False
        self.max_file_size = 0  # MB
        self.supported_formats = []
    
    def set_rate_limits(self, per_minute: int, per_hour: int):
        """Rate limit'leri ayarla"""
        self.rate_limits = {
            'requests_per_minute': per_minute,
            'requests_per_hour': per_hour
        }
    
    def set_file_support(self, max_size: int, formats: List[str]):
        """Dosya desteğini ayarla"""
        self.file_upload_support = True
        self.max_file_size = max_size
        self.supported_formats = formats
    
    def set_webhook_support(self, enabled: bool = True):
        """Webhook desteğini ayarla"""
        self.webhook_support = enabled

# Platform konfigürasyonları
PLATFORMS = {
    'telegram': PlatformConfig(
        name='Telegram',
        api_base_url='https://api.telegram.org',
        auth_url='https://oauth.telegram.org',
        scopes=['bot']
    ),
    'instagram': PlatformConfig(
        name='Instagram',
        api_base_url='https://graph.instagram.com',
        auth_url='https://api.instagram.com/oauth',
        scopes=['user_profile', 'user_media']
    ),
    'facebook': PlatformConfig(
        name='Facebook',
        api_base_url='https://graph.facebook.com',
        auth_url='https://www.facebook.com/v18.0/dialog/oauth',
        scopes=['pages_manage_posts', 'pages_read_engagement']
    ),
    'twitter': PlatformConfig(
        name='Twitter',
        api_base_url='https://api.twitter.com/2',
        auth_url='https://twitter.com/i/oauth2/authorize',
        scopes=['tweet.read', 'tweet.write', 'users.read']
    ),
    'linkedin': PlatformConfig(
        name='LinkedIn',
        api_base_url='https://api.linkedin.com/v2',
        auth_url='https://www.linkedin.com/oauth/v2/authorization',
        scopes=['r_liteprofile', 'r_emailaddress', 'w_member_social']
    ),
    'whatsapp': PlatformConfig(
        name='WhatsApp Business',
        api_base_url='https://graph.facebook.com/v18.0',
        auth_url='https://www.facebook.com/v18.0/dialog/oauth',
        scopes=['whatsapp_business_messaging']
    )
}

# Platform özelliklerini ayarla
PLATFORMS['telegram'].set_rate_limits(30, 1000)
PLATFORMS['telegram'].set_file_support(50, ['jpg', 'png', 'gif', 'mp4', 'pdf', 'doc'])
PLATFORMS['telegram'].set_webhook_support(True)

PLATFORMS['instagram'].set_rate_limits(200, 10000)
PLATFORMS['instagram'].set_file_support(100, ['jpg', 'png', 'mp4'])

PLATFORMS['facebook'].set_rate_limits(200, 10000)
PLATFORMS['facebook'].set_file_support(100, ['jpg', 'png', 'mp4', 'gif'])

PLATFORMS['twitter'].set_rate_limits(300, 15000)
PLATFORMS['twitter'].set_file_support(25, ['jpg', 'png', 'gif', 'mp4'])

PLATFORMS['linkedin'].set_rate_limits(100, 5000)
PLATFORMS['linkedin'].set_file_support(10, ['jpg', 'png', 'pdf'])

PLATFORMS['whatsapp'].set_rate_limits(1000, 100000)
PLATFORMS['whatsapp'].set_file_support(100, ['jpg', 'png', 'mp4', 'pdf', 'doc'])

def get_all_platforms() -> Dict[str, PlatformConfig]:
    """Tüm platformları al"""
    return PLATFORMS

def get_platform(name: str) -> Optional[PlatformConfig]:
    """Belirli bir platformu al"""
    return PLATFORMS.get(name.lower())

def get_platform_names() -> List[str]:
    """Platform isimlerini al"""
    return list(PLATFORMS.keys())

def get_platforms_with_file_support() -> List[str]:
    """Dosya desteği olan platformları al"""
    return [
        name for name, config in PLATFORMS.items()
        if config.file_upload_support
    ]

def get_platforms_with_webhook_support() -> List[str]:
    """Webhook desteği olan platformları al"""
    return [
        name for name, config in PLATFORMS.items()
        if config.webhook_support
    ]

def validate_platform(name: str) -> bool:
    """Platform geçerli mi kontrol et"""
    return name.lower() in PLATFORMS

def get_platform_rate_limits(name: str) -> Dict[str, int]:
    """Platform rate limit'lerini al"""
    platform = get_platform(name)
    if platform:
        return platform.rate_limits
    return {}

def get_platform_file_limits(name: str) -> Dict[str, Any]:
    """Platform dosya limitlerini al"""
    platform = get_platform(name)
    if platform:
        return {
            'max_size': platform.max_file_size,
            'supported_formats': platform.supported_formats,
            'upload_support': platform.file_upload_support
        }
    return {}

# Platform istatistikleri
def get_platform_stats() -> Dict[str, Any]:
    """Platform istatistiklerini al"""
    total_platforms = len(PLATFORMS)
    platforms_with_files = len(get_platforms_with_file_support())
    platforms_with_webhooks = len(get_platforms_with_webhook_support())
    
    return {
        'total_platforms': total_platforms,
        'platforms_with_file_support': platforms_with_files,
        'platforms_with_webhook_support': platforms_with_webhooks,
        'platform_names': get_platform_names()
    }
