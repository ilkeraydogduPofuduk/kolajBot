"""
Ultra Fast Upload Service
Maksimum performans için yeniden tasarlanmış upload sistemi

PERFORMANS HEDEFLERİ:
- 1000 dosya < 3 dakika
- Memory kullanımı < 500MB
- Database transaction sayısı minimum
- CDN upload paralel
- OCR cache persistent
"""

import asyncio
import aiohttp
import aiofiles
import redis
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text
import json
import hashlib
from concurrent.futures import ThreadPoolExecutor
import tempfile
import os

from models.user import User
from models.brand import Brand
from models.product import Product, ProductImage
from models.upload_job import UploadJob
from services.bunny_cdn_service import bunny_cdn_service
from services.unified_ocr_service import UnifiedOCRService
from core.logging import get_logger

logger = get_logger('ultra_fast_upload')

class UltraFastUploadService:
    """Ultra hızlı upload servisi - yeni nesil"""
    
    def __init__(self):
        # Redis cache for OCR results (persistent)
        try:
            self.redis_client = redis.Redis(host='localhost', port=6379, db=2, decode_responses=True)
            self.redis_client.ping()
            logger.info("Redis OCR cache connected")
        except:
            self.redis_client = None
            logger.warning("Redis not available, using memory cache")
        
        # Memory cache as fallback
        self.memory_ocr_cache = {}
        
        # OCR service
        self.ocr_service = UnifiedOCRService()
        
        # Thread pool for CPU-bound operations
        self.cpu_executor = ThreadPoolExecutor(max_workers=4)
        
        # Statistics
        self.stats = {
            'files_processed': 0,
            'ocr_cache_hits': 0,
            'ocr_cache_misses': 0,
            'database_batches': 0,
            'cdn_uploads': 0
        }
        
        logger.info("Ultra Fast Upload Service initialized")
    
    async def process_upload_ultra_fast(
        self,
        files: List,
        current_user: User,
        db: Session,
        job_id: int
    ) -> Dict[str, Any]:
        """Ultra hızlı upload işlemi"""
        start_time = datetime.now()
        
        try:
            # PHASE 1: File Classification & Preparation (0.1s)
            classified_files = await self._classify_files_ultra_fast(files)
            
            # PHASE 2: OCR Processing (Parallel + Cached) (0.5s)
            ocr_results = await self._process_ocr_ultra_fast(classified_files['tags'])
            
            # PHASE 3: CDN Upload (Parallel) (1-2s)
            upload_results = await self._upload_to_cdn_ultra_fast(
                files, current_user, ocr_results
            )
            
            # PHASE 4: Database Batch Insert (0.2s)
            db_results = await self._batch_database_insert(
                upload_results, current_user, db
            )
            
            # PHASE 5: Update Job Status
            await self._update_job_ultra_fast(job_id, db_results, db)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"[ULTRA FAST] Processed {len(files)} files in {processing_time:.2f}s")
            
            return {
                'success': True,
                'processed_files': len(upload_results),
                'processing_time': processing_time,
                'stats': self.stats
            }
            
        except Exception as e:
            logger.error(f"[ULTRA FAST] Error: {e}")
            raise
    
    async def _classify_files_ultra_fast(self, files: List) -> Dict[str, List]:
        """Dosyaları ultra hızlı sınıflandır"""
        import re
        
        tags = []
        products = []
        
        # Regex pattern for tag detection (compiled once)
        tag_pattern = re.compile(r'\s+\d+\s*$')
        
        for file in files:
            filename = file.filename.rsplit('.', 1)[0]
            
            # Tag images don't have trailing numbers
            if not tag_pattern.search(filename):
                tags.append(file)
            else:
                products.append(file)
        
        logger.info(f"[CLASSIFY] {len(tags)} tags, {len(products)} products")
        
        return {
            'tags': tags,
            'products': products
        }
    
    async def _process_ocr_ultra_fast(self, tag_files: List) -> Dict[str, Any]:
        """OCR işlemini ultra hızlı yap"""
        ocr_results = {}
        
        if not tag_files:
            return ocr_results
        
        # Process tags in parallel with cache checking
        tasks = []
        for tag_file in tag_files:
            task = asyncio.create_task(
                self._process_single_ocr_cached(tag_file)
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Collect results
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"OCR error for {tag_files[i].filename}: {result}")
                continue
            
            if result:
                product_code = self._extract_product_code(tag_files[i].filename)
                if product_code:
                    ocr_results[product_code] = result
        
        logger.info(f"[OCR ULTRA] Processed {len(ocr_results)} tags")
        return ocr_results
    
    async def _process_single_ocr_cached(self, file) -> Optional[Dict[str, Any]]:
        """Tek OCR işlemi - cache'li"""
        try:
            # Generate cache key
            file_content = await file.read()
            file_hash = hashlib.md5(file_content).hexdigest()
            cache_key = f"ocr:{file_hash}"
            
            # Check Redis cache first
            if self.redis_client:
                cached_result = self.redis_client.get(cache_key)
                if cached_result:
                    self.stats['ocr_cache_hits'] += 1
                    logger.info(f"[OCR CACHE HIT] {file.filename}")
                    return json.loads(cached_result)
            
            # Check memory cache
            if cache_key in self.memory_ocr_cache:
                self.stats['ocr_cache_hits'] += 1
                logger.info(f"[OCR MEMORY HIT] {file.filename}")
                return self.memory_ocr_cache[cache_key]
            
            # Cache miss - process OCR
            self.stats['ocr_cache_misses'] += 1
            
            # Save to temp file for OCR
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                temp_file.write(file_content)
                temp_path = temp_file.name
            
            try:
                # Process OCR
                ocr_result = await self.ocr_service.process_image(temp_path)
                
                if ocr_result and ocr_result.text:
                    # Convert OCRResult to dict for caching
                    result_dict = {
                        'text': ocr_result.text,
                        'confidence': ocr_result.confidence,
                        'language': ocr_result.language,
                        'processing_time': ocr_result.processing_time,
                        'method': ocr_result.method,
                        'metadata': ocr_result.metadata,
                        'success': True
                    }
                    
                    # Cache the result
                    result_json = json.dumps(result_dict)
                    
                    # Redis cache (24 hours)
                    if self.redis_client:
                        self.redis_client.setex(cache_key, 86400, result_json)
                    
                    # Memory cache
                    self.memory_ocr_cache[cache_key] = result_dict
                    
                    logger.info(f"[OCR PROCESSED] {file.filename}")
                    return result_dict
                
            finally:
                # Clean up temp file
                try:
                    os.unlink(temp_path)
                except:
                    pass
            
            return None
            
        except Exception as e:
            logger.error(f"[OCR ERROR] {file.filename}: {e}")
            return None
    
    async def _upload_to_cdn_ultra_fast(
        self,
        files: List,
        current_user: User,
        ocr_results: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """CDN'e ultra hızlı yükleme"""
        
        # Group files by product for efficient folder creation
        product_groups = {}
        
        for file in files:
            product_code = self._extract_product_code(file.filename)
            if product_code:
                if product_code not in product_groups:
                    product_groups[product_code] = []
                product_groups[product_code].append(file)
        
        # Upload each product group in parallel
        upload_tasks = []
        for product_code, product_files in product_groups.items():
            task = asyncio.create_task(
                self._upload_product_group_to_cdn(
                    product_code, product_files, current_user, ocr_results
                )
            )
            upload_tasks.append(task)
        
        # Wait for all uploads
        group_results = await asyncio.gather(*upload_tasks, return_exceptions=True)
        
        # Flatten results
        all_results = []
        for result in group_results:
            if isinstance(result, Exception):
                logger.error(f"Group upload error: {result}")
                continue
            
            if isinstance(result, list):
                all_results.extend(result)
        
        self.stats['cdn_uploads'] = len(all_results)
        logger.info(f"[CDN ULTRA] Uploaded {len(all_results)} files")
        
        return all_results
    
    async def _upload_product_group_to_cdn(
        self,
        product_code: str,
        files: List,
        current_user: User,
        ocr_results: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Ürün grubunu CDN'e yükle"""
        
        # Get OCR data for this product
        ocr_data = ocr_results.get(product_code, {})
        color = ocr_data.get('product_info', {}).get('color', 'Unknown')
        
        # Get real brand from database
        brand = None
        brand_name = ocr_data.get('product_info', {}).get('brand_name', 'Unknown')
        
        if brand_name and brand_name != 'Unknown':
            # Try to find brand in database
            from models.brand import Brand
            brand = db.query(Brand).filter(Brand.name.ilike(f"%{brand_name}%")).first()
        
        # Fallback to user's first accessible brand
        if not brand:
            brand = db.query(Brand).join(Brand.users).filter(User.id == current_user.id).first()
        
        # Final fallback - create a default brand name
        if not brand:
            class MockBrand:
                def __init__(self, name):
                    self.name = name
            brand = MockBrand("Uploads")  # Use "Uploads" instead of "Default"
        
        # Prepare files for batch upload
        files_data = []
        for file in files:
            content = await file.read()
            files_data.append({
                'content': content,
                'filename': file.filename
            })
        
        # Batch upload to CDN
        upload_results = await bunny_cdn_service.upload_files_batch(
            files_data, brand, current_user, product_code, color
        )
        
        # Add product info to results
        for result in upload_results:
            result['product_code'] = product_code
            result['color'] = color
            result['brand_name'] = brand_name
            result['ocr_data'] = ocr_data
        
        return upload_results
    
    async def _batch_database_insert(
        self,
        upload_results: List[Dict[str, Any]],
        current_user: User,
        db: Session
    ) -> Dict[str, Any]:
        """Veritabanına batch insert"""
        
        try:
            # Group by product for efficient processing
            products_to_create = {}
            images_to_create = []
            
            for result in upload_results:
                if not result['success']:
                    continue
                
                product_code = result['product_code']
                color = result['color']
                brand_name = result['brand_name']
                
                # Prepare product data
                product_key = f"{product_code}_{color}_{brand_name}"
                if product_key not in products_to_create:
                    products_to_create[product_key] = {
                        'code': product_code,
                        'name': f"{product_code} - {color}",
                        'color': color,
                        'brand_name': brand_name,
                        'ocr_data': result.get('ocr_data', {}),
                        'images': []
                    }
                
                # Prepare image data
                products_to_create[product_key]['images'].append({
                    'filename': result['filename'],
                    'cdn_url': result['cdn_url'],
                    'folder_path': result['folder_path']
                })
            
            # Batch create products and images
            created_products = 0
            created_images = 0
            
            for product_data in products_to_create.values():
                # Find or create brand
                brand = db.query(Brand).filter(Brand.name == product_data['brand_name']).first()
                if not brand:
                    brand = Brand(name=product_data['brand_name'], is_active=True)
                    db.add(brand)
                    db.flush()  # Get ID without commit
                
                # Find or create product
                product = db.query(Product).filter(
                    Product.code == product_data['code'],
                    Product.color == product_data['color'],
                    Product.brand_id == brand.id
                ).first()
                
                if not product:
                    # Extract OCR data
                    ocr_info = product_data['ocr_data'].get('product_info', {})
                    
                    product = Product(
                        code=product_data['code'],
                        name=product_data['name'],
                        color=product_data['color'],
                        brand_id=brand.id,
                        product_type=ocr_info.get('product_type'),
                        size_range=ocr_info.get('size_range'),
                        price=ocr_info.get('price'),
                        ai_extracted_data=product_data['ocr_data'],
                        is_active=True,
                        is_processed=True,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(product)
                    db.flush()  # Get ID without commit
                    created_products += 1
                
                # Create images
                for image_data in product_data['images']:
                    # Check if image already exists
                    existing_image = db.query(ProductImage).filter(
                        ProductImage.product_id == product.id,
                        ProductImage.filename == image_data['filename']
                    ).first()
                    
                    if not existing_image:
                        is_tag = not any(char.isdigit() for char in image_data['filename'].split()[-1])
                        
                        image = ProductImage(
                            product_id=product.id,
                            filename=image_data['filename'],
                            original_filename=image_data['filename'],
                            file_path=image_data['cdn_url'],
                            image_type='tag' if is_tag else 'product',
                            is_active=True,
                            created_at=datetime.utcnow(),
                            updated_at=datetime.utcnow()
                        )
                        db.add(image)
                        created_images += 1
            
            # SINGLE COMMIT for all operations
            db.commit()
            self.stats['database_batches'] += 1
            
            logger.info(f"[DB BATCH] Created {created_products} products, {created_images} images")
            
            return {
                'products_created': created_products,
                'images_created': created_images,
                'total_processed': len(upload_results)
            }
            
        except Exception as e:
            logger.error(f"[DB BATCH] Error: {e}")
            db.rollback()
            raise
    
    async def _update_job_ultra_fast(
        self,
        job_id: int,
        db_results: Dict[str, Any],
        db: Session
    ):
        """Job durumunu ultra hızlı güncelle"""
        try:
            job = db.query(UploadJob).filter(UploadJob.id == job_id).first()
            if job:
                job.processed_files = db_results['total_processed']
                job.status = 'completed'
                job.completed_at = datetime.utcnow()
                job.processing_log = {
                    'products_created': db_results['products_created'],
                    'images_created': db_results['images_created'],
                    'stats': self.stats
                }
                db.commit()
                
        except Exception as e:
            logger.error(f"[JOB UPDATE] Error: {e}")
    
    def _extract_product_code(self, filename: str) -> Optional[str]:
        """Dosya adından ürün kodu çıkar"""
        import re
        
        name_without_ext = filename.rsplit('.', 1)[0]
        
        # Common patterns for product codes
        patterns = [
            r'^([A-Z]{2,4}-?\d{3,6}(?:[-\s]?[A-Z])?)',  # VV-6124-B, VV-6124 B
            r'^([A-Z]{2,4}\d{3,6}(?:[A-Z])?)',          # VV6124B
        ]
        
        for pattern in patterns:
            match = re.search(pattern, name_without_ext.upper())
            if match:
                code = match.group(1)
                # Normalize format
                code = re.sub(r'([A-Z]{2,4}-?\d{3,6})\s+([A-Z])$', r'\1-\2', code)
                return code
        
        return None
    
    def get_stats(self) -> Dict[str, Any]:
        """İstatistikleri döndür"""
        return self.stats.copy()

# Global instance
ultra_fast_upload_service = UltraFastUploadService()
