"""
Tip Güvenliği ve Doğrulama Sistemi
Tüm doğrulamalar tek yerden yönetilir
"""

import re
import email_validator
from typing import Any, Dict, List, Optional, Union, Type, Callable
from dataclasses import dataclass
from enum import Enum
from pydantic import BaseModel, ValidationError as PydanticValidationError
from core.logging import get_logger
from core.exceptions import ValidationError
from core.constants import RegexPatterns, ValidationRules

logger = get_logger('validation')

class ValidationType(str, Enum):
    """Doğrulama türleri"""
    REQUIRED = "required"
    EMAIL = "email"
    PHONE = "phone"
    URL = "url"
    PASSWORD = "password"
    USERNAME = "username"
    PRODUCT_CODE = "product_code"
    COLOR_CODE = "color_code"
    DATE = "date"
    NUMBER = "number"
    STRING = "string"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"
    FILE = "file"
    CUSTOM = "custom"

@dataclass
class ValidationRule:
    """Doğrulama kuralı"""
    field: str
    validation_type: ValidationType
    required: bool = False
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[Union[int, float]] = None
    max_value: Optional[Union[int, float]] = None
    pattern: Optional[str] = None
    allowed_values: Optional[List[Any]] = None
    custom_validator: Optional[Callable] = None
    error_message: Optional[str] = None

