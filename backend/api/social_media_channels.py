from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, false
from database import get_db
from models import SocialMediaChannel, Brand, User, TelegramBot
from core.logging import get_logger

logger = get_logger('social_media_channels')
from schemas.social_media_channel import (
    SocialMediaChannelResponse,
    SocialMediaChannelListResponse,
    ChannelStatistics,
    ChannelAssignUsersRequest,
    ChannelAssignUsersResponse
)
from schemas.telegram_discovery import TelegramChannelAddRequest, TelegramChannelAddRequestLegacy, TelegramChannelAddResponse, TelegramBulkChannelAddRequest, BulkAddResponse
from dependencies.auth import get_current_active_user
from dependencies.role_checker import brand_access, resource_access
from services.permission_service import PermissionService
from typing import List, Optional, Any, Dict, Union
import math
from fastapi import BackgroundTasks
import httpx
from utils.telegram_helpers import get_rate_limited_client
from utils.telegram_bot_manager import discover_telegram_chats_by_token, get_chat_admin_status, TelegramBotManager
from config.platforms import get_all_platforms, PlatformConfig
from fastapi import status
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

def get_bot_token_from_channel(channel: Any) -> str | None:
    """Helper: Kanaldan bot token'ı al (yeni yapı ile uyumlu)"""
    if channel.telegram_bot and channel.telegram_bot.bot_token:
        return channel.telegram_bot.bot_token
    # LEGACY: Eski kanallar için geriye uyumluluk (olmayacak ama güvenlik için)
    return getattr(channel, 'bot_token', None)

