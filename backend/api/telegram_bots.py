"""
Telegram Bots API
Admin only - Bot token management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Any, List, Optional, Dict
from database import get_db
from dependencies.auth import get_current_active_user
from models.telegram_bot import TelegramBot
from models.social_media_channel import SocialMediaChannel
from models.user import User
from models.brand import Brand
from schemas.telegram_bot import (
    TelegramBotCreate,
    TelegramBotUpdate,
    TelegramBotResponse,
    TelegramBotListResponse,
    TelegramBotVerifyResponse
)
from utils.telegram_bot_manager import TelegramBotManager, discover_telegram_chats_by_token
from datetime import datetime
import logging
from dependencies.role_checker import brand_access
from api.social_media_channels import fetch_channel_info

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/telegram-bots", tags=["Telegram Bots"])


@router.post("", response_model=TelegramBotResponse, status_code=status.HTTP_201_CREATED)
async def create_telegram_bot(
    bot_data: TelegramBotCreate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """
    Bot Ekle + Otomatik Kanal Keşfi (Global Bot - Marka Bağımsız)
    1. Bot token ile bot ekle (global)
    2. getUpdates ile bot'un tüm kanallarını keşfet
    3. Her kanal için admin doğrula
    4. Kanalları markasız ekle (sonra atanacak)
    """
    # Role check - admin only
    if not current_user.permissions or 'social.manage' not in current_user.permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için yetkiniz yok. Sadece adminler bot ekleyebilir."
        )

    try:
        # Bot Manager ile doğrula
        manager = TelegramBotManager(bot_data.bot_token)
        success, bot_info = await manager.verify_bot_token()
        if not success or not bot_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bot token geçersiz veya bot bilgileri alınamadı"
            )

        bot_username = bot_info.get('username', 'unknown_bot')
        bot_name = bot_info.get('first_name', 'Unknown Bot')
        bot_user_id = str(bot_info.get('id', ''))

        # Bot DB'ye ekle (Global - brand_id = None)
        existing_bot = db.query(TelegramBot).filter(
            TelegramBot.bot_token == bot_data.bot_token
        ).first()
        if existing_bot:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu bot zaten ekli"
            )

        bot = TelegramBot(
            bot_token=bot_data.bot_token,
            bot_name=bot_name,
            bot_username=bot_username,
            bot_user_id=bot_user_id,
            is_active=True,
            is_verified=True,
            last_verified_at=datetime.utcnow(),
            brand_id=None,  # Global bot
            created_by=current_user.id,
            updated_by=current_user.id
        )
        db.add(bot)
        db.commit()
        db.refresh(bot)

        logger.info(f"[BOT_CREATED] Global bot {bot_username} added")

        # Otomatik Kanal Keşfi (Global Channels - Markasız)
        discovered_success, discovered_chats, error = await discover_telegram_chats_by_token(bot.bot_token, limit=1000)
        if not discovered_success:
            logger.warning(f"Discovery failed for bot {bot.id}: {error}")
            discovered_count = 0
        else:
            discovered_count = 0
            auto_added_channels = []
            bot_user_id_int = bot_info.get('id')
            for chat in discovered_chats:
                chat_id = str(chat.get('id'))
                # Admin doğrula
                is_admin = await manager.check_bot_admin_permissions(chat_id, bot_user_id_int)
                if is_admin:
                    # Kanal ekle (Global - brand_id = None)
                    try:
                        existing_channel = db.query(SocialMediaChannel).filter(
                            SocialMediaChannel.channel_id == chat_id,
                            SocialMediaChannel.telegram_bot_id == bot.id
                        ).first()
                        if not existing_channel:
                            member_count = await manager.get_chat_member_count(chat_id) or 0
                            channel = SocialMediaChannel(
                                name=chat.get('title', f"Channel {chat_id}"),
                                platform='telegram',
                                type='channel' if chat.get('type') == 'channel' else 'group',
                                channel_id=chat_id,
                                chat_id=chat_id,
                                channel_username=chat.get('username'),
                                member_count=member_count,
                                is_active=True,
                                telegram_bot_id=bot.id,
                                brand_id=None,  # Atanacak
                                created_by=current_user.id,
                                updated_by=current_user.id
                            )
                            db.add(channel)
                            db.commit()
                            db.refresh(channel)
                            auto_added_channels.append({
                                "id": channel.id,
                                "name": channel.name,
                                "chat_id": chat_id
                            })
                            discovered_count += 1
                            logger.info(f"[AUTO_CHANNEL] Added {chat.get('title')} for global bot {bot.id}")
                    except Exception as e:
                        logger.error(f"Failed to add channel {chat_id}: {e}")

            logger.info(f"[DISCOVERY_COMPLETE] {discovered_count} channels auto-added for bot {bot.id}")

        return TelegramBotResponse(
            id=bot.id,
            bot_name=bot.bot_name,
            bot_username=bot.bot_username,
            bot_user_id=bot.bot_user_id,
            is_active=bot.is_active,
            is_verified=bot.is_verified,
            last_verified_at=bot.last_verified_at,
            created_by=bot.created_by,
            creator_name=f"{current_user.first_name} {current_user.last_name}" if current_user else None,
            created_at=bot.created_at,
            updated_at=bot.updated_at,
            channel_count=discovered_count,
            message=f"Bot eklendi! {discovered_count} kanal otomatik keşfedildi ve eklendi.",
            discovered_channels_count=discovered_count
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bot creation error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Bot ekleme hatası: {str(e)}")


@router.get("", response_model=TelegramBotListResponse)
async def get_telegram_bots(
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """
    Tüm Telegram botlarını listele
    Admin: Tüm botları görebilir
    Marka Yöneticisi: Aktif botları görebilir
    """
    # Query oluştur
    query = db.query(TelegramBot)
    
    # Admin değilse sadece aktif botları göster
    if not current_user.permissions or 'social.manage' not in current_user.permissions:
        query = query.filter(TelegramBot.is_active == True)
    
    bots = query.order_by(TelegramBot.created_at.desc()).all()
    
    # Her bot için kanal sayısını ekle
    bot_responses = []
    for bot in bots:
        # Creator bilgisi
        creator = db.query(User).filter(User.id == bot.created_by).first()
        
        # Bu bot'a bağlı kanal sayısı
        channel_count = db.query(func.count(SocialMediaChannel.id)).filter(
            SocialMediaChannel.telegram_bot_id == bot.id
        ).scalar()
        
        bot_responses.append(TelegramBotResponse(
            id=bot.id,
            bot_name=bot.bot_name,
            bot_username=bot.bot_username,
            bot_user_id=bot.bot_user_id,
            is_active=bot.is_active,
            is_verified=bot.is_verified,
            last_verified_at=bot.last_verified_at,
            created_by=bot.created_by,
            creator_name=f"{creator.first_name} {creator.last_name}" if creator else None,
            created_at=bot.created_at,
            updated_at=bot.updated_at,
            channel_count=channel_count or 0
        ))
    
    return TelegramBotListResponse(
        bots=bot_responses,
        total=len(bot_responses)
    )


@router.get("/{bot_id}", response_model=TelegramBotResponse)
async def get_telegram_bot(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """
    Belirli bir botu getir
    """
    bot = db.query(TelegramBot).filter(TelegramBot.id == bot_id).first()
    
    if not bot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot bulunamadı"
        )
    
    # Admin değilse sadece aktif botları görebilir
    if not bot.is_active and (not current_user.permissions or 'social.manage' not in current_user.permissions):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot bulunamadı"
        )
    
    # Creator bilgisi
    creator = db.query(User).filter(User.id == bot.created_by).first()
    
    # Kanal sayısı
    channel_count = db.query(func.count(SocialMediaChannel.id)).filter(
        SocialMediaChannel.telegram_bot_id == bot.id
    ).scalar()
    
    return TelegramBotResponse(
        id=bot.id,
        bot_name=bot.bot_name,
        bot_username=bot.bot_username,
        bot_user_id=bot.bot_user_id,
        is_active=bot.is_active,
        is_verified=bot.is_verified,
        last_verified_at=bot.last_verified_at,
        created_by=bot.created_by,
        creator_name=f"{creator.first_name} {creator.last_name}" if creator else None,
        created_at=bot.created_at,
        updated_at=bot.updated_at,
        channel_count=channel_count or 0
    )


@router.put("/{bot_id}", response_model=TelegramBotResponse)
async def update_telegram_bot(
    bot_id: int,
    bot_data: TelegramBotUpdate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """
    Bot bilgilerini güncelle (Sadece Admin)
    """
    # Yetki kontrolü
    if not current_user.permissions or 'social.manage' not in current_user.permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için yetkiniz yok"
        )
    
    bot = db.query(TelegramBot).filter(TelegramBot.id == bot_id).first()
    
    if not bot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot bulunamadı"
        )
    
    # Güncellenecek alanlar
    update_data = bot_data.model_dump(exclude_unset=True)
    
    # Token değişmişse doğrulama yap
    if 'bot_token' in update_data and update_data['bot_token'] != bot.bot_token:
        manager = TelegramBotManager(update_data['bot_token'])
        bot_valid, bot_info = await manager.verify_bot_token()
        
        if not bot_valid or not bot_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Yeni bot token geçersiz"
            )
        
        # Token değişince verified bilgilerini güncelle
        update_data['is_verified'] = True
        update_data['last_verified_at'] = datetime.utcnow()
        update_data['bot_user_id'] = str(bot_info.get('id', ''))
    
    # Username değişmişse @ işaretini kaldır
    if 'bot_username' in update_data:
        username = update_data['bot_username'].strip()
        if username.startswith('@'):
            username = username[1:]
        update_data['bot_username'] = username
    
    # Güncelle
    for key, value in update_data.items():
        setattr(bot, key, value)
    
    bot.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(bot)
    
    # Creator bilgisi
    creator = db.query(User).filter(User.id == bot.created_by).first()
    
    # Kanal sayısı
    channel_count = db.query(func.count(SocialMediaChannel.id)).filter(
        SocialMediaChannel.telegram_bot_id == bot.id
    ).scalar()
    
    return TelegramBotResponse(
        id=bot.id,
        bot_name=bot.bot_name,
        bot_username=bot.bot_username,
        bot_user_id=bot.bot_user_id,
        is_active=bot.is_active,
        is_verified=bot.is_verified,
        last_verified_at=bot.last_verified_at,
        created_by=bot.created_by,
        creator_name=f"{creator.first_name} {creator.last_name}" if creator else None,
        created_at=bot.created_at,
        updated_at=bot.updated_at,
        channel_count=channel_count or 0
    )


@router.get("/{bot_id}/delete-info", response_model=Dict[str, Any])
async def get_bot_delete_info(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """
    Bot silme öncesi bilgi ver (kanal sayısı vb.)
    """
    # Yetki kontrolü
    if not current_user.permissions or 'social.manage' not in current_user.permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için yetkiniz yok"
        )

    bot = db.query(TelegramBot).filter(TelegramBot.id == bot_id).first()

    if not bot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot bulunamadı"
        )

    # Kanal sayısını hesapla
    channel_count = db.query(func.count(SocialMediaChannel.id)).filter(
        SocialMediaChannel.telegram_bot_id == bot.id
    ).scalar()

    return {
        "bot_id": bot_id,
        "bot_name": bot.bot_name,
        "bot_username": bot.bot_username,
        "channel_count": channel_count or 0,
        "warning_message": f"Bu bot'a bağlı {channel_count or 0} kanal var. Bot'u silerseniz tüm kanallar da kalıcı olarak silinecektir. Bu işlem geri alınamaz!"
    }


@router.delete("/{bot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_telegram_bot(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """
    Botu sil (Sadece Admin)
    NOT: Bot silinirse, o bot'a bağlı tüm kanallar da silinir (cascade)
    """
    # Yetki kontrolü
    if not current_user.permissions or 'social.manage' not in current_user.permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için yetkiniz yok"
        )

    bot = db.query(TelegramBot).filter(TelegramBot.id == bot_id).first()

    if not bot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot bulunamadı"
        )

    # Kanal sayısını kontrol et ve uyarı ver
    channel_count = db.query(func.count(SocialMediaChannel.id)).filter(
        SocialMediaChannel.telegram_bot_id == bot.id
    ).scalar()

    # Uyarı mesajı oluştur - silme işlemini yapmadan önce frontend'de gösterilecek
    if channel_count and channel_count > 0:
        logger.warning(f"[BOT_DELETE_WARNING] Bot {bot_id} ({bot.bot_username}) silinmek isteniyor. {channel_count} kanal bağlı.")

    # Sil - cascade delete otomatik çalışacak
    db.delete(bot)
    db.commit()

    logger.info(f"[BOT_DELETED] Bot {bot_id} ({bot.bot_username}) ve bağlı {channel_count or 0} kanal silindi")

    return None


@router.post("/{bot_id}/verify", response_model=TelegramBotVerifyResponse)
async def verify_telegram_bot(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """
    Bot token'ını yeniden doğrula
    """
    # Yetki kontrolü
    if not current_user.permissions or 'social.manage' not in current_user.permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için yetkiniz yok"
        )
    
    bot = db.query(TelegramBot).filter(TelegramBot.id == bot_id).first()
    
    if not bot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bot bulunamadı"
        )
    
    # Token'ı doğrula
    manager = TelegramBotManager(bot.bot_token)
    bot_valid, bot_info = await manager.verify_bot_token()
    
    if not bot_valid or not bot_info:
        bot.is_verified = False
        db.commit()
        
        return TelegramBotVerifyResponse(
            success=False,
            message="Bot token geçersiz veya bot'a erişilemiyor",
            bot_info=None
        )
    
    # Başarılı - bilgileri güncelle
    bot.is_verified = True
    bot.last_verified_at = datetime.utcnow()
    bot.bot_user_id = str(bot_info.get('id', ''))
    db.commit()
    
    return TelegramBotVerifyResponse(
        success=True,
        message="Bot token geçerli",
        bot_info={
            "id": bot_info.get('id'),
            "first_name": bot_info.get('first_name'),
            "username": bot_info.get('username'),
            "can_join_groups": bot_info.get('can_join_groups'),
            "can_read_all_group_messages": bot_info.get('can_read_all_group_messages')
        }
    )


@router.get("/{bot_id}/channels", response_model=Dict[str, Any])
async def get_bot_channels(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """
    Bot'a ait tüm kanalları getir
    """
    bot = db.query(TelegramBot).filter(TelegramBot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot bulunamadı")
    
    # Get all channels for this bot
    channels = db.query(SocialMediaChannel).filter(
        SocialMediaChannel.telegram_bot_id == bot_id
    ).all()
    
    # Format response
    channel_list = []
    for ch in channels:
        # Get brand name if assigned
        brand_name = None
        if ch.brand_id:
            brand = db.query(Brand).filter(Brand.id == ch.brand_id).first()
            brand_name = brand.name if brand else None
        
        # Get assigned users
        assigned_users = []
        if ch.assigned_user_ids:
            user_ids = [int(uid) for uid in ch.assigned_user_ids if uid]
            users = db.query(User).filter(User.id.in_(user_ids)).all()
            assigned_users = [
                {
                    "id": u.id,
                    "name": f"{u.first_name} {u.last_name}",
                    "email": u.email
                }
                for u in users
            ]
        
        channel_list.append({
            "id": ch.id,
            "name": ch.name,
            "channel_username": ch.channel_username,
            "member_count": ch.member_count or 0,
            "is_active": ch.is_active,
            "brand_id": ch.brand_id,
            "brand_name": brand_name,
            "assigned_users": assigned_users
        })
    
    return {
        "channels": channel_list,
        "total": len(channel_list)
    }


@router.post("/{bot_id}/discover-channels", response_model=Dict[str, Any])
async def discover_channels_for_bot(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """
    Mevcut Bot için Kanal Keşfi Tetikle
    getUpdates ile bot'un kanallarını keşfet ve otomatik ekle
    """
    # Bot getir
    bot = db.query(TelegramBot).filter(TelegramBot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot bulunamadı")

    # Brand erişim
    if not brand_access.check_brand_access(current_user, bot.brand_id, db):
        raise HTTPException(status_code=403, detail="Bu bot için erişim yok")

    brand = db.query(Brand).filter(Brand.id == bot.brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Marka bulunamadı")

    try:
        manager = TelegramBotManager(bot.bot_token)
        bot_valid, bot_info = await manager.verify_bot_token()
        if not bot_valid or not bot_info:
            raise HTTPException(status_code=400, detail="Bot token geçersiz")

        bot_user_id = bot_info.get('id')
        if not bot_user_id:
            raise HTTPException(status_code=400, detail="Bot ID alınamadı")

        # Keşif
        discovered_success, discovered_chats, error = await discover_telegram_chats_by_token(bot.bot_token, limit=1000)
        if not discovered_success:
            logger.warning(f"Discovery failed for existing bot {bot_id}: {error}")
            return {"success": False, "message": "Keşif başarısız", "discovered_count": 0}

        discovered_count = 0
        auto_added = []
        for chat in discovered_chats:
            chat_id = str(chat.get('id'))
            is_admin = await manager.check_bot_admin_permissions(chat_id, bot_user_id)
            if is_admin:
                existing_channel = db.query(SocialMediaChannel).filter(
                    SocialMediaChannel.channel_id == chat_id,
                    SocialMediaChannel.brand_id == bot.brand_id
                ).first()
                if not existing_channel:
                    member_count = await manager.get_chat_member_count(chat_id) or 0
                    channel = SocialMediaChannel(
                        name=chat.get('title', f"Channel {chat_id}"),
                        platform='telegram',
                        type='channel' if chat.get('type') == 'channel' else 'group',
                        channel_id=chat_id,
                        chat_id=chat_id,
                        channel_username=chat.get('username'),
                        member_count=member_count,
                        is_active=True,
                        telegram_bot_id=bot.id,
                        brand_id=bot.brand_id,
                        created_by=current_user.id,
                        updated_by=current_user.id
                    )
                    db.add(channel)
                    db.commit()
                    db.refresh(channel)
                    auto_added.append(channel.id)
                    discovered_count += 1
                    logger.info(f"[AUTO_DISCOVER] Added {chat.get('title')} for bot {bot_id}")

        # Background update
        for ch_id in auto_added:
            try:
                await fetch_channel_info(ch_id, db)
            except:
                pass

        return {
            "success": True,
            "message": f"{discovered_count} kanal keşfedildi ve eklendi.",
            "discovered_count": discovered_count,
            "added_channel_ids": auto_added
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Discovery error for bot {bot_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Keşif hatası: {str(e)}")

