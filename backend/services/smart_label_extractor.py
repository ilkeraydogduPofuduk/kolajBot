"""
Smart Label Extractor
AI-powered, comprehensive label information extraction system
"""

import re
import logging
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class LabelField(Enum):
    """Label field types"""
    BRAND = "brand"
    PRODUCT_CODE = "product_code"
    COLOR = "color"
    SIZE_RANGE = "size_range"
    PRICE = "price"
    PRODUCT_TYPE = "product_type"
    MATERIAL = "material"
    SEASON = "season"
    BARCODE = "barcode"
    COUNTRY = "country"
    CARE_INSTRUCTIONS = "care_instructions"
    COMPOSITION = "composition"

@dataclass
class LabelFieldCandidate:
    """Label field candidate with metadata"""
    field_type: LabelField
    value: str
    confidence: float
    position: int
    line_number: int
    surrounding_text: str
    reasoning: str
    extraction_method: str

@dataclass
class LabelInfo:
    """Complete label information"""
    brand: Optional[str] = None
    product_code: Optional[str] = None
    color: Optional[str] = None
    size_range: Optional[str] = None
    price: Optional[str] = None
    product_type: Optional[str] = None
    material: Optional[str] = None
    season: Optional[str] = None
    barcode: Optional[str] = None
    country: Optional[str] = None
    care_instructions: Optional[str] = None
    composition: Optional[str] = None
    confidence: float = 0.0
    missing_fields: List[str] = None
    raw_text: str = ""

