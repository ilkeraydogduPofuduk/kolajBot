"""
Cache Service
Uygulama genelinde cache yönetimi
"""

import json
import pickle
import hashlib
from typing import Any, Optional, Dict, List
from datetime import datetime, timedelta
from core.logging import get_logger
from core.exceptions import BaseAppException

logger = get_logger('cache_service')

class CacheEntry:
    """Cache girişi"""
    def __init__(self, value: Any, ttl: int = 3600):
        self.value = value
        self.created_at = datetime.now()
        self.ttl = ttl
        self.access_count = 0
        self.last_accessed = datetime.now()

    def is_expired(self) -> bool:
        """Cache girişi süresi dolmuş mu?"""
        return datetime.now() > self.created_at + timedelta(seconds=self.ttl)

    def access(self):
        """Cache girişine erişim"""
        self.access_count += 1
        self.last_accessed = datetime.now()

class MemoryCache:
    """Bellek tabanlı cache"""
    
    def __init__(self, max_size: int = 1000):
        self.cache: Dict[str, CacheEntry] = {}
        self.max_size = max_size
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Optional[Any]:
        """Cache'den değer al"""
        if key in self.cache:
            entry = self.cache[key]
            if not entry.is_expired():
                entry.access()
                self.hits += 1
                return entry.value
            else:
                del self.cache[key]
        
        self.misses += 1
        return None

    def set(self, key: str, value: Any, ttl: int = 3600):
        """Cache'e değer kaydet"""
        # Maksimum boyut kontrolü
        if len(self.cache) >= self.max_size:
            self._evict_oldest()
        
        self.cache[key] = CacheEntry(value, ttl)

    def delete(self, key: str):
        """Cache'den değer sil"""
        if key in self.cache:
            del self.cache[key]

    def clear(self):
        """Tüm cache'i temizle"""
        self.cache.clear()
        self.hits = 0
        self.misses = 0

    def _evict_oldest(self):
        """En eski girişi sil"""
        if not self.cache:
            return
        
        oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k].last_accessed)
        del self.cache[oldest_key]

    def get_stats(self) -> Dict[str, Any]:
        """Cache istatistiklerini döndür"""
        total_requests = self.hits + self.misses
        hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'size': len(self.cache),
            'max_size': self.max_size,
            'hits': self.hits,
            'misses': self.misses,
            'hit_rate': round(hit_rate, 2),
            'total_requests': total_requests
        }

class TemplateCache:
    """Şablon cache servisi"""
    
    def __init__(self):
        self.cache = MemoryCache(max_size=500)
        self.prefix = "template_"

    async def get_template(self, template_id: int) -> Optional[Any]:
        """Şablon cache'den al"""
        key = f"{self.prefix}{template_id}"
        return self.cache.get(key)

    async def set_template(self, template_id: int, template: Any, ttl: int = 3600):
        """Şablon cache'e kaydet"""
        key = f"{self.prefix}{template_id}"
        self.cache.set(key, template, ttl)

    async def delete_template(self, template_id: int):
        """Şablon cache'den sil"""
        key = f"{self.prefix}{template_id}"
        self.cache.delete(key)

    async def get_user_templates(self, user_id: int) -> Optional[List[Any]]:
        """Kullanıcı şablonları cache'den al"""
        key = f"{self.prefix}user_{user_id}"
        return self.cache.get(key)

    async def set_user_templates(self, user_id: int, templates: List[Any], ttl: int = 1800):
        """Kullanıcı şablonları cache'e kaydet"""
        key = f"{self.prefix}user_{user_id}"
        self.cache.set(key, templates, ttl)

    async def delete_user_templates(self, user_id: int):
        """Kullanıcı şablonları cache'den sil"""
        key = f"{self.prefix}user_{user_id}"
        self.cache.delete(key)

    def clear_all(self):
        """Tüm şablon cache'ini temizle"""
        self.cache.clear()

    def get_stats(self) -> Dict[str, Any]:
        """Şablon cache istatistiklerini döndür"""
        return self.cache.get_stats()

