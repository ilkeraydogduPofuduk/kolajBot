"""
Dinamik Konfigürasyon Sistemi
Runtime'da değiştirilebilir ayarlar
"""

import json
import os
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from core.config import settings
from core.logging import get_logger
from core.exceptions import ConfigurationError

logger = get_logger('dynamic_config')

@dataclass
class DynamicConfigItem:
    """Dinamik konfigürasyon öğesi"""
    key: str
    value: Any
    category: str
    description: str
    data_type: str
    is_sensitive: bool = False
    is_readonly: bool = False
    min_value: Optional[Any] = None
    max_value: Optional[Any] = None
    allowed_values: Optional[List[Any]] = None
    updated_at: datetime = None
    updated_by: Optional[str] = None

class DynamicConfigManager:
    """Dinamik konfigürasyon yöneticisi"""
    
    def __init__(self):
        self.config_file = "dynamic_config.json"
        self.config: Dict[str, DynamicConfigItem] = {}
        self.listeners: List[callable] = []
        self.load_config()
    
    def load_config(self) -> None:
        """Konfigürasyonu dosyadan yükle"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                for key, item_data in data.items():
                    # Convert datetime strings back to datetime objects
                    if item_data.get('updated_at'):
                        item_data['updated_at'] = datetime.fromisoformat(item_data['updated_at'])
                    
                    self.config[key] = DynamicConfigItem(**item_data)
                    
                logger.info(f"Dynamic config loaded: {len(self.config)} items")
            else:
                self.initialize_default_config()
                
        except Exception as e:
            logger.error(f"Failed to load dynamic config: {e}")
            self.initialize_default_config()
    
    def save_config(self) -> None:
        """Konfigürasyonu dosyaya kaydet"""
        try:
            data = {}
            for key, item in self.config.items():
                item_dict = asdict(item)
                # Convert datetime to string for JSON serialization
                if item_dict.get('updated_at'):
                    item_dict['updated_at'] = item_dict['updated_at'].isoformat()
                data[key] = item_dict
            
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                
            logger.info("Dynamic config saved")
            
        except Exception as e:
            logger.error(f"Failed to save dynamic config: {e}")
            raise ConfigurationError(f"Failed to save dynamic config: {str(e)}")
    
    def initialize_default_config(self) -> None:
        """Varsayılan konfigürasyonu oluştur"""
        default_configs = [
            # OCR Settings
            DynamicConfigItem(
                key="ocr.parallel_workers",
                value=10,
                category="ocr",
                description="Paralel OCR işçi sayısı",
                data_type="integer",
                min_value=1,
                max_value=50
            ),
            DynamicConfigItem(
                key="ocr.timeout",
                value=30,
                category="ocr",
                description="OCR zaman aşımı (saniye)",
                data_type="integer",
                min_value=5,
                max_value=300
            ),
            DynamicConfigItem(
                key="ocr.confidence_threshold",
                value=0.7,
                category="ocr",
                description="OCR güven eşiği",
                data_type="float",
                min_value=0.1,
                max_value=1.0
            ),
            
            # Upload Settings
            DynamicConfigItem(
                key="upload.max_file_size_mb",
                value=10,
                category="upload",
                description="Maksimum dosya boyutu (MB)",
                data_type="integer",
                min_value=1,
                max_value=100
            ),
            DynamicConfigItem(
                key="upload.max_file_count",
                value=500,
                category="upload",
                description="Maksimum dosya sayısı",
                data_type="integer",
                min_value=1,
                max_value=1000
            ),
            DynamicConfigItem(
                key="upload.allowed_extensions",
                value=["jpg", "jpeg", "png", "webp"],
                category="upload",
                description="İzin verilen dosya uzantıları",
                data_type="list"
            ),
            
            # Cache Settings
            DynamicConfigItem(
                key="cache.ttl",
                value=300,
                category="cache",
                description="Cache TTL (saniye)",
                data_type="integer",
                min_value=60,
                max_value=3600
            ),
            DynamicConfigItem(
                key="cache.max_size_mb",
                value=100,
                category="cache",
                description="Maksimum cache boyutu (MB)",
                data_type="integer",
                min_value=10,
                max_value=1000
            ),
            
            # Performance Settings
            DynamicConfigItem(
                key="performance.slow_query_threshold",
                value=2.0,
                category="performance",
                description="Yavaş sorgu eşiği (saniye)",
                data_type="float",
                min_value=0.1,
                max_value=10.0
            ),
            DynamicConfigItem(
                key="performance.max_concurrent_requests",
                value=100,
                category="performance",
                description="Maksimum eşzamanlı istek",
                data_type="integer",
                min_value=10,
                max_value=1000
            ),
            
            # Security Settings
            DynamicConfigItem(
                key="security.max_login_attempts",
                value=5,
                category="security",
                description="Maksimum giriş denemesi",
                data_type="integer",
                min_value=3,
                max_value=10
            ),
            DynamicConfigItem(
                key="security.lockout_duration_minutes",
                value=15,
                category="security",
                description="Kilitlenme süresi (dakika)",
                data_type="integer",
                min_value=5,
                max_value=60
            ),
            
            # Feature Flags
            DynamicConfigItem(
                key="features.social_media",
                value=True,
                category="features",
                description="Sosyal medya özelliği",
                data_type="boolean"
            ),
            DynamicConfigItem(
                key="features.templates",
                value=True,
                category="features",
                description="Şablon özelliği",
                data_type="boolean"
            ),
            DynamicConfigItem(
                key="features.ai_generation",
                value=True,
                category="features",
                description="AI üretim özelliği",
                data_type="boolean"
            ),
            DynamicConfigItem(
                key="features.multi_language",
                value=False,
                category="features",
                description="Çoklu dil özelliği",
                data_type="boolean"
            ),
            
            # UI Settings
            DynamicConfigItem(
                key="ui.theme",
                value="light",
                category="ui",
                description="UI teması",
                data_type="string",
                allowed_values=["light", "dark", "system"]
            ),
            DynamicConfigItem(
                key="ui.language",
                value="tr",
                category="ui",
                description="UI dili",
                data_type="string",
                allowed_values=["tr", "en"]
            ),
            DynamicConfigItem(
                key="ui.date_format",
                value="DD/MM/YYYY",
                category="ui",
                description="Tarih formatı",
                data_type="string"
            ),
        ]
        
        for config_item in default_configs:
            config_item.updated_at = datetime.now()
            self.config[config_item.key] = config_item
        
        self.save_config()
        logger.info("Default dynamic config initialized")
    
    def get(self, key: str, default: Any = None) -> Any:
        """Konfigürasyon değerini al"""
        if key in self.config:
            return self.config[key].value
        return default
    
    def set(self, key: str, value: Any, updated_by: Optional[str] = None) -> bool:
        """Konfigürasyon değerini ayarla"""
        if key not in self.config:
            logger.warning(f"Unknown config key: {key}")
            return False
        
        config_item = self.config[key]
        
        # Check if readonly
        if config_item.is_readonly:
            logger.warning(f"Config key is readonly: {key}")
            return False
        
        # Validate value
        if not self.validate_value(config_item, value):
            return False
        
        # Update value
        old_value = config_item.value
        config_item.value = value
        config_item.updated_at = datetime.now()
        config_item.updated_by = updated_by
        
        # Save config
        self.save_config()
        
        # Notify listeners
        self.notify_listeners(key, old_value, value)
        
        logger.info(f"Config updated: {key} = {value}")
        return True
    
    def validate_value(self, config_item: DynamicConfigItem, value: Any) -> bool:
        """Değeri doğrula"""
        try:
            # Type validation
            if config_item.data_type == "integer":
                if not isinstance(value, int):
                    value = int(value)
            elif config_item.data_type == "float":
                if not isinstance(value, float):
                    value = float(value)
            elif config_item.data_type == "boolean":
                if not isinstance(value, bool):
                    value = bool(value)
            elif config_item.data_type == "string":
                if not isinstance(value, str):
                    value = str(value)
            elif config_item.data_type == "list":
                if not isinstance(value, list):
                    value = list(value)
            
            # Range validation
            if config_item.min_value is not None and value < config_item.min_value:
                logger.error(f"Value below minimum: {key} = {value} < {config_item.min_value}")
                return False
            
            if config_item.max_value is not None and value > config_item.max_value:
                logger.error(f"Value above maximum: {key} = {value} > {config_item.max_value}")
                return False
            
            # Allowed values validation
            if config_item.allowed_values is not None and value not in config_item.allowed_values:
                logger.error(f"Value not in allowed values: {key} = {value}")
                return False
            
            return True
            
        except (ValueError, TypeError) as e:
            logger.error(f"Value validation failed: {key} = {value}, error: {e}")
            return False
    
    def get_category(self, category: str) -> Dict[str, Any]:
        """Kategoriye göre konfigürasyonları al"""
        result = {}
        for key, config_item in self.config.items():
            if config_item.category == category:
                result[key] = {
                    'value': config_item.value,
                    'description': config_item.description,
                    'data_type': config_item.data_type,
                    'is_sensitive': config_item.is_sensitive,
                    'is_readonly': config_item.is_readonly,
                    'updated_at': config_item.updated_at,
                    'updated_by': config_item.updated_by
                }
        return result
    
    def get_all(self) -> Dict[str, Any]:
        """Tüm konfigürasyonları al"""
        result = {}
        for key, config_item in self.config.items():
            result[key] = {
                'value': config_item.value,
                'category': config_item.category,
                'description': config_item.description,
                'data_type': config_item.data_type,
                'is_sensitive': config_item.is_sensitive,
                'is_readonly': config_item.is_readonly,
                'updated_at': config_item.updated_at,
                'updated_by': config_item.updated_by
            }
        return result
    
    def add_listener(self, listener: callable) -> None:
        """Konfigürasyon değişiklik dinleyicisi ekle"""
        self.listeners.append(listener)
    
    def remove_listener(self, listener: callable) -> None:
        """Konfigürasyon değişiklik dinleyicisi kaldır"""
        if listener in self.listeners:
            self.listeners.remove(listener)
    
    def notify_listeners(self, key: str, old_value: Any, new_value: Any) -> None:
        """Dinleyicilere bildirim gönder"""
        for listener in self.listeners:
            try:
                listener(key, old_value, new_value)
            except Exception as e:
                logger.error(f"Config listener error: {e}")
    
    def reset_to_default(self, key: str) -> bool:
        """Konfigürasyonu varsayılan değere sıfırla"""
        if key not in self.config:
            return False
        
        # Reload default config to get original value
        original_config = DynamicConfigManager()
        original_config.initialize_default_config()
        
        if key in original_config.config:
            default_value = original_config.config[key].value
            return self.set(key, default_value, "system")
        
        return False
    
    def export_config(self) -> str:
        """Konfigürasyonu dışa aktar"""
        return json.dumps(self.get_all(), indent=2, ensure_ascii=False, default=str)
    
    def import_config(self, config_data: str) -> bool:
        """Konfigürasyonu içe aktar"""
        try:
            data = json.loads(config_data)
            for key, value in data.items():
                if key in self.config:
                    self.set(key, value, "import")
            return True
        except Exception as e:
            logger.error(f"Config import failed: {e}")
            return False

# Global dynamic config manager
dynamic_config = DynamicConfigManager()

def get_dynamic_config(key: str, default: Any = None) -> Any:
    """Dinamik konfigürasyon değerini al"""
    return dynamic_config.get(key, default)

def set_dynamic_config(key: str, value: Any, updated_by: Optional[str] = None) -> bool:
    """Dinamik konfigürasyon değerini ayarla"""
    return dynamic_config.set(key, value, updated_by)

def get_dynamic_config_category(category: str) -> Dict[str, Any]:
    """Kategoriye göre dinamik konfigürasyonları al"""
    return dynamic_config.get_category(category)

def get_all_dynamic_config() -> Dict[str, Any]:
    """Tüm dinamik konfigürasyonları al"""
    return dynamic_config.get_all()