class Validator:
    """Ana doğrulayıcı sınıf"""
    
    def __init__(self):
        self.rules: Dict[str, List[ValidationRule]] = {}
        self.errors: List[str] = []
    
    def add_rule(self, rule: ValidationRule):
        """Doğrulama kuralı ekle"""
        if rule.field not in self.rules:
            self.rules[rule.field] = []
        self.rules[rule.field].append(rule)
    
    def validate(self, data: Dict[str, Any]) -> bool:
        """Veriyi doğrula"""
        self.errors = []
        
        for field, rules in self.rules.items():
            value = data.get(field)
            
            for rule in rules:
                if not self._validate_field(field, value, rule):
                    return False
        
        return len(self.errors) == 0
    
    def _validate_field(self, field: str, value: Any, rule: ValidationRule) -> bool:
        """Alan doğrulaması"""
        # Required check
        if rule.required and (value is None or value == ""):
            error_msg = rule.error_message or f"{field} is required"
            self.errors.append(error_msg)
            return False
        
        # Skip validation if value is None and not required
        if value is None and not rule.required:
            return True
        
        # Type-specific validation
        if rule.validation_type == ValidationType.EMAIL:
            return self._validate_email(field, value, rule)
        elif rule.validation_type == ValidationType.PHONE:
            return self._validate_phone(field, value, rule)
        elif rule.validation_type == ValidationType.URL:
            return self._validate_url(field, value, rule)
        elif rule.validation_type == ValidationType.PASSWORD:
            return self._validate_password(field, value, rule)
        elif rule.validation_type == ValidationType.USERNAME:
            return self._validate_username(field, value, rule)
        elif rule.validation_type == ValidationType.PRODUCT_CODE:
            return self._validate_product_code(field, value, rule)
        elif rule.validation_type == ValidationType.COLOR_CODE:
            return self._validate_color_code(field, value, rule)
        elif rule.validation_type == ValidationType.DATE:
            return self._validate_date(field, value, rule)
        elif rule.validation_type == ValidationType.NUMBER:
            return self._validate_number(field, value, rule)
        elif rule.validation_type == ValidationType.STRING:
            return self._validate_string(field, value, rule)
        elif rule.validation_type == ValidationType.BOOLEAN:
            return self._validate_boolean(field, value, rule)
        elif rule.validation_type == ValidationType.ARRAY:
            return self._validate_array(field, value, rule)
        elif rule.validation_type == ValidationType.OBJECT:
            return self._validate_object(field, value, rule)
        elif rule.validation_type == ValidationType.FILE:
            return self._validate_file(field, value, rule)
        elif rule.validation_type == ValidationType.CUSTOM:
            return self._validate_custom(field, value, rule)
        
        return True
    
    def _validate_email(self, field: str, value: Any, rule: ValidationRule) -> bool:
        """Email doğrulaması"""
        try:
            email_validator.validate_email(value)
            return True
        except email_validator.EmailNotValidError:
            error_msg = rule.error_message or f"{field} is not a valid email"
            self.errors.append(error_msg)
            return False
    
    def _validate_phone(self, field: str, value: Any, rule: ValidationRule) -> bool:
        """Telefon doğrulaması"""
        if not re.match(RegexPatterns.PHONE, str(value)):
            error_msg = rule.error_message or f"{field} is not a valid phone number"
            self.errors.append(error_msg)
            return False
        return True
    
    def _validate_url(self, field: str, value: Any, rule: ValidationRule) -> bool:
        """URL doğrulaması"""
        if not re.match(RegexPatterns.URL, str(value)):
            error_msg = rule.error_message or f"{field} is not a valid URL"
            self.errors.append(error_msg)
            return False
        return True
    
    def _validate_password(self, field: str, value: Any, rule: ValidationRule) -> bool:
        """Şifre doğrulaması"""
        password = str(value)
        
        if len(password) < ValidationRules.PASSWORD_MIN_LENGTH:
            error_msg = rule.error_message or f"{field} must be at least {ValidationRules.PASSWORD_MIN_LENGTH} characters"
            self.errors.append(error_msg)
            return False
        
        if len(password) > ValidationRules.PASSWORD_MAX_LENGTH:
            error_msg = rule.error_message or f"{field} must be at most {ValidationRules.PASSWORD_MAX_LENGTH} characters"
            self.errors.append(error_msg)
            return False
        
        # Check for at least one uppercase, lowercase, digit, and special character
        if not re.search(r'[A-Z]', password):
            error_msg = rule.error_message or f"{field} must contain at least one uppercase letter"
            self.errors.append(error_msg)
            return False
        
        if not re.search(r'[a-z]', password):
            error_msg = rule.error_message or f"{field} must contain at least one lowercase letter"
            self.errors.append(error_msg)
            return False
        
        if not re.search(r'\d', password):
            error_msg = rule.error_message or f"{field} must contain at least one digit"
            self.errors.append(error_msg)
            return False
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            error_msg = rule.error_message or f"{field} must contain at least one special character"
            self.errors.append(error_msg)
            return False
        
        return True
    
    def _validate_username(self, field: str, value: Any, rule: ValidationRule) -> bool:
        """Kullanıcı adı doğrulaması"""
        username = str(value)
        
        if len(username) < ValidationRules.USERNAME_MIN_LENGTH:
            error_msg = rule.error_message or f"{field} must be at least {ValidationRules.USERNAME_MIN_LENGTH} characters"
            self.errors.append(error_msg)
            return False
        
        if len(username) > ValidationRules.USERNAME_MAX_LENGTH:
            error_msg = rule.error_message or f"{field} must be at most {ValidationRules.USERNAME_MAX_LENGTH} characters"
            self.errors.append(error_msg)
            return False
        
        # Check for valid characters (alphanumeric and underscore only)
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            error_msg = rule.error_message or f"{field} can only contain letters, numbers, and underscores"
            self.errors.append(error_msg)
            return False
        
        return True
    
    def _validate_product_code(self, field: str, value: Any, rule: ValidationRule) -> bool:
        """Ürün kodu doğrulaması"""
        if not re.match(RegexPatterns.PRODUCT_CODE, str(value)):
            error_msg = rule.error_message or f"{field} is not a valid product code"
            self.errors.append(error_msg)
            return False
        return True
    
    def _validate_color_code(self, field: str, value: Any, rule: ValidationRule) -> bool:
        """Renk kodu doğrulaması"""
        if not re.match(RegexPatterns.COLOR_CODE, str(value)):
            error_msg = rule.error_message or f"{field} is not a valid color code"
            self.errors.append(error_msg)
            return False
        return True
    
    def _validate_date(self, field: str, value: Any, rule: ValidationRule) -> bool:
        """Tarih doğrulaması"""
        try:
            from datetime import datetime
            if isinstance(value, str):
                datetime.fromisoformat(value)
            elif isinstance(value, datetime):
                pass
            else:
                raise ValueError("Invalid date format")
            return True
        except (ValueError, TypeError):
            error_msg = rule.error_message or f"{field} is not a valid date"
            self.errors.append(error_msg)
            return False
    
    def _validate_number(self, field: str, value: Any, rule: ValidationRule) -> bool:
        """Sayı doğrulaması"""
        try:
            num_value = float(value)
            
            if rule.min_value is not None and num_value < rule.min_value:
                error_msg = rule.error_message or f"{field} must be at least {rule.min_value}"
                self.errors.append(error_msg)
                return False
            
            if rule.max_value is not None and num_value > rule.max_value:
                error_msg = rule.error_message or f"{field} must be at most {rule.max_value}"
                self.errors.append(error_msg)
                return False
            
            return True
        except (ValueError, TypeError):
            error_msg = rule.error_message or f"{field} is not a valid number"
            self.errors.append(error_msg)
            return False
    
    def _validate_string(self, field: str, value: Any, rule: ValidationRule) -> bool:
        """String doğrulaması"""
        str_value = str(value)
        
        if rule.min_length is not None and len(str_value) < rule.min_length:
            error_msg = rule.error_message or f"{field} must be at least {rule.min_length} characters"
            self.errors.append(error_msg)
            return False
        
        if rule.max_length is not None and len(str_value) > rule.max_length:
            error_msg = rule.error_message or f"{field} must be at most {rule.max_length} characters"
            self.errors.append(error_msg)
            return False
        
        if rule.pattern and not re.match(rule.pattern, str_value):
            error_msg = rule.error_message or f"{field} does not match required pattern"
            self.errors.append(error_msg)
            return False
        
        if rule.allowed_values and str_value not in rule.allowed_values:
            error_msg = rule.error_message or f"{field} must be one of {rule.allowed_values}"
            self.errors.append(error_msg)
            return False
        
        return True
    
    def _validate_boolean(self, field: str, value: Any, rule: ValidationRule) -> bool:
        """Boolean doğrulaması"""
        if not isinstance(value, bool):
            error_msg = rule.error_message or f"{field} must be a boolean value"
            self.errors.append(error_msg)
            return False
        return True
    
    def _validate_array(self, field: str, value: Any, rule: ValidationRule) -> bool:
        """Array doğrulaması"""
        if not isinstance(value, list):
            error_msg = rule.error_message or f"{field} must be an array"
            self.errors.append(error_msg)
            return False
        
        if rule.min_length is not None and len(value) < rule.min_length:
            error_msg = rule.error_message or f"{field} must have at least {rule.min_length} items"
            self.errors.append(error_msg)
            return False
        
        if rule.max_length is not None and len(value) > rule.max_length:
            error_msg = rule.error_message or f"{field} must have at most {rule.max_length} items"
            self.errors.append(error_msg)
            return False
        
        return True
    
    def _validate_object(self, field: str, value: Any, rule: ValidationRule) -> bool:
        """Object doğrulaması"""
        if not isinstance(value, dict):
            error_msg = rule.error_message or f"{field} must be an object"
            self.errors.append(error_msg)
            return False
        return True
    
    def _validate_file(self, field: str, value: Any, rule: ValidationRule) -> bool:
        """Dosya doğrulaması"""
        # This would typically check file size, type, etc.
        # For now, just check if it's a file-like object
        if not hasattr(value, 'read'):
            error_msg = rule.error_message or f"{field} must be a file"
            self.errors.append(error_msg)
            return False
        return True
    
    def _validate_custom(self, field: str, value: Any, rule: ValidationRule) -> bool:
        """Özel doğrulama"""
        if rule.custom_validator:
            try:
                return rule.custom_validator(value)
            except Exception as e:
                error_msg = rule.error_message or f"{field} validation failed: {str(e)}"
                self.errors.append(error_msg)
                return False
        return True
    
    def get_errors(self) -> List[str]:
        """Hataları al"""
        return self.errors.copy()
    
    def clear_errors(self):
        """Hataları temizle"""
        self.errors = []

