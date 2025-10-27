"""
Smart Collage Service - Performans Optimized
Lazy loading ve cache stratejileri ile hızlı kolaj yönetimi
"""

import os
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.product import Product, ProductImage
from models.user import User
from services.bunny_cdn_service import bunny_cdn_service
from core.logging import get_logger

logger = get_logger('smart_collage_service')

class SmartCollageService:
    """Akıllı kolaj servisi - performans odaklı"""
    
    def __init__(self):
        self.collage_queue = []  # Kolaj kuyruğu
        self.processing_products = set()  # İşlenmekte olan ürünler
        self.collage_cache = {}  # Kolaj cache'i
        logger.info("Smart Collage Service initialized")
    
    async def schedule_collage_creation(
        self, 
        product_id: int, 
        priority: str = "normal"
    ) -> bool:
        """
        Kolaj oluşturmayı kuyruğa ekle (lazy approach)
        priority: "immediate", "normal", "low"
        """
        try:
            if product_id in self.processing_products:
                logger.info(f"[SMART COLLAGE] Product {product_id} already in queue")
                return True
            
            # Kuyruğa ekle
            queue_item = {
                'product_id': product_id,
                'priority': priority,
                'scheduled_at': datetime.now(),
                'attempts': 0
            }
            
            # Öncelik sırasına göre ekle
            if priority == "immediate":
                self.collage_queue.insert(0, queue_item)
            else:
                self.collage_queue.append(queue_item)
            
            logger.info(f"[SMART COLLAGE] Scheduled product {product_id} with priority {priority}")
            return True
            
        except Exception as e:
            logger.error(f"[SMART COLLAGE] Error scheduling collage: {e}")
            return False
    
    async def process_collage_queue(self, db: Session, max_concurrent: int = 3):
        """
        Kolaj kuyruğunu işle - paralel ve akıllı
        """
        try:
            if not self.collage_queue:
                return
            
            # Maksimum eş zamanlı işlem sayısını kontrol et
            active_tasks = len(self.processing_products)
            if active_tasks >= max_concurrent:
                logger.info(f"[SMART COLLAGE] Max concurrent limit reached: {active_tasks}")
                return
            
            # İşlenecek öğeleri seç
            items_to_process = []
            for _ in range(min(max_concurrent - active_tasks, len(self.collage_queue))):
                if self.collage_queue:
                    item = self.collage_queue.pop(0)
                    items_to_process.append(item)
            
            if not items_to_process:
                return
            
            # Paralel işlem başlat
            tasks = []
            for item in items_to_process:
                self.processing_products.add(item['product_id'])
                task = asyncio.create_task(
                    self._process_single_collage(item, db)
                )
                tasks.append(task)
            
            # Tüm görevleri bekle
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Sonuçları işle
            for i, result in enumerate(results):
                product_id = items_to_process[i]['product_id']
                self.processing_products.discard(product_id)
                
                if isinstance(result, Exception):
                    logger.error(f"[SMART COLLAGE] Error processing {product_id}: {result}")
                    # Hatalı olanları tekrar kuyruğa ekle (max 3 deneme)
                    if items_to_process[i]['attempts'] < 3:
                        items_to_process[i]['attempts'] += 1
                        self.collage_queue.append(items_to_process[i])
                else:
                    logger.info(f"[SMART COLLAGE] Successfully processed {product_id}")
            
        except Exception as e:
            logger.error(f"[SMART COLLAGE] Queue processing error: {e}")
    
    async def _process_single_collage(self, queue_item: Dict[str, Any], db: Session):
        """Tek kolaj işlemi"""
        try:
            product_id = queue_item['product_id']
            
            # Ürün bilgilerini al
            product = db.query(Product).filter(
                Product.id == product_id,
                Product.is_active == True
            ).first()
            
            if not product:
                logger.warning(f"[SMART COLLAGE] Product not found: {product_id}")
                return
            
            # Cache kontrolü
            cache_key = f"{product.code}_{product.color}"
            if cache_key in self.collage_cache:
                cache_time = self.collage_cache[cache_key]['created_at']
                if datetime.now() - cache_time < timedelta(hours=1):
                    logger.info(f"[SMART COLLAGE] Using cached collage: {cache_key}")
                    return self.collage_cache[cache_key]['url']
            
            # SAFETY: Double-check images with fresh database query
            db.refresh(product)  # Refresh product from database
            
            # Görselleri al - fresh query
            images = db.query(ProductImage).filter(
                ProductImage.product_id == product_id,
                ProductImage.is_active == True,
                ProductImage.image_type == 'product'
            ).all()
            
            if len(images) < 2:
                logger.info(f"[SMART COLLAGE] Not enough images for {product.code} - found {len(images)}")
                return
            
            # VERIFICATION: Ensure all images have valid CDN URLs
            valid_images = []
            for img in images:
                if img.file_path and img.file_path.startswith('http'):
                    valid_images.append(img)
                else:
                    logger.warning(f"[SMART COLLAGE] Invalid image URL: {img.filename} - {img.file_path}")
            
            if len(valid_images) < 2:
                logger.warning(f"[SMART COLLAGE] Not enough valid images for {product.code} - {len(valid_images)}/{len(images)}")
                return
            
            images = valid_images  # Use only valid images
            
            # Kolaj oluştur
            from services.product_cdn_processor import product_cdn_processor
            
            # Kolaj klasörü oluştur
            collage_folder = await bunny_cdn_service.create_collage_folder(
                product.brand, 
                db.query(User).first(),  # TODO: Proper user handling
                product.code, 
                product.color
            )
            
            if not collage_folder:
                logger.error(f"[SMART COLLAGE] Failed to create folder for {product.code}")
                return
            
            # Kolaj oluştur ve yükle
            collage_url = await product_cdn_processor._create_and_upload_collage(
                product, images, collage_folder, db.query(User).first()
            )
            
            if collage_url:
                # Cache'e kaydet
                self.collage_cache[cache_key] = {
                    'url': collage_url,
                    'created_at': datetime.now(),
                    'product_id': product_id
                }
                logger.info(f"[SMART COLLAGE] Created and cached: {collage_url}")
                return collage_url
            
        except Exception as e:
            logger.error(f"[SMART COLLAGE] Single collage error: {e}")
            raise
    
    async def get_or_create_collage(
        self, 
        product_id: int, 
        db: Session, 
        force_recreate: bool = False
    ) -> Optional[str]:
        """
        Kolaj al veya oluştur - web arayüzü için
        """
        try:
            product = db.query(Product).filter(Product.id == product_id).first()
            if not product:
                return None
            
            cache_key = f"{product.code}_{product.color}"
            
            # Cache kontrolü (force_recreate değilse)
            if not force_recreate and cache_key in self.collage_cache:
                cache_data = self.collage_cache[cache_key]
                cache_time = cache_data['created_at']
                
                # 1 saat içinde oluşturulmuşsa cache'den döndür
                if datetime.now() - cache_time < timedelta(hours=1):
                    logger.info(f"[SMART COLLAGE] Returning cached collage: {cache_key}")
                    return cache_data['url']
            
            # Hemen kolaj oluştur (immediate priority)
            await self.schedule_collage_creation(product_id, priority="immediate")
            await self.process_collage_queue(db, max_concurrent=1)
            
            # Cache'den döndür
            if cache_key in self.collage_cache:
                return self.collage_cache[cache_key]['url']
            
            return None
            
        except Exception as e:
            logger.error(f"[SMART COLLAGE] Get or create error: {e}")
            return None
    
    def get_queue_status(self) -> Dict[str, Any]:
        """Kuyruk durumunu döndür"""
        return {
            'queue_size': len(self.collage_queue),
            'processing_count': len(self.processing_products),
            'cache_size': len(self.collage_cache),
            'queue_items': [
                {
                    'product_id': item['product_id'],
                    'priority': item['priority'],
                    'scheduled_at': item['scheduled_at'].isoformat(),
                    'attempts': item['attempts']
                }
                for item in self.collage_queue[:10]  # İlk 10 öğe
            ]
        }
    
    def clear_old_cache(self, max_age_hours: int = 24):
        """Eski cache'leri temizle"""
        try:
            current_time = datetime.now()
            keys_to_remove = []
            
            for key, data in self.collage_cache.items():
                age = current_time - data['created_at']
                if age > timedelta(hours=max_age_hours):
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                del self.collage_cache[key]
            
            if keys_to_remove:
                logger.info(f"[SMART COLLAGE] Cleared {len(keys_to_remove)} old cache entries")
                
        except Exception as e:
            logger.error(f"[SMART COLLAGE] Cache cleanup error: {e}")

# Global instance
smart_collage_service = SmartCollageService()
