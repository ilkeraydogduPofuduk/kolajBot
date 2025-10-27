from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from database import get_db
from models import SocialMediaChannel, SocialMediaMessage, User
from schemas.social_media_message import (
    SocialMediaMessageCreate,
    SocialMediaMessageUpdate,
    SocialMediaMessageResponse,
    SocialMediaMessageListResponse
)
from dependencies.auth import get_current_active_user
from dependencies.role_checker import resource_access
from typing import List, Optional
import math
import httpx
from datetime import datetime, timedelta
from config.settings import settings


router = APIRouter()


@router.delete("/channels/{channel_id}/messages/clear")
async def clear_channel_messages(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Clear all messages from a channel (database only)"""
    
    # Verify channel exists and user has access
    channel = db.query(SocialMediaChannel).filter(SocialMediaChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # DİNAMİK: Kanal yönetimi yetkisi gerekli
    if not resource_access.check_channel_access(current_user, channel.brand_id, db):
        raise HTTPException(status_code=403, detail="Bu kanalda mesaj silme yetkiniz yok")
    
    # Delete all messages for this channel
    deleted_count = db.query(SocialMediaMessage).filter(
        SocialMediaMessage.channel_id == channel_id
    ).delete()
    
    db.commit()
    
    return {
        "message": f"Cleared {deleted_count} messages from channel",
        "deleted_count": deleted_count
    }


@router.get("/channels/{channel_id}/messages", response_model=SocialMediaMessageListResponse)
async def get_channel_messages(
    channel_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=500),  # Increased limit for real-time messaging
    sender_type: Optional[str] = Query(None, description="Filter by sender type: 'user' or 'bot'"),
    message_type: Optional[str] = Query(None, description="Filter by message type: 'text', 'image', 'video', etc."),
    start_date: Optional[str] = Query(None, description="Filter messages from this date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter messages until this date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get messages for a specific channel with filtering and pagination"""
    
    # Verify channel exists and user has access
    channel = db.query(SocialMediaChannel).filter(SocialMediaChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # DİNAMİK: Kanal erişim kontrolü
    has_brand_access = resource_access.check_channel_access(current_user, channel.brand_id, db)
    is_assigned = channel.assigned_user_ids and current_user.id in channel.assigned_user_ids
    is_creator = channel.created_by == current_user.id
    
    if not (has_brand_access or is_assigned or is_creator):
        raise HTTPException(status_code=403, detail="Bu kanalda mesaj görüntüleme yetkiniz yok")
    
    # Build query
    query = db.query(SocialMediaMessage).filter(SocialMediaMessage.channel_id == channel_id)
    
    # Apply filters
    if sender_type:
        if sender_type.lower() == 'user':
            query = query.filter(SocialMediaMessage.is_sent == False)  # Received messages
        elif sender_type.lower() == 'bot':
            query = query.filter(SocialMediaMessage.is_sent == True)   # Sent messages
    
    if message_type:
        query = query.filter(SocialMediaMessage.message_type == message_type)
    
    if start_date:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        query = query.filter(SocialMediaMessage.timestamp >= start_dt)
    
    if end_date:
        end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
        query = query.filter(SocialMediaMessage.timestamp < end_dt)
    
    # Get total count
    total = query.count()
    
    # Apply pagination - order by timestamp ascending (oldest first)
    offset = (page - 1) * per_page
    messages = query.order_by(SocialMediaMessage.timestamp.asc()).offset(offset).limit(per_page).all()
    
    # Format responses
    message_responses = [
        SocialMediaMessageResponse(
            id=msg.id,
            channel_id=msg.channel_id,
            message_id=msg.message_id,
            message_text=msg.message_text,
            sender_id=msg.sender_id,
            sender_name=msg.sender_name,
            recipient_id=msg.recipient_id,
            message_type=msg.message_type,
            media_url=msg.media_url if not msg.media_url or msg.media_url.startswith('http') 
                     else f"{settings.BACKEND_URL}{msg.media_url}",
            file_name=msg.file_name,
            timestamp=msg.timestamp,
            is_sent=msg.is_sent,
            is_read=msg.is_read,
            created_at=msg.created_at,
            updated_at=msg.updated_at
        )
        for msg in messages
    ]
    
    total_pages = math.ceil(total / per_page)
    
    return SocialMediaMessageListResponse(
        messages=message_responses,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )


@router.post("/channels/{channel_id}/messages/upload")
async def send_message_with_file(
    channel_id: int,
    file: UploadFile = File(...),
    message_text: str = Form(""),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Send a message with file upload to a specific channel"""
    import os
    import tempfile
    from pathlib import Path
    
    # Verify channel exists and user has access
    channel = db.query(SocialMediaChannel).filter(SocialMediaChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check if channel is active
    if not channel.is_active:
        raise HTTPException(status_code=400, detail="Bu kanal pasif durumda.")
    
    # DİNAMİK: Kanal erişim kontrolü - mesaj gönderme
    has_brand_access = resource_access.check_channel_access(current_user, channel.brand_id, db)
    is_assigned = channel.assigned_user_ids and current_user.id in channel.assigned_user_ids
    is_creator = channel.created_by == current_user.id
    
    if not (has_brand_access or is_assigned or is_creator):
        raise HTTPException(status_code=403, detail="Bu kanala mesaj gönderme yetkiniz yok")
    
    # Save file temporarily
    try:
        # Create uploads directory if not exists
        uploads_dir = Path("uploads/channel_messages")
        uploads_dir.mkdir(parents=True, exist_ok=True)
        
        # Save file
        file_path = uploads_dir / file.filename
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Determine message type from file
        message_type = 'document'
        if file.content_type:
            if file.content_type.startswith('image/'):
                message_type = 'image'
            elif file.content_type.startswith('video/'):
                message_type = 'video'
        
        # Create message in DB
        message = SocialMediaMessage(
            channel_id=channel_id,
            message_id=None,
            message_text=message_text or file.filename,
            sender_id=str(current_user.id),
            sender_name=f"{current_user.first_name} {current_user.last_name}",
            recipient_id=channel.chat_id if channel.chat_id else channel.channel_id,
            message_type=message_type,
            media_url=str(file_path),  # Local file path
            file_name=file.filename,
            timestamp=datetime.utcnow(),
            is_sent=False,
            is_read=False
        )
        
        db.add(message)
        db.commit()
        db.refresh(message)
        
        # Send to platform immediately
        await send_message_to_platform_immediate(channel.id, message.id)
        
        return SocialMediaMessageResponse(
            id=message.id,
            channel_id=message.channel_id,
            message_id=message.message_id,
            message_text=message.message_text,
            sender_id=message.sender_id,
            sender_name=message.sender_name,
            recipient_id=message.recipient_id,
            message_type=message.message_type,
            media_url=message.media_url,
            file_name=message.file_name,
            timestamp=message.timestamp,
            is_sent=message.is_sent,
            is_read=message.is_read,
            created_at=message.created_at,
            updated_at=message.updated_at
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@router.post("/channels/{channel_id}/messages", response_model=SocialMediaMessageResponse)
async def send_message_to_channel(
    channel_id: int,
    message_data: SocialMediaMessageCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Send a message to a specific channel and save to database"""
    
    # Verify channel exists and user has access
    channel = db.query(SocialMediaChannel).filter(SocialMediaChannel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check if channel is active
    if not channel.is_active:
        raise HTTPException(status_code=400, detail="Bu kanal pasif durumda. Mesaj göndermek için kanalı aktif etmeniz gerekiyor.")
    
    # DİNAMİK: Kanal erişim kontrolü - mesaj gönderme
    has_brand_access = resource_access.check_channel_access(current_user, channel.brand_id, db)
    is_assigned = channel.assigned_user_ids and current_user.id in channel.assigned_user_ids
    is_creator = channel.created_by == current_user.id
    
    if not (has_brand_access or is_assigned or is_creator):
        raise HTTPException(status_code=403, detail="Bu kanala mesaj gönderme yetkiniz yok")
    
    # Validate required fields based on platform
    if not message_data.message_text and not message_data.media_url:
        raise HTTPException(status_code=400, detail="Either message text or media URL is required")
    
    # If no message text but has media, set empty text
    if not message_data.message_text and message_data.media_url:
        message_data.message_text = ""
    
    # If no media URL but has text, set None
    if not message_data.media_url and message_data.message_text:
        message_data.media_url = None
    
    # Create the message record in database
    message = SocialMediaMessage(
        channel_id=channel_id,
        message_id=None,
        message_text=message_data.message_text,
        sender_id=str(current_user.id),  # Use user ID as sender for admin-sent messages
        sender_name=f"{current_user.first_name} {current_user.last_name}",
        recipient_id=channel.chat_id if channel.chat_id else channel.channel_id,  # Send to channel
        message_type=message_data.message_type or 'text',
        media_url=message_data.media_url,
        file_name=message_data.file_name,
        timestamp=message_data.timestamp or func.now(),
        is_sent=True,  # This is a message being sent by the system
        is_read=False
    )
    
    db.add(message)
    db.commit()
    db.refresh(message)
    
    # Update channel's last activity
    channel.last_activity = func.now()
    db.commit()
    
    # CRITICAL FIX: Send immediately instead of background task
    # Background tasks cause DB session to expire
    await send_message_to_platform_immediate(channel.id, message.id)
    
    # Return the created message
    return SocialMediaMessageResponse(
        id=message.id,
        channel_id=message.channel_id,
        message_id=message.message_id,
        message_text=message.message_text,
        sender_id=message.sender_id,
        sender_name=message.sender_name,
        recipient_id=message.recipient_id,
        message_type=message.message_type,
        media_url=message.media_url,
        file_name=message.file_name,
        timestamp=message.timestamp,
        is_sent=message.is_sent,
        is_read=message.is_read,
        created_at=message.created_at,
        updated_at=message.updated_at
    )


async def send_message_to_platform_immediate(channel_id: int, message_id: int):
    """
    Send message to Telegram immediately with fresh DB session
    CRITICAL: Creates new DB session to avoid expiration issues
    """
    from database import SessionLocal
    db = SessionLocal()
    
    try:
        # Fetch fresh objects from DB
        channel = db.query(SocialMediaChannel).filter(SocialMediaChannel.id == channel_id).first()
        message = db.query(SocialMediaMessage).filter(SocialMediaMessage.id == message_id).first()
        
        if not channel or not message:
            print(f"[ERROR] [SEND] Channel or message not found")
            return
        
        print(f"\n[SEND] Starting send for message {message.id}")
        print(f"   Type: {message.message_type}")
        print(f"   Media URL: {message.media_url}")
        print(f"   Text: {message.message_text[:50] if message.message_text else 'None'}...")
        
        if channel.platform == 'telegram' and channel.bot_token and channel.chat_id:
            # Validate media URL if present
            if message.media_url:
                # Check if media URL is valid
                try:
                    parsed_url = message.media_url.strip()
                    if not parsed_url.startswith(('http://', 'https://')):
                        raise ValueError("Invalid media URL format")
                    
                    # Additional checks for different media types
                    if message.message_type in ['image', 'video', 'document']:
                        # For images, verify common image extensions or URL patterns
                        if message.message_type == 'image':
                            allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
                            # Silent validation
                        
                        # For videos, verify common video extensions
                        elif message.message_type == 'video':
                            allowed_extensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']
                            # Silent validation
                
                except ValueError:
                    message.is_sent = False
                    db.commit()
                    return

            # Prepare the appropriate API call based on message type
            async with httpx.AsyncClient() as client:
                if message.message_type == 'image' and message.media_url:
                    # Check if URL or local file
                    try:
                        if message.media_url.startswith(('http://', 'https://')):
                            # Download from URL
                            print(f"   [DOWNLOAD] Downloading image from: {message.media_url}")
                            media_response = await client.get(message.media_url, timeout=15.0)
                            media_content = media_response.content
                            print(f"   [OK] Downloaded {len(media_content)} bytes")
                        else:
                            # Read from local file
                            print(f"   [LOCAL] Reading image from: {message.media_url}")
                            with open(message.media_url, 'rb') as f:
                                media_content = f.read()
                            print(f"   [OK] Read {len(media_content)} bytes")
                        
                        # Get original filename from URL or use generic name
                        filename = message.media_url.split('/')[-1] if '/' in message.media_url else "image.jpg"
                        if not filename or '.' not in filename:
                            filename = "image.jpg"
                        
                        # Determine content type based on file extension
                        if filename.lower().endswith(('.png', '.PNG')):
                            content_type = "image/png"
                        elif filename.lower().endswith(('.gif', '.GIF')):
                            content_type = "image/gif"
                        elif filename.lower().endswith(('.webp', '.WEBP')):
                            content_type = "image/webp"
                        else:
                            content_type = "image/jpeg"
                        
                        # Try sending as photo first, fallback to document if it fails
                        files = {"photo": (filename, media_content, content_type)}
                        data = {
                            "chat_id": channel.chat_id,
                            "caption": message.message_text or "",
                            "parse_mode": "HTML"
                        }
                        
                        print(f"   📤 Sending image to Telegram chat {channel.chat_id}")
                        # Use sendDocument instead of sendPhoto to avoid PHOTO_INVALID_DIMENSIONS errors
                        response = await client.post(
                            f"https://api.telegram.org/bot{channel.bot_token}/sendDocument",
                            files={"document": (filename, media_content, content_type)},
                            data=data,
                            timeout=30.0  # Increased timeout for large images
                        )
                        
                        if response.status_code == 200:
                            response_data = response.json()
                            if response_data.get('ok'):
                                telegram_message_id = response_data.get('result', {}).get('message_id')
                                if telegram_message_id:
                                    message.message_id = f"telegram_{telegram_message_id}"
                                message.is_sent = True
                                db.commit()
                                print(f"   [OK] Image sent successfully as document!")
                            else:
                                error_desc = response_data.get('description', 'Unknown error')
                                print(f"   [ERROR] Telegram API error: {error_desc}")
                                message.is_sent = False
                                db.commit()
                        else:
                            print(f"   [ERROR] Telegram API error: {response.status_code} - {response.text}")
                            message.is_sent = False
                            db.commit()
                            
                    except Exception as e:
                        print(f"   [ERROR] Error sending image: {str(e)}")
                        # Fallback to text message
                        response = await client.get(
                            f"https://api.telegram.org/bot{channel.bot_token}/sendMessage",
                            params={
                                "chat_id": channel.chat_id,
                                "text": f"{message.message_text or ''}\n\n[Resim gönderilemedi: {str(e)}]",
                                "parse_mode": "HTML"
                            },
                            timeout=15.0
                        )
                elif message.message_type == 'document' and message.media_url:
                    # Check if URL or local file
                    try:
                        if message.media_url.startswith(('http://', 'https://')):
                            media_response = await client.get(message.media_url, timeout=15.0)
                            media_content = media_response.content
                        else:
                            with open(message.media_url, 'rb') as f:
                                media_content = f.read()
                        
                        files = {"document": (message.file_name or "document", media_content)}
                        data = {
                            "chat_id": channel.chat_id,
                            "caption": message.message_text or "",
                            "parse_mode": "HTML"
                        }
                        
                        response = await client.post(
                            f"https://api.telegram.org/bot{channel.bot_token}/sendDocument",
                            files=files,
                            data=data,
                            timeout=15.0
                        )
                    except Exception as e:
                        # Fallback to text message
                        response = await client.get(
                            f"https://api.telegram.org/bot{channel.bot_token}/sendMessage",
                            params={
                                "chat_id": channel.chat_id,
                                "text": f"{message.message_text or ''}\n\n[Dosya gönderilemedi: {str(e)}]",
                                "parse_mode": "HTML"
                            },
                            timeout=15.0
                        )
                elif message.message_type == 'video' and message.media_url:
                    # Check if URL or local file
                    try:
                        if message.media_url.startswith(('http://', 'https://')):
                            media_response = await client.get(message.media_url, timeout=15.0)
                            media_content = media_response.content
                        else:
                            with open(message.media_url, 'rb') as f:
                                media_content = f.read()
                        
                        files = {"video": (message.file_name or "video.mp4", media_content, "video/mp4")}
                        data = {
                            "chat_id": channel.chat_id,
                            "caption": message.message_text or "",
                            "parse_mode": "HTML"
                        }
                        
                        response = await client.post(
                            f"https://api.telegram.org/bot{channel.bot_token}/sendVideo",
                            files=files,
                            data=data,
                            timeout=15.0
                        )
                    except Exception as e:
                        # Fallback to text message
                        response = await client.get(
                            f"https://api.telegram.org/bot{channel.bot_token}/sendMessage",
                            params={
                                "chat_id": channel.chat_id,
                                "text": f"{message.message_text or ''}\n\n[Video gönderilemedi: {str(e)}]",
                                "parse_mode": "HTML"
                            },
                            timeout=15.0
                        )
                else:
                    # Send text message
                    response = await client.get(
                        f"https://api.telegram.org/bot{channel.bot_token}/sendMessage",
                        params={
                            "chat_id": channel.chat_id,
                            "text": message.message_text or "Empty message",
                            "parse_mode": "HTML"
                        },
                        timeout=15.0
                    )
                
                if response.status_code == 200:
                    response_data = response.json()
                    if response_data.get('ok'):
                        # Update the message_id with the Telegram message ID
                        telegram_message_id = response_data.get('result', {}).get('message_id')
                        if telegram_message_id:
                            message.message_id = f"telegram_{telegram_message_id}"
                        message.is_sent = True
                        db.commit()
                    else:
                        error_desc = response_data.get('description', 'Unknown error')
                        message.is_sent = False
                        db.commit()
                else:
                    print(f"Failed to send message to Telegram: HTTP {response.status_code}")
                    try:
                        error_data = response.json()
                        error_desc = error_data.get('description', 'Unknown error')
                        print(f"Telegram API error: {error_desc}")
                    except:
                        print(f"Raw response: {response.text}")
                    message.is_sent = False
                    db.commit()
        else:
            print(f"Unsupported platform or missing credentials for channel {channel.name}")
            message.is_sent = False
            db.commit()
            
    except httpx.TimeoutException:
        print(f"Message sending timed out for channel {channel.name}")
        message.is_sent = False
        db.commit()
    except httpx.RequestError as e:
        print(f"Network error while sending message: {e}")
        message.is_sent = False
        db.commit()
    except Exception as e:
        print(f"[CRITICAL ERROR] sending message to platform: {e}")
        import traceback
        traceback.print_exc()
        message.is_sent = False
        db.commit()
    finally:
        db.close()


@router.patch("/channels/{channel_id}/messages/{message_id}", response_model=SocialMediaMessageResponse)
async def update_message(
    channel_id: int,
    message_id: int,
    update_data: SocialMediaMessageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a specific message"""
    
    # Verify user has access to the channel
    channel = db.query(SocialMediaChannel).filter(
        SocialMediaChannel.id == channel_id
    ).first()
    
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # DİNAMİK: Kanal erişim kontrolü
    if not resource_access.check_channel_access(current_user, channel.brand_id, db):
        raise HTTPException(status_code=403, detail="Bu mesajı güncelleme yetkiniz yok")
    
    # Find the message
    message = db.query(SocialMediaMessage).filter(
        SocialMediaMessage.id == message_id,
        SocialMediaMessage.channel_id == channel_id
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Update fields
    update_dict = update_data.dict(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(message, field, value)
    
    db.commit()
    db.refresh(message)
    
    return SocialMediaMessageResponse(
        id=message.id,
        channel_id=message.channel_id,
        message_id=message.message_id,
        message_text=message.message_text,
        sender_id=message.sender_id,
        sender_name=message.sender_name,
        recipient_id=message.recipient_id,
        message_type=message.message_type,
        media_url=message.media_url,
        file_name=message.file_name,
        timestamp=message.timestamp,
        is_sent=message.is_sent,
        is_read=message.is_read,
        created_at=message.created_at,
        updated_at=message.updated_at
    )


@router.delete("/channels/{channel_id}/messages/{message_id}")
async def delete_message(
    channel_id: int,
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a specific message"""
    
    # Verify user has access to the channel
    channel = db.query(SocialMediaChannel).filter(
        SocialMediaChannel.id == channel_id
    ).first()
    
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # DİNAMİK: Kanal erişim kontrolü
    if not resource_access.check_channel_access(current_user, channel.brand_id, db):
        raise HTTPException(status_code=403, detail="Bu mesajı silme yetkiniz yok")
    
    # Find and delete the message
    message = db.query(SocialMediaMessage).filter(
        SocialMediaMessage.id == message_id,
        SocialMediaMessage.channel_id == channel_id
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    db.delete(message)
    db.commit()
    
    return {"message": "Message deleted successfully"}