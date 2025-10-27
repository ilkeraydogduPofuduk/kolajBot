"""
Product Helpers - Modüler Yapı
Yardımcı fonksiyonlar ve utility'ler
"""

import re
import os
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.product import Product
from models.brand import Brand
from services.unified_ocr_service import UnifiedOCRService
from core.logging import get_logger

logger = get_logger('product_helpers')

class ProductHelpers:
    """Helper functions for product operations"""
    
    def __init__(self):
        self.ocr_service = UnifiedOCRService()
    
    def find_existing_product(self, db: Session, code: str, color: str, brand_id: int) -> Optional[Product]:
        """Enhanced duplicate product detection with fuzzy matching"""
        
        # Handle None values gracefully
        if not code or not color:
            logger.info(f"[DUPLICATE CHECK] No existing product found for: {code} - {color} (missing code or color)")
            return None
        
        # Exact match first
        exact_match = db.query(Product).filter(
            Product.code == code,
            Product.color == color,
            Product.brand_id == brand_id,
            Product.is_active == True
        ).first()
        
        if exact_match:
            logger.info(f"[DUPLICATE CHECK] Exact match found: {code} - {color} (ID: {exact_match.id})")
            return exact_match
        
        # Fuzzy matching for similar products
        fuzzy_match = db.query(Product).filter(
            func.lower(Product.code) == code.lower(),
            func.lower(Product.color) == color.lower(),
            Product.brand_id == brand_id,
            Product.is_active == True
        ).first()
        
        if fuzzy_match:
            logger.info(f"[DUPLICATE CHECK] Fuzzy match found: {fuzzy_match.code} - {fuzzy_match.color} (ID: {fuzzy_match.id})")
            return fuzzy_match
        
        # Check for products with similar codes (typo detection) - exact matching only
        # Disable fuzzy matching to prevent wrong product associations
        similar_products = []
        
        for similar in similar_products:
            # Check if colors are similar
            if self.are_colors_similar(color, similar.color):
                logger.info(f"[DUPLICATE CHECK] Similar product found: {similar.code} - {similar.color} (ID: {similar.id})")
                return similar
        
        logger.info(f"[DUPLICATE CHECK] No existing product found for: {code} - {color}")
        return None
    
    def are_colors_similar(self, color1: str, color2: str) -> bool:
        """Check if two colors are similar (for typo detection)"""
        if not color1 or not color2:
            return False
        
        color1_clean = color1.lower().strip()
        color2_clean = color2.lower().strip()
        
        # Exact match
        if color1_clean == color2_clean:
            return True
        
        # Common color variations
        color_variations = {
            'black': ['blk', 'bk', 'blac'],
            'white': ['wht', 'wh', 'whit'],
            'brown': ['brn', 'br', 'brwn'],
            'blue': ['blu', 'bl'],
            'red': ['rd'],
            'green': ['grn', 'gr'],
            'gray': ['grey', 'gry', 'gr'],
            'beige': ['bej', 'beige'],
            'vison': ['vison', 'visn', 'vison'],
        }
        
        for base_color, variations in color_variations.items():
            if (color1_clean == base_color and color2_clean in variations) or \
               (color2_clean == base_color and color1_clean in variations):
                return True
        
        # Check for partial matches (for typos)
        if len(color1_clean) >= 3 and len(color2_clean) >= 3:
            # Check if one is contained in the other
            if color1_clean in color2_clean or color2_clean in color1_clean:
                return True
            
            # Check for character differences (max 2 chars difference)
            if abs(len(color1_clean) - len(color2_clean)) <= 2:
                # Simple Levenshtein distance check
                if self.levenshtein_distance(color1_clean, color2_clean) <= 2:
                    return True
        
        return False
    
    def levenshtein_distance(self, s1: str, s2: str) -> int:
        """Calculate Levenshtein distance between two strings"""
        if len(s1) < len(s2):
            return self.levenshtein_distance(s2, s1)
        
        if len(s2) == 0:
            return len(s1)
        
        previous_row = list(range(len(s2) + 1))
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row
        
        return previous_row[-1]
    
    def is_safe_filename(self, filename: str) -> bool:
        """Check if filename is safe from security threats"""
        if not filename or len(filename) > 255:
            return False
        
        # Check for path traversal attempts
        dangerous_patterns = [
            r'\.\./',  # ../ 
            r'\.\.\\',  # ..\
            r'/',       # Forward slash
            r'\\',      # Backslash
            r'<',       # Less than
            r'>',       # Greater than
            r':',       # Colon
            r'"',       # Double quote
            r'\|',      # Pipe
            r'\?',      # Question mark
            r'\*',      # Asterisk
            r'\x00',    # Null byte
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, filename):
                return False
        
        # Check for control characters
        if any(ord(c) < 32 or ord(c) > 126 for c in filename):
            return False
        
        # Check for reserved names (Windows)
        reserved_names = [
            'CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        ]
        
        name_without_ext = filename.split('.')[0].upper()
        if name_without_ext in reserved_names:
            return False
        
        return True
    
    def sanitize_path_component(self, component: str) -> str:
        """Sanitize a path component for safe directory/file names"""
        if not component:
            return "unknown"
        
        # Remove dangerous characters
        sanitized = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', component)
        
        # Remove leading/trailing dots and spaces
        sanitized = sanitized.strip('. ')
        
        # Limit length
        sanitized = sanitized[:50]
        
        # Ensure it's not empty after sanitization
        if not sanitized:
            return "unknown"
        
        return sanitized
    
    def is_safe_path(self, path: str) -> bool:
        """Check if path is safe from directory traversal attacks"""
        try:
            # Get absolute path
            abs_path = os.path.abspath(path)
            
            # Check if path contains any dangerous patterns
            dangerous_patterns = ['..', '~', '$', '`']
            for pattern in dangerous_patterns:
                if pattern in abs_path:
                    return False
            
            # Check if path is within expected directory structure
            expected_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            if not abs_path.startswith(expected_root):
                return False
            
            return True
            
        except Exception:
            return False
    
    def extract_from_filename(self, filename: str) -> tuple:
        """Enhanced filename extraction with better error handling and security"""
        try:
            # Security: Validate filename
            if not self.is_safe_filename(filename):
                logger.warning(f"[SECURITY] Unsafe filename detected: {filename}")
                return None, None, None, None
            
            # Clean filename - remove extension and normalize
            clean_filename = filename.split('.')[0].strip()
            
            # Additional security: Remove path traversal attempts
            clean_filename = os.path.basename(clean_filename)
            
            # Check for dual product patterns
            dual_patterns = [
                r'([A-Z0-9-]+\s+[A-Z\s]+?)\s*-\s*([A-Z0-9-]+\s+[A-Z\s]+?)$',  # "LL-2Z27 B BLACK - LL-2V28 B BLACK"
                r'([A-Z0-9-]+)\s*-\s*([A-Z0-9-]+)',  # "KY-557 - SNL-11026 BROWN"
                r'(.+?)\s*&\s*(.+?)$',  # "VV-6124 BLACK & VV-2590 BLACK"
                r'(.+?)\s*\+\s*(.+?)$', # "VV-6124 BLACK + VV-2590 BLACK"
            ]
            
            dual_product_info = None
            is_dual = False
            
            for pattern in dual_patterns:
                match = re.search(pattern, clean_filename)
                if match:
                    part1, part2 = match.groups()
                    if len(part1.strip()) > 3 and len(part2.strip()) > 3:
                        is_dual = True
                        break
            
            if is_dual:
                # Extract dual product information
                parts = re.split(r'\s*[-&+]\s*', clean_filename)
                if len(parts) >= 2:
                    # First product
                    part1 = parts[0].strip()
                    code1 = self.ocr_service._extract_product_code(part1)
                    color1 = self.ocr_service._extract_color(part1)
                    
                    # Second product
                    part2 = parts[1].strip()
                    code2 = self.ocr_service._extract_product_code(part2)
                    color2 = self.ocr_service._extract_color(part2)
                    
                    logger.info(f"[DUAL PRODUCT] Product 1: {code1} {color1}")
                    logger.info(f"[DUAL PRODUCT] Product 2: {code2} {color2}")
                    
                    # Use first product as main
                    main_code = code1
                    main_color = color1
                    
                    # Store both product info for dual products
                    dual_product_info = {
                        'code_1': code1,
                        'color_1': color1,
                        'code_2': code2,
                        'color_2': color2
                    }
                else:
                    # Fallback to single product
                    main_code = self.ocr_service._extract_product_code(clean_filename)
                    main_color = self.ocr_service._extract_color(clean_filename)
                    dual_product_info = None
            else:
                # Single product extraction
                main_code = self.ocr_service._extract_product_code(clean_filename)
                main_color = self.ocr_service._extract_color(clean_filename)
                dual_product_info = None
            
            # Extract brand (from full filename)
            main_brand = self.ocr_service._extract_brand(filename)
            
            # Validate extracted data
            if not main_code:
                logger.warning(f"[FILENAME] No product code found in: {filename}")
            if not main_color:
                logger.warning(f"[FILENAME] No color found in: {filename}")
            if not main_brand:
                logger.warning(f"[FILENAME] No brand found in: {filename}")
            
            return main_code, main_color, main_brand, dual_product_info
            
        except Exception as e:
            logger.error(f"[FILENAME EXTRACT] Error parsing filename '{filename}': {e}")
            # Fallback to basic extraction
            try:
                basic_code = self.ocr_service._extract_product_code(filename)
                basic_color = self.ocr_service._extract_color(filename)
                basic_brand = self.ocr_service._extract_brand(filename)
                return basic_code, basic_color, basic_brand, None
            except:
                return None, None, None, None
    
    def determine_template_category(self, analysis: dict) -> str:
        """Ürün analizine göre şablon kategorisini belirle"""
        brand_name = analysis.get('brand_name', '').lower()
        product_type = analysis.get('product_type', '').lower()
        price = analysis.get('price', 0)
        
        # Lüks markalar
        luxury_brands = ['gucci', 'prada', 'versace', 'dior', 'chanel', 'louis vuitton']
        if any(brand in brand_name for brand in luxury_brands) or price > 500:
            return 'luxury'
        
        # Minimalist tasarım
        if product_type in ['basic', 'minimal', 'casual'] or price < 100:
            return 'minimal'
        
        # Modern tasarım
        if product_type in ['modern', 'contemporary', 'trendy']:
            return 'modern'
        
        # Vintage tasarım
        if product_type in ['vintage', 'retro', 'classic']:
            return 'vintage'
        
        # Kurumsal tasarım
        if product_type in ['business', 'formal', 'corporate']:
            return 'corporate'
        
        return 'modern'  # Varsayılan
    
    def generate_template_config(self, analysis: dict, category: str) -> dict:
        """Kategoriye göre şablon konfigürasyonu oluştur"""
        configs = {
            'luxury': {
                'layout': 'grid_2x2',
                'background_color': '#000000',
                'text_color': '#FFFFFF',
                'text_background_color': '#000000',
                'font_size_large': 42,
                'font_size_medium': 28,
                'font_size_small': 20,
                'show_brand': True,
                'show_code': True,
                'show_color': True,
                'show_type': True,
                'show_price': True,
                'show_size': False,
                'text_position': 'bottom',
                'image_border_radius': 0,
                'image_spacing': 10
            },
            'minimal': {
                'layout': 'grid_2x2',
                'background_color': '#FFFFFF',
                'text_color': '#333333',
                'text_background_color': '#FFFFFF',
                'font_size_large': 32,
                'font_size_medium': 20,
                'font_size_small': 16,
                'show_brand': True,
                'show_code': False,
                'show_color': True,
                'show_type': False,
                'show_price': True,
                'show_size': False,
                'text_position': 'bottom',
                'image_border_radius': 20,
                'image_spacing': 20
            },
            'modern': {
                'layout': 'grid_2x2',
                'background_color': '#F8F9FA',
                'text_color': '#212529',
                'text_background_color': '#FFFFFF',
                'font_size_large': 36,
                'font_size_medium': 24,
                'font_size_small': 18,
                'show_brand': True,
                'show_code': True,
                'show_color': True,
                'show_type': True,
                'show_price': True,
                'show_size': True,
                'text_position': 'bottom',
                'image_border_radius': 15,
                'image_spacing': 15
            },
            'vintage': {
                'layout': 'grid_2x2',
                'background_color': '#F5F5DC',
                'text_color': '#8B4513',
                'text_background_color': '#F5F5DC',
                'font_size_large': 38,
                'font_size_medium': 26,
                'font_size_small': 20,
                'show_brand': True,
                'show_code': True,
                'show_color': True,
                'show_type': True,
                'show_price': True,
                'show_size': False,
                'text_position': 'bottom',
                'image_border_radius': 25,
                'image_spacing': 5
            },
            'corporate': {
                'layout': 'grid_2x2',
                'background_color': '#FFFFFF',
                'text_color': '#1E3A8A',
                'text_background_color': '#F1F5F9',
                'font_size_large': 34,
                'font_size_medium': 22,
                'font_size_small': 16,
                'show_brand': True,
                'show_code': True,
                'show_color': True,
                'show_type': True,
                'show_price': True,
                'show_size': True,
                'text_position': 'bottom',
                'image_border_radius': 5,
                'image_spacing': 10
            }
        }
        
        return configs.get(category, configs['modern'])