class ProductCache:
    """Ürün cache servisi"""
    
    def __init__(self):
        self.cache = MemoryCache(max_size=1000)
        self.prefix = "product_"

    async def get_product(self, product_id: int) -> Optional[Any]:
        """Ürün cache'den al"""
        key = f"{self.prefix}{product_id}"
        return self.cache.get(key)

    async def set_product(self, product_id: int, product: Any, ttl: int = 3600):
        """Ürün cache'e kaydet"""
        key = f"{self.prefix}{product_id}"
        self.cache.set(key, product, ttl)

    async def delete_product(self, product_id: int):
        """Ürün cache'den sil"""
        key = f"{self.prefix}{product_id}"
        self.cache.delete(key)

    async def get_brand_products(self, brand_id: int) -> Optional[List[Any]]:
        """Marka ürünleri cache'den al"""
        key = f"{self.prefix}brand_{brand_id}"
        return self.cache.get(key)

    async def set_brand_products(self, brand_id: int, products: List[Any], ttl: int = 1800):
        """Marka ürünleri cache'e kaydet"""
        key = f"{self.prefix}brand_{brand_id}"
        self.cache.set(key, products, ttl)

    async def delete_brand_products(self, brand_id: int):
        """Marka ürünleri cache'den sil"""
        key = f"{self.prefix}brand_{brand_id}"
        self.cache.delete(key)

    def clear_all(self):
        """Tüm ürün cache'ini temizle"""
        self.cache.clear()

    def get_stats(self) -> Dict[str, Any]:
        """Ürün cache istatistiklerini döndür"""
        return self.cache.get_stats()

class UserCache:
    """Kullanıcı cache servisi"""
    
    def __init__(self):
        self.cache = MemoryCache(max_size=500)
        self.prefix = "user_"

    async def get_user(self, user_id: int) -> Optional[Any]:
        """Kullanıcı cache'den al"""
        key = f"{self.prefix}{user_id}"
        return self.cache.get(key)

    async def set_user(self, user_id: int, user: Any, ttl: int = 3600):
        """Kullanıcı cache'e kaydet"""
        key = f"{self.prefix}{user_id}"
        self.cache.set(key, user, ttl)

    async def delete_user(self, user_id: int):
        """Kullanıcı cache'den sil"""
        key = f"{self.prefix}{user_id}"
        self.cache.delete(key)

    async def get_user_permissions(self, user_id: int) -> Optional[List[str]]:
        """Kullanıcı izinleri cache'den al"""
        key = f"{self.prefix}permissions_{user_id}"
        return self.cache.get(key)

    async def set_user_permissions(self, user_id: int, permissions: List[str], ttl: int = 1800):
        """Kullanıcı izinleri cache'e kaydet"""
        key = f"{self.prefix}permissions_{user_id}"
        self.cache.set(key, permissions, ttl)

    async def delete_user_permissions(self, user_id: int):
        """Kullanıcı izinleri cache'den sil"""
        key = f"{self.prefix}permissions_{user_id}"
        self.cache.delete(key)

    def clear_all(self):
        """Tüm kullanıcı cache'ini temizle"""
        self.cache.clear()

    def get_stats(self) -> Dict[str, Any]:
        """Kullanıcı cache istatistiklerini döndür"""
        return self.cache.get_stats()

class CacheService:
    """Ana cache servisi"""
    
    def __init__(self):
        self.template_cache = TemplateCache()
        self.product_cache = ProductCache()
        self.user_cache = UserCache()
        self.general_cache = MemoryCache(max_size=2000)

    def get(self, key: str) -> Optional[Any]:
        """Genel cache'den değer al"""
        return self.general_cache.get(key)

    def set(self, key: str, value: Any, ttl: int = 3600):
        """Genel cache'e değer kaydet"""
        self.general_cache.set(key, value, ttl)

    def delete(self, key: str):
        """Genel cache'den değer sil"""
        self.general_cache.delete(key)

    def clear_all(self):
        """Tüm cache'leri temizle"""
        self.template_cache.clear_all()
        self.product_cache.clear_all()
        self.user_cache.clear_all()
        self.general_cache.clear()

    def get_stats(self) -> Dict[str, Any]:
        """Tüm cache istatistiklerini döndür"""
        return {
            'template': self.template_cache.get_stats(),
            'product': self.product_cache.get_stats(),
            'user': self.user_cache.get_stats(),
            'general': self.general_cache.get_stats()
        }

    def generate_cache_key(self, prefix: str, **kwargs) -> str:
        """Cache anahtarı oluştur"""
        # Parametreleri sıralı hale getir
        sorted_params = sorted(kwargs.items())
        param_string = '_'.join([f"{k}_{v}" for k, v in sorted_params])
        
        # Hash oluştur
        hash_object = hashlib.md5(param_string.encode())
        hash_hex = hash_object.hexdigest()
        
        return f"{prefix}_{hash_hex}"

# Singleton instances
template_cache = TemplateCache()
product_cache = ProductCache()
user_cache = UserCache()
cache_service = CacheService()

# Backward compatibility
TemplateCache = template_cache
ProductCache = product_cache
UserCache = user_cache
CacheService = cache_service
