"""
Telegram Bot Manager
Telegram bot yönetimi için sınıf
"""

import asyncio
from typing import Dict, Any, Optional, List
from core.logging import get_logger
from utils.telegram_helpers import (
    verify_bot_token, get_chat_info, get_chat_member_count,
    check_bot_admin_status, send_message, get_chat_administrators, get_chat_member
)

logger = get_logger('telegram_bot_manager')

class TelegramBotManager:
    """Telegram Bot Manager - Verification Only"""
    
    def __init__(self, bot_token: str):
        self.bot_token = bot_token
        self.bot_info: Optional[Dict[str, Any]] = None
        self._verified = False
        
    async def verify_bot_token(self) -> tuple[bool, Optional[Dict[str, Any]]]:
        """Bot token doğrula"""
        if self._verified and self.bot_info:
            return True, self.bot_info
            
        success, bot_info = await verify_bot_token(self.bot_token)
        
        if success:
            self.bot_info = bot_info
            self._verified = True
            logger.info(f"Bot verified: {bot_info.get('username')}")
            
        return success, bot_info
    
    async def get_chat_info(self, chat_id: str) -> Optional[Dict[str, Any]]:
        """Chat info al"""
        return await get_chat_info(self.bot_token, chat_id)
    
    async def get_chat_member_count(self, chat_id: str) -> Optional[int]:
        """Üye sayısı al"""
        return await get_chat_member_count(self.bot_token, chat_id)
    
    async def is_bot_member(self, chat_id: str, bot_user_id: int) -> bool:
        """Bot'un kanalda üye olup olmadığını kontrol et"""
        try:
            member = await get_chat_member(self.bot_token, chat_id, bot_user_id)
            is_member = member and member.get('status') in ['member', 'administrator', 'creator']
            logger.info(f"[MEMBER_CHECK] Bot {bot_user_id} in {chat_id}: {is_member}")
            return is_member
        except Exception as e:
            logger.error(f"Member check error: {e}")
            return False
    
    async def check_bot_admin_permissions(self, chat_id: str, bot_user_id: int) -> bool:
        """Bot'un admin yetkilerini kontrol et"""
        try:
            admins = await get_chat_administrators(self.bot_token, chat_id)
            
            bot_admin = next((admin for admin in admins if admin.get('user', {}).get('id') == bot_user_id), None)
            
            if not bot_admin:
                logger.warning(f"Bot not admin in {chat_id}")
                return False
            
            # Yetkiler
            can_post = bot_admin.get('can_post_messages', False)
            can_edit = bot_admin.get('can_edit_messages', False)
            can_delete = bot_admin.get('can_delete_messages', False)
            
            has_perms = can_post and can_edit  # Temel yetkiler
            
            logger.info(f"[PERMS_CHECK] Bot {bot_user_id} in {chat_id}: post={can_post}, edit={can_edit}, delete={can_delete}")
            
            return has_perms
            
        except Exception as e:
            logger.error(f"Admin permissions check error: {e}")
            return False
    
    async def get_chat_administrators(self, chat_id: str) -> List[Dict[str, Any]]:
        """Chat yöneticilerini al"""
        return await get_chat_administrators(self.bot_token, chat_id)
    
    async def check_bot_admin_status(self, chat_id: str, bot_user_id: int) -> bool:
        """Bot'un yönetici durumunu kontrol et - Geliştirilmiş"""
        try:
            # Önce bot kanalda mı kontrol et
            member_status = await get_chat_member(self.bot_token, chat_id, bot_user_id)
            
            if not member_status:
                logger.warning(f"Bot {bot_user_id} chat {chat_id} üye değil")
                return False
            
            if member_status.get('status') != 'administrator':
                logger.warning(f"Bot {bot_user_id} chat {chat_id} üye ama yönetici değil")
                return False
            
            # Admin yetkilerini kontrol et
            admin_info = await get_chat_administrators(self.bot_token, chat_id)
            bot_admin = next((admin for admin in admin_info if admin.get('user', {}).get('id') == bot_user_id), None)
            
            if not bot_admin:
                logger.warning(f"Bot admin listesinde yok: {chat_id}")
                return False
            
            # Gerekli yetkiler
            can_post = bot_admin.get('can_post_messages', False)
            can_edit = bot_admin.get('can_edit_messages', False)
            can_delete = bot_admin.get('can_delete_messages', False)
            
            has_perms = can_post and can_edit  # Temel yetkiler
            
            logger.info(f"[ADMIN] Bot {bot_user_id} in {chat_id}: admin={True}, perms={has_perms}")
            return has_perms
            
        except Exception as e:
            logger.error(f"Admin check error: {e}")
            return False
    
    async def verify_bot_access(self, username: str) -> tuple[bool, Optional[Dict[str, Any]]]:
        """Bot erişimini doğrula - Kanal var mı, bot admin mi?"""
        try:
            chat_key = f"@{username}" if not username.startswith('@') else username
            chat_info = await self.get_chat_info(chat_key)
            
            if not chat_info:
                logger.warning(f"Chat info alınamadı: {chat_key}")
                return False, None
            
            chat_id = str(chat_info.get('id', ''))
            
            # Bot admin mi kontrol et
            is_admin = await self.check_bot_admin_status(chat_id, self.bot_info.get('id', 0))
            
            if is_admin:
                logger.info(f"[ACCESS] Bot access verified for {chat_key}")
            
            return is_admin, chat_info
            
        except Exception as e:
            logger.error(f"Bot access verify error: {e}")
            return False, None
    
    async def send_message(self, chat_id: str, text: str, parse_mode: str = "HTML") -> Optional[int]:
        """Mesaj gönder"""
        return await send_message(self.bot_token, chat_id, text, parse_mode)
    
    async def discover_telegram_chats_by_token(self, limit: int = 1000) -> List[Dict[str, Any]]:
        """Bot token ile Telegram chat'lerini keşfet - Geliştirilmiş (Offset ile daha fazla update)"""
        try:
            # Bot token'ını doğrula
            success, bot_info = await self.verify_bot_token()
            if not success:
                logger.error("Bot token verification failed")
                return []
            
            bot_user_id = bot_info.get('id')
            if not bot_user_id:
                logger.error("Bot user ID not found")
                return []
            
            from utils.telegram_helpers import get_rate_limited_client
            client = get_rate_limited_client()
            
            all_chats = []
            seen_chats = set()
            offset = 0
            batch_size = 100
            total_fetched = 0
            
            logger.info(f"[DISCOVERY_START] Starting discovery for bot {bot_info.get('username')}, limit {limit}")
            
            while total_fetched < limit:
                updates_response = await client.get(f"/bot{self.bot_token}/getUpdates", {
                    "limit": min(batch_size, limit - total_fetched),
                    "offset": offset,
                    "timeout": 1  # Short timeout for polling
                })
                
                if not updates_response.get('ok'):
                    logger.error(f"Failed to get updates at offset {offset}: {updates_response}")
                    break
                
                updates = updates_response.get('result', [])
                batch_fetched = len(updates)
                total_fetched += batch_fetched
                
                logger.info(f"[DISCOVERY_BATCH] Offset {offset}: Fetched {batch_fetched} updates, total {total_fetched}")
                
                if batch_fetched == 0:
                    break  # No more updates
                
                for update in updates:
                    # Extract chat from message
                    if 'message' in update:
                        message = update['message']
                        chat = message.get('chat', {})
                        chat_id = str(chat.get('id'))
                        chat_type = chat.get('type')
                        
                        if chat_id in seen_chats:
                            continue
                        
                        # Only channels and supergroups
                        if chat_type in ['channel', 'supergroup']:
                            # Get full chat info
                            chat_info = await self.get_chat_info(chat_id)
                            if chat_info:
                                # Check if bot is admin
                                is_admin = await self.check_bot_admin_permissions(chat_id, bot_user_id)
                                chat_info['is_bot_admin'] = is_admin
                                all_chats.append(chat_info)
                                seen_chats.add(chat_id)
                                logger.info(f"[DISCOVERY_CHAT] Found {chat_info.get('title', 'Unknown')} (ID: {chat_id}), admin: {is_admin}")
                
                offset += batch_fetched  # Update offset to next batch
                await asyncio.sleep(0.5)  # Rate limit pause
                
                if batch_fetched < batch_size:
                    break  # Less than batch, likely end
            
            logger.info(f"[DISCOVERY_END] Total chats discovered: {len(all_chats)} out of {total_fetched} updates")
            return all_chats[:limit]  # Cap at limit
            
        except Exception as e:
            logger.error(f"Discovery error: {str(e)}")
            return []
    
    async def get_chat_admin_status(self, chat_id: str) -> Dict[str, Any]:
        """Chat yönetici durumunu al"""
        try:
            # Bot bilgilerini al
            success, bot_info = await self.verify_bot_token()
            if not success:
                return {"is_admin": False, "error": "Bot verification failed"}
            
            bot_user_id = bot_info.get('id')
            if not bot_user_id:
                return {"is_admin": False, "error": "Bot user ID not found"}
            
            # Yönetici durumunu kontrol et
            is_admin = await self.check_bot_admin_status(chat_id, bot_user_id)
            
            # Chat bilgilerini al
            chat_info = await self.get_chat_info(chat_id)
            
            # Yönetici listesini al
            administrators = await self.get_chat_administrators(chat_id)
            
            return {
                "is_admin": is_admin,
                "bot_info": bot_info,
                "chat_info": chat_info,
                "administrators": administrators,
                "error": None
            }
            
        except Exception as e:
            logger.error(f"Error getting chat admin status: {e}")
            return {"is_admin": False, "error": str(e)}

async def discover_telegram_chats_by_token(bot_token: str, limit: int = 50) -> tuple[bool, List[Dict[str, Any]], Optional[str]]:
    """Bot token ile Telegram chat'lerini keşfet"""
    try:
        manager = TelegramBotManager(bot_token)
        chats = await manager.discover_telegram_chats_by_token(limit)
        return True, chats, None
    except Exception as e:
        logger.error(f"Error in discover_telegram_chats_by_token: {e}")
        return False, [], str(e)

async def get_chat_admin_status(bot_token: str, chat_id: str) -> Dict[str, Any]:
    """Chat yönetici durumunu al"""
    manager = TelegramBotManager(bot_token)
    return await manager.get_chat_admin_status(chat_id)