async def send_test_message(channel: Any, db: Session, recipient: str | None = None) -> tuple[bool, str | None]:
    """Send a test message to the channel. Returns (sent_ok, error_message)."""
    try:
        bot_token = get_bot_token_from_channel(channel)
        if channel.platform == 'telegram' and bot_token and (channel.chat_id or recipient):
            test_message = f"🧪 Test mesajı - {channel.brand.name} markası için bağlantı testi başarılı! ✅"
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    params={
                        "chat_id": recipient or channel.chat_id,
                        "text": test_message,
                        "parse_mode": "HTML"
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('ok'):
                        # Update last activity
                        channel.last_activity = func.now()
                        db.commit()
                        return True, None
                    else:
                        error_desc = data.get('description') or 'Telegram sendMessage failed'
                        # Add more specific error handling
                        if 'not found' in error_desc.lower():
                            error_desc = "Chat not found - verify the chat ID or username"
                        elif 'not a member' in error_desc.lower() or 'have no rights' in error_desc.lower():
                            error_desc = "Bot doesn't have required rights to send messages in this chat"
                        elif 'kicked' in error_desc.lower() or 'banned' in error_desc.lower():
                            error_desc = "Bot is banned or kicked from this chat"
                        elif 'blocked' in error_desc.lower():
                            error_desc = "Bot is blocked by the user or chat"
                        return False, error_desc
                else:
                    try:
                        data = response.json()
                        err = data.get('description')
                    except Exception:
                        err = response.text
                    return False, err or f"HTTP {response.status_code}"
        # WhatsApp test messaging removed
        
    except httpx.TimeoutException:
        return False, "Request timed out - check your network connection and try again"
    except httpx.RequestError as e:
        return False, f"Request error: {str(e)}"
    except Exception as e:
        return False, str(e)

    # Fallback when platform-specific branches didn't return
    return False, "Unsupported platform or missing credentials"

async def fetch_channel_info(channel_id: int, db: Session):
    """Fetch channel information from the respective platform API with rate limiting"""
    channel = db.query(SocialMediaChannel).filter(SocialMediaChannel.id == channel_id).first()
    if not channel:
        return
    channel: Any = channel
    
    # Rate limiting: Only update if last update was more than 1 hour ago
    if channel.updated_at and (datetime.utcnow() - channel.updated_at.replace(tzinfo=None)) < timedelta(hours=1):
        return
    
    try:
        bot_token = get_bot_token_from_channel(channel)
        if channel.platform == 'telegram' and bot_token:
            # Use the new bot manager for operations
            manager = TelegramBotManager(bot_token)
            
            # Apply rate limiting before making API call
            get_rate_limited_client(bot_token, channel.chat_id)
            
            # Fetch Telegram channel info
            chat_info = await manager.get_chat_info(channel.chat_id)
            if chat_info:
                
                # Update channel info
                title = chat_info.get('title')
                username = chat_info.get('username')
                chat_id_from_api = str(chat_info.get('id'))
                
                # Update channel ID if different
                if chat_id_from_api != channel.chat_id:
                    channel.chat_id = chat_id_from_api
                    channel.channel_id = chat_id_from_api
                
                # Use title if available, otherwise use username or keep existing name
                if title:
                    channel.name = title
                elif username:
                    channel.name = f"@{username}"
                
                chat_type = chat_info.get('type', 'private')
                # Telegram'da türler: private, group, supergroup, channel
                if chat_type in ['private', 'group', 'supergroup']:
                    channel.type = 'group'
                elif chat_type == 'channel':
                    channel.type = 'channel'
                else:
                    channel.type = 'group'  # varsayılan
                
                # Get member count if possible (excluding bot)
                try:
                    # Apply rate limiting for member count request as well
                    member_count = await manager.get_chat_member_count(channel.chat_id)
                    if member_count is not None:
                        # Subtract 1 to exclude the bot itself from member count
                        channel.member_count = max(0, member_count - 1)
                except Exception as e:
                    pass  # Member count is optional
                
                # Update the updated_at timestamp to reflect this sync
                channel.updated_at = datetime.utcnow()
                db.commit()
            else:
                pass
        # WhatsApp info fetching removed
        
    except Exception as e:
        # Don't raise the exception, just log it
        pass

@router.post("/telegram/discover")
async def discover_telegram_chats(
    bot_token: str = Body(..., embed=True),
):
    """Discover chats accessible by the bot and return unique chats with admin status.
    """
    try:
        success, result, error = await discover_telegram_chats_by_token(bot_token)
        
        if not success:
            raise HTTPException(status_code=400, detail=error or "Bot keşfi başarısız oldu")
        
        # Bot'un daha önce mesaj aldığı kanalları döndür
        if result and len(result) > 0:
            return {
                "success": True,
                "chats": result,
                "message": f"{len(result)} kanal bulundu. Bot'un daha önce mesaj aldığı kanallar listeleniyor.",
                "bot_info": {
                    "username": "pofuAi_bot",
                    "verified": True
                }
            }
        else:
            return {
                "success": True,
                "chats": result,
                "message": "Henüz hiç kanal bulunamadı. Bot'u yönetmek istediğiniz kanala ekleyin, sonra tekrar deneyin.",
                "instructions": [
                    "1. Bot'u yönetmek istediğiniz kanala ekleyin",
                    "2. Bot'a yönetici yetkisi verin",
                    "3. Kanala bir mesaj gönderin",
                    "4. Birkaç dakika bekleyin ve tekrar deneyin"
                ]
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Keşif sırasında hata: {str(e)}")


@router.post("/channels/add-by-bot", response_model=Union[TelegramChannelAddResponse, BulkAddResponse])
async def add_channel_by_bot(
    request: Union[TelegramChannelAddRequest, TelegramBulkChannelAddRequest],
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """
    Bulk Kanal Ekleme - Doğrulama Odaklı
    Tek kanal veya liste destekler.
    Her kanal için: Doğrula (bot kanalda/admin), ekle.
    """
    # Bulk mu tek mi kontrol et
    is_bulk = isinstance(request, TelegramBulkChannelAddRequest)
    if is_bulk:
        channel_identifiers = request.channel_identifiers
        telegram_bot_id = request.telegram_bot_id
        brand_id = request.brand_id
    else:
        channel_identifiers = [request.channel_identifier]
        telegram_bot_id = request.telegram_bot_id
        brand_id = request.brand_id

    # Marka ve bot kontrol (ortak)
    if brand_id and not brand_access.check_brand_access(current_user, brand_id, db):
        raise HTTPException(status_code=403, detail="Marka erişim hatası")

    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Marka bulunamadı")

    bot = db.query(TelegramBot).filter(
        TelegramBot.id == telegram_bot_id,
        TelegramBot.is_active == True
    ).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot bulunamadı")

    try:
        manager = TelegramBotManager(bot.bot_token)
        bot_valid, bot_info = await manager.verify_bot_token()
        if not bot_valid or not bot_info:
            raise HTTPException(status_code=400, detail="Bot token geçersiz")

        bot_user_id = bot_info.get('id')
        if not bot_user_id:
            raise HTTPException(status_code=400, detail="Bot ID alınamadı")

        added_channels = []
        failed_channels = []
        instructions = []

        for identifier in channel_identifiers:
            if not identifier.strip():
                continue

            # Normalize
            channel_username = identifier.strip()
            if channel_username.startswith('@'):
                channel_username = channel_username[1:]
            elif 't.me/' in channel_username:
                channel_username = channel_username.split('t.me/')[-1].split('/')[0].split('?')[0]

            chat_key = f"@{channel_username}"
            logger.info(f"[BULK_ADD] Verifying: {chat_key}")

            # Get chat info
            chat_info = await manager.get_chat_info(chat_key)
            if not chat_info:
                failed_channels.append({
                    "username": channel_username,
                    "reason": "Kanal bulunamadı veya erişilemedi"
                })
                continue

            chat_id = str(chat_info.get('id'))
            logger.info(f"[BULK_ADD] Found: {chat_info.get('title')} (ID: {chat_id})")

            # Bot member?
            is_bot_member = await manager.is_bot_member(chat_id, bot_user_id)
            if not is_bot_member:
                failed_channels.append({
                    "username": channel_username,
                    "reason": "Bot kanalda değil"
                })
                instructions.append(f"@{channel_username}: Bot ekleyin.")
                continue

            # Admin perms?
            admin_perms = await manager.check_bot_admin_permissions(chat_id, bot_user_id)
            if not admin_perms:
                failed_channels.append({
                    "username": channel_username,
                    "reason": "Bot admin yetkileri yetersiz"
                })
                instructions.append(f"@{channel_username}: Yetkileri güncelleyin (post/edit/delete).")
                continue

            # Existing?
            existing = db.query(SocialMediaChannel).filter(
                SocialMediaChannel.channel_id == chat_id,
                SocialMediaChannel.brand_id == brand_id
            ).first()
            if existing:
                logger.warning(f"[BULK_ADD] Already exists: {chat_key}")
                added_channels.append({
                    "username": channel_username,
                    "status": "already_exists",
                    "name": existing.name
                })
                continue

            # Add channel
            member_count = await manager.get_chat_member_count(chat_id) or 0
            channel = SocialMediaChannel(
                name=chat_info.get('title', f"Kanal {chat_id}"),
                platform='telegram',
                type='channel' if chat_info.get('type') == 'channel' else 'group',
                channel_id=chat_id,
                chat_id=chat_id,
                channel_username=chat_info.get('username'),
                member_count=member_count,
                is_active=True,
                telegram_bot_id=bot.id,
                brand_id=brand_id,
                created_by=current_user.id,
                updated_by=current_user.id
            )

            db.add(channel)
            db.commit()
            db.refresh(channel)

            # Background update
            try:
                await fetch_channel_info(channel.id, db)
            except Exception as e:
                logger.warning(f"Background update failed for {chat_id}: {e}")

            added_channels.append({
                "id": channel.id,
                "username": channel_username,
                "name": channel.name,
                "member_count": member_count
            })
            logger.info(f"[BULK_ADD_SUCCESS] Added: {chat_key}")

        success_count = len([c for c in added_channels if c.get('status') != 'already_exists'])
        already_count = len([c for c in added_channels if c.get('status') == 'already_exists'])
        failed_count = len(failed_channels)

        if is_bulk:
            message = f"Bulk ekleme tamamlandı: {success_count} yeni + {already_count} mevcut, {failed_count} başarısız."
            if failed_count > 0:
                instructions = list(set(instructions))  # Unique
                instructions.insert(0, f"{failed_count} kanal için botu ekleyin:")
            else:
                instructions = None

            return BulkAddResponse(
                success=True,
                success_count=success_count,
                failed_count=failed_count,
                added_channels=added_channels,
                failed_channels=failed_channels,
                instructions=instructions,
                message=message
            )
        else:
            # Single fallback
            if added_channels:
                return TelegramChannelAddResponse(
                    success=True,
                    message="Kanal eklendi!",
                    channel_id=added_channels[0]['id'],
                    channel_info=added_channels[0]
                )
            else:
                # From first failed
                if failed_channels:
                    fc = failed_channels[0]
                    return TelegramChannelAddResponse(
                        success=False,
                        message=fc['reason'],
                        channel_info={
                            "username": fc['username'],
                            "instructions": [f"@{fc['username']}: Bot ekleyin ve yönetici yapın."],
                            "bot_username": bot.bot_username,
                            "requires_manual": True
                        }
                    )
                raise HTTPException(status_code=500, detail="Beklenmeyen hata")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bulk kanal ekleme hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Hata: {str(e)}")

def extract_username_from_link(link: str) -> str:
    """Link'ten username çıkar"""
    if 't.me/' in link:
        return link.split('t.me/')[1].split('/')[0].split('?')[0].replace('@', '')
    return link.replace('@', '')


@router.post("/telegram/discover-and-add", response_model=TelegramChannelAddResponse, deprecated=True)
async def discover_and_add_telegram_channel(
    request: TelegramChannelAddRequestLegacy,  # Eski schema kullan
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """
    [LEGACY - ESKİ YAPI] DEPRECATED - Artık kullanılmıyor!
    Yeni sistemde /channels/add-by-bot endpoint'ini kullanın.
    """
    raise HTTPException(
        status_code=410,
        detail="Bu endpoint artık kullanılmıyor. Lütfen /channels/add-by-bot endpoint'ini kullanın."
    )
    
    # DİNAMİK: Marka erişim kontrolü
    brand_id = request.get('brand_id')
    if brand_id and not brand_access.check_brand_access(current_user, brand_id, db):
        raise HTTPException(status_code=403, detail="Bu marka için kanal oluşturma yetkiniz yok")
    
    # Check if brand exists
    brand = db.query(Brand).filter(Brand.id == request.get('brand_id')).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    try:
        # Use the new bot manager for all operations
        manager = TelegramBotManager(request.bot_token)
        
        # Verify bot token
        bot_valid, bot_info = await manager.verify_bot_token()
        if not bot_valid:
            raise HTTPException(status_code=400, detail="Bot token geçersiz")
        
        if not bot_info:
            raise HTTPException(status_code=400, detail="Bot bilgileri alınamadı")
        
        # Check if bot is admin in the specified chat
        bot_user_id = bot_info.get('id')
        if not bot_user_id:
            raise HTTPException(status_code=400, detail="Bot ID alınamadı")
        
        is_bot_admin = await manager.check_bot_admin_status(request.chat_id, bot_user_id)
        if not is_bot_admin:
            raise HTTPException(status_code=400, detail="Bot kanalda yönetici değil. Botun kanalda yönetici olduğundan emin olun.")
        
        # Get channel info
        chat_info = await manager.get_chat_info(request.chat_id)
        if not chat_info:
            raise HTTPException(status_code=400, detail=f"Kanal bulunamadı: {request.chat_id}. Botun kanalda yönetici olduğundan emin olun.")
        
        # Get member count
        member_count = await manager.get_chat_member_count(request.chat_id) or 0
        
        # Check if channel already exists
        existing_channel = db.query(SocialMediaChannel).filter(
            SocialMediaChannel.channel_id == str(chat_info.get('id')),
            SocialMediaChannel.brand_id == request.brand_id
        ).first()
        
        if existing_channel:
            raise HTTPException(status_code=400, detail="Bu kanal zaten eklenmiş")
        
        # Create channel
        channel = SocialMediaChannel()
        channel.name = chat_info.get('title', f"Telegram Channel {request.chat_id}")
        channel.platform = 'telegram'
        channel.type = 'channel' if chat_info.get('type') == 'channel' else 'group'
        channel.channel_id = str(chat_info.get('id'))
        channel.chat_id = str(chat_info.get('id'))
        channel.member_count = member_count
        channel.is_active = True
        channel.bot_token = request.bot_token  # Note: In a production system, you might want to encrypt this
        channel.brand_id = request.brand_id
        channel.created_by = current_user.id
        channel.updated_by = current_user.id
        
        db.add(channel)
        db.commit()
        db.refresh(channel)
        
        # Refresh channel info from API
        try:
            await fetch_channel_info(int(channel.id), db)
        except Exception as e:
            pass
        
        # Return success response
        return TelegramChannelAddResponse(
            success=True,
            message="Kanal başarıyla eklendi!",
            channel={
                "id": channel.id,
                "name": channel.name,
                "type": channel.type,
                "member_count": channel.member_count,
                "chat_id": channel.chat_id,
                "is_active": channel.is_active
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kanal eklenirken hata: {str(e)}")

@router.get("/platforms")
async def get_platforms():
    """Get all available social media platforms and their configuration"""
    platforms = get_all_platforms()
    return {
        "platforms": [
            {
                "name": name,
                "display_name": config.display_name,
                "icon": config.icon,
                "color": config.color,
                "enabled": config.enabled,
                "fields": [
                    {
                        "name": field.name,
                        "label": field.label,
                        "type": field.type,
                        "required": field.required,
                        "placeholder": field.placeholder,
                        "help_text": field.help_text,
                        "default_value": field.default_value
                    }
                    for field in config.fields
                ]
            }
            for name, config in platforms.items()
            if config.enabled
        ]
    }


@router.post("/telegram/chat-info")
async def get_telegram_chat_info(
    bot_token: str = Body(..., embed=True),
    chat_id: str = Body(..., embed=True)
):
    """Get chat info by chat_id or @username using getChat"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://api.telegram.org/bot{bot_token}/getChat",
                params={"chat_id": chat_id}
            )
            if resp.status_code != 200 or not resp.json().get('ok'):
                raise HTTPException(status_code=400, detail="getChat başarısız. Botun sohbete erişimi olmayabilir.")
            chat_info = resp.json().get('result', {})
            # Try to get member count best-effort (excluding bot)
            members = None
            try:
                mresp = await client.get(
                    f"https://api.telegram.org/bot{bot_token}/getChatMembersCount",
                    params={"chat_id": chat_id}
                )
                if mresp.status_code == 200 and mresp.json().get('ok'):
                    # Subtract 1 to exclude the bot itself from member count
                    members = max(0, mresp.json().get('result', 0) - 1)
            except Exception:
                pass
            return {
                'chat_id': chat_id,
                'type': chat_info.get('type'),
                'title': chat_info.get('title'),
                'username': chat_info.get('username'),
                'member_count': members
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat bilgisi alınamadı: {e}")

@router.get("/channels", response_model=SocialMediaChannelListResponse)
async def get_channels(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=1000),
    platform: Optional[str] = Query(None),
    brand_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """Get social media channels with filtering and pagination"""
    
    # Debug logging
    print(f"[DEBUG] get_channels called by user: {current_user.email} (role: {current_user.role_display_name})")
    print(f"[DEBUG] Filters: page={page}, per_page={per_page}, platform={platform}, brand_id={brand_id}, search={search}")
    
    # Build query
    query = db.query(SocialMediaChannel).join(Brand).join(User, SocialMediaChannel.created_by == User.id)
    
    # DİNAMİK: Kullanıcının erişebileceği markalar
    accessible_brand_ids = brand_access.get_accessible_brand_ids(current_user, db)
    
    if accessible_brand_ids is not None:  # None = tüm markalar
        if not accessible_brand_ids:
            query = query.filter(false())  # Hiç markası yok
        else:
            query = query.filter(SocialMediaChannel.brand_id.in_(accessible_brand_ids))
    
    # Apply filters
    if platform:
        query = query.filter(SocialMediaChannel.platform == platform)
    
    if brand_id:
        query = query.filter(SocialMediaChannel.brand_id == brand_id)
    
    if search:
        query = query.filter(
            or_(
                SocialMediaChannel.name.ilike(f"%{search}%"),
                Brand.name.ilike(f"%{search}%")
            )
        )
    
    # Get total count
    total = query.count()
    print(f"[DEBUG] Total channels found: {total}")
    
    # Apply pagination
    offset = (page - 1) * per_page
    channels = query.offset(offset).limit(per_page).all()
    channels: List[Any] = channels
    print(f"[DEBUG] Channels returned: {len(channels)}")

    # Format response
    channel_responses: List[Dict[str, Any]] = []
    for channel in channels:
        channel: Any = channel
        # Mask sensitive tokens
        masked_bot_token = None
        if getattr(channel, 'bot_token', None):
            masked_bot_token = getattr(channel, 'bot_token')[:4] + '••••' + getattr(channel, 'bot_token')[-4:]

        resp_data: Dict[str, Any] = {
            'id': channel.id,
            'name': channel.name,
            'platform': channel.platform,
            'type': channel.type,
            'channel_id': channel.channel_id,
            'member_count': channel.member_count,
            'is_active': channel.is_active,
            'bot_token': masked_bot_token,
            'chat_id': channel.chat_id,
            'brand_id': channel.brand_id,
            'brand_name': channel.brand.name,
            'assigned_user_ids': channel.assigned_user_ids,
            'last_activity': channel.last_activity,
            'created_at': channel.created_at,
            'updated_at': channel.updated_at,
            'created_by': channel.created_by,
            'creator_name': f"{channel.creator.first_name} {channel.creator.last_name}",
            'updated_by': channel.updated_by,
            'updater_name': f"{channel.updater.first_name} {channel.updater.last_name}" if channel.updater else None,
        }
        channel_responses.append(resp_data)
    
    total_pages = math.ceil(total / per_page)
    
    return {
        'channels': channel_responses,
        'total': int(total),
        'page': int(page),
        'per_page': int(per_page),
        'total_pages': int(total_pages)
    }
from typing import Any, Dict, List

@router.get("/channels/statistics", response_model=ChannelStatistics)
async def get_channel_statistics(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """Get channel statistics"""
    
    # Build base query
    query = db.query(SocialMediaChannel)
    
    # DİNAMİK: Kullanıcının erişebileceği markalar
    accessible_brand_ids = brand_access.get_accessible_brand_ids(current_user, db)
    
    if accessible_brand_ids is not None:  # None = tüm markalar
        if not accessible_brand_ids:
            # Hiç markası yok - sadece kendi oluşturdukları
            query = query.filter(
                or_(
                    SocialMediaChannel.assigned_user_ids.contains([current_user.id]),
                    SocialMediaChannel.created_by == current_user.id
                )
            )
        else:
            # Belirli markalar veya kendi oluşturdukları
            query = query.filter(
                or_(
                    SocialMediaChannel.brand_id.in_(accessible_brand_ids),
                    SocialMediaChannel.created_by == current_user.id,
                    SocialMediaChannel.assigned_user_ids.contains([current_user.id])
                )
            )
    
    # Calculate statistics (avoid subqueries producing multiple rows for scalar)
    channels_all = query.all()
    channels_all: List[Any] = channels_all
    total_channels = len(channels_all)
    telegram_channels = sum(1 for c in channels_all if c.platform == 'telegram')
    active_channels = sum(1 for c in channels_all if c.is_active)
    total_members = sum(c.member_count or 0 for c in channels_all)
    
    return ChannelStatistics(
        total_channels=total_channels,
        telegram_channels=telegram_channels,
        active_channels=active_channels,
        total_members=total_members
    )



@router.post("/channels", response_model=SocialMediaChannelResponse)
async def create_channel(
    channel_data: Any,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """Create a new social media channel"""
    
    # DİNAMİK: Marka erişim kontrolü
    if not brand_access.check_brand_access(current_user, channel_data.brand_id, db):
        raise HTTPException(status_code=403, detail="Bu marka için kanal oluşturma yetkiniz yok")
    
    # Check if brand exists
    brand = db.query(Brand).filter(Brand.id == channel_data.brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    # Check if channel with same ID already exists in same brand
    existing_channel = db.query(SocialMediaChannel).filter(
        SocialMediaChannel.channel_id == channel_data.channel_id,
        SocialMediaChannel.platform == channel_data.platform,
        SocialMediaChannel.brand_id == channel_data.brand_id
    ).first()
    
    if existing_channel:
        raise HTTPException(status_code=400, detail="Channel with this ID already exists")
    
    # Auto-generate channel name if not provided
    channel_name = channel_data.name
    if not channel_name:
        channel_name = f"Telegram - {channel_data.chat_id}"

    # Create channel
    channel = SocialMediaChannel()
    channel.name = channel_name
    channel.platform = channel_data.platform
    channel.type = channel_data.type or 'group'
    channel.channel_id = channel_data.channel_id
    channel.member_count = channel_data.member_count or 0
    channel.is_active = channel_data.is_active if channel_data.is_active is not None else True
    channel.bot_token = channel_data.bot_token
    channel.chat_id = channel_data.chat_id
    channel.brand_id = channel_data.brand_id
    channel.created_by = current_user.id
    channel.updated_by = current_user.id
    
    db.add(channel)
    db.commit()
    db.refresh(channel)
    
    # Start background task to fetch channel info
    try:
        await fetch_channel_info(int(channel.id), db)
    except Exception as e:
        # Log error but don't fail the creation
        pass
    
    # Format response - never expose full bot token in API responses
    return {
        'id': channel.id,
        'name': channel.name,
        'platform': channel.platform,
        'type': channel.type,
        'channel_id': channel.channel_id,
        'member_count': channel.member_count,
        'is_active': channel.is_active,
        'bot_token': (get_bot_token_from_channel(channel)[:4] + '••••' + get_bot_token_from_channel(channel)[-4:]) if get_bot_token_from_channel(channel) else None,  # Only show masked token
        'chat_id': channel.chat_id,
        'brand_id': channel.brand_id,
        'brand_name': channel.brand.name,
        'last_activity': channel.last_activity,
        'created_at': channel.created_at,
        'updated_at': channel.updated_at,
        'created_by': channel.created_by,
        'creator_name': f"{channel.creator.first_name} {channel.creator.last_name}",
        'updated_by': channel.updated_by,
        'updater_name': None
    }

@router.post("/channels/bulk-assign", response_model=Dict[str, Any])
async def bulk_assign_channels(
    assignment_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """
    Çoklu Kanal Atama: Birden fazla kanala aynı anda marka ve kullanıcı ata
    """
    # Admin check
    if not current_user.permissions or 'social.manage' not in current_user.permissions:
        raise HTTPException(status_code=403, detail="Bu işlem için admin yetkisi gerekli")

    channel_ids = assignment_data.get('channel_ids', [])
    brand_id = assignment_data.get('brand_id')
    user_ids = assignment_data.get('user_ids', [])

    if not channel_ids:
        raise HTTPException(status_code=400, detail="En az bir kanal seçmelisiniz")

    # Validate brand if provided
    if brand_id:
        brand = db.query(Brand).filter(Brand.id == brand_id).first()
        if not brand:
            raise HTTPException(status_code=404, detail="Marka bulunamadı")

    # Validate users if provided
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        if len(users) != len(user_ids):
            raise HTTPException(status_code=400, detail="Bazı kullanıcılar bulunamadı")

    # Get channels
    channels = db.query(SocialMediaChannel).filter(SocialMediaChannel.id.in_(channel_ids)).all()
    if len(channels) != len(channel_ids):
        raise HTTPException(status_code=400, detail="Bazı kanallar bulunamadı")

    # Update channels
    updated_channels = []
    for channel in channels:
        if brand_id is not None:
            channel.brand_id = brand_id
        if user_ids is not None:
            channel.assigned_user_ids = user_ids
        channel.updated_by = current_user.id
        updated_channels.append({
            "id": channel.id,
            "name": channel.name,
            "brand_id": channel.brand_id,
            "assigned_user_ids": channel.assigned_user_ids
        })

    db.commit()

    return {
        "success": True,
        "message": f"{len(updated_channels)} kanal başarıyla güncellendi",
        "updated_channels": updated_channels,
        "total_updated": len(updated_channels)
    }


@router.post("/channels/{channel_id}/assign", response_model=Dict[str, Any])
async def assign_channel(
    channel_id: int,
    assignment_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """
    Kanal Atama: Marka ve Kullanıcı Ata (Admin Only)
    """
    # Admin check
    if not current_user.permissions or 'social.manage' not in current_user.permissions:
        raise HTTPException(status_code=403, detail="Bu işlem için admin yetkisi gerekli")

    channel = db.query(SocialMediaChannel).filter(SocialMediaChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Kanal bulunamadı")

    # Assign brand
    brand_id = assignment_data.get('brand_id')
    if brand_id:
        brand = db.query(Brand).filter(Brand.id == brand_id).first()
        if not brand:
            raise HTTPException(status_code=404, detail="Marka bulunamadı")
        channel.brand_id = brand_id

    # Assign users
    user_ids = assignment_data.get('user_ids', [])
    if user_ids:
        # Validate users
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        if len(users) != len(user_ids):
            raise HTTPException(status_code=400, detail="Bazı kullanıcılar bulunamadı")
        channel.assigned_user_ids = user_ids

    channel.updated_by = current_user.id
    db.commit()
    db.refresh(channel)

    return {
        "success": True,
        "message": "Kanal atama başarılı",
        "channel_id": channel.id,
        "brand_id": channel.brand_id,
        "assigned_user_ids": channel.assigned_user_ids
    }


@router.put("/channels/{channel_id}", response_model=SocialMediaChannelResponse)
async def update_channel(
    channel_id: int,
    channel_data: Any,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """Update a social media channel"""
    
    # Get channel
    channel = db.query(SocialMediaChannel).filter(SocialMediaChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # DİNAMİK: Kanal erişim kontrolü
    if not resource_access.check_channel_access(current_user, channel.brand_id, db):
        raise HTTPException(status_code=403, detail="Bu kanalı güncelleme yetkiniz yok")
    
    # Update fields
    update_data = channel_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(channel, field):
            setattr(channel, field, value)
    
    channel.updated_by = current_user.id
    
    db.commit()
    db.refresh(channel)
    
    # Format response
    return {
        'id': channel.id,
        'name': channel.name,
        'platform': channel.platform,
        'type': channel.type,
        'channel_id': channel.channel_id,
        'member_count': channel.member_count,
        'is_active': channel.is_active,
        'bot_token': (channel.bot_token[:4] + '••••' + channel.bot_token[-4:]) if channel.bot_token else None,
        'chat_id': channel.chat_id,
        'brand_id': channel.brand_id,
        'brand_name': channel.brand.name,
        'last_activity': channel.last_activity,
        'created_at': channel.created_at,
        'updated_at': channel.updated_at,
        'created_by': channel.created_by,
        'creator_name': f"{channel.creator.first_name} {channel.creator.last_name}",
        'updated_by': channel.updated_by,
        'updater_name': f"{channel.updater.first_name} {channel.updater.last_name}" if channel.updater else None
    }

@router.delete("/channels/{channel_id}")
async def delete_channel(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """Delete a specific social media channel (Super Admin only)"""
    
    # DİNAMİK: social.manage yetkisi gerekli
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'social.manage'):
        raise HTTPException(status_code=403, detail="Kanal silme yetkiniz yok")
    
    # Get channel
    channel = db.query(SocialMediaChannel).filter(SocialMediaChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    db.delete(channel)
    db.commit()
    
    return {"message": "Channel deleted successfully"}

@router.patch("/channels/{channel_id}/toggle")
async def toggle_channel_status(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """Toggle channel active status"""
    
    # Get channel
    channel = db.query(SocialMediaChannel).filter(SocialMediaChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # DİNAMİK: Kanal erişim kontrolü
    if not resource_access.check_channel_access(current_user, channel.brand_id, db):
        raise HTTPException(status_code=403, detail="Bu kanalı güncelleme yetkiniz yok")
    
    # Toggle status
    channel.is_active = not bool(channel.is_active)
    channel.updated_by = current_user.id
    
    db.commit()
    
    return {"message": f"Channel {'activated' if channel.is_active else 'deactivated'} successfully", "is_active": channel.is_active}

@router.post("/channels/{channel_id}/health")
async def test_channel_connection(
    channel_id: int,
    background_tasks: BackgroundTasks,
    recipient: Optional[str] = Body(default=None, embed=True),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """Test connectivity for a specific channel (simple ping)."""
    channel = db.query(SocialMediaChannel).filter(SocialMediaChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    # DİNAMİK: Kanal erişim kontrolü
    if not resource_access.check_channel_access(current_user, channel.brand_id, db):
        raise HTTPException(status_code=403, detail="Bu kanalı test etme yetkiniz yok")

    # Check basic connection first (getMe for bot)
    status = 'disconnected'
    test_message_sent = False
    test_message_error = None
    
    try:
        bot_token = get_bot_token_from_channel(channel)
        if channel.platform == 'telegram' and bot_token:
            # Telegram getMe as health-check
            url = f"https://api.telegram.org/bot{bot_token}/getMe"
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200 and resp.json().get('ok'):
                    status = 'connected'
            
            # If basic connection is OK, try to get chat info to verify access
            if status == 'connected' and channel.chat_id:
                chat_info_url = f"https://api.telegram.org/bot{channel.bot_token}/getChat"
                chat_resp = await client.get(chat_info_url, params={"chat_id": channel.chat_id})
                if chat_resp.status_code != 200 or not chat_resp.json().get('ok'):
                    status = 'disconnected'
                    test_message_error = "Cannot access the chat - check if bot is added to chat and has permissions"
        # WhatsApp health check removed
    except Exception as e:
        status = 'error'
        test_message_error = str(e)

    # If connected, refresh channel info from platform APIs (best-effort)
    if status == 'connected':
        try:
            await fetch_channel_info(channel.id, db)
        except Exception:
            pass
    
    # Only try to send test message if the channel is a group (where bot can send messages by default)
    # For channels, sending message requires the bot to be admin, which may fail
    if status == 'connected':
        try:
            # For Telegram, check chat type first to determine if sending message is appropriate
            if channel.platform == 'telegram':
                # Try to get chat details to check type
                async with httpx.AsyncClient(timeout=8.0) as client:
                    chat_info_url = f"https://api.telegram.org/bot{bot_token}/getChat"
                    chat_resp = await client.get(chat_info_url, params={"chat_id": channel.chat_id})
                    if chat_resp.status_code == 200 and chat_resp.json().get('ok'):
                        chat_data = chat_resp.json().get('result', {})
                        chat_type = chat_data.get('type', '')
                        
                        # For private chats, groups, and supergroups, try to send message
                        # For channels, sending may fail if bot is not admin
                        if chat_type in ['group', 'supergroup', 'private']:
                            test_message_sent, test_message_error = await send_test_message(channel, db, recipient)
                        elif chat_type == 'channel':
                            # For channels, try to send message but expect potential failure
                            test_message_sent, test_message_error = await send_test_message(channel, db, recipient)
                            if not test_message_sent and not test_message_error:
                                test_message_error = "Bot needs to be admin in channel to send messages"
                        else:
                            test_message_sent, test_message_error = await send_test_message(channel, db, recipient)
                    else:
                        test_message_sent, test_message_error = await send_test_message(channel, db, recipient)
            else:
                # Other platforms not supported
                test_message_sent, test_message_error = (False, None)
        except Exception as e:
            test_message_error = str(e)
    
    return {
        "connection_status": status,
        "test_message_sent": test_message_sent,
        "test_message_error": test_message_error
    }

@router.post("/channels/{channel_id}/rotate-token")
async def rotate_channel_token(
    channel_id: int,
    token: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """Rotate/replace the access token for a channel (platform-specific)."""
    channel = db.query(SocialMediaChannel).filter(SocialMediaChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    # DİNAMİK: Kanal erişim kontrolü
    if not resource_access.check_channel_access(current_user, channel.brand_id, db):
        raise HTTPException(status_code=403, detail="Bu kanalda token rotasyonu yapma yetkiniz yok")

    if not token:
        raise HTTPException(status_code=400, detail="Token is required")

    # Platform-specific token field
    if channel.platform == 'telegram':
        channel.bot_token = token
    else:
        raise HTTPException(status_code=400, detail="Unsupported platform")

    channel.updated_by = current_user.id
    db.commit()
    db.refresh(channel)

    masked = token[:4] + '••••' + token[-4:] if len(token) >= 8 else '••••'
    return {"message": "Token updated", "token_preview": masked}


@router.get("/channels/{channel_id}", response_model=SocialMediaChannelResponse)
async def get_channel(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """Get a specific social media channel."""
    channel = db.query(SocialMediaChannel).filter(SocialMediaChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    channel: Any = channel

    # DİNAMİK: Kanal erişim kontrolü
    has_brand_access = resource_access.check_channel_access(current_user, channel.brand_id, db)
    is_assigned = channel.assigned_user_ids and current_user.id in channel.assigned_user_ids
    is_creator = channel.created_by == current_user.id
    
    if not (has_brand_access or is_assigned or is_creator):
        raise HTTPException(status_code=403, detail="Bu kanalı görüntüleme yetkiniz yok")

    # Mask sensitive tokens
    masked_bot_token = None
    bot_token = get_bot_token_from_channel(channel)
    if bot_token:
        masked_bot_token = bot_token[:4] + '••••' + bot_token[-4:]

    response = SocialMediaChannelResponse(  # type: ignore
        id=int(channel.id),
        name=str(channel.name),
        platform=str(channel.platform),
        type=str(channel.type),
        channel_id=str(channel.channel_id),
        member_count=int(channel.member_count),
        is_active=bool(channel.is_active),
        bot_token=masked_bot_token,
        chat_id=str(channel.chat_id),
        brand_id=int(channel.brand_id),
        brand_name=str(channel.brand.name),
        assigned_user_ids=channel.assigned_user_ids,
        last_activity=channel.last_activity,
        created_at=channel.created_at,
        updated_at=channel.updated_at,
        created_by=int(channel.created_by),
        creator_name=f"{channel.creator.first_name} {channel.creator.last_name}",
        updated_by=int(channel.updated_by),
        updater_name=f"{channel.updater.first_name} {channel.updater.last_name}" if channel.updater else None
    )
    return response


@router.get("/channels/{channel_id}/statistics")
async def get_channel_statistics(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """
    Kanal istatistiklerini getirir:
    - Toplam mesaj sayısı
    - Toplam post sayısı (gönderilen)
    - Toplam üye sayısı
    - Atanan çalışan sayısı
    - Bot bilgileri
    """
    from models import SocialMediaMessage, User
    
    channel = db.query(SocialMediaChannel).filter(SocialMediaChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    channel: Any = channel

    # Erişim kontrolü
    has_brand_access = resource_access.check_channel_access(current_user, channel.brand_id, db)
    is_assigned = channel.assigned_user_ids and current_user.id in channel.assigned_user_ids
    is_creator = channel.created_by == current_user.id
    
    if not (has_brand_access or is_assigned or is_creator):
        raise HTTPException(status_code=403, detail="Bu kanalı görüntüleme yetkiniz yok")

    # Mesaj istatistikleri
    total_messages = db.query(func.count(SocialMediaMessage.id)).filter(
        SocialMediaMessage.channel_id == channel_id
    ).scalar() or 0
    
    sent_messages = db.query(func.count(SocialMediaMessage.id)).filter(
        SocialMediaMessage.channel_id == channel_id,
        SocialMediaMessage.is_sent == True
    ).scalar() or 0
    
    # Atanan kullanıcılar
    assigned_users_data = []
    if channel.assigned_user_ids:
        for user_id in channel.assigned_user_ids:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                # Bu kullanıcının gönderdiği mesaj sayısı
                user_messages = db.query(func.count(SocialMediaMessage.id)).filter(
                    SocialMediaMessage.channel_id == channel_id,
                    SocialMediaMessage.created_by == user_id,
                    SocialMediaMessage.is_sent == True
                ).scalar() or 0
                
                assigned_users_data.append({
                    "id": user.id,
                    "name": f"{user.first_name} {user.last_name}",
                    "email": user.email,
                    "sent_messages": user_messages
                })
    
    # Bot bilgileri
    bot_info = None
    if channel.telegram_bot:
        bot_info = {
            "id": channel.telegram_bot.id,
            "name": channel.telegram_bot.bot_name,
            "username": f"@{channel.telegram_bot.bot_username}",
            "is_active": channel.telegram_bot.is_active,
            "is_verified": channel.telegram_bot.is_verified
        }
    
    return {
        "channel_id": channel.id,
        "channel_name": channel.name,
        "statistics": {
            "total_messages": total_messages,
            "sent_posts": sent_messages,
            "total_members": channel.member_count or 0,
            "assigned_users_count": len(channel.assigned_user_ids) if channel.assigned_user_ids else 0
        },
        "bot": bot_info,
        "assigned_users": assigned_users_data
    }


@router.get("/channels/{channel_id}/debug")
async def debug_channel_info(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """Debug channel information and test Telegram API connection"""
    channel = db.query(SocialMediaChannel).filter(SocialMediaChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    channel: Any = channel

    # DİNAMİK: Kanal erişim kontrolü
    if not resource_access.check_channel_access(current_user, channel.brand_id, db):
        raise HTTPException(status_code=403, detail="Bu kanalı görüntüleme yetkiniz yok")

    # Test Telegram API connection
    telegram_info = None
    bot_token = get_bot_token_from_channel(channel)
    if channel.platform == 'telegram' and bot_token and channel.chat_id:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://api.telegram.org/bot{bot_token}/getChat",
                    params={"chat_id": channel.chat_id},
                    timeout=10.0
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get('ok'):
                        telegram_info = data.get('result', {})
        except Exception as e:
            pass

    return {
        "channel_id": channel.id,
        "name": channel.name,
        "platform": channel.platform,
        "type": channel.type,
        "channel_id_db": channel.channel_id,
        "chat_id_db": channel.chat_id,
        "bot_token_preview": (get_bot_token_from_channel(channel)[:4] + "••••" + get_bot_token_from_channel(channel)[-4:]) if get_bot_token_from_channel(channel) else None,
        "telegram_api_response": telegram_info,
        "member_count": channel.member_count,
        "is_active": channel.is_active
    }

@router.post("/channels/{channel_id}/refresh-info")
async def refresh_channel_info(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """Refresh channel information from the platform API."""
    channel = db.query(SocialMediaChannel).filter(SocialMediaChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    channel: Any = channel

    # DİNAMİK: Kanal erişim kontrolü
    if not resource_access.check_channel_access(current_user, channel.brand_id, db):
        raise HTTPException(status_code=403, detail="Bu kanalı güncelleme yetkiniz yok")

    try:
        # Fetch updated channel info
        await fetch_channel_info(channel_id, db)
        
        # Return updated channel info
        updated_channel = db.query(SocialMediaChannel).filter(SocialMediaChannel.id == channel_id).first()
        
        # Mask sensitive tokens
        updated_channel: Any = updated_channel
        masked_bot_token = None
        if getattr(updated_channel, 'bot_token', None):
            bot_token = get_bot_token_from_channel(updated_channel)
            masked_bot_token = bot_token[:4] + '••••' + bot_token[-4:] if bot_token else None

        response = SocialMediaChannelResponse(  # type: ignore
            id=int(updated_channel.id),
            name=str(updated_channel.name),
            platform=str(updated_channel.platform),
            type=str(updated_channel.type),
            channel_id=str(updated_channel.channel_id),
            member_count=int(updated_channel.member_count),
            is_active=bool(updated_channel.is_active),
            bot_token=masked_bot_token,
            chat_id=str(updated_channel.chat_id),
            brand_id=int(updated_channel.brand_id),
            brand_name=str(updated_channel.brand.name),
            last_activity=updated_channel.last_activity,
            created_at=updated_channel.created_at,
            updated_at=updated_channel.updated_at,
            created_by=int(updated_channel.created_by),
            creator_name=f"{updated_channel.creator.first_name} {updated_channel.creator.last_name}",
            updated_by=int(updated_channel.updated_by),
            updater_name=f"{updated_channel.updater.first_name} {updated_channel.updater.last_name}" if updated_channel.updater else None
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error refreshing channel info: {str(e)}")


@router.post("/channels/add-by-username")
async def add_channel_by_username(
    request: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """Add channel by username using bot token and channel username"""
    
    bot_token = request.get('bot_token')
    channel_username = request.get('channel_username', '').strip()
    chat_id_input = request.get('chat_id')
    brand_id = request.get('brand_id')
    
    if not bot_token or not brand_id:
        raise HTTPException(status_code=400, detail="Bot token and brand ID are required")
    
    if not channel_username and not chat_id_input:
        raise HTTPException(status_code=400, detail="Either channel username or chat_id is required")
    
    # Normalize inputs
    if channel_username and channel_username.startswith('@'):
        channel_username = channel_username[1:]
    
    # DİNAMİK: Marka erişim kontrolü
    if not brand_access.check_brand_access(current_user, brand_id, db):
        raise HTTPException(status_code=403, detail="Bu marka için kanal oluşturma yetkiniz yok")
    
    # Check if brand exists
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    try:
        # Use the bot manager for operations
        manager = TelegramBotManager(bot_token)
        
        # Verify bot token
        bot_valid, bot_info = await manager.verify_bot_token()
        if not bot_valid:
            raise HTTPException(status_code=400, detail="Bot token geçersiz")
        
        if not bot_info:
            raise HTTPException(status_code=400, detail="Bot bilgileri alınamadı")
        
        # Determine chat key: prefer numeric chat_id if provided
        chat_key = None
        if chat_id_input:
            chat_key = str(chat_id_input)
        else:
            chat_key = f"@{channel_username}"

        # Get channel info by chat_key (supports @username or numeric id)
        chat_info = await manager.get_chat_info(chat_key)
        if not chat_info:
            raise HTTPException(status_code=400, detail=f"Kanal bulunamadı: {chat_key}")
        
        chat_id = str(chat_info.get('id'))
        
        # Check if bot is admin in the channel
        bot_user_id = bot_info.get('id')
        if not bot_user_id:
            raise HTTPException(status_code=400, detail="Bot ID alınamadı")
        
        is_bot_admin = await manager.check_bot_admin_status(chat_id, bot_user_id)
        if not is_bot_admin:
            raise HTTPException(status_code=400, detail="Bot kanalda yönetici değil. Botun kanalda yönetici olduğundan emin olun.")
        
        # Get member count
        member_count = await manager.get_chat_member_count(chat_id) or 0
        
        # Check if channel already exists
        existing_channel = db.query(SocialMediaChannel).filter(
            SocialMediaChannel.channel_id == chat_id,
            SocialMediaChannel.brand_id == brand_id
        ).first()
        
        if existing_channel:
            raise HTTPException(status_code=400, detail="Bu kanal zaten eklenmiş")
        
        # Create channel
        channel = SocialMediaChannel()
        # Name preference: title -> @username -> Telegram {chat_id}
        resolved_username = chat_info.get('username')
        channel.name = chat_info.get('title') or (f"@{resolved_username}" if resolved_username else f"Telegram {chat_id}")
        channel.platform = 'telegram'
        channel.type = 'channel' if chat_info.get('type') == 'channel' else 'group'
        channel.channel_id = chat_id
        channel.chat_id = chat_id
        channel.member_count = member_count
        channel.is_active = True
        channel.bot_token = bot_token
        channel.brand_id = brand_id
        channel.created_by = current_user.id
        channel.updated_by = current_user.id
        
        db.add(channel)
        db.commit()
        db.refresh(channel)
        
        # Refresh channel info from API
        try:
            await fetch_channel_info(int(channel.id), db)
        except Exception as e:
            pass
        
        # Return success response
        return {
            "success": True,
            "message": "Kanal başarıyla eklendi!",
            "channel": {
                "id": channel.id,
                "name": channel.name,
                "username": channel_username,
                "chat_id": channel.chat_id,
                "member_count": channel.member_count,
                "type": channel.type
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kanal eklenirken hata: {str(e)}")


@router.put("/channels/{channel_id}/assign-users", response_model=ChannelAssignUsersResponse)
async def assign_users_to_channel(
    channel_id: int,
    request: ChannelAssignUsersRequest,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """Assign users to a channel (for managing the channel)"""
    
    # Get channel
    channel = db.query(SocialMediaChannel).filter(SocialMediaChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # DİNAMİK: Kanal yönetimi yetkisi kontrolü
    if not resource_access.check_channel_access(current_user, channel.brand_id, db):
        raise HTTPException(status_code=403, detail="Bu kanalı yönetme yetkiniz yok")
    
    # Validate user IDs - ensure they exist and have access to the brand
    if request.user_ids:
        for user_id in request.user_ids:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=400, detail=f"User with ID {user_id} not found")
            
            # DİNAMİK: Kullanıcının bu markaya erişimi var mı kontrol et
            if not brand_access.check_brand_access(user, channel.brand_id, db):
                raise HTTPException(
                    status_code=403, 
                    detail=f"Kullanıcı {user.first_name} {user.last_name} bu markaya erişim yetkisine sahip değil"
                )
    
    # Update channel's assigned users
    channel.assigned_user_ids = request.user_ids
    channel.updated_by = current_user.id
    db.commit()
    
    return ChannelAssignUsersResponse(
        message=f"Successfully assigned {len(request.user_ids)} users to channel",
        assigned_user_ids=request.user_ids
    )


@router.get("/channels/{channel_id}/assigned-users")
async def get_channel_assigned_users(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """Get users assigned to a channel"""
    
    # Get channel
    channel = db.query(SocialMediaChannel).filter(SocialMediaChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # DİNAMİK: Kanal erişim kontrolü
    if not resource_access.check_channel_access(current_user, channel.brand_id, db):
        raise HTTPException(status_code=403, detail="Bu kanalı görüntüleme yetkiniz yok")
    
    # Get assigned users details
    assigned_users = []
    if channel.assigned_user_ids:
        for user_id in channel.assigned_user_ids:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                assigned_users.append({
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'role': user.role_display_name,
                    'is_active': user.is_active
                })
    
    return {
        'channel_id': channel_id,
        'channel_name': channel.name,
        'assigned_users': assigned_users
    }
