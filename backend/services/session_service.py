"""
Session Management Service
Kullanıcı oturumlarını yönetir ve şifre değişikliği sonrası tüm oturumları sonlandırır
"""
import redis
import json
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from config.settings import settings
import logging

logger = logging.getLogger(__name__)

class SessionService:
    def __init__(self, db: Session):
        self.db = db
        try:
            self.redis_client = redis.from_url(settings.REDIS_URL)
            self.redis_client.ping()
        except:
            self.redis_client = None
            logger.warning("Redis baglantisi kurulamadi, session yonetimi devre disi")
    
    def create_session(self, user_id: int, access_token: str, refresh_token: str, 
                      ip_address: str = None, user_agent: str = None) -> bool:
        """Yeni oturum oluştur"""
        if not self.redis_client:
            return False
        
        try:
            session_data = {
                'user_id': user_id,
                'access_token': access_token,
                'refresh_token': refresh_token,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'created_at': datetime.utcnow().isoformat(),
                'last_activity': datetime.utcnow().isoformat()
            }
            
            # Session'ı Redis'te sakla (7 gün geçerli)
            session_key = f"session:{user_id}:{access_token[:16]}"
            self.redis_client.setex(
                session_key, 
                timedelta(days=7), 
                json.dumps(session_data)
            )
            
            # Kullanıcının aktif session'larını takip et
            user_sessions_key = f"user_sessions:{user_id}"
            self.redis_client.sadd(user_sessions_key, session_key)
            self.redis_client.expire(user_sessions_key, timedelta(days=7))
            
            logger.info(f"Session oluşturuldu: {session_key}")
            return True
            
        except Exception as e:
            logger.error(f"Session oluşturma hatası: {e}")
            return False
    
    def validate_session(self, access_token: str) -> Optional[dict]:
        """Session'ı doğrula"""
        if not self.redis_client:
            return None
        
        try:
            # Token'dan session key'i oluştur
            session_key = f"session:*:{access_token[:16]}"
            keys = self.redis_client.keys(session_key)
            
            if not keys:
                return None
            
            session_data = self.redis_client.get(keys[0])
            if session_data:
                return json.loads(session_data)
            
            return None
            
        except Exception as e:
            logger.error(f"Session doğrulama hatası: {e}")
            return None
    
    def invalidate_session(self, access_token: str) -> bool:
        """Tek session'ı sonlandır"""
        if not self.redis_client:
            return False
        
        try:
            session_key = f"session:*:{access_token[:16]}"
            keys = self.redis_client.keys(session_key)
            
            if keys:
                session_data = self.redis_client.get(keys[0])
                if session_data:
                    data = json.loads(session_data)
                    user_id = data.get('user_id')
                    
                    # Session'ı sil
                    self.redis_client.delete(keys[0])
                    
                    # Kullanıcının session listesinden çıkar
                    if user_id:
                        user_sessions_key = f"user_sessions:{user_id}"
                        self.redis_client.srem(user_sessions_key, keys[0])
                    
                    logger.info(f"Session sonlandırıldı: {keys[0]}")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Session sonlandırma hatası: {e}")
            return False
    
    def invalidate_all_user_sessions(self, user_id: int) -> int:
        """Kullanıcının tüm oturumlarını sonlandır"""
        if not self.redis_client:
            logger.warning(f"Redis baglantisi yok, kullanici {user_id} icin session sonlandirma atlandi")
            return 0
        
        try:
            user_sessions_key = f"user_sessions:{user_id}"
            session_keys = self.redis_client.smembers(user_sessions_key)
            
            invalidated_count = 0
            for session_key in session_keys:
                try:
                    self.redis_client.delete(session_key)
                    invalidated_count += 1
                except:
                    continue
            
            # Kullanıcının session listesini temizle
            self.redis_client.delete(user_sessions_key)
            
            logger.info(f"Kullanıcı {user_id} için {invalidated_count} session sonlandırıldı")
            return invalidated_count
            
        except Exception as e:
            logger.error(f"Tüm session'ları sonlandırma hatası: {e}")
            return 0
    
    def get_user_active_sessions(self, user_id: int) -> List[dict]:
        """Kullanıcının aktif oturumlarını getir"""
        if not self.redis_client:
            return []
        
        try:
            user_sessions_key = f"user_sessions:{user_id}"
            session_keys = self.redis_client.smembers(user_sessions_key)
            
            active_sessions = []
            for session_key in session_keys:
                try:
                    session_data = self.redis_client.get(session_key)
                    if session_data:
                        data = json.loads(session_data)
                        active_sessions.append({
                            'session_key': session_key.decode(),
                            'ip_address': data.get('ip_address'),
                            'user_agent': data.get('user_agent'),
                            'created_at': data.get('created_at'),
                            'last_activity': data.get('last_activity')
                        })
                except:
                    continue
            
            return active_sessions
            
        except Exception as e:
            logger.error(f"Aktif session'ları getirme hatası: {e}")
            return []
    
    def update_session_activity(self, access_token: str) -> bool:
        """Session aktivitesini güncelle"""
        if not self.redis_client:
            return False
        
        try:
            session_key = f"session:*:{access_token[:16]}"
            keys = self.redis_client.keys(session_key)
            
            if keys:
                session_data = self.redis_client.get(keys[0])
                if session_data:
                    data = json.loads(session_data)
                    data['last_activity'] = datetime.utcnow().isoformat()
                    
                    # Session'ı güncelle
                    self.redis_client.setex(
                        keys[0], 
                        timedelta(days=7), 
                        json.dumps(data)
                    )
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Session aktivite güncelleme hatası: {e}")
            return False
