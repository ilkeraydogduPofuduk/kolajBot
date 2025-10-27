from functools import wraps
from typing import Callable, List, Optional
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from dependencies.auth import get_current_active_user
from schemas.user import User
import logging

logger = logging.getLogger(__name__)

def require_roles(allowed_roles: List[str]):
    """Belirli rollere sahip kullanıcılar için decorator"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # current_user parametresini bul
            current_user = None
            for key, value in kwargs.items():
                if isinstance(value, User):
                    current_user = value
                    break
            
            if not current_user:
                raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")
            
            if current_user.role.name not in allowed_roles:
                raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def log_activity(action: str, details: Optional[str] = None):
    """Aktivite loglamak için decorator"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                result = await func(*args, **kwargs)
                logger.info(f"Action: {action}, Details: {details}")
                return result
            except Exception as e:
                logger.error(f"Error in {action}: {str(e)}")
                raise
        return wrapper
    return decorator

def handle_db_errors(func: Callable):
    """Database hatalarını yakala ve uygun HTTP hatalarına çevir"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Database error in {func.__name__}: {str(e)}")
            if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                raise HTTPException(status_code=400, detail="Bu kayıt zaten mevcut")
            elif "foreign key" in str(e).lower():
                raise HTTPException(status_code=400, detail="İlişkili kayıtlar mevcut, silme işlemi yapılamaz")
            else:
                raise HTTPException(status_code=500, detail="Veritabanı hatası oluştu")
    return wrapper

def cache_result(ttl: int = 300):
    """Sonucu cache'le (Redis gerekiyor)"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                import redis
                from config.settings import settings
                import json
                import hashlib
                
                # Redis bağlantısını dene
                try:
                    redis_client = redis.from_url(settings.REDIS_URL)
                    redis_client.ping()
                except:
                    # Redis yoksa direkt fonksiyonu çalıştır
                    return await func(*args, **kwargs)
                
                # Cache key oluştur
                func_name = func.__name__
                args_str = str(args) + str(sorted(kwargs.items()))
                cache_key = f"cache:{func_name}:{hashlib.md5(args_str.encode()).hexdigest()}"
                
                # Cache'den kontrol et
                cached_result = redis_client.get(cache_key)
                if cached_result:
                    try:
                        return json.loads(cached_result)
                    except:
                        pass  # JSON parse hatası, cache'i yoksay
                
                # Fonksiyonu çalıştır
                result = await func(*args, **kwargs)
                
                # Sonucu cache'le
                try:
                    redis_client.setex(
                        cache_key, 
                        ttl, 
                        json.dumps(result, default=str)  # datetime gibi objeler için
                    )
                except:
                    pass  # Cache yazma hatası, devam et
                
                return result
                
            except Exception as e:
                # Herhangi bir hata durumunda direkt fonksiyonu çalıştır
                return await func(*args, **kwargs)
        return wrapper
    return decorator
