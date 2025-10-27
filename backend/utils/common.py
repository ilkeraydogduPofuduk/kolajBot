from typing import Dict, Any, Optional, List
from datetime import datetime
import hashlib
import secrets
import string

def generate_token(length: int = 32) -> str:
    """Güvenli token oluştur"""
    return secrets.token_urlsafe(length)

def generate_password(length: int = 12) -> str:
    """Güvenli şifre oluştur"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def hash_string(text: str) -> str:
    """String'i hash'le"""
    return hashlib.sha256(text.encode()).hexdigest()

def format_phone_number(phone: str) -> str:
    """Telefon numarasını formatla"""
    # Türkiye formatında telefon numarası düzenlemesi
    phone = ''.join(filter(str.isdigit, phone))
    
    if phone.startswith('0'):
        phone = '90' + phone[1:]
    elif not phone.startswith('90'):
        phone = '90' + phone
    
    return phone

def get_file_extension(filename: str) -> str:
    """Dosya uzantısını al"""
    return filename.split('.')[-1].lower() if '.' in filename else ''

def is_valid_file_type(filename: str, allowed_types: List[str]) -> bool:
    """Dosya tipinin geçerli olup olmadığını kontrol et"""
    extension = get_file_extension(filename)
    return extension in allowed_types

def paginate_query(query, page: int, per_page: int):
    """SQLAlchemy query'sini sayfalara böl"""
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    
    return {
        'items': items,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page
        }
    }

def create_response(
    data: Any = None,
    message: str = "Success",
    success: bool = True,
    status_code: int = 200
) -> Dict[str, Any]:
    """Standart API response oluştur"""
    response = {
        'success': success,
        'message': message,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    if data is not None:
        response['data'] = data
    
    return response

class APIError(Exception):
    """Özel API hatası"""
    def __init__(self, message: str, status_code: int = 400, details: Optional[Dict] = None):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(self.message)
