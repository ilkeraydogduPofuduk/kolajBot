"""
Brand-Based Label Patterns
Her markanın etiket yapısını tanımlar
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from core.logging import get_logger

logger = get_logger(__name__)

@dataclass
class LabelPattern:
    """Etiket pattern tanımı"""
    brand_name: str
    has_price: bool = True
    has_product_code: bool = True
    has_color: bool = True
    has_size_range: bool = True
    has_product_type: bool = True
    has_barcode: bool = False
    has_material: bool = False
    has_season: bool = False
    required_fields: List[str] = None
    
    def __post_init__(self):
        if self.required_fields is None:
            self.required_fields = []

class BrandLabelPatternService:
    """Marka bazlı etiket pattern servisi"""
    
    def __init__(self):
        self.patterns = self._initialize_patterns()
    
    def _initialize_patterns(self) -> Dict[str, LabelPattern]:
        """Marka pattern'lerini başlat"""
        return {
            # DİZAYN BRANDS - TÜM BİLGİLER VAR
            'DIZAYN BRANDS': LabelPattern(
                brand_name='DIZAYN BRANDS',
                has_price=True,
                has_product_code=True,
                has_color=True,
                has_size_range=True,
                has_product_type=True,
                has_barcode=True,
                has_material=True,
                has_season=True,
                required_fields=['product_code', 'color', 'size_range', 'price', 'product_type']
            ),
            
            'DZAYN BRANDS': LabelPattern(
                brand_name='DZAYN BRANDS',
                has_price=True,
                has_product_code=True,
                has_color=True,
                has_size_range=True,
                has_product_type=True,
                has_barcode=True,
                has_material=True,
                has_season=True,
                required_fields=['product_code', 'color', 'size_range', 'price', 'product_type']
            ),
            
            # KOKART - MİNİMAL BİLGİ
            'KOKART': LabelPattern(
                brand_name='KOKART',
                has_price=False,  # Genelde fiyat yok
                has_product_code=True,
                has_color=True,  # Ekstra olabilir
                has_size_range=True,
                has_product_type=False,  # Genelde yok
                has_barcode=False,
                has_material=False,
                has_season=False,
                required_fields=['product_code', 'size_range']
            ),
            
            # ANNAVERO - MİNİMAL BİLGİ
            'ANNAVERO': LabelPattern(
                brand_name='ANNAVERO',
                has_price=False,
                has_product_code=True,
                has_color=True,
                has_size_range=True,
                has_product_type=False,
                has_barcode=False,
                has_material=False,
                has_season=False,
                required_fields=['product_code', 'size_range']
            ),
            
            # FEVER - MİNİMAL BİLGİ
            'FEVER': LabelPattern(
                brand_name='FEVER',
                has_price=False,
                has_product_code=True,
                has_color=True,
                has_size_range=True,
                has_product_type=False,
                has_barcode=False,
                has_material=False,
                has_season=False,
                required_fields=['product_code', 'size_range']
            ),
            
            # DEFAULT - STANDART BİLGİLER
            'DEFAULT': LabelPattern(
                brand_name='DEFAULT',
                has_price=True,
                has_product_code=True,
                has_color=True,
                has_size_range=True,
                has_product_type=True,
                has_barcode=False,
                has_material=False,
                has_season=False,
                required_fields=['product_code', 'color', 'size_range']
            )
        }
    
    def get_pattern_for_brand(self, brand_name: str) -> LabelPattern:
        """Marka için pattern al"""
        if not brand_name:
            return self.patterns['DEFAULT']
        
        # Normalize brand name
        brand_upper = brand_name.upper().strip()
        
        # Direct match
        if brand_upper in self.patterns:
            logger.info(f"[BRAND PATTERN] Found pattern for {brand_upper}")
            return self.patterns[brand_upper]
        
        # Fuzzy match
        for pattern_name in self.patterns.keys():
            if pattern_name in brand_upper or brand_upper in pattern_name:
                logger.info(f"[BRAND PATTERN] Fuzzy match: {brand_upper} -> {pattern_name}")
                return self.patterns[pattern_name]
        
        # Default
        logger.info(f"[BRAND PATTERN] Using DEFAULT pattern for {brand_name}")
        return self.patterns['DEFAULT']
    
    def should_extract_field(self, brand_name: str, field_name: str) -> bool:
        """Bu alan bu marka için çıkarılmalı mı?"""
        pattern = self.get_pattern_for_brand(brand_name)
        
        field_map = {
            'price': pattern.has_price,
            'product_code': pattern.has_product_code,
            'color': pattern.has_color,
            'size_range': pattern.has_size_range,
            'product_type': pattern.has_product_type,
            'barcode': pattern.has_barcode,
            'material': pattern.has_material,
            'season': pattern.has_season
        }
        
        return field_map.get(field_name, False)
    
    def get_required_fields(self, brand_name: str) -> List[str]:
        """Bu marka için zorunlu alanlar"""
        pattern = self.get_pattern_for_brand(brand_name)
        return pattern.required_fields
    
    def validate_extraction(self, brand_name: str, extracted_data: Dict) -> Dict:
        """Çıkarılan verileri doğrula ve eksikleri belirle"""
        pattern = self.get_pattern_for_brand(brand_name)
        
        missing_fields = []
        for field in pattern.required_fields:
            if not extracted_data.get(field):
                missing_fields.append(field)
        
        return {
            'is_valid': len(missing_fields) == 0,
            'missing_fields': missing_fields,
            'extracted_fields': list(extracted_data.keys()),
            'pattern_name': pattern.brand_name
        }

# Global instance
brand_label_pattern_service = BrandLabelPatternService()

