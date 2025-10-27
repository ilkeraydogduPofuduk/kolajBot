"""
Unified OCR Service
Tüm OCR işlemleri tek yerden yönetilir
"""

import asyncio
import tempfile
import os
from typing import List, Dict, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from core.services import BaseService
from core.config import settings
from core.logging import get_logger, log_performance_metric
from core.exceptions import ExternalServiceError, ValidationError

logger = get_logger('unified_ocr')

@dataclass
class OCRResult:
    """OCR result data class"""
    text: str
    confidence: float
    language: str
    processing_time: float
    method: str
    metadata: Dict[str, Any]

@dataclass
class ProductInfo:
    """Product information extracted from OCR"""
    product_code: Optional[str] = None
    color: Optional[str] = None
    brand_name: Optional[str] = None
    product_type: Optional[str] = None  # TULUM, GÖMLEK, PANTOLON, etc.
    size: Optional[str] = None
    material: Optional[str] = None
    price: Optional[str] = None
    barcode: Optional[str] = None
    confidence: float = 0.0
    raw_text: str = ""

class UnifiedOCRService(BaseService):
    """Unified OCR service combining multiple OCR providers"""
    
    def __init__(self):
        super().__init__()
        self.google_ai_service = None
        self.parallel_workers = settings.ocr.parallel_workers
        self.timeout = settings.ocr.timeout
        self.retry_count = settings.ocr.retry_count
        self.executor = ThreadPoolExecutor(max_workers=self.parallel_workers)
        
        # AI-powered dynamic detection - no static lists needed!
        # The system will learn and adapt to new brands, colors, and product types automatically
    
    async def initialize(self) -> bool:
        """Initialize OCR service"""
        try:
            # Initialize Google AI Vision API
            if settings.ocr.google_ai_api_key:
                from services.google_ai_ocr_service import GoogleAIOCRService
                self.google_ai_service = GoogleAIOCRService()
                logger.info("Google AI Vision API initialized")
            else:
                raise ValueError("Google AI API key not found in database settings")
            
            logger.info(f"Unified OCR Service initialized with {self.parallel_workers} workers")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize OCR service: {e}")
            return False
    
    async def cleanup(self) -> bool:
        """Cleanup OCR service"""
        try:
            if self.executor:
                self.executor.shutdown(wait=True)
            logger.info("Unified OCR Service cleaned up")
            return True
        except Exception as e:
            logger.error(f"Failed to cleanup OCR service: {e}")
            return False
    
    async def process_image(self, image_path: str) -> OCRResult:
        """Process single image with OCR"""
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Try Google AI Vision API first (if available)
            if self.google_ai_service:
                try:
                    result = await self._process_with_google_ai(image_path)
                    if result and result.confidence > 0.7:
                        return result
                except Exception as e:
                    logger.warning(f"Google AI OCR failed, using filename parsing: {e}")
            
            # Fallback to filename parsing
            result = await self._process_with_filename(image_path)
            
            processing_time = asyncio.get_event_loop().time() - start_time
            log_performance_metric('ocr_single_image', processing_time)
            
            return result
            
        except Exception as e:
            logger.error(f"OCR processing failed for {image_path}: {e}")
            raise ExternalServiceError(f"OCR processing failed: {str(e)}")
    
    async def process_images_batch(self, image_paths: List[str]) -> List[OCRResult]:
        """Process multiple images in parallel"""
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Process images in parallel
            tasks = [self.process_image(path) for path in image_paths]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter out exceptions
            valid_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"OCR failed for {image_paths[i]}: {result}")
                    # Create fallback result
                    fallback_result = await self._process_with_filename(image_paths[i])
                    valid_results.append(fallback_result)
                else:
                    valid_results.append(result)
            
            processing_time = asyncio.get_event_loop().time() - start_time
            log_performance_metric('ocr_batch_images', processing_time, details={
                'image_count': len(image_paths),
                'success_count': len(valid_results)
            })
            
            return valid_results
            
        except Exception as e:
            logger.error(f"Batch OCR processing failed: {e}")
            raise ExternalServiceError(f"Batch OCR processing failed: {str(e)}")
    
    async def extract_product_info(self, ocr_result: OCRResult) -> ProductInfo:
        """Extract product information from OCR result using smart label extractor"""
        try:
            # Use original text (not lowercased) for extraction
            text = ocr_result.text
            
            # Log raw OCR text for debugging (sanitize for Windows console)
            safe_text = text[:200] if len(text) > 200 else text
            safe_text = safe_text.encode('ascii', 'ignore').decode('ascii')
            logger.info(f"[OCR RAW TEXT] Length: {len(text)}, Text: {safe_text}")
            
            # Use smart label extractor for comprehensive extraction
            try:
                # Determine product type first
                product_type = self._determine_product_type(text)
                
                # Extract all fields using smart label extractor
                from services.smart_label_extractor import smart_label_extractor
                label_info = await smart_label_extractor.extract_all_fields(text, product_type)
                
                # Safely encode for logging
                safe_brand = label_info.brand.encode('ascii', 'ignore').decode('ascii') if label_info.brand else 'N/A'
                safe_type = label_info.product_type.encode('ascii', 'ignore').decode('ascii') if label_info.product_type else 'N/A'
                
                logger.info(f"[SMART OCR EXTRACTED] code={label_info.product_code}, color={label_info.color}, brand={safe_brand}, type={safe_type}, size={label_info.size_range}, price={label_info.price}")
                logger.info(f"[SMART OCR MISSING] {label_info.missing_fields}")
                logger.info(f"[SMART OCR CONFIDENCE] {label_info.confidence:.2f}")
                logger.debug(f"[OCR DEBUG] Raw text lines: {text.split(chr(10))[:10]}")  # First 10 lines
                
                return ProductInfo(
                    product_code=label_info.product_code,
                    color=label_info.color,
                    brand_name=label_info.brand,
                    product_type=label_info.product_type,
                    size=label_info.size_range,
                    material=label_info.material,
                    price=label_info.price,
                    barcode=label_info.barcode,
                    confidence=label_info.confidence,
                    raw_text=label_info.raw_text
                )
                
            except Exception as smart_error:
                logger.error(f"Smart label extraction failed: {smart_error}")
                # Fallback to simple extraction
                return await self._extract_product_info_simple(ocr_result)
            
        except Exception as e:
            logger.error(f"Product info extraction failed: {e}")
            return ProductInfo(raw_text=ocr_result.text, confidence=0.0)
    
    async def _extract_product_info_simple(self, ocr_result: OCRResult) -> ProductInfo:
        """Simple fallback product info extraction"""
        try:
            text = ocr_result.text
            
            # Extract product code
            product_code = self._extract_product_code(text)
            
            # Extract color
            color = self._extract_color(text)
            
            # Extract brand
            brand_name = self._extract_brand(text)
            
            # Extract product type
            product_type = self._extract_product_type(text)
            
            # Extract size
            size = self._extract_size(text)
            
            # Extract price
            price = self._extract_price_simple(text)
            
            # Safely encode for logging
            safe_brand = brand_name.encode('ascii', 'ignore').decode('ascii') if brand_name else 'N/A'
            safe_type = product_type.encode('ascii', 'ignore').decode('ascii') if product_type else 'N/A'
            logger.info(f"[SIMPLE OCR EXTRACTED] code={product_code}, color={color}, brand={safe_brand}, type={safe_type}, size={size}, price={price}")
            
            return ProductInfo(
                product_code=product_code,
                color=color,
                brand_name=brand_name,
                product_type=product_type,
                size=size,
                material=None,
                price=price,
                barcode=None,
                confidence=ocr_result.confidence,
                raw_text=ocr_result.text
            )
            
        except Exception as e:
            logger.error(f"Simple product info extraction failed: {e}")
            return ProductInfo(raw_text=ocr_result.text, confidence=0.0)
    
    async def _process_with_google_ai(self, image_path: str) -> Optional[OCRResult]:
        """Process image with Google AI Vision API"""
        try:
            if not self.google_ai_service:
                return None
            
            import time
            start_time = time.time()
            
            # Google AI service is synchronous, so we run it in executor
            loop = asyncio.get_event_loop()
            text = await loop.run_in_executor(
                self.executor,
                self.google_ai_service.extract_text_from_image,
                image_path
            )
            
            processing_time = time.time() - start_time
            
            if text:
                return OCRResult(
                    text=text,
                    confidence=0.9,  # Google AI typically has high confidence
                    language='tr',
                    processing_time=processing_time,
                    method='google_ai',
                    metadata={'raw_text': text}
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Google AI OCR failed: {e}")
            return None
    
    async def _process_with_filename(self, image_path: str) -> OCRResult:
        """Process image by parsing filename"""
        try:
            filename = os.path.basename(image_path)
            start_time = asyncio.get_event_loop().time()
            
            print(f"[OCR DEBUG] Processing filename: {filename}")
            logger.info(f"Processing filename: {filename}")
            
            # Extract information from filename
            product_code = self._extract_product_code(filename)
            color = self._extract_color(filename)
            brand_name = self._extract_brand(filename)
            product_type = self._extract_product_type(filename)
            size = self._extract_size(filename)
            price = self._extract_price(filename)
            
            print(f"[OCR DEBUG] Extracted - code: {product_code}, color: {color}, brand: {brand_name}, type: {product_type}, size: {size}, price: {price}")
            logger.info(f"From filename - code: {product_code}, color: {color}, brand: {brand_name}, type: {product_type}, size: {size}, price: {price}")
            
            # Create synthetic text with all extracted information
            synthetic_text = f"{brand_name or ''} {product_code or ''} {color or ''} {product_type or ''} {size or ''} {price or ''}".strip()
            
            logger.info(f"Synthetic text: '{synthetic_text}'")
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            return OCRResult(
                text=synthetic_text,
                confidence=0.6,  # Lower confidence for filename parsing
                language='tr',
                processing_time=processing_time,
                method='filename_parsing',
                metadata={'filename': filename}
            )
            
        except Exception as e:
            logger.error(f"Filename parsing failed: {e}")
            return OCRResult(
                text="",
                confidence=0.0,
                language='tr',
                processing_time=0.0,
                method='filename_parsing',
                metadata={'error': str(e)}
            )
    
    def _extract_product_code(self, text: str) -> Optional[str]:
        """Extract product code from text - Enhanced with better patterns"""
        import re
        
        # Enhanced product code patterns (case-insensitive) - Priority order
        patterns = [
            # Most specific patterns first
            # VV-6124-B gibi tire ile devam eden kodlar (ÖNCE BU!)
            r'\b([A-Za-z]{2,4}-\d{3,6}-[A-Za-z])\b',
            # VV-6124 B gibi boşlukla devam eden kodlar
            r'\b([A-Za-z]{2,4}-\d{3,6}\s+[A-Za-z])\b',
            # SNL-11026, VV-6124 gibi standart formatlar (suffix yok)
            r'\b([A-Za-z]{2,4}-\d{3,6})\b',
            # LL-2E626-B gibi E içeren kodlar (alphanumeric mix)
            r'\b[A-Za-z]{2,4}-[A-Za-z0-9]{3,6}(?:-[A-Za-z])?\b',
            # CM2932, ABC123456 gibi kodlar (tire olmadan)
            r'\b[A-Za-z]{2,4}\d{3,6}\b',
            # LL2E626 gibi alphanumeric mix (tire olmadan)
            r'\b[A-Za-z]{2,4}\d{1,2}[A-Za-z]\d{3,6}\b',
            # 2932B, 123456ABC gibi kodlar
            r'\b\d{4,6}[A-Za-z]{1,3}\b',
            # 12345678 gibi sayısal kodlar (son çare)
            r'\b\d{6,8}\b',
        ]
        
        # Try each pattern and return the first valid match
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                # Take the first match and clean it
                code = matches[0].upper()
                
                # Clean and standardize the code
                code = self._clean_product_code(code)
                
                # Validate the code
                if self._validate_product_code(code):
                    logger.info(f"[PRODUCT CODE] Extracted: {code} from text")
                    return code
        
        # If no pattern matches, try manual extraction
        manual_code = self._manual_product_code_extraction(text)
        if manual_code:
            logger.info(f"[PRODUCT CODE] Manual extraction: {manual_code}")
            return manual_code
        
        logger.warning(f"[PRODUCT CODE] No valid code found in text: {text[:100]}...")
        return None
    
    def _clean_product_code(self, code: str) -> str:
        """Clean and standardize product code format"""
        import re
        
        # Remove extra spaces and normalize
        code = re.sub(r'\s+', '', code.strip())
        
        # VV-6124 B formatını VV-6124-B'ye çevir (boşluk → tire)
        code = re.sub(r'([A-Z]{2,4}-\d{3,6})([A-Z])$', r'\1-\2', code)
        
        # VV-6124B formatını VV-6124-B'ye çevir (harf → tire+harf)
        code = re.sub(r'([A-Z]{2,4}-\d{3,6})([A-Z])$', r'\1-\2', code)
        
        # Remove invalid characters
        code = re.sub(r'[^A-Z0-9\-]', '', code)
        
        return code
    
    def _validate_product_code(self, code: str) -> bool:
        """Validate if the extracted code looks like a real product code"""
        import re
        
        # Must be at least 4 characters
        if len(code) < 4:
            return False
        
        # Must contain at least one letter and one number
        if not re.search(r'[A-Z]', code) or not re.search(r'\d', code):
            return False
        
        # Must not be all numbers (too generic)
        if re.match(r'^\d+$', code):
            return False
        
        # Must not be all letters (too generic)
        if re.match(r'^[A-Z]+$', code):
            return False
        
        return True
    
    def _manual_product_code_extraction(self, text: str) -> Optional[str]:
        """Manual extraction for edge cases"""
        import re
        
        # Look for patterns that might be missed by regex
        words = text.split()
        
        for word in words:
            word = word.strip('.,!?()[]{}')
            
            # Check if word looks like a product code
            if len(word) >= 4 and len(word) <= 15:
                # Must have both letters and numbers
                if re.search(r'[A-Za-z]', word) and re.search(r'\d', word):
                    # Must not be a common word
                    common_words = ['SIZE', 'COLOR', 'TYPE', 'BRAND', 'MODEL', 'STYLE']
                    if word.upper() not in common_words:
                        cleaned = self._clean_product_code(word.upper())
                        if self._validate_product_code(cleaned):
                            return cleaned
        
        return None
    
    def _extract_color(self, text: str) -> Optional[str]:
        """Extract color from text - simple approach"""
        try:
            import re
            
            # Common colors in Turkish and English
            colors = [
                'BLACK', 'WHITE', 'RED', 'BLUE', 'GREEN', 'YELLOW', 'PINK', 'PURPLE', 'ORANGE', 'BROWN', 'GRAY', 'GREY',
                'NAVY', 'MAROON', 'CREAM', 'BEIGE', 'BURGUNDY', 'VIOLET', 'AMBER', 'CHOCOLATE', 'SILVER', 'GOLD',
                'SIYAH', 'BEYAZ', 'KIRMIZI', 'MAVI', 'YESIL', 'SARI', 'PEMBE', 'MOR', 'TURUNCU', 'KAHVERENGI', 'GRI',
                'LACIVERT', 'BORDO', 'KREM', 'BEJ', 'VİZON', 'EKRU', 'TAŞ', 'DAMSON', 'BONE', 'LEOPAR'
            ]
            
            text_upper = text.upper()
            for color in colors:
                if color in text_upper:
                    logger.info(f"[COLOR] Found: {color}")
                    return color.title()
            
            # Pattern-based extraction for filename formats
            filename_patterns = [
                r'[A-Z0-9-]+\s+[A-Z]\s+([A-Z\s]+?)(?:\s|$|\.)',  # CODE B COLOR
                r'[A-Z0-9-]+\s+([A-Z\s]+?)(?:\s|$|\.)',         # CODE COLOR
            ]
            
            for pattern in filename_patterns:
                matches = re.findall(pattern, text.upper())
                for match in matches:
                    color = match.strip()
                    if len(color) >= 3 and not re.search(r'\d', color):
                        skip_words = ['BRANDS', 'BRAND', 'MADE', 'TURKEY', 'QUALITY', 'PRODUCT', 'UNDER', 'GUARANTEE']
                        if not any(word in color for word in skip_words) and color != 'B':
                            logger.info(f"[COLOR] Found via pattern: {color}")
                            return color.title()
            
            # If no color found, return "Eksik"
            logger.info("[COLOR] No color found, returning 'Eksik'")
            return "Eksik"
            
        except Exception as e:
            logger.error(f"[COLOR] Error: {e}")
            return "Eksik"
    
    
    def _extract_brand(self, text: str) -> Optional[str]:
        """Extract brand from text - simple approach"""
        try:
            import re
            
            # Look for brand indicators
            # FIRST PASS: Look for lines with brand indicators (highest priority)
            lines = text.split('\n')
            brand_indicators = ['BRANDS', 'BRAND', 'COLLECTION', 'COMPANY', 'CORP', 'LTD', 'INC']
            
            for line in lines:
                line = line.strip()
                if not line or len(line) < 3:
                    continue
                
                # Priority 1: Lines containing brand indicators
                if any(indicator in line.upper() for indicator in brand_indicators):
                    # Clean the brand name
                    brand = line.strip().title()
                    # Special case: "DZAYN BRANDS" or "DIZAYN BRANDS"
                    if 'DZAYN' in line.upper() or 'DIZAYN' in line.upper():
                        brand = "Dizayn Brands"
                    safe_brand = brand.encode('ascii', 'ignore').decode('ascii')
                    logger.info(f"[BRAND] Found with indicator: {safe_brand}")
                    return brand
            
            # SECOND PASS: Look for standalone brand names (lower priority)
            for line in lines:
                line = line.strip()
                if not line or len(line) < 3:
                    continue
                
                # Skip lines with numbers (codes, dates)
                if re.search(r'\d', line):
                    continue
                
                # Skip single letters or very short words
                if len(line) <= 2:
                    continue
                
                # If line looks like a brand name (reasonable length, no numbers)
                if 4 <= len(line) <= 30 and not re.search(r'\d', line):
                    # Skip common non-brand words and product names
                    skip_words = ['VITA', 'VIEN', 'QUALITY', 'MATERIALS', 'LATEST', 'TECHNOLOGY', 
                                 'TRADEMARK', 'PRODUCT', 'UNDER', 'GUARANTEE', 'MADE', 'TURKEY',
                                 'TULUM', 'BLUZ', 'ETEK', 'PANTOLON', 'ELBISE', 'CEKET']
                    if not any(word in line.upper() for word in skip_words):
                        brand = line.strip().title()
                        safe_brand = brand.encode('ascii', 'ignore').decode('ascii')
                        logger.info(f"[BRAND] Found standalone: {safe_brand}")
                        return brand
            
            # If no brand found, return "Eksik"
            logger.info("[BRAND] No brand found, returning 'Eksik'")
            return "Eksik"
            
        except Exception as e:
            logger.error(f"[BRAND] Error: {e}")
            return "Eksik"
    
    
    def _extract_product_type(self, text: str) -> Optional[str]:
        """Extract product type from text - simple approach"""
        try:
            # Simple approach: look for clothing/product type words
            import re
            
            # Common product types in Turkish and English
            product_types = [
                'TULUM', 'GÖMLEK', 'PANTOLON', 'ETEK', 'CEKET', 'MONT', 'KABAN',
                'ELBİSE', 'KAZAK', 'HIRKA', 'YELEK', 'ŞORT', 'TAYT', 'BODY',
                'TİŞÖRT', 'POLO', 'SWEATSHIRT', 'HOODIE', 'BLUZ', 'TUNIK',
                'JUMPSUIT', 'SHIRT', 'PANTS', 'TROUSERS', 'SKIRT', 'JACKET', 'COAT',
                'DRESS', 'SWEATER', 'CARDIGAN', 'VEST', 'SHORTS', 'LEGGINGS',
                'T-SHIRT', 'BLOUSE', 'TUNIC', 'JEANS', 'DENIM'
            ]
            
            text_upper = text.upper()
            for product_type in product_types:
                if product_type in text_upper:
                    logger.info(f"[PRODUCT TYPE] Found: {product_type}")
                    return product_type
            
            # If no product type found, return "Eksik"
            logger.info("[PRODUCT TYPE] No product type found, returning 'Eksik'")
            return "Eksik"
            
        except Exception as e:
            logger.error(f"[PRODUCT TYPE] Error: {e}")
            return "Eksik"
    
    
    def _extract_size(self, text: str) -> Optional[str]:
        """Extract size or size range from text - simple approach"""
        try:
            import re
            
            # Size patterns - order matters (check ranges first)
            patterns = [
                r'\b(\d{2,3})\s*-\s*(\d{2,3})\b',  # Size range: 36-40, 42-46
                r'\b(XS|S|M|L|XL|XXL|XXXL)\b',      # Letter sizes
                r'\b\d{2,3}\s*cm\b',                 # With cm
                r'\b\d{2,3}\s*inch\b',               # With inch
                r'\b\d{2,3}\b',                      # Single numeric size: 36, 42
            ]
            
            for pattern in patterns:
                match = re.search(pattern, text.upper())
                if match:
                    # If it's a range pattern (first one), format it nicely
                    if '-' in pattern:
                        size = f"{match.group(1)}-{match.group(2)}"
                        logger.info(f"[SIZE] Found range: {size}")
                        return size
                    size = match.group()
                    logger.info(f"[SIZE] Found: {size}")
                    return size
            
            # If no size found, return "Eksik"
            logger.info("[SIZE] No size found, returning 'Eksik'")
            return "Eksik"
            
        except Exception as e:
            logger.error(f"[SIZE] Error: {e}")
            return "Eksik"
    
    def _extract_material(self, text: str) -> Optional[str]:
        """Extract material from text"""
        materials = [
            'cotton', 'polyester', 'wool', 'silk', 'leather', 'denim',
            'pamuk', 'polyester', 'yün', 'ipek', 'deri', 'kot'
        ]
        
        for material in materials:
            if material.lower() in text.lower():
                return material.title()
        
        return None
    
    def _extract_price(self, text: str) -> Optional[str]:
        """Extract price using smart, modular approach"""
        try:
            # Import the smart price extractor
            from services.smart_price_extractor import smart_price_extractor
            
            # Determine product type from text (simple heuristic)
            product_type = self._determine_product_type(text)
            
            # Check if there's already a running event loop
            try:
                loop = asyncio.get_running_loop()
                # If we're already in an async context, we can't use run_until_complete
                # Fall back to simple extraction
                logger.warning(f"[PRICE] Already in async context, using simple extraction")
                return self._extract_price_simple(text)
            except RuntimeError:
                # No running loop, we can create a new one
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    price = loop.run_until_complete(
                        smart_price_extractor.extract_price(text, product_type)
                    )
                    return price
                finally:
                    loop.close()
            
        except Exception as e:
            logger.error(f"[PRICE] Error with smart extractor: {e}")
            # Fallback to simple extraction
            return self._extract_price_simple(text)
    
    def _determine_product_type(self, text: str) -> str:
        """Determine product type from text for better price extraction"""
        text_lower = text.lower()
        
        # Clothing keywords
        clothing_keywords = ['blouse', 'pant', 'jean', 'shirt', 'dress', 'skirt', 'trouser', 'gömlek', 'pantolon', 'elbise', 'etek']
        if any(keyword in text_lower for keyword in clothing_keywords):
            return 'clothing'
        
        # Shoe keywords
        shoe_keywords = ['shoe', 'boot', 'sandal', 'sneaker', 'ayakkabı', 'bot', 'sandalet', 'spor ayakkabı']
        if any(keyword in text_lower for keyword in shoe_keywords):
            return 'shoes'
        
        # Accessory keywords
        accessory_keywords = ['bag', 'belt', 'hat', 'scarf', 'çanta', 'kemer', 'şapka', 'atkı', 'aksesuar']
        if any(keyword in text_lower for keyword in accessory_keywords):
            return 'accessories'
        
        # Jewelry keywords
        jewelry_keywords = ['ring', 'necklace', 'bracelet', 'earring', 'yüzük', 'kolye', 'bilezik', 'küpe', 'mücevher']
        if any(keyword in text_lower for keyword in jewelry_keywords):
            return 'jewelry'
        
        return 'default'
    
    def _extract_price_simple(self, text: str) -> Optional[str]:
        """Simple fallback price extraction"""
        try:
            import re
            
            # Look for price with currency symbols
            currency_patterns = [
                r'\b(\d+)[,.]?\d*\s*TL\b',
                r'\b(\d+)[,.]?\d*\s*₺\b',
                r'\b(\d+)[,.]?\d*\s*USD\b',
                r'\b(\d+)[,.]?\d*\s*EUR\b',
                r'\b(\d+)[,.]?\d*\s*\$\b',
            ]
            
            for pattern in currency_patterns:
                match = re.search(pattern, text.upper())
                if match:
                    price = match.group(1)
                    if 10 <= int(price) <= 999:
                        logger.info(f"[PRICE SIMPLE] Found with currency: {price}")
                        return price
            
            # Look for price keywords
            price_keywords = ['fiyat', 'price', 'tutar', 'ücret']
            for keyword in price_keywords:
                if keyword in text.lower():
                    numbers = re.findall(r'\b(\d{2,3})\b', text)
                    for num in numbers:
                        if 10 <= int(num) <= 999:
                            logger.info(f"[PRICE SIMPLE] Found with keyword '{keyword}': {num}")
                            return num
            
            return "Eksik"
            
        except Exception as e:
            logger.error(f"[PRICE SIMPLE] Error: {e}")
            return "Eksik"
    
    
    def _extract_barcode(self, text: str) -> Optional[str]:
        """Extract barcode from text"""
        import re
        
        # Barcode patterns
        patterns = [
            r'\b\d{8,13}\b',  # EAN-8, EAN-13
            r'\b\d{12,14}\b', # UPC-A, UPC-E
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                barcode = match.group()
                if len(barcode) >= 8:  # Valid barcode length
                    return barcode
        
        return None

# Global OCR service instance
unified_ocr_service = UnifiedOCRService()
