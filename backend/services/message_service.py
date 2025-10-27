"""
Merkezi Mesaj ve Bildirim Servisi
Tüm uygulama mesajları buradan yönetilir
"""

from enum import Enum
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class MessageType(Enum):
    """Mesaj tipleri"""
    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"

class MessageCategory(Enum):
    """Mesaj kategorileri"""
    AUTH = "auth"
    UPLOAD = "upload"
    PRODUCT = "product"
    BRAND = "brand"
    USER = "user"
    PERMISSION = "permission"
    TEMPLATE = "template"
    SYSTEM = "system"
    VALIDATION = "validation"

class MessageService:
    """Merkezi mesaj yönetim servisi"""
    
    # Mesaj şablonları
    MESSAGES = {
        # Authentication Messages
        "auth.login.success": {
            "type": MessageType.SUCCESS,
            "message": "Başarıyla giriş yaptınız. Hoş geldiniz {name}!"
        },
        "auth.login.failed": {
            "type": MessageType.ERROR,
            "message": "Giriş başarısız. Email veya şifre hatalı."
        },
        "auth.login.locked": {
            "type": MessageType.ERROR,
            "message": "Hesabınız {minutes} dakika süreyle kilitlendi. Lütfen daha sonra tekrar deneyin."
        },
        "auth.logout.success": {
            "type": MessageType.SUCCESS,
            "message": "Başarıyla çıkış yaptınız."
        },
        "auth.token.expired": {
            "type": MessageType.WARNING,
            "message": "Oturumunuz sona erdi. Lütfen tekrar giriş yapın."
        },
        "auth.unauthorized": {
            "type": MessageType.ERROR,
            "message": "Bu işlem için yetkiniz yok."
        },
        
        # Upload Messages
        "upload.started": {
            "type": MessageType.INFO,
            "message": "{count} dosya yükleniyor..."
        },
        "upload.success": {
            "type": MessageType.SUCCESS,
            "message": "{count} ürün başarıyla yüklendi! 🎨 Otomatik şablonlar oluşturuluyor..."
        },
        "upload.partial_success": {
            "type": MessageType.WARNING,
            "message": "{success_count} ürün yüklendi. {failed_count} ürün başarısız oldu."
        },
        "upload.failed": {
            "type": MessageType.ERROR,
            "message": "Yükleme başarısız: {reason}"
        },
        "upload.file_too_large": {
            "type": MessageType.ERROR,
            "message": "Dosya çok büyük: {filename} ({size}MB). Maksimum: {max_size}MB"
        },
        "upload.invalid_type": {
            "type": MessageType.ERROR,
            "message": "Geçersiz dosya türü: {extension}. İzin verilen türler: {allowed}"
        },
        "upload.limit_exceeded": {
            "type": MessageType.ERROR,
            "message": "Dosya sayısı limiti aşıldı. Maksimum {limit} dosya yükleyebilirsiniz."
        },
        "upload.size_exceeded": {
            "type": MessageType.ERROR,
            "message": "Toplam yükleme boyutu çok büyük: {total}MB. Maksimum: {max}MB"
        },
        
        # Brand Detection Messages
        "brand.detected": {
            "type": MessageType.SUCCESS,
            "message": "Marka tespit edildi: {brand_name}"
        },
        "brand.not_detected": {
            "type": MessageType.WARNING,
            "message": "Hiçbir marka tespit edilemedi. Kullanıcının varsayılan markası kullanılacak."
        },
        "brand.no_permission": {
            "type": MessageType.ERROR,
            "message": "Bu marka ({brand_name}) için yetkiniz yok."
        },
        "brand.not_found": {
            "type": MessageType.ERROR,
            "message": "Marka bulunamadı: {brand_name}"
        },
        "brand.detection_failed": {
            "type": MessageType.WARNING,
            "message": "Marka tespit edilemedi ve varsayılan marka yok. Lütfen etiketlerin net olduğundan emin olun."
        },
        
        # Permission Messages
        "permission.unauthorized": {
            "type": MessageType.ERROR,
            "message": "Yükleme yetkisi yok: {reason}"
        },
        "permission.brands_allowed": {
            "type": MessageType.SUCCESS,
            "message": "Yetkili markalar: {brands}"
        },
        "permission.brands_denied": {
            "type": MessageType.ERROR,
            "message": "Yetkisiz markalar: {brands}"
        },
        
        # Product Messages
        "product.created": {
            "type": MessageType.SUCCESS,
            "message": "Ürün oluşturuldu: {code} - {color}"
        },
        "product.updated": {
            "type": MessageType.SUCCESS,
            "message": "Ürün güncellendi: {code} - {color}"
        },
        "product.deleted": {
            "type": MessageType.SUCCESS,
            "message": "Ürün silindi"
        },
        "product.duplicate": {
            "type": MessageType.WARNING,
            "message": "Ürün zaten mevcut: {code} - {color}"
        },
        "product.not_found": {
            "type": MessageType.ERROR,
            "message": "Ürün bulunamadı"
        },
        "product.unknown_color": {
            "type": MessageType.WARNING,
            "message": "Renk tespit edilemedi, varsayılan renk kullanılıyor"
        },
        
        # Template Messages
        "template.created": {
            "type": MessageType.SUCCESS,
            "message": "Şablon oluşturuldu: {name}"
        },
        "template.generation_started": {
            "type": MessageType.INFO,
            "message": "Otomatik şablon oluşturuluyor..."
        },
        "template.generation_failed": {
            "type": MessageType.ERROR,
            "message": "Şablon oluşturulamadı: {reason}"
        },
        
        # User Messages
        "user.created": {
            "type": MessageType.SUCCESS,
            "message": "Kullanıcı oluşturuldu: {email}"
        },
        "user.updated": {
            "type": MessageType.SUCCESS,
            "message": "Kullanıcı bilgileri güncellendi"
        },
        "user.deleted": {
            "type": MessageType.SUCCESS,
            "message": "Kullanıcı silindi"
        },
        "user.not_found": {
            "type": MessageType.ERROR,
            "message": "Kullanıcı bulunamadı"
        },
        "user.email_exists": {
            "type": MessageType.ERROR,
            "message": "Bu email adresi zaten kullanımda"
        },
        
        # Validation Messages
        "validation.required": {
            "type": MessageType.ERROR,
            "message": "{field} alanı zorunludur"
        },
        "validation.invalid_format": {
            "type": MessageType.ERROR,
            "message": "{field} geçersiz formatta"
        },
        "validation.min_length": {
            "type": MessageType.ERROR,
            "message": "{field} en az {min} karakter olmalıdır"
        },
        "validation.max_length": {
            "type": MessageType.ERROR,
            "message": "{field} en fazla {max} karakter olabilir"
        },
        
        # System Messages
        "system.maintenance": {
            "type": MessageType.WARNING,
            "message": "Sistem bakımda. Lütfen daha sonra tekrar deneyin."
        },
        "system.error": {
            "type": MessageType.ERROR,
            "message": "Bir hata oluştu. Lütfen tekrar deneyin."
        },
        "system.success": {
            "type": MessageType.SUCCESS,
            "message": "İşlem başarılı"
        },
        
        # OCR Messages
        "ocr.processing": {
            "type": MessageType.INFO,
            "message": "OCR işleniyor: {count} görsel"
        },
        "ocr.completed": {
            "type": MessageType.SUCCESS,
            "message": "OCR tamamlandı: {count} ürün işlendi"
        },
        "ocr.failed": {
            "type": MessageType.ERROR,
            "message": "OCR başarısız: {reason}"
        },
    }
    
    @classmethod
    def get_message(cls, key: str, **kwargs) -> Dict[str, Any]:
        """
        Mesaj şablonunu al ve parametrelerle doldur
        
        Args:
            key: Mesaj anahtarı (örn: "auth.login.success")
            **kwargs: Mesajda kullanılacak parametreler
        
        Returns:
            Dict with 'type' and 'message' keys
        """
        template = cls.MESSAGES.get(key)
        
        if not template:
            logger.warning(f"Message key not found: {key}")
            return {
                "type": MessageType.INFO.value,
                "message": "İşlem tamamlandı"
            }
        
        try:
            message = template["message"].format(**kwargs)
            return {
                "type": template["type"].value,
                "message": message
            }
        except KeyError as e:
            logger.error(f"Missing parameter for message {key}: {e}")
            return {
                "type": template["type"].value,
                "message": template["message"]
            }
    
    @classmethod
    def format_list(cls, items: list, separator: str = ", ") -> str:
        """Liste elemanlarını formatla"""
        if not items:
            return ""
        return separator.join(str(item) for item in items)
    
    @classmethod
    def get_upload_messages(cls) -> Dict[str, Dict[str, Any]]:
        """Yükleme ile ilgili tüm mesajları getir"""
        return {k: v for k, v in cls.MESSAGES.items() if k.startswith("upload.")}
    
    @classmethod
    def get_messages_by_category(cls, category: MessageCategory) -> Dict[str, Dict[str, Any]]:
        """Kategoriye göre mesajları getir"""
        prefix = f"{category.value}."
        return {k: v for k, v in cls.MESSAGES.items() if k.startswith(prefix)}
    
    @classmethod
    def create_error_response(cls, key: str, **kwargs) -> Dict[str, Any]:
        """API için hata yanıtı oluştur"""
        msg = cls.get_message(key, **kwargs)
        return {
            "success": False,
            "error": msg["message"],
            "type": msg["type"]
        }
    
    @classmethod
    def create_success_response(cls, key: str, data: Any = None, **kwargs) -> Dict[str, Any]:
        """API için başarı yanıtı oluştur"""
        msg = cls.get_message(key, **kwargs)
        response = {
            "success": True,
            "message": msg["message"],
            "type": msg["type"]
        }
        if data is not None:
            response["data"] = data
        return response

# Global instance
message_service = MessageService()

