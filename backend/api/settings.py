from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
from database import get_db
from schemas.settings import (
    SettingsCreate, SettingsUpdate, SettingsResponse, 
    SettingsListResponse, SettingsCategoryResponse
)
from services.settings import SettingsService
from dependencies.auth import get_current_active_user
from services.permission_service import PermissionService
from models.user import User
from models.settings import Settings

# Logger setup
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/public", response_model=SettingsListResponse)
async def get_all_settings_public(
    db: Session = Depends(get_db)
):
    """Public settings for unauthenticated pages (mask sensitive)."""
    settings_service = SettingsService(db)
    settings = settings_service.get_all_settings()
    # Mask sensitive values
    for setting in settings:
        if getattr(setting, "is_sensitive", False):
            setting.value = "***GIZLI***"
    return SettingsListResponse(settings=settings, total=len(settings))

@router.get("/", response_model=SettingsListResponse)
async def get_all_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Tüm ayarları listele - Genel ayarlar tüm kullanıcılara açık"""
    
    settings_service = SettingsService(db)
    settings = settings_service.get_all_settings()
    
    # DİNAMİK: Sensitive ayarları gizle (settings.manage yetkisi yoksa)
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'settings.manage'):
        for setting in settings:
            if setting.is_sensitive:
                setting.value = "***GİZLİ***"
    
    return SettingsListResponse(
        settings=settings,
        total=len(settings)
    )

@router.get("/category/{category}", response_model=SettingsCategoryResponse)
async def get_category_settings(
    category: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Kategori ayarlarını al - DİNAMİK YETKİ"""
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'settings.manage'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ayarları görüntüleme yetkiniz yok"
        )
    
    settings_service = SettingsService(db)
    settings = settings_service.get_category_settings(category)
    
    return SettingsCategoryResponse(
        category=category,
        settings=settings
    )

@router.get("/{category}/{key}")
async def get_setting(
    category: str,
    key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Tek bir ayar değerini al - DİNAMİK YETKİ"""
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'settings.manage'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ayarı görüntüleme yetkiniz yok"
        )
    
    settings_service = SettingsService(db)
    value = settings_service.get_setting(category, key)
    
    if value is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ayar bulunamadı"
        )
    
    return {"category": category, "key": key, "value": value}

@router.post("/{category}/{key}")
async def set_setting(
    category: str,
    key: str,
    value: Optional[str] = Query(None),
    description: str = None,
    is_sensitive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Ayar değerini güncelle veya oluştur"""
    if current_user.role_display_name != "Super Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için yetkiniz yok"
        )
    
    if value is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Value parametresi gereklidir"
        )
    
    settings_service = SettingsService(db)
    setting = settings_service.set_setting(
        category=category,
        key=key,
        value=value,
        description=description,
        is_sensitive=is_sensitive
    )
    
    return {"message": "Ayar başarıyla güncellendi", "setting_id": setting.id}

@router.put("/bulk/{category}")
async def update_category_settings(
    category: str,
    settings_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Bir kategorideki birden fazla ayarı güncelle"""
    if current_user.role_display_name != "Super Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için yetkiniz yok"
        )
    
    settings_service = SettingsService(db)
    updated_count = 0
    
    for key, value in settings_data.items():
        if isinstance(value, dict) and "value" in value:
            # Detaylı format: {"value": "...", "is_sensitive": true}
            settings_service.set_setting(
                category=category,
                key=key,
                value=str(value["value"]),
                is_sensitive=value.get("is_sensitive", False)
            )
        else:
            # Basit format: key-value
            settings_service.set_setting(category, key, str(value))
        
        updated_count += 1
    
    return {"message": f"{updated_count} ayar başarıyla güncellendi"}

@router.post("/test-email")
async def test_email(
    test_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Test e-postası gönder"""
    if current_user.role_display_name != "Super Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için yetkiniz yok"
        )
    
    try:
        from services.email import EmailService
        
        email_service = EmailService(db)
        
        # E-posta ayarlarını kontrol et
        settings = email_service.get_email_settings()
        print(f"📧 E-posta ayarları: {settings}")
        
        if not email_service.is_configured():
            print("⚠️ E-posta ayarları yapılandırılmamış, simülasyon modunda çalışıyor")
            return {"message": "E-posta ayarları yapılandırılmamış - simülasyon modunda çalışıyor"}
        
        # Test e-postası gönder
        success = email_service.send_email(
            to_email=test_data.get('to_email'),
            subject=test_data.get('subject', 'Test E-postası'),
            html_content=f"""
            <html>
            <body>
                <h2>Test E-postası</h2>
                <p>{test_data.get('message', 'Bu bir test e-postasıdır.')}</p>
                <p><strong>Gönderim Zamanı:</strong> {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}</p>
                <p><strong>Gönderen:</strong> {current_user.first_name} {current_user.last_name}</p>
            </body>
            </html>
            """,
            text_content=f"Test E-postası\n\n{test_data.get('message', 'Bu bir test e-postasıdır.')}\n\nGönderim Zamanı: {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}\nGönderen: {current_user.first_name} {current_user.last_name}"
        )
        
        if success:
            return {"message": "Test e-postası başarıyla gönderildi"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="E-posta gönderilemedi"
            )
            
    except Exception as e:
        print(f"❌ Test e-posta hatası: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Test e-postası gönderilirken hata oluştu: {str(e)}"
        )


@router.delete("/{category}/{key}")
async def delete_setting(
    category: str,
    key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Ayarı sil"""
    if current_user.role_display_name != "Super Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için yetkiniz yok"
        )
    
    settings_service = SettingsService(db)
    success = settings_service.delete_setting(category, key)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ayar bulunamadı"
        )
    
    return {"message": "Ayar başarıyla silindi"}

@router.post("/init-defaults")
async def init_default_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Varsayılan ayarları oluştur"""
    if current_user.role_display_name != "Super Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için yetkiniz yok"
        )
    
    settings_service = SettingsService(db)
    settings_service.init_default_settings()
    
    return {"message": "Varsayılan ayarlar başarıyla oluşturuldu"}

@router.get("/urls", response_model=Dict[str, str])
async def get_url_settings(
    db: Session = Depends(get_db)
):
    """Get URL settings for dynamic configuration"""
    settings_service = SettingsService(db)
    url_settings = settings_service.get_settings_by_category("urls")
    
    result = {}
    for setting in url_settings:
        if setting.is_active:
            result[setting.key] = setting.value
    
    return result
