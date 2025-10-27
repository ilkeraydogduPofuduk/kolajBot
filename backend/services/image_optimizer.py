"""
Image Optimizer Service
Büyük görselleri optimize eder - thumbnail ve compressed versiyonlar oluşturur
"""

from PIL import Image, ImageOps
import os
from typing import Tuple, Optional
from core.logging import get_logger

logger = get_logger('image_optimizer')

class ImageOptimizer:
    """Görsel optimizasyon servisi"""
    
    def __init__(self):
        # Boyut limitleri
        self.max_width = 1920  # Full boyut max genişlik
        self.max_height = 2560  # Full boyut max yükseklik
        self.thumb_size = (300, 400)  # Thumbnail boyutu (liste görünümü için)
        self.quality_full = 85  # Full görsel kalitesi
        self.quality_thumb = 75  # Thumbnail kalitesi
    
    def optimize_image(self, input_path: str, output_dir: str, filename: str) -> dict:
        """
        Görseli optimize et ve farklı boyutlar oluştur
        Returns: {
            'full': path,  # Optimize edilmiş full boyut
            'thumbnail': path,  # Küçük önizleme
            'original_size': bytes,
            'optimized_size': bytes,
            'thumbnail_size': bytes,
            'compression_ratio': float
        }
        """
        try:
            # Orijinal dosya boyutu
            original_size = os.path.getsize(input_path)
            
            # Görseli aç
            img = Image.open(input_path)
            
            # EXIF rotation düzelt (Pillow 9.1.0+ uyumlu)
            try:
                img = ImageOps.exif_transpose(img)
            except AttributeError:
                # Eski Pillow versiyonları için fallback
                try:
                    img = ImageOps.exorient(img)
                except AttributeError:
                    pass  # EXIF rotation yok
            
            # RGB'ye çevir (RGBA, CMYK vs için)
            if img.mode in ('RGBA', 'LA', 'P'):
                # Transparency varsa beyaz arka plan ekle
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # 1. FULL BOYUT OPTIMIZE (max 1920x2560)
            img_full = img.copy()
            if img_full.width > self.max_width or img_full.height > self.max_height:
                img_full.thumbnail((self.max_width, self.max_height), Image.Resampling.LANCZOS)
            
            full_path = os.path.join(output_dir, filename)
            img_full.save(full_path, 'JPEG', quality=self.quality_full, optimize=True)
            optimized_size = os.path.getsize(full_path)
            
            # 2. THUMBNAIL (300x400)
            img_thumb = img.copy()
            img_thumb.thumbnail(self.thumb_size, Image.Resampling.LANCZOS)
            
            thumb_filename = f"thumb_{filename}"
            thumb_path = os.path.join(output_dir, thumb_filename)
            img_thumb.save(thumb_path, 'JPEG', quality=self.quality_thumb, optimize=True)
            thumb_size = os.path.getsize(thumb_path)
            
            compression_ratio = (1 - optimized_size / original_size) * 100 if original_size > 0 else 0
            
            logger.info(f"[OPTIMIZE] {filename}: {original_size/1024:.1f}KB -> {optimized_size/1024:.1f}KB ({compression_ratio:.1f}% reduction)")
            
            return {
                'full': full_path,
                'thumbnail': thumb_path,
                'original_size': original_size,
                'optimized_size': optimized_size,
                'thumbnail_size': thumb_size,
                'compression_ratio': compression_ratio,
                'dimensions': {
                    'full': (img_full.width, img_full.height),
                    'thumbnail': (img_thumb.width, img_thumb.height)
                }
            }
            
        except Exception as e:
            logger.error(f"[OPTIMIZE ERROR] {filename}: {e}")
            # Fallback: Orijinal dosyayı kopyala
            import shutil
            full_path = os.path.join(output_dir, filename)
            shutil.copy2(input_path, full_path)
            return {
                'full': full_path,
                'thumbnail': None,
                'original_size': original_size,
                'optimized_size': original_size,
                'thumbnail_size': 0,
                'compression_ratio': 0,
                'error': str(e)
            }
    
    def create_thumbnail_only(self, input_path: str, size: Tuple[int, int] = None) -> Optional[Image.Image]:
        """Sadece thumbnail oluştur (bellekte)"""
        try:
            img = Image.open(input_path)
            try:
                img = ImageOps.exif_transpose(img)
            except AttributeError:
                try:
                    img = ImageOps.exorient(img)
                except AttributeError:
                    pass
            
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            thumb_size = size or self.thumb_size
            img.thumbnail(thumb_size, Image.Resampling.LANCZOS)
            
            return img
            
        except Exception as e:
            logger.error(f"[THUMB ERROR] {input_path}: {e}")
            return None
    
    def get_image_info(self, image_path: str) -> dict:
        """Görsel hakkında bilgi al"""
        try:
            img = Image.open(image_path)
            file_size = os.path.getsize(image_path)
            
            return {
                'width': img.width,
                'height': img.height,
                'mode': img.mode,
                'format': img.format,
                'size_bytes': file_size,
                'size_mb': file_size / (1024 * 1024),
                'megapixels': (img.width * img.height) / 1000000
            }
        except Exception as e:
            logger.error(f"[INFO ERROR] {image_path}: {e}")
            return {}

# Global instance
image_optimizer = ImageOptimizer()

