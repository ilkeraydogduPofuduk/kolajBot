"""
Telegram Helper Functions
Telegram API yardımcı fonksiyonları
"""

import httpx
import asyncio
from typing import Dict, Any, Optional, List
from core.logging import get_logger

logger = get_logger('telegram_helpers')

class RateLimitedClient:
    """Rate limit'li HTTP istemcisi"""
    
    def __init__(self, base_url: str = "https://api.telegram.org"):
        self.base_url = base_url
        self.request_count = 0
        self.last_request_time = 0
        self.min_interval = 0.1  # 100ms between requests
    
    async def _wait_if_needed(self):
        """Gerekirse bekle"""
        current_time = asyncio.get_event_loop().time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.min_interval:
            await asyncio.sleep(self.min_interval - time_since_last)
        
        self.last_request_time = asyncio.get_event_loop().time()
        self.request_count += 1
    
    async def get(self, url: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """GET isteği gönder"""
        await self._wait_if_needed()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}{url}", params=params)
            return response.json()
    
    async def post(self, url: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """POST isteği gönder"""
        await self._wait_if_needed()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}{url}", json=data)
            return response.json()

def get_rate_limited_client() -> RateLimitedClient:
    """Rate limit'li istemci al"""
    return RateLimitedClient()

async def verify_bot_token(bot_token: str) -> tuple[bool, Optional[Dict[str, Any]]]:
    """Bot token'ını doğrula"""
    try:
        client = get_rate_limited_client()
        response = await client.get(f"/bot{bot_token}/getMe")
        
        if response.get('ok'):
            return True, response.get('result')
        else:
            logger.warning(f"Bot token verification failed: {response.get('description')}")
            return False, None
    
    except Exception as e:
        logger.error(f"Error verifying bot token: {e}")
        return False, None

async def get_chat_info(bot_token: str, chat_id: str) -> Optional[Dict[str, Any]]:
    """Chat bilgilerini al"""
    try:
        client = get_rate_limited_client()
        response = await client.get(f"/bot{bot_token}/getChat", {"chat_id": chat_id})
        
        if response.get('ok'):
            return response.get('result')
        else:
            logger.warning(f"Failed to get chat info: {response.get('description')}")
            return None
    
    except Exception as e:
        logger.error(f"Error getting chat info: {e}")
        return None

async def get_chat_member_count(bot_token: str, chat_id: str) -> Optional[int]:
    """Chat üye sayısını al"""
    try:
        client = get_rate_limited_client()
        response = await client.get(f"/bot{bot_token}/getChatMemberCount", {"chat_id": chat_id})
        
        if response.get('ok'):
            return response.get('result')
        else:
            logger.warning(f"Failed to get member count: {response.get('description')}")
            return None
    
    except Exception as e:
        logger.error(f"Error getting member count: {e}")
        return None

async def check_bot_admin_status(bot_token: str, chat_id: str, bot_user_id: int) -> bool:
    """Bot'un yönetici durumunu kontrol et"""
    try:
        client = get_rate_limited_client()
        response = await client.get(f"/bot{bot_token}/getChatMember", {
            "chat_id": chat_id,
            "user_id": bot_user_id
        })
        
        if response.get('ok'):
            member_info = response.get('result', {})
            status = member_info.get('status', '')
            return status in ['administrator', 'creator']
        else:
            logger.warning(f"Failed to check admin status: {response.get('description')}")
            return False
    
    except Exception as e:
        logger.error(f"Error checking admin status: {e}")
        return False

async def send_message(bot_token: str, chat_id: str, text: str, parse_mode: str = "HTML") -> Optional[int]:
    """Mesaj gönder"""
    try:
        client = get_rate_limited_client()
        response = await client.post(f"/bot{bot_token}/sendMessage", {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode
        })
        
        if response.get('ok'):
            return response.get('result', {}).get('message_id')
        else:
            logger.warning(f"Failed to send message: {response.get('description')}")
            return None
    
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        return None

async def get_chat_administrators(bot_token: str, chat_id: str) -> List[Dict[str, Any]]:
    """Chat yöneticilerini al"""
    try:
        client = get_rate_limited_client()
        response = await client.get(f"/bot{bot_token}/getChatAdministrators", {"chat_id": chat_id})
        
        if response.get('ok'):
            return response.get('result', [])
        else:
            logger.warning(f"Failed to get administrators: {response.get('description')}")
            return []
    
    except Exception as e:
        logger.error(f"Error getting administrators: {e}")
        return []

async def get_chat_member(bot_token: str, chat_id: str, user_id: int) -> Optional[Dict[str, Any]]:
    """Chat üyesi bilgilerini al"""
    try:
        client = get_rate_limited_client()
        response = await client.get(f"/bot{bot_token}/getChatMember", {
            "chat_id": chat_id,
            "user_id": user_id
        })
        
        if response.get('ok'):
            return response.get('result')
        else:
            logger.warning(f"Failed to get chat member: {response.get('description')}")
            return None
    
    except Exception as e:
        logger.error(f"Error getting chat member: {e}")
        return None
