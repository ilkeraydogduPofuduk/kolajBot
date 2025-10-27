"""
Telegram Bot Entegrasyonu
Kolajları Telegram'a otomatik gönderir
"""
import os
import requests
import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from models.brand import Brand
from models.social_media_channel import SocialMediaChannel
from core.logging import get_logger

logger = get_logger('telegram_service')

class TelegramService:
    """Telegram bot servisi - markaya özel kanallar destekli"""
    
    def __init__(self):
        self.default_bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.default_chat_id = os.getenv('TELEGRAM_CHAT_ID')
        self.default_api_url = f"https://api.telegram.org/bot{self.default_bot_token}" if self.default_bot_token else None
        
    def send_collage(self, 
                    image_path: str, 
                    caption: str,
                    product_info: Dict[str, Any],
                    brand_id: Optional[int] = None,
                    db: Optional[Session] = None) -> bool:
        """Kolajı Telegram'a gönder - markaya özel kanallar destekli"""
        try:
            # Markaya özel kanal bilgilerini al
            bot_token, chat_id = self._get_brand_telegram_credentials(brand_id, db)
            
            # Eğer markaya özel bot bilgileri yoksa genel bilgileri kullan
            if not bot_token or not chat_id:
                if not self.default_bot_token or not self.default_chat_id:
                    logger.warning("[TELEGRAM] No bot token or chat ID configured")
                    return False
                bot_token = self.default_bot_token
                chat_id = self.default_chat_id
            
            api_url = f"https://api.telegram.org/bot{bot_token}"
            
            # Görseli yükle
            with open(image_path, 'rb') as photo:
                files = {'photo': photo}
                
                # SADECE GÖRSEL - Caption yok
                data = {
                    'chat_id': chat_id
                }
                
                # Telegram API'ye gönder
                response = requests.post(
                    f"{api_url}/sendPhoto",
                    files=files,
                    data=data,
                    timeout=30
                )
                
                if response.status_code == 200:
                    logger.info(f"[TELEGRAM] Successfully sent collage: {image_path} to brand {brand_id}")
                    return True
                else:
                    logger.error(f"[TELEGRAM] Failed to send: {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"[TELEGRAM] Error sending collage: {e}")
            return False
    
    def send_video(self,
                   video_path: str,
                   caption: str,
                   product_info: Dict[str, Any],
                   brand_id: Optional[int] = None,
                   db: Optional[Session] = None) -> bool:
        """Videoyu Telegram'a gönder - markaya özel kanallar destekli"""
        try:
            # Markaya özel kanal bilgilerini al
            bot_token, chat_id = self._get_brand_telegram_credentials(brand_id, db)
            
            # Eğer markaya özel bot bilgileri yoksa genel bilgileri kullan
            if not bot_token or not chat_id:
                if not self.default_bot_token or not self.default_chat_id:
                    logger.warning("[TELEGRAM] No bot token or chat ID configured")
                    return False
                bot_token = self.default_bot_token
                chat_id = self.default_chat_id
            
            api_url = f"https://api.telegram.org/bot{bot_token}"
            
            # Videoyu yükle
            with open(video_path, 'rb') as video:
                files = {'video': video}
                
                # SADECE VIDEO - Caption yok
                data = {
                    'chat_id': chat_id,
                    'supports_streaming': True  # Video streaming desteği
                }
                
                # Telegram API'ye gönder
                logger.info(f"[TELEGRAM] Sending video: {video_path}")
                response = requests.post(
                    f"{api_url}/sendVideo",
                    files=files,
                    data=data,
                    timeout=60  # Video için daha uzun timeout
                )
                
                if response.status_code == 200:
                    logger.info(f"[TELEGRAM] Successfully sent video: {video_path} to brand {brand_id}")
                    return True
                else:
                    logger.error(f"[TELEGRAM] Failed to send video: {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"[TELEGRAM] Error sending video: {e}")
            return False
    
    def send_fabric_collage(self, 
                          fabric_json_path: str,
                          product_info: Dict[str, Any],
                          brand_id: Optional[int] = None,
                          db: Optional[Session] = None) -> bool:
        """Fabric.js kolajını Telegram'a gönder - markaya özel kanallar destekli"""
        try:
            # Fabric.js JSON'u oku
            with open(fabric_json_path, 'r', encoding='utf-8') as f:
                fabric_data = json.load(f)
            
            # PNG export için frontend'e gönder (simülasyon)
            logger.info(f"[TELEGRAM] Fabric.js collage ready for export: {fabric_json_path}")
            
            # Caption hazırla
            caption = self._create_caption(
                f"{product_info.get('product_code', '')} {product_info.get('color', '')}",
                product_info
            )
            
            # Markaya özel kanal bilgilerini al
            bot_token, chat_id = self._get_brand_telegram_credentials(brand_id, db)
            
            # Eğer markaya özel bot bilgileri yoksa genel bilgileri kullan
            if not bot_token or not chat_id:
                if not self.default_bot_token or not self.default_chat_id:
                    logger.warning("[TELEGRAM] No bot token or chat ID configured")
                    return False
                bot_token = self.default_bot_token
                chat_id = self.default_chat_id
            
            api_url = f"https://api.telegram.org/bot{bot_token}"
            
            # Simülasyon - gerçek sistemde frontend'den PNG alınacak
            logger.info(f"[TELEGRAM] Would send to brand {brand_id}: {caption}")
            
            return True
            
        except Exception as e:
            logger.error(f"[TELEGRAM] Error processing fabric collage: {e}")
            return False

    def _get_brand_telegram_credentials(self, brand_id: Optional[int], db: Optional[Session]) -> tuple:
        """Markaya özel Telegram bot bilgilerini al"""
        try:
            if not brand_id or not db:
                logger.info("[TELEGRAM] No brand_id or db session provided, using default credentials")
                return self.default_bot_token, self.default_chat_id
            
            # Markaya ait aktif Telegram kanallarını bul
            telegram_channel = db.query(SocialMediaChannel).filter(
                SocialMediaChannel.brand_id == brand_id,
                SocialMediaChannel.platform == 'telegram',
                SocialMediaChannel.is_active == True
            ).first()
            
            if telegram_channel and telegram_channel.bot_token and telegram_channel.chat_id:
                logger.info(f"[TELEGRAM] Found brand-specific credentials for brand {brand_id}")
                return telegram_channel.bot_token, telegram_channel.chat_id
            else:
                logger.info(f"[TELEGRAM] No brand-specific credentials found for brand {brand_id}, using default")
                return self.default_bot_token, self.default_chat_id
                
        except Exception as e:
            logger.error(f"[TELEGRAM] Error getting brand credentials: {e}")
            return self.default_bot_token, self.default_chat_id
    
    def _create_caption(self, title: str, product_info: Dict[str, Any]) -> str:
        """Telegram caption oluştur"""
        caption = f"<b>{title}</b>\n\n"
        
        if product_info.get('brand'):
            caption += f"🏷️ <b>Marka:</b> {product_info['brand']}\n"
        
        if product_info.get('product_type'):
            caption += f"👕 <b>Tip:</b> {product_info['product_type']}\n"
        
        if product_info.get('size_range'):
            caption += f"📏 <b>Beden:</b> {product_info['size_range']}\n"
        
        if product_info.get('price'):
            caption += f"💰 <b>Fiyat:</b> {product_info['price']} TL\n"
        
        caption += "\n#moda #giyim #alışveriş"
        
        return caption
    
    def test_connection(self, bot_token: Optional[str] = None) -> bool:
        """Telegram bağlantısını test et"""
        try:
            # Eğer özel bot token verilmediyse varsayılanı kullan
            test_bot_token = bot_token or self.default_bot_token
            
            if not test_bot_token:
                logger.warning("[TELEGRAM] Bot token not configured")
                return False

            test_api_url = f"https://api.telegram.org/bot{test_bot_token}"
            response = requests.get(f"{test_api_url}/getMe", timeout=10)

            if response.status_code == 200:
                bot_info = response.json()
                logger.info(f"[TELEGRAM] Bot connected: {bot_info['result']['first_name']}")
                return True
            else:
                logger.error(f"[TELEGRAM] Connection failed: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"[TELEGRAM] Connection test error: {e}")
            return False

# Global instance
telegram_service = TelegramService()