# Pydantic model validators
class BaseValidatorModel(BaseModel):
    """Temel doğrulama modeli"""
    
    class Config:
        validate_assignment = True
        use_enum_values = True
        extra = "forbid"
    
    def validate_field(self, field_name: str, value: Any) -> bool:
        """Alan doğrulaması"""
        try:
            setattr(self, field_name, value)
            return True
        except PydanticValidationError as e:
            logger.error(f"Validation error for field {field_name}: {e}")
            return False

# Specific validators
class UserValidator(BaseValidatorModel):
    """Kullanıcı doğrulayıcı"""
    username: str
    email: str
    password: str
    role: str
    status: str
    
    @classmethod
    def create_validator(cls) -> Validator:
        """Kullanıcı doğrulayıcı oluştur"""
        validator = Validator()
        
        validator.add_rule(ValidationRule(
            field="username",
            validation_type=ValidationType.USERNAME,
            required=True,
            min_length=ValidationRules.USERNAME_MIN_LENGTH,
            max_length=ValidationRules.USERNAME_MAX_LENGTH
        ))
        
        validator.add_rule(ValidationRule(
            field="email",
            validation_type=ValidationType.EMAIL,
            required=True
        ))
        
        validator.add_rule(ValidationRule(
            field="password",
            validation_type=ValidationType.PASSWORD,
            required=True,
            min_length=ValidationRules.PASSWORD_MIN_LENGTH,
            max_length=ValidationRules.PASSWORD_MAX_LENGTH
        ))
        
        validator.add_rule(ValidationRule(
            field="role",
            validation_type=ValidationType.STRING,
            required=True,
            allowed_values=["super_admin", "brand_manager", "employee", "viewer"]
        ))
        
        validator.add_rule(ValidationRule(
            field="status",
            validation_type=ValidationType.STRING,
            required=True,
            allowed_values=["active", "inactive", "pending", "suspended"]
        ))
        
        return validator

