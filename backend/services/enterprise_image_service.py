"""
Enterprise Image Service
High-performance image handling with CDN, caching, and optimization
"""

import os
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from fastapi import HTTPException
from fastapi.responses import FileResponse
from PIL import Image
import io
import redis
import json
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class EnterpriseImageService:
    """
    Enterprise-level image service
    - Image optimization and resizing
    - CDN integration
    - Intelligent caching
    - Thumbnail generation
    - Progressive loading
    """
    
    def __init__(self):
        try:
            self.redis_client = redis.from_url("redis://localhost:6379")
            self.cache_enabled = True
        except:
            self.redis_client = None
            self.cache_enabled = False
            logger.warning("Redis not available, image caching disabled")
        
        # Image optimization settings
        self.thumbnail_sizes = {
            'xs': (50, 50),
            'sm': (150, 150),
            'md': (300, 300),
            'lg': (600, 600),
            'xl': (1200, 1200)
        }
        
        # Quality settings
        self.quality_settings = {
            'thumbnail': 85,
            'web': 90,
            'print': 95
        }
    
    def _generate_image_cache_key(self, file_path: str, size: str, quality: str) -> str:
        """Generate cache key for image"""
        key_data = f"{file_path}:{size}:{quality}"
        return f"image:{hashlib.md5(key_data.encode()).hexdigest()}"
    
    def _get_image_from_cache(self, cache_key: str) -> Optional[bytes]:
        """Get image from cache"""
        if not self.cache_enabled:
            return None
        
        try:
            cached = self.redis_client.get(cache_key)
            if cached:
                return cached
        except Exception as e:
            logger.error(f"Image cache get error: {e}")
        
        return None
    
    def _set_image_cache(self, cache_key: str, image_data: bytes, ttl: int = 3600):
        """Set image in cache"""
        if not self.cache_enabled:
            return
        
        try:
            self.redis_client.setex(cache_key, ttl, image_data)
        except Exception as e:
            logger.error(f"Image cache set error: {e}")
    
    def optimize_image(
        self,
        image_path: str,
        size: str = 'md',
        quality: str = 'web',
        format: str = 'JPEG'
    ) -> bytes:
        """
        Optimize image with specified size and quality
        """
        if not os.path.exists(image_path):
            raise HTTPException(status_code=404, detail="Image not found")
        
        # Generate cache key
        cache_key = self._generate_image_cache_key(image_path, size, quality)
        
        # Try cache first
        cached_image = self._get_image_from_cache(cache_key)
        if cached_image:
            logger.debug(f"Image cache HIT: {image_path} {size}")
            return cached_image
        
        logger.debug(f"Image cache MISS: {image_path} {size}")
        
        try:
            # Open image
            with Image.open(image_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # Get target size
                target_size = self.thumbnail_sizes.get(size, (300, 300))
                
                # Calculate resize dimensions maintaining aspect ratio
                img_ratio = img.width / img.height
                target_ratio = target_size[0] / target_size[1]
                
                if img_ratio > target_ratio:
                    # Image is wider, fit to width
                    new_width = target_size[0]
                    new_height = int(target_size[0] / img_ratio)
                else:
                    # Image is taller, fit to height
                    new_height = target_size[1]
                    new_width = int(target_size[1] * img_ratio)
                
                # Resize image
                resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Get quality setting
                quality_value = self.quality_settings.get(quality, 90)
                
                # Save to bytes
                output = io.BytesIO()
                resized_img.save(output, format=format, quality=quality_value, optimize=True)
                image_data = output.getvalue()
                
                # Cache the result
                self._set_image_cache(cache_key, image_data, ttl=3600)
                
                return image_data
                
        except Exception as e:
            logger.error(f"Image optimization error: {e}")
            raise HTTPException(status_code=500, detail=f"Image optimization failed: {str(e)}")
    
    def generate_thumbnail(
        self,
        image_path: str,
        size: str = 'sm'
    ) -> bytes:
        """
        Generate thumbnail for image
        """
        return self.optimize_image(image_path, size=size, quality='thumbnail')
    
    def get_image_url(
        self,
        file_path: str,
        size: str = 'md',
        quality: str = 'web'
    ) -> str:
        """
        Get optimized image URL
        """
        # Clean file path
        clean_path = file_path.replace('\\', '/').lstrip('/')
        
        # Generate URL with optimization parameters
        base_url = os.getenv('CDN_URL', 'http://localhost:8005')
        return f"{base_url}/api/images/optimized/{clean_path}?size={size}&quality={quality}"
    
    def get_thumbnail_url(self, file_path: str, size: str = 'sm') -> str:
        """
        Get thumbnail URL
        """
        return self.get_image_url(file_path, size=size, quality='thumbnail')
    
    def batch_optimize_images(
        self,
        image_paths: List[str],
        sizes: List[str] = ['sm', 'md', 'lg']
    ) -> Dict[str, Dict[str, bytes]]:
        """
        Batch optimize multiple images
        """
        results = {}
        
        for image_path in image_paths:
            if not os.path.exists(image_path):
                continue
            
            results[image_path] = {}
            
            for size in sizes:
                try:
                    optimized = self.optimize_image(image_path, size=size)
                    results[image_path][size] = optimized
                except Exception as e:
                    logger.error(f"Batch optimization error for {image_path}: {e}")
                    results[image_path][size] = None
        
        return results
    
    def validate_image_file(self, file_path: str) -> bool:
        """
        Validate image file
        """
        if not os.path.exists(file_path):
            return False
        
        try:
            with Image.open(file_path) as img:
                img.verify()
            return True
        except Exception:
            return False
    
    def get_image_metadata(self, file_path: str) -> Dict[str, Any]:
        """
        Get image metadata
        """
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Image not found")
        
        try:
            with Image.open(file_path) as img:
                file_size = os.path.getsize(file_path)
                
                return {
                    "width": img.width,
                    "height": img.height,
                    "format": img.format,
                    "mode": img.mode,
                    "file_size": file_size,
                    "file_size_mb": round(file_size / (1024 * 1024), 2),
                    "aspect_ratio": round(img.width / img.height, 2)
                }
        except Exception as e:
            logger.error(f"Image metadata error: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to get image metadata: {str(e)}")
    
    def create_progressive_image(
        self,
        image_path: str,
        quality_steps: List[int] = [10, 30, 60, 90]
    ) -> List[bytes]:
        """
        Create progressive JPEG with multiple quality steps
        """
        if not os.path.exists(image_path):
            raise HTTPException(status_code=404, detail="Image not found")
        
        try:
            with Image.open(image_path) as img:
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                progressive_images = []
                
                for quality in quality_steps:
                    output = io.BytesIO()
                    img.save(output, format='JPEG', quality=quality, progressive=True, optimize=True)
                    progressive_images.append(output.getvalue())
                
                return progressive_images
                
        except Exception as e:
            logger.error(f"Progressive image creation error: {e}")
            raise HTTPException(status_code=500, detail=f"Progressive image creation failed: {str(e)}")
    
    def invalidate_image_cache(self, file_path: str):
        """
        Invalidate cache for specific image
        """
        if not self.cache_enabled:
            return
        
        try:
            # Generate pattern for all sizes and qualities
            pattern = f"image:{hashlib.md5(file_path.encode()).hexdigest()[:8]}*"
            keys = self.redis_client.keys(pattern)
            
            if keys:
                self.redis_client.delete(*keys)
                logger.info(f"Invalidated {len(keys)} image cache entries for: {file_path}")
        except Exception as e:
            logger.error(f"Image cache invalidation error: {e}")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get image cache statistics
        """
        if not self.cache_enabled:
            return {"enabled": False}
        
        try:
            info = self.redis_client.info()
            return {
                "enabled": True,
                "used_memory": info.get("used_memory_human", "N/A"),
                "connected_clients": info.get("connected_clients", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "total_commands_processed": info.get("total_commands_processed", 0)
            }
        except Exception as e:
            return {"enabled": True, "error": str(e)}

# Global instance
enterprise_image_service = EnterpriseImageService()
