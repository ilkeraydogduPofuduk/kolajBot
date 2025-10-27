"""
Brand Permission Service
Handles brand access control and validation
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from models.user import User
from models.brand import Brand
from models.user_brand import UserBrand
from core.logging import get_logger

logger = get_logger('brand_permission_service')

class BrandPermissionService:
    """Service for managing brand permissions and access control"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_accessible_brands(self, user: User) -> List[Brand]:
        """Get all brands that user has access to"""
        try:
            # DİNAMİK: brands.manage yetkisi varsa tüm markalara erişebilir
            from services.permission_service import PermissionService
            permission_service = PermissionService(self.db)
            if permission_service.has_permission(user.id, 'brands.manage'):
                return self.db.query(Brand).all()
            
            # Get brands from user_brands junction table
            accessible_brands = self.db.query(Brand).join(UserBrand).filter(
                UserBrand.user_id == user.id
            ).all()
            
            # Also include user's primary brand if exists
            if user.brand_id:
                primary_brand = self.db.query(Brand).filter(
                    Brand.id == user.brand_id
                ).first()
                if primary_brand and primary_brand not in accessible_brands:
                    accessible_brands.append(primary_brand)
            
            return accessible_brands
            
        except Exception as e:
            logger.error(f"Error getting user accessible brands: {e}")
            return []
    
    def get_user_accessible_brand_ids(self, user: User) -> List[int]:
        """Get all brand IDs that user has access to"""
        accessible_brands = self.get_user_accessible_brands(user)
        return [brand.id for brand in accessible_brands]
    
    def get_user_accessible_brand_names(self, user: User) -> List[str]:
        """Get all brand names that user has access to"""
        accessible_brands = self.get_user_accessible_brands(user)
        return [brand.name for brand in accessible_brands]
    
    def can_user_access_brand(self, user: User, brand_id: int) -> bool:
        """Check if user can access specific brand"""
        try:
            # DİNAMİK: brands.manage yetkisi varsa tüm markalara erişebilir
            from services.permission_service import PermissionService
            permission_service = PermissionService(self.db)
            if permission_service.has_permission(user.id, 'brands.manage'):
                return True
            
            # Check if brand exists
            brand = self.db.query(Brand).filter(
                Brand.id == brand_id
            ).first()
            
            if not brand:
                return False
            
            # Check user_brands junction table
            user_brand = self.db.query(UserBrand).filter(
                UserBrand.user_id == user.id,
                UserBrand.brand_id == brand_id
            ).first()
            
            if user_brand:
                return True
            
            # Check if it's user's primary brand
            if user.brand_id == brand_id:
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking brand access: {e}")
            return False
    
    def can_user_access_brand_by_name(self, user: User, brand_name: str) -> bool:
        """Check if user can access brand by name"""
        try:
            # DİNAMİK: brands.manage yetkisi varsa tüm markalara erişebilir
            from services.permission_service import PermissionService
            permission_service = PermissionService(self.db)
            if permission_service.has_permission(user.id, 'brands.manage'):
                return True
            
            # Find brand by name
            brand = self.db.query(Brand).filter(
                Brand.name.ilike(f"%{brand_name}%"),
                Brand.is_active == True
            ).first()
            
            if not brand:
                return False
            
            return self.can_user_access_brand(user, brand.id)
            
        except Exception as e:
            logger.error(f"Error checking brand access by name: {e}")
            return False
    
    def assign_brand_to_user(self, user_id: int, brand_id: int) -> bool:
        """Assign brand to user"""
        try:
            # Check if assignment already exists
            existing = self.db.query(UserBrand).filter(
                UserBrand.user_id == user_id,
                UserBrand.brand_id == brand_id
            ).first()
            
            if existing:
                return True
            
            # Create new assignment
            user_brand = UserBrand(
                user_id=user_id,
                brand_id=brand_id
            )
            
            self.db.add(user_brand)
            self.db.commit()
            
            logger.info(f"Assigned brand {brand_id} to user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error assigning brand to user: {e}")
            self.db.rollback()
            return False
    
    def remove_brand_from_user(self, user_id: int, brand_id: int) -> bool:
        """Remove brand assignment from user"""
        try:
            user_brand = self.db.query(UserBrand).filter(
                UserBrand.user_id == user_id,
                UserBrand.brand_id == brand_id
            ).first()
            
            if user_brand:
                self.db.delete(user_brand)
                self.db.commit()
                logger.info(f"Removed brand {brand_id} from user {user_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error removing brand from user: {e}")
            self.db.rollback()
            return False
    
    def _normalize_brand_name(self, brand_name: str) -> str:
        """Normalize brand name for comparison - TURKISH CHARACTER AWARE"""
        if not brand_name:
            return ""
        
        # CRITICAL: Handle DİZAYN vs DZAYN specifically
        brand_name_upper = brand_name.upper()
        if 'DİZAYN' in brand_name_upper or 'DIZAYN' in brand_name_upper:
            brand_name = brand_name_upper.replace('DİZAYN', 'DZAYN').replace('DIZAYN', 'DZAYN')
        
        # TURKISH CHARACTER REPLACEMENTS FIRST (before any other normalization)
        turkish_map = {
            'İ': 'I', 'ı': 'i', 'Ş': 'S', 'ş': 's',
            'Ğ': 'G', 'ğ': 'g', 'Ü': 'U', 'ü': 'u',
            'Ö': 'O', 'ö': 'o', 'Ç': 'C', 'ç': 'c'
        }
        
        for turkish_char, replacement in turkish_map.items():
            brand_name = brand_name.replace(turkish_char, replacement)
        
        # Remove accents and special characters
        import unicodedata
        normalized = unicodedata.normalize('NFD', brand_name)
        ascii_string = ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')
        
        # Convert to lowercase and remove spaces/special chars
        normalized = ascii_string.lower()
        normalized = ''.join(c for c in normalized if c.isalnum())
        
        return normalized

    def validate_brand_access_for_product(self, user: User, extracted_brand_name: str) -> tuple[bool, Optional[Brand], str]:
        """
        Validate if user can access the extracted brand for product upload
        Returns: (is_valid, brand_object, error_message)
        """
        try:
            if not extracted_brand_name:
                return False, None, "Marka bilgisi bulunamadı"
            
            # Fix OCR misreads before processing
            brand_clean = extracted_brand_name.lower().replace('\n', ' ').replace('\r', ' ').replace('  ', ' ').strip()
            if brand_clean in ['svv', 's vv'] or 's' in brand_clean and 'vv' in brand_clean:
                extracted_brand_name = 'DİZAYN BRANDS'
                logger.info(f"[BRAND PERMISSION] OCR misread fixed: '{extracted_brand_name}' -> 'DİZAYN BRANDS'")
            
            # Normalize the extracted brand name
            normalized_extracted = self._normalize_brand_name(extracted_brand_name)
            logger.info(f"[BRAND PERMISSION] Normalized extracted: '{extracted_brand_name}' -> '{normalized_extracted}'")
            
            # Get all accessible brands for the user
            accessible_brands = self.get_user_accessible_brands(user)
            logger.info(f"[BRAND PERMISSION] User has {len(accessible_brands)} accessible brands")
            
            # Try to find matching brand using normalized comparison
            matching_brand = None
            for brand in accessible_brands:
                normalized_brand = self._normalize_brand_name(brand.name)
                logger.info(f"[BRAND PERMISSION] Comparing: '{normalized_extracted}' == '{normalized_brand}' (from '{brand.name}')")
                if normalized_extracted == normalized_brand:
                    matching_brand = brand
                    logger.info(f"[BRAND PERMISSION] EXACT MATCH FOUND: {brand.name}")
                    break
                # Also try partial matching
                elif normalized_extracted in normalized_brand or normalized_brand in normalized_extracted:
                    matching_brand = brand
                    logger.info(f"[BRAND PERMISSION] PARTIAL MATCH FOUND: {brand.name}")
                    break
            
            if not matching_brand:
                # Try database query as fallback
                brand = self.db.query(Brand).filter(
                    Brand.name.ilike(f"%{extracted_brand_name}%"),
                    Brand.is_active == True
                ).first()
                
                if brand and self.can_user_access_brand(user, brand.id):
                    matching_brand = brand
            
            if not matching_brand:
                accessible_brands = self.get_user_accessible_brand_names(user)
                return False, None, f"Marka '{extracted_brand_name}' bulunamadı. Erişiminiz olan markalar: {', '.join(accessible_brands)}"
            
            logger.info(f"[BRAND PERMISSION] User {user.email} has access to brand {matching_brand.name}")
            return True, matching_brand, ""
            
        except Exception as e:
            logger.error(f"Error validating brand access: {e}")
            return False, None, f"Marka erişim kontrolünde hata: {str(e)}"