class BrandValidator(BaseValidatorModel):
    """Marka doğrulayıcı"""
    name: str
    description: Optional[str] = None
    status: str
    
    @classmethod
    def create_validator(cls) -> Validator:
        """Marka doğrulayıcı oluştur"""
        validator = Validator()
        
        validator.add_rule(ValidationRule(
            field="name",
            validation_type=ValidationType.STRING,
            required=True,
            min_length=ValidationRules.BRAND_NAME_MIN_LENGTH,
            max_length=ValidationRules.BRAND_NAME_MAX_LENGTH
        ))
        
        validator.add_rule(ValidationRule(
            field="description",
            validation_type=ValidationType.STRING,
            required=False,
            max_length=500
        ))
        
        validator.add_rule(ValidationRule(
            field="status",
            validation_type=ValidationType.STRING,
            required=True,
            allowed_values=["active", "inactive", "pending"]
        ))
        
        return validator

class ProductValidator(BaseValidatorModel):
    """Ürün doğrulayıcı"""
    name: str
    code: str
    color: Optional[str] = None
    brand_id: int
    
    @classmethod
    def create_validator(cls) -> Validator:
        """Ürün doğrulayıcı oluştur"""
        validator = Validator()
        
        validator.add_rule(ValidationRule(
            field="name",
            validation_type=ValidationType.STRING,
            required=True,
            min_length=3,
            max_length=100
        ))
        
        validator.add_rule(ValidationRule(
            field="code",
            validation_type=ValidationType.PRODUCT_CODE,
            required=True,
            min_length=ValidationRules.PRODUCT_CODE_MIN_LENGTH,
            max_length=ValidationRules.PRODUCT_CODE_MAX_LENGTH
        ))
        
        validator.add_rule(ValidationRule(
            field="color",
            validation_type=ValidationType.STRING,
            required=False,
            max_length=50
        ))
        
        validator.add_rule(ValidationRule(
            field="brand_id",
            validation_type=ValidationType.NUMBER,
            required=True,
            min_value=1
        ))
        
        return validator

# Global validators
user_validator = UserValidator.create_validator()
brand_validator = BrandValidator.create_validator()
product_validator = ProductValidator.create_validator()

def validate_user(data: Dict[str, Any]) -> bool:
    """Kullanıcı doğrulaması"""
    return user_validator.validate(data)

def validate_brand(data: Dict[str, Any]) -> bool:
    """Marka doğrulaması"""
    return brand_validator.validate(data)

def validate_product(data: Dict[str, Any]) -> bool:
    """Ürün doğrulaması"""
    return product_validator.validate(data)

def get_validation_errors() -> List[str]:
    """Doğrulama hatalarını al"""
    all_errors = []
    all_errors.extend(user_validator.get_errors())
    all_errors.extend(brand_validator.get_errors())
    all_errors.extend(product_validator.get_errors())
    return all_errors

def clear_validation_errors():
    """Doğrulama hatalarını temizle"""
    user_validator.clear_errors()
    brand_validator.clear_errors()
    product_validator.clear_errors()
