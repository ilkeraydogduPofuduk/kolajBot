"""
Google AI OCR Service - Refactored for Modularity
Modern, hızlı ve doğru OCR çözümü
"""

import os
import base64
import json
import requests
from typing import Dict, List, Optional, Tuple
import logging
from PIL import Image
import io
import re
from core.logging import get_logger
from core.exceptions import BaseAppException

logger = get_logger('google_ai_ocr')

class GoogleAIOCRService:
    """Google AI Vision API ile OCR işlemleri"""
    
    def __init__(self):
        from core.config import settings
        self.api_key = settings.google_ai.api_key
        self.api_url = "https://vision.googleapis.com/v1/images:annotate"
        
        if not self.api_key:
            raise ValueError("GOOGLE_AI_API_KEY not found in database settings")
        
        self.ocr_cache = {}
    
    def _encode_image(self, image_path: str) -> str:
        """Resmi base64 formatına çevir"""
        try:
            with open(image_path, 'rb') as image_file:
                return base64.b64encode(image_file.read()).decode('utf-8')
        except Exception as e:
            logger.error(f"Image encoding error: {e}")
            raise BaseAppException(f"Image encoding failed: {e}")
    
    def _preprocess_image(self, image_path: str) -> str:
        """Resmi OCR için optimize et"""
        try:
            image = Image.open(image_path)
            
            # Resize if too large
            max_size = (2048, 2048)
            if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Save processed image
            processed_path = image_path.replace('.', '_processed.')
            image.save(processed_path, 'JPEG', quality=85)
            
            return processed_path
        except Exception as e:
            logger.error(f"Image preprocessing error: {e}")
            return image_path
    
    def _call_google_vision_api(self, image_data: str) -> Dict:
        """Google Vision API'yi çağır"""
        if not self.api_key:
            raise BaseAppException("Google AI API key not configured")
            
        try:
            payload = {
                "requests": [
                    {
                        "image": {"content": image_data},
                        "features": [
                            {"type": "TEXT_DETECTION", "maxResults": 50},
                            {"type": "DOCUMENT_TEXT_DETECTION", "maxResults": 50}
                        ]
                    }
                ]
            }
            
            response = requests.post(
                f"{self.api_url}?key={self.api_key}",
                json=payload,
                timeout=30
            )
            
            if response.status_code != 200:
                raise BaseAppException(f"API call failed: {response.status_code}")
            
            return response.json()
        except Exception as e:
            logger.error(f"API call error: {e}")
            raise BaseAppException(f"API call failed: {e}")
    
    def _extract_text_from_response(self, response: Dict) -> str:
        """API yanıtından metin çıkar"""
        try:
            if 'responses' not in response or not response['responses']:
                return ""
            
            response_data = response['responses'][0]
            
            # DOCUMENT_TEXT_DETECTION öncelikli
            if 'fullTextAnnotation' in response_data:
                return response_data['fullTextAnnotation'].get('text', '')
            
            # TEXT_DETECTION fallback
            if 'textAnnotations' in response_data:
                annotations = response_data['textAnnotations']
                if annotations:
                    return annotations[0].get('description', '')
            
            return ""
        except Exception as e:
            logger.error(f"Text extraction error: {e}")
            return ""
    
    def _parse_product_info(self, text: str) -> Dict[str, str]:
        """OCR metninden ürün bilgilerini çıkar"""
        try:
            product_info = {
                'code': '',
                'color': '',
                'brand': '',
                'size': '',
                'material': ''
            }
            
            # Ürün kodu pattern'leri
            code_patterns = [
                r'[A-Z]{2,4}-?\d{3,6}',
                r'\d{4,6}[A-Z]{1,3}',
                r'[A-Z]\d{3,5}',
                r'[A-Z]{2,3}\d{2,4}'
            ]
            
            for pattern in code_patterns:
                match = re.search(pattern, text)
                if match:
                    product_info['code'] = match.group().strip()
                    break
            
            # Renk pattern'leri
            color_patterns = [
                r'\b(WHITE|BLACK|RED|BLUE|GREEN|YELLOW|PINK|PURPLE|ORANGE|BROWN|GRAY|GREY)\b',
                r'\b(BEYAZ|SIYAH|KIRMIZI|MAVI|YESIL|SARI|PEMBE|MOR|TURUNCU|KAHVERENGI|GRİ|GRI)\b',
                r'\b(DAMSON|NAVY|ROYAL|FOREST|LIME|CORAL|VIOLET|AMBER|CHOCOLATE|SILVER)\b'
            ]
            
            for pattern in color_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    product_info['color'] = match.group().strip().upper()
                    break
            
            # Marka pattern'leri
            brand_patterns = [
                r'\b(DIZAYN|DESIGN|BRAND|MARKA)\b',
                r'\b[A-Z]{3,}\s*BRANDS?\b',
                r'\b[A-Z]{2,}\s*DESIGN\b'
            ]
            
            for pattern in brand_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    product_info['brand'] = match.group().strip().upper()
                    break
            
            # Boyut pattern'leri
            size_patterns = [
                r'\b(XS|S|M|L|XL|XXL|XXXL)\b',
                r'\b(\d{2,3})\s*CM\b',
                r'\b(\d{1,2})\s*INCH\b'
            ]
            
            for pattern in size_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    product_info['size'] = match.group().strip().upper()
                    break
            
            return product_info
        except Exception as e:
            logger.error(f"Product info parsing error: {e}")
            return {'code': '', 'color': '', 'brand': '', 'size': '', 'material': ''}
    
    def extract_text_from_image(self, image_path: str) -> str:
        """Resimden metin çıkar"""
        try:
            # Cache kontrolü
            if image_path in self.ocr_cache:
                return self.ocr_cache[image_path]
            
            # Resmi işle
            processed_path = self._preprocess_image(image_path)
            
            # Base64 encode
            image_data = self._encode_image(processed_path)
            
            # API çağrısı
            response = self._call_google_vision_api(image_data)
            
            # Metin çıkar
            text = self._extract_text_from_response(response)
            
            # Cache'e kaydet
            self.ocr_cache[image_path] = text
            
            # Geçici dosyayı sil
            if processed_path != image_path and os.path.exists(processed_path):
                os.remove(processed_path)
            
            return text
        except Exception as e:
            logger.error(f"Text extraction error: {e}")
            raise BaseAppException(f"Text extraction failed: {e}")
    
    def extract_product_info(self, image_path: str) -> Dict[str, str]:
        """Resimden ürün bilgilerini çıkar"""
        try:
            text = self.extract_text_from_image(image_path)
            return self._parse_product_info(text)
        except Exception as e:
            logger.error(f"Product info extraction error: {e}")
            raise BaseAppException(f"Product info extraction failed: {e}")
    
    def batch_extract_text(self, image_paths: List[str]) -> List[str]:
        """Birden fazla resimden metin çıkar"""
        try:
            results = []
            for path in image_paths:
                try:
                    text = self.extract_text_from_image(path)
                    results.append(text)
                except Exception as e:
                    logger.error(f"Batch processing error for {path}: {e}")
                    results.append("")
            return results
        except Exception as e:
            logger.error(f"Batch extraction error: {e}")
            raise BaseAppException(f"Batch extraction failed: {e}")
    
    def get_cache_stats(self) -> Dict[str, int]:
        """Cache istatistiklerini al"""
        return {
            'cached_items': len(self.ocr_cache),
            'cache_hits': getattr(self, '_cache_hits', 0),
            'cache_misses': getattr(self, '_cache_misses', 0)
        }
    
    def clear_cache(self):
        """Cache'i temizle"""
        self.ocr_cache.clear()
        self._cache_hits = 0
        self._cache_misses = 0