class SmartLabelExtractor:
    """AI-powered, comprehensive label information extraction system"""
    
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # Brand patterns
        self.brand_patterns = {
            'indicators': ['marka', 'brand', 'firma', 'company', 'label'],
            'common_brands': [
                'dizayn brands', 'dizayn&ella', 'dzyn exclusive', 'dzyn line',
                'esta line', 'fever', 'kokart', 'annavero', 'ar collection',
                'biljana', 'bluemese', 'my8', 'lilium', 'vita vien',
                'svv', 's vv'  # OCR sometimes misreads DZAYN as SVV
            ],
            'patterns': [
                r'\b([A-Z][A-Za-z\s&]+(?:BRANDS?|DESIGN|COLLECTION|LINE|EXCLUSIVE))\b',
                r'\b([A-Z][A-Za-z\s&]{2,20})\b(?=\s*(?:BRAND|MARKA|FİRMA))',
            ]
        }
        
        # Product code patterns
        self.product_code_patterns = {
            'patterns': [
                r'\b([A-Za-z]{2,4}-\d{3,6}-[A-Za-z])\b',  # VV-6124-B
                r'\b([A-Za-z]{2,4}-\d{3,6})\b',  # VV-6124
                r'\b([A-Za-z]{2,4}\d{3,6})\b',  # VV6124
                r'\b(\d{4,6}[A-Za-z]{1,3})\b',  # 6124B
                r'\b([A-Za-z]{2,4}\d{1,2}[A-Za-z]\d{3,6})\b',  # LL2E626
            ],
            'indicators': ['kod', 'code', 'ref', 'referans', 'model', 'artikel']
        }
        
        # Color patterns
        self.color_patterns = {
            'common_colors': [
                # English colors
                'black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'purple',
                'orange', 'brown', 'gray', 'grey', 'beige', 'navy', 'burgundy', 'camel',
                'maroon', 'cream', 'violet', 'turquoise', 'khaki', 'olive', 'gold', 'silver',
                # Turkish colors (with proper Turkish character support)
                'siyah', 'syah', 'beyaz', 'kırmızı', 'kirmizi', 'mavi', 'yeşil', 'yesil', 
                'sarı', 'sari', 'pembe', 'mor', 'turuncu', 'kahverengi', 'kahve',
                'gri', 'bej', 'lacivert', 'bordo', 'krem', 'vizon', 'ekru', 'taş', 'tas',
                'deve', 'deve tüyü', 'deve tuyu'
            ],
            'patterns': [
                r'\b(renk|color|colour)[:\s]*([A-Za-zğüşöçıİĞÜŞÖÇ]+)\b',
                r'\b([A-Za-zğüşöçıİĞÜŞÖÇ]+)\s*(?:renk|color|colour)\b',
            ]
        }
        
        # Size range patterns
        self.size_patterns = {
            'patterns': [
                r'\b(\d{2,3}[-/]\d{2,3})\b',  # 36-42, 38/44
                r'\b(beden|size|ölçü)[:\s]*(\d{2,3}[-/]\d{2,3})\b',
                r'\b(\d{2,3}[-/]\d{2,3})\s*(?:beden|size|ölçü)\b',
            ],
            'indicators': ['beden', 'size', 'ölçü', 'numara', 'num']
        }
        
        # Price patterns (from smart_price_extractor)
        self.price_patterns = {
            'currency_symbols': {
                'TL': r'\b(\d+)[,.]?\d*\s*TL\b',
                '₺': r'\b(\d+)[,.]?\d*\s*₺\b',
                'USD': r'\b(\d+)[,.]?\d*\s*USD\b',
                'EUR': r'\b(\d+)[,.]?\d*\s*EUR\b',
                '$': r'\b(\d+)[,.]?\d*\s*\$\b',
            },
            'keywords': ['fiyat', 'price', 'tutar', 'ücret', 'bedel'],
            'ranges': {
                'clothing': (20, 500),
                'shoes': (50, 800),
                'accessories': (10, 200),
                'default': (10, 1000),
            }
        }
        
        # Product type patterns
        self.product_type_patterns = {
            'clothing': [
                'blouse', 'pant', 'jean', 'shirt', 'dress', 'skirt', 'trouser',
                'jacket', 'coat', 'sweater', 'cardigan', 't-shirt', 'polo',
                'gömlek', 'pantolon', 'elbise', 'etek', 'ceket', 'mont',
                'kazak', 'hırka', 'tişört', 'polo', 'tulum'
            ],
            'shoes': [
                'shoe', 'boot', 'sandal', 'sneaker', 'heel', 'flat',
                'ayakkabı', 'bot', 'sandalet', 'spor ayakkabı', 'topuklu'
            ],
            'accessories': [
                'bag', 'belt', 'hat', 'scarf', 'gloves', 'watch',
                'çanta', 'kemer', 'şapka', 'atkı', 'eldiven', 'saat'
            ],
            'jewelry': [
                'ring', 'necklace', 'bracelet', 'earring', 'pendant',
                'yüzük', 'kolye', 'bilezik', 'küpe', 'kolye ucu'
            ]
        }
        
        # Material patterns
        self.material_patterns = {
            'materials': [
                'cotton', 'polyester', 'wool', 'silk', 'leather', 'denim',
                'linen', 'cashmere', 'viscose', 'rayon', 'nylon', 'spandex',
                'pamuk', 'polyester', 'yün', 'ipek', 'deri', 'kot',
                'keten', 'kaşmir', 'viskon', 'rayon', 'naylon', 'spandeks'
            ],
            'patterns': [
                r'\b(%\s*\d+)\s*([A-Za-z]+)\b',  # 100% Cotton
                r'\b([A-Za-z]+)\s*(%\s*\d+)\b',  # Cotton 100%
            ]
        }
        
        # Season patterns
        self.season_patterns = {
            'seasons': ['f/w', 's/s', 'a/w', 'fw', 'ss', 'aw', 'fall/winter', 'spring/summer'],
            'patterns': [
                r'\b(f/w|s/s|a/w|fw|ss|aw)\b',
                r'\b(fall/winter|spring/summer|autumn/winter)\b',
            ]
        }
        
        # Barcode patterns
        self.barcode_patterns = {
            'patterns': [
                r'\b(\d{8,13})\b',  # EAN-8, EAN-13
                r'\b(\d{12,14})\b',  # UPC-A, UPC-E
            ]
        }
        
        # Country patterns
        self.country_patterns = {
            'countries': [
                'turkey', 'türkiye', 'china', 'çin', 'italy', 'italya',
                'france', 'fransa', 'germany', 'almanya', 'spain', 'ispanya'
            ],
            'patterns': [
                r'\b(made in|üretim|origin)[:\s]*([A-Za-z]+)\b',
                r'\b([A-Za-z]+)\s*(?:made|üretim|origin)\b',
            ]
        }
        
        # Care instructions patterns
        self.care_patterns = {
            'symbols': ['●', '○', '■', '□', '▲', '△'],
            'keywords': ['wash', 'dry', 'iron', 'bleach', 'yıkama', 'kurutma', 'ütüleme'],
            'patterns': [
                r'\b(wash|dry|iron|bleach)[:\s]*([A-Za-z\s,]+)\b',
                r'\b(yıkama|kurutma|ütüleme)[:\s]*([A-Za-z\s,]+)\b',
            ]
        }
        
        # Composition patterns
        self.composition_patterns = {
            'patterns': [
                r'\b(\d+%\s*[A-Za-z]+(?:\s*,\s*\d+%\s*[A-Za-z]+)*)\b',
                r'\b(composition|bileşim|içerik)[:\s]*([A-Za-z0-9%,\s]+)\b',
            ]
        }
    
    async def extract_all_fields(self, text: str, product_type: str = 'default') -> LabelInfo:
        """Extract all possible fields from label text - DYNAMIC based on brand"""
        try:
            from services.brand_label_patterns import brand_label_pattern_service
            
            logger.info(f"[SMART LABEL] Extracting all fields from {product_type} product")
            
            # CRITICAL FIX: Handle double labels (2 labels on same image)
            # Strategy: Prioritize the FIRST/TOP label (usually first 10-15 lines)
            # If not found, fallback to searching entire text
            priority_text = self._get_priority_label_text(text)
            logger.info(f"[SMART LABEL] Priority label text: {len(priority_text)} chars (original: {len(text)} chars)")
            
            # STEP 1: Extract brand first (always needed)
            brand = await self._extract_brand(priority_text)
            if not brand:
                # Fallback to full text if not found in priority text
                brand = await self._extract_brand(text)
            logger.info(f"[SMART LABEL] Detected brand: {brand}")
            
            # STEP 2: Get brand pattern to know what to extract
            pattern = brand_label_pattern_service.get_pattern_for_brand(brand)
            logger.info(f"[SMART LABEL] Using pattern: {pattern.brand_name}, Required fields: {pattern.required_fields}")
            
            # STEP 3: Extract only fields that exist for this brand (prioritize first label)
            product_code = await self._extract_product_code(priority_text) if pattern.has_product_code else None
            if not product_code:
                product_code = await self._extract_product_code(text) if pattern.has_product_code else None
                
            color = await self._extract_color(priority_text) if pattern.has_color else None
            if not color:
                color = await self._extract_color(text) if pattern.has_color else None
                
            size_range = await self._extract_size_range(priority_text) if pattern.has_size_range else None
            if not size_range:
                size_range = await self._extract_size_range(text) if pattern.has_size_range else None
                
            price = await self._extract_price(priority_text, product_type) if pattern.has_price else None
            if not price:
                price = await self._extract_price(text, product_type) if pattern.has_price else None
                
            product_type_detected = await self._extract_product_type(priority_text) if pattern.has_product_type else None
            if not product_type_detected:
                product_type_detected = await self._extract_product_type(text) if pattern.has_product_type else None
                
            material = await self._extract_material(priority_text) if pattern.has_material else None
            if not material:
                material = await self._extract_material(text) if pattern.has_material else None
                
            season = await self._extract_season(priority_text) if pattern.has_season else None
            if not season:
                season = await self._extract_season(text) if pattern.has_season else None
                
            barcode = await self._extract_barcode(priority_text) if pattern.has_barcode else None
            if not barcode:
                barcode = await self._extract_barcode(text) if pattern.has_barcode else None
                
            country = await self._extract_country(priority_text)  # Always try
            if not country:
                country = await self._extract_country(text)
                
            care_instructions = await self._extract_care_instructions(priority_text)  # Always try
            if not care_instructions:
                care_instructions = await self._extract_care_instructions(text)
                
            composition = await self._extract_composition(priority_text)  # Always try
            if not composition:
                composition = await self._extract_composition(text)
            
            # Calculate overall confidence
            fields = [brand, product_code, color, size_range, price, product_type_detected, material, season, barcode, country, care_instructions, composition]
            non_none_fields = [f for f in fields if f is not None]
            confidence = len(non_none_fields) / len(fields) if fields else 0.0
            
            # Determine missing fields based on brand pattern
            missing_fields = []
            
            # Check only required fields for this brand
            if 'brand' in pattern.required_fields and not brand:
                missing_fields.append('brand')
            if 'product_code' in pattern.required_fields and not product_code:
                missing_fields.append('product_code')
            if 'color' in pattern.required_fields and not color:
                missing_fields.append('color')
            if 'size_range' in pattern.required_fields and not size_range:
                missing_fields.append('size_range')
            if 'price' in pattern.required_fields and not price:
                missing_fields.append('price')
            if 'product_type' in pattern.required_fields and not product_type_detected:
                missing_fields.append('product_type')
            
            logger.info(f"[SMART LABEL] Missing fields for {brand}: {missing_fields}")
            
            return LabelInfo(
                brand=brand,
                product_code=product_code,
                color=color,
                size_range=size_range,
                price=price,
                product_type=product_type_detected,
                material=material,
                season=season,
                barcode=barcode,
                country=country,
                care_instructions=care_instructions,
                composition=composition,
                confidence=confidence,
                missing_fields=missing_fields,
                raw_text=text
            )
            
        except Exception as e:
            logger.error(f"[SMART LABEL] Error extracting fields: {e}")
            return LabelInfo(raw_text=text, confidence=0.0)
    
    def _get_priority_label_text(self, text: str) -> str:
        """
        Extract priority label text (top/first label when there are 2 labels)
        Strategy: Take first 10-15 lines as priority text
        """
        try:
            lines = text.split('\n')
            
            # If text is short (single label), return as-is
            if len(lines) <= 15:
                return text
            
            # Take first 10-15 lines as priority (top label)
            # This usually contains brand, code, color, size, price
            priority_lines = lines[:12]
            priority_text = '\n'.join(priority_lines)
            
            # Ensure we have at least the essential info
            # If priority text is too short, extend it
            if len(priority_text) < 100:
                priority_lines = lines[:20]
                priority_text = '\n'.join(priority_lines)
            
            return priority_text
            
        except Exception as e:
            logger.error(f"[PRIORITY LABEL] Error: {e}")
            return text  # Fallback to full text
    
    async def _extract_brand(self, text: str) -> Optional[str]:
        """Extract brand information - ONLY from actual OCR text, NO fallbacks"""
        try:
            # UNICODE FIX: Encode safely for Windows console
            safe_text = text[:100].encode('ascii', 'ignore').decode('ascii')
            logger.info(f"[BRAND] Analyzing text: {safe_text}...")
            
            # Clean text for analysis
            text_clean = text.replace('\n', ' ').replace('\r', ' ').replace('  ', ' ').strip()
            words = text.split()
            
            # PRIORITY METHOD 1: Look for DZAYN/DIZAYN BRANDS FIRST
            if 'dzayn' in text_clean.lower() or 'dizayn' in text_clean.lower():
                logger.info(f"[BRAND] Found DZAYN/DIZAYN in text, returning DZAYN BRANDS")
                return 'DZAYN BRANDS'
            
            # Check for "BRANDS" keyword - likely DZAYN BRANDS
            if 'brands' in text_clean.lower() and ('vita' in text_clean.lower() or 'vv' in text_clean.lower()):
                logger.info(f"[BRAND] Found BRANDS keyword with VITA/VV, returning DZAYN BRANDS")
                return 'DZAYN BRANDS'
            
            # Look for brand indicators in the actual text
            brand_indicators = ['brands', 'brand', 'marka', 'firma', 'company']
            
            # Method 2: Look for brand + indicator pattern
            for i, word in enumerate(words):
                word_clean = word.strip('.,!?;:').upper()
                
                # Skip very short words, numbers, and common non-brand words
                if (len(word_clean) >= 3 and 
                    not word_clean.isdigit() and 
                    word_clean not in ['SIZE', 'COLOR', 'PRICE', 'CODE', 'MODEL', 'TYPE', 'MADE', 'IN', 'VITA', 'V']):
                    
                    # Check if this word is followed by a brand indicator
                    if i + 1 < len(words):
                        next_word = words[i + 1].lower()
                        if any(indicator in next_word for indicator in brand_indicators):
                            # Double check - if BRANDS is there, it's likely DZAYN BRANDS
                            if 'brands' in next_word.lower():
                                logger.info(f"[BRAND] Found BRANDS indicator, returning DZAYN BRANDS")
                                return 'DZAYN BRANDS'
                            logger.info(f"[BRAND] Found brand with indicator: {word_clean}")
                            return word_clean
            
            # Method 3: Look for known brand patterns in the actual text
            for brand in self.brand_patterns['common_brands']:
                if brand.lower() in text_clean.lower():
                    # Find the actual word in the original text
                    for word in words:
                        if word.lower() == brand.lower():
                            logger.info(f"[BRAND] Found known brand in OCR: {word}")
                            return word.upper()
            
            # Method 4: Look for brand indicators with regex
            for indicator in self.brand_patterns['indicators']:
                pattern = rf'{re.escape(indicator)}[:\s]*([A-Za-z\s&]+)'
                match = re.search(pattern, text.lower())
                if match:
                    brand = match.group(1).strip().title()
                    logger.info(f"[BRAND] Found with indicator '{indicator}': {brand}")
                    return brand
            
            # If nothing found, return None - DO NOT GUESS!
            logger.info(f"[BRAND] No brand found in text")
            return None
            
        except Exception as e:
            logger.error(f"[BRAND] Error: {e}")
            return None
    
    async def _extract_product_code(self, text: str) -> Optional[str]:
        """Extract product code"""
        try:
            # Method 1: Look for code indicators
            for indicator in self.product_code_patterns['indicators']:
                pattern = rf'{re.escape(indicator)}[:\s]*([A-Za-z0-9\-]+)'
                match = re.search(pattern, text.lower())
                if match:
                    code = match.group(1).strip().upper()
                    logger.info(f"[CODE] Found with indicator '{indicator}': {code}")
                    return code
            
            # Method 2: Look for code patterns
            for pattern in self.product_code_patterns['patterns']:
                match = re.search(pattern, text)
                if match:
                    code = match.group(1).strip().upper()
                    logger.info(f"[CODE] Found with pattern: {code}")
                    return code
            
            return None
            
        except Exception as e:
            logger.error(f"[CODE] Error: {e}")
            return None
    
    async def _extract_color(self, text: str) -> Optional[str]:
        """Extract color information - Enhanced with Turkish color support"""
        try:
            # Method 1: Look for common colors FIRST (more reliable than patterns)
            # This prevents partial matches like "Si" from "SIYAH"
            text_lower = text.lower()
            text_normalized = text_lower.replace('ı', 'i').replace('İ', 'i')
            
            for color in self.color_patterns['common_colors']:
                color_normalized = color.lower().replace('ı', 'i').replace('İ', 'i')
                
                # Look for whole word match to avoid partial matches
                import re
                # Use word boundary for exact match
                if re.search(r'\b' + re.escape(color_normalized) + r'\b', text_normalized):
                    logger.info(f"[COLOR] Found common color: {color}")
                    # Return proper capitalization
                    if color.lower() in ['siyah', 'syah']:
                        return 'Black'
                    elif color.lower() in ['beyaz']:
                        return 'White'
                    elif color.lower() in ['kahverengi', 'kahve']:
                        return 'Brown'
                    elif color.lower() == 'camel':
                        return 'Camel'
                    else:
                        return color.title()
            
            # Method 2: Look for color indicators (if common colors didn't match)
            for pattern in self.color_patterns['patterns']:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    color = match.group(2) if len(match.groups()) > 1 else match.group(1)
                    color = color.strip().title()
                    logger.info(f"[COLOR] Found with pattern: {color}")
                    return color
            
            return None
            
        except Exception as e:
            logger.error(f"[COLOR] Error: {e}")
            return None
    
    async def _extract_size_range(self, text: str) -> Optional[str]:
        """Extract size range"""
        try:
            # Method 1: Look for size indicators
            for indicator in self.size_patterns['indicators']:
                pattern = rf'{re.escape(indicator)}[:\s]*(\d{{2,3}}[-/]\d{{2,3}})'
                match = re.search(pattern, text.lower())
                if match:
                    size = match.group(1).strip()
                    logger.info(f"[SIZE] Found with indicator '{indicator}': {size}")
                    return size
            
            # Method 2: Look for size patterns
            for pattern in self.size_patterns['patterns']:
                match = re.search(pattern, text)
                if match:
                    size = match.group(1) if len(match.groups()) > 1 else match.group(1)
                    size = size.strip()
                    logger.info(f"[SIZE] Found with pattern: {size}")
                    return size
            
            return None
            
        except Exception as e:
            logger.error(f"[SIZE] Error: {e}")
            return None
    
    async def _extract_price(self, text: str, product_type: str) -> Optional[str]:
        """Extract price using smart price extractor"""
        try:
            from services.smart_price_extractor import smart_price_extractor
            price = await smart_price_extractor.extract_price(text, product_type)
            return price if price != "Eksik" else None
        except Exception as e:
            logger.error(f"[PRICE] Error: {e}")
            return None
    
    async def _extract_product_type(self, text: str) -> Optional[str]:
        """Extract product type directly from OCR text - AI-based dynamic extraction"""
        try:
            text_lower = text.lower()
            
            # Look for product type indicators in the text
            # Common patterns that indicate product type (PRIORITY ORDER - specific first!)
            product_type_indicators = [
                # Turkish product types (highest priority)
                'takim', 'takım', 'tulum', 'pantolon', 'jean', 'şalvar',
                'gömlek', 'tişört', 'polo', 'bluz', 'tunik',
                'elbise', 'etek', 'etekli',
                'ceket', 'mont', 'kaban', 'blazer',
                'kazak', 'hırka', 'pullover', 'yelek',
                'şort', 'tayt', 'body',
                # English product types
                'suit', 'set', 'jumpsuit', 'trouser', 'pant', 
                'shirt', 'blouse', 't-shirt', 
                'dress', 'skirt',
                'jacket', 'coat',
                'sweater', 'cardigan', 'vest',
                'shorts', 'leggings',
                # Accessories
                'ayakkabı', 'shoe', 'boot', 'sandal', 'sneaker', 'sandalet',
                'çanta', 'bag', 'kemer', 'belt', 'şapka', 'hat', 'beret',
                'yüzük', 'ring', 'kolye', 'necklace', 'bilezik', 'bracelet', 'küpe', 'earring',
                'saat', 'watch', 'gözlük', 'glasses', 'sunglasses'
            ]
            
            # Find the first product type indicator in the text
            for indicator in product_type_indicators:
                if indicator in text_lower:
                    # Return the original text (capitalized) as found in OCR
                    # Find the actual word in the original text
                    words = text.split()
                    for word in words:
                        if word.lower().replace('ı', 'i').replace('İ', 'i') == indicator.replace('ı', 'i'):
                            logger.info(f"[TYPE] Found product type: {word}")
                            return word.upper()  # Return as TAKIM, TULUM, PANTOLON, etc.
            
            # If no specific indicator found, try to extract any word that looks like a product type
            # But SKIP brand-related words and common non-product words
            words = text.split()
            skip_words = [
                'BRANDS', 'BRAND', 'MARKA', 'FİRMA', 'COMPANY', 'COLLECTION', 'LINE',
                'SIZE', 'COLOR', 'PRICE', 'CODE', 'MODEL', 'RENK', 'BEDEN', 'FİYAT',
                'DZAYN', 'DIZAYN', 'DZYN', 'ANNAVERO', 'KOKART', 'LILIUM', 'MY8',
                'VITA', 'VIEN', 'QUALITY', 'MADE', 'TURKEY', 'TRK', 'UNDER', 'GUARANTEE',
                'WWW', 'COM', 'MOB', 'TEL', 'PHONE', 'EMAIL'
            ]
            
            for word in words:
                word_clean = word.strip('.,!?;:').upper()
                # Skip very short words, numbers, and common non-product words
                if (len(word_clean) >= 3 and 
                    not word_clean.isdigit() and 
                    word_clean not in skip_words and
                    not any(skip in word_clean for skip in skip_words)):
                    logger.info(f"[TYPE] Extracted potential product type: {word_clean}")
                    return word_clean
            
            return None
            
        except Exception as e:
            logger.error(f"[TYPE] Error: {e}")
            return None
    
    async def _extract_material(self, text: str) -> Optional[str]:
        """Extract material information"""
        try:
            # Method 1: Look for material patterns
            for pattern in self.material_patterns['patterns']:
                match = re.search(pattern, text)
                if match:
                    material = match.group(2) if len(match.groups()) > 1 else match.group(1)
                    material = material.strip().title()
                    logger.info(f"[MATERIAL] Found with pattern: {material}")
                    return material
            
            # Method 2: Look for common materials
            text_lower = text.lower()
            for material in self.material_patterns['materials']:
                if material.lower() in text_lower:
                    logger.info(f"[MATERIAL] Found common material: {material}")
                    return material.title()
            
            return None
            
        except Exception as e:
            logger.error(f"[MATERIAL] Error: {e}")
            return None
    
    async def _extract_season(self, text: str) -> Optional[str]:
        """Extract season information"""
        try:
            # Look for season patterns
            for pattern in self.season_patterns['patterns']:
                match = re.search(pattern, text.lower())
                if match:
                    season = match.group(1).strip().upper()
                    logger.info(f"[SEASON] Found: {season}")
                    return season
            
            return None
            
        except Exception as e:
            logger.error(f"[SEASON] Error: {e}")
            return None
    
    async def _extract_barcode(self, text: str) -> Optional[str]:
        """Extract barcode"""
        try:
            for pattern in self.barcode_patterns['patterns']:
                match = re.search(pattern, text)
                if match:
                    barcode = match.group(1).strip()
                    if len(barcode) >= 8:  # Valid barcode length
                        logger.info(f"[BARCODE] Found: {barcode}")
                        return barcode
            
            return None
            
        except Exception as e:
            logger.error(f"[BARCODE] Error: {e}")
            return None
    
    async def _extract_country(self, text: str) -> Optional[str]:
        """Extract country information"""
        try:
            # Method 1: Look for country patterns
            for pattern in self.country_patterns['patterns']:
                match = re.search(pattern, text.lower())
                if match:
                    country = match.group(2) if len(match.groups()) > 1 else match.group(1)
                    country = country.strip().title()
                    logger.info(f"[COUNTRY] Found with pattern: {country}")
                    return country
            
            # Method 2: Look for common countries
            text_lower = text.lower()
            for country in self.country_patterns['countries']:
                if country.lower() in text_lower:
                    logger.info(f"[COUNTRY] Found common country: {country}")
                    return country.title()
            
            return None
            
        except Exception as e:
            logger.error(f"[COUNTRY] Error: {e}")
            return None
    
    async def _extract_care_instructions(self, text: str) -> Optional[str]:
        """Extract care instructions"""
        try:
            # Look for care patterns
            for pattern in self.care_patterns['patterns']:
                match = re.search(pattern, text.lower())
                if match:
                    care = match.group(2) if len(match.groups()) > 1 else match.group(1)
                    care = care.strip()
                    logger.info(f"[CARE] Found: {care}")
                    return care
            
            return None
            
        except Exception as e:
            logger.error(f"[CARE] Error: {e}")
            return None
    
    async def _extract_composition(self, text: str) -> Optional[str]:
        """Extract composition information"""
        try:
            for pattern in self.composition_patterns['patterns']:
                match = re.search(pattern, text)
                if match:
                    composition = match.group(2) if len(match.groups()) > 1 else match.group(1)
                    composition = composition.strip()
                    logger.info(f"[COMPOSITION] Found: {composition}")
                    return composition
            
            return None
            
        except Exception as e:
            logger.error(f"[COMPOSITION] Error: {e}")
            return None

# Global instance
smart_label_extractor = SmartLabelExtractor()
