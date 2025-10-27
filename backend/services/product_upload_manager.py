"""
Product Upload Manager - Modüler Yapı
Enterprise-level product upload operations
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
import os
import re
from datetime import datetime
import asyncio

from models.user import User
from models.brand import Brand
from models.upload_job import UploadJob
from models.product import Product, ProductImage
from services.unified_ocr_service import UnifiedOCRService, ProductInfo
from services.unified_upload_service import UnifiedUploadService
from services.enterprise_template_service import EnterpriseTemplateService
from services.brand_permission_service import BrandPermissionService
from services.bunny_cdn_service import bunny_cdn_service
from services.product_cdn_processor import product_cdn_processor
from services.smart_collage_service import smart_collage_service
from services.ultra_fast_upload_service import ultra_fast_upload_service
from core.logging import get_logger

logger = get_logger('product_upload_manager')

class ProductUploadManager:
    """Product upload manager for enterprise operations"""
    
    def __init__(self):
        self.ocr_service = UnifiedOCRService()
        self.upload_service = UnifiedUploadService()
        self.template_service = EnterpriseTemplateService()
        
        # Uploads directory
        # Get project root directory (two levels up from backend/services)
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        self.uploads_dir = os.path.join(project_root, 'uploads')
        os.makedirs(self.uploads_dir, exist_ok=True)
        
        # OCR cache to avoid processing same tags multiple times
        self.ocr_cache: Dict[str, Any] = {}
        
        # Initialize OCR service
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(self._initialize_services())
            else:
                loop.run_until_complete(self._initialize_services())
        except Exception as e:
            logger.warning(f"Failed to initialize services: {e}")
    
    async def _initialize_services(self):
        """Initialize all services"""
        try:
            await self.ocr_service.initialize()
            logger.info("All services initialized successfully")
        except Exception as e:
            logger.error(f"Service initialization failed: {e}")
    
    async def process_upload(
        self,
        files: List,
        current_user: User,
        db: Session,
        background_tasks,
        use_ultra_fast: bool = True
    ) -> Dict[str, Any]:
        """Process product upload with enterprise features"""
        try:
            if not files:
                from fastapi import HTTPException
                raise HTTPException(status_code=400, detail="No files provided")
            
            upload_job = self._create_upload_job(current_user, len(files), db)
            
            # ULTRA FAST MODE: Direct processing for better performance
            if use_ultra_fast and len(files) <= 500:  # Ultra fast for reasonable file counts
                logger.info(f"[ULTRA FAST MODE] Processing {len(files)} files directly")
                
                background_tasks.add_task(
                    self._process_ultra_fast_background,
                    files, current_user, upload_job.id, db
                )
            else:
                # Fallback to original method for very large uploads
                logger.info(f"[STANDARD MODE] Processing {len(files)} files in background")
                
                background_tasks.add_task(
                    self._process_files_background,
                    files, current_user, upload_job.id, db
                )
            
            return {
                'success': True,
                'message': 'Upload başlatıldı',
                'job_id': upload_job.id,
                'status': 'processing',
                'mode': 'ultra_fast' if use_ultra_fast and len(files) <= 500 else 'standard'
            }
            
        except Exception as e:
            logger.error(f"Upload processing error: {e}")
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=str(e))
    
    def _create_upload_job(self, user: User, file_count: int, db: Session) -> UploadJob:
        """Create upload job record"""
        brand = db.query(Brand).first()
        if not brand:
            brand = Brand(name="Default Brand", is_active=True)
            db.add(brand)
            db.commit()
            db.refresh(brand)
        
        upload_job = UploadJob(
            brand_id=brand.id,
            uploader_id=user.id,
            brand_manager_id=None,
            upload_date=datetime.now(),
            status='processing',
            total_files=file_count,
            processed_files=0,
            base_path=os.path.join(self.uploads_dir, brand.name, str(user.id), datetime.now().strftime('%d%m%Y'))
        )
        db.add(upload_job)
        db.commit()
        db.refresh(upload_job)
        return upload_job
    
    async def _process_files_background(
        self,
        files: List,
        current_user: User,
        job_id: int,
        db: Session
    ):
        """Process files in background with parallel processing"""
        try:
            processed_count = 0
            failed_count = 0
            
            batch_size = 25  # Optimize edildi: daha iyi memory management için
            total_files = len(files)
            
            # CRITICAL: Sort files to process tag images first (for OCR caching)
            # Tag images don't have trailing numbers like " 11.jpg", " 14.jpg", etc.
            import re
            def is_tag_image(file):
                filename = file.filename.rsplit('.', 1)[0]
                return not bool(re.search(r'\s+\d+\s*$', filename))
            
            tag_images = [f for f in files if is_tag_image(f)]
            other_images = [f for f in files if not is_tag_image(f)]
            sorted_files = tag_images + other_images
            
            logger.info(f"[BATCH UPLOAD] Processing {total_files} files ({len(tag_images)} tags first, then {len(other_images)} product images)")
            
            # IMMEDIATE PROGRESS: Update job with initial status (0% but with info)
            job = db.query(UploadJob).filter(UploadJob.id == job_id).first()
            if job:
                job.processing_log = {
                    "total_files": total_files,
                    "tag_images": len(tag_images),
                    "product_images": len(other_images),
                    "tags_processed": 0,
                    "products_processed": 0,
                    "failed_files": 0,
                    "status": "Etiket görselleri analiz ediliyor..."
                }
                db.commit()
            
            # HIZLANDIRILDI: Batch size artırıldı
            optimal_batch_size = 50 if total_files > 20 else batch_size
            
            for i in range(0, total_files, optimal_batch_size):
                batch = sorted_files[i:i + optimal_batch_size]
                logger.info(f"[BATCH {i//optimal_batch_size + 1}] Processing {len(batch)} files")
                
                # CRITICAL: Process TAG images first SEQUENTIALLY to populate cache
                # Then process other images in parallel
                batch_tags = [f for f in batch if is_tag_image(f)]
                batch_others = [f for f in batch if not is_tag_image(f)]
                
                results = []
                
                # Process TAG images first (sequentially for cache)
                tags_in_batch = 0
                for tag_file in batch_tags:
                    logger.info(f"[TAG FIRST] Processing tag image: {tag_file.filename}")
                    result = await self._process_single_file(tag_file, current_user, db)
                    results.append(result)
                    tags_in_batch += 1
                    
                    # Update progress after each tag (for real-time feedback)
                    if not isinstance(result, Exception):
                        processed_count += 1
                    else:
                        failed_count += 1
                        logger.error(f"File processing error: {result}")
                    
                    await self._update_job_progress_detailed(
                        job_id, processed_count, failed_count, 
                        len(tag_images), len(other_images), 
                        min(tags_in_batch, len(tag_images)), 
                        0, db, 
                        f"Etiket {tags_in_batch}/{len(tag_images)} okundu..."
                    )
                
                # Then process other images (parallel but with database safety)
                if batch_others:
                    # OPTIMIZED: Reduce parallelism to prevent database lock issues
                    semaphore = asyncio.Semaphore(10)  # REDUCED: 30 -> 10 for database safety
                    async def process_with_semaphore(file):
                        async with semaphore:
                            try:
                                result = await self._process_single_file(file, current_user, db)
                                # Small delay to prevent database contention
                                await asyncio.sleep(0.1)
                                return result
                            except Exception as e:
                                logger.error(f"[PARALLEL PROCESS] Error with {file.filename}: {e}")
                                return e
                    
                    other_tasks = [process_with_semaphore(file) for file in batch_others]
                    other_results = await asyncio.gather(*other_tasks, return_exceptions=True)
                    results.extend(other_results)
                    
                    # Count results
                    for result in other_results:
                        if isinstance(result, Exception):
                            logger.error(f"File processing error: {result}")
                            failed_count += 1
                        else:
                            processed_count += 1
                
                await self._update_job_progress_detailed(
                    job_id, processed_count, failed_count,
                    len(tag_images), len(other_images),
                    len(tag_images),
                    processed_count - len(tag_images),
                    db,
                    f"Ürün görselleri işleniyor... {processed_count}/{total_files}"
                )
                logger.info(f"[BATCH PROGRESS] {processed_count}/{total_files} completed, {failed_count} failed")
            
            # CRITICAL: Ensure all database transactions are committed before collage creation
            try:
                db.commit()  # Force commit all pending transactions
                logger.info(f"[UPLOAD COMPLETE] All files processed and committed to database")
            except Exception as e:
                logger.error(f"[UPLOAD COMPLETE] Database commit error: {e}")
                db.rollback()
            
            # After all files processed and committed, create collages for products
            await self._create_collages_for_batch(sorted_files, current_user, db)
            
            self._update_upload_job(job_id, processed_count, failed_count, db)
            logger.info(f"[UPLOAD COMPLETE] Total: {total_files}, Success: {processed_count}, Failed: {failed_count}")
            
        except Exception as e:
            logger.error(f"Background processing error: {e}")
    
    async def _process_ultra_fast_background(
        self,
        files: List,
        current_user: User,
        job_id: int,
        db: Session
    ):
        """Ultra fast background processing"""
        try:
            logger.info(f"[ULTRA FAST] Starting ultra fast processing for {len(files)} files")
            
            # Use ultra fast service
            result = await ultra_fast_upload_service.process_upload_ultra_fast(
                files, current_user, db, job_id
            )
            
            if result['success']:
                logger.info(f"[ULTRA FAST] Completed in {result['processing_time']:.2f}s")
                
                # Schedule collages (lazy)
                await self._schedule_collages_ultra_fast(files, current_user, db)
            else:
                logger.error(f"[ULTRA FAST] Failed: {result}")
                
        except Exception as e:
            logger.error(f"[ULTRA FAST] Background error: {e}")
            # Fallback to standard processing
            logger.info(f"[ULTRA FAST] Falling back to standard processing")
            await self._process_files_background(files, current_user, job_id, db)
    
    async def _schedule_collages_ultra_fast(
        self,
        files: List,
        current_user: User,
        db: Session
    ):
        """Schedule collages for ultra fast processed files"""
        try:
            # Extract unique product codes
            product_codes = set()
            for file in files:
                product_code = ultra_fast_upload_service._extract_product_code(file.filename)
                if product_code:
                    product_codes.add(product_code)
            
            # Schedule collages
            for product_code in product_codes:
                product = db.query(Product).filter(
                    Product.code == product_code,
                    Product.is_active == True
                ).first()
                
                if product:
                    await smart_collage_service.schedule_collage_creation(
                        product.id, priority="normal"
                    )
                    logger.info(f"[ULTRA FAST COLLAGE] Scheduled {product_code}")
            
            # Process a few immediately
            if product_codes:
                await smart_collage_service.process_collage_queue(db, max_concurrent=2)
                
        except Exception as e:
            logger.error(f"[ULTRA FAST COLLAGE] Error: {e}")
    
    async def _create_collages_for_batch(self, files, current_user: User, db: Session):
        """Create collages for all products in batch after all files are processed"""
        try:
            # Get unique product codes from files
            product_codes = set()
            for file in files:
                filename = file.filename.rsplit('.', 1)[0]
                # Extract product code from filename (including suffix like -B, -C)
                import re
                # Match patterns like VV-6124-B, VV-6124 B, or VV-6124
                code_match = re.search(r'^([A-Z]{2,4}-?\d{3,6}(?:[-\s]?[A-Z])?)', filename, re.IGNORECASE)
                if code_match:
                    code = code_match.group(1).upper()
                    # Normalize: VV-6124 B -> VV-6124-B
                    code = re.sub(r'([A-Z]{2,4}-?\d{3,6})\s+([A-Z])$', r'\1-\2', code)
                    product_codes.add(code)
            
            logger.info(f"[COLLAGE BATCH] Creating collages for {len(product_codes)} products")
            
            # SAFETY CHECK: Verify all images are properly uploaded before scheduling collages
            verified_products = []
            
            for product_code in product_codes:
                # Find product ID
                product = db.query(Product).filter(
                    Product.code == product_code,
                    Product.is_active == True
                ).first()
                
                if product:
                    # CRITICAL: Verify product has sufficient images for collage
                    image_count = db.query(ProductImage).filter(
                        ProductImage.product_id == product.id,
                        ProductImage.is_active == True,
                        ProductImage.image_type == 'product'
                    ).count()
                    
                    if image_count >= 2:
                        # Schedule for lazy processing only if we have enough images
                        await smart_collage_service.schedule_collage_creation(
                            product.id, priority="normal"
                        )
                        verified_products.append(product_code)
                        logger.info(f"[BATCH COLLAGE] Scheduled {product_code} ({image_count} images)")
                    else:
                        logger.info(f"[BATCH COLLAGE] Skipped {product_code} - insufficient images ({image_count})")
            
            # Process verified collages (max 2 to not slow down upload)
            if verified_products:
                logger.info(f"[BATCH COLLAGE] Processing {len(verified_products)} verified products")
                await smart_collage_service.process_collage_queue(db, max_concurrent=2)
            else:
                logger.info(f"[BATCH COLLAGE] No products ready for collage creation")
                
        except Exception as e:
            logger.error(f"[COLLAGE BATCH] Error creating collages: {e}")
    
    async def _process_single_file(
        self,
        file,
        current_user: User,
        db: Session
    ):
        """Process single file with CDN integration"""
        return await product_cdn_processor.process_single_file(file, current_user, db)
    
    async def _create_auto_template(self, product: Product, current_user: User, db: Session):
        """Ürün için otomatik şablon oluştur"""
        try:
            from models.template import Template
            from services.product_helpers import ProductHelpers
            
            helpers = ProductHelpers()
            
            # Ürün analizi yap
            product_analysis = {
                'brand_name': product.brand.name if product.brand else 'Unknown',
                'product_type': product.product_type or 'General',
                'color': product.color or 'Unknown',
                'size_range': product.size_range or 'One Size',
                'price': product.price or 0,
                'image_count': len(product.images) if product.images else 0
            }
            
            # Şablon kategorisini belirle
            category = helpers.determine_template_category(product_analysis)
            
            # Şablon ayarlarını oluştur
            template_config = helpers.generate_template_config(product_analysis, category)
            
            # Şablon oluştur
            template_data = {
                'name': f"Auto Template - {product.code}",
                'description': f"Otomatik oluşturulan şablon - {product.brand.name if product.brand else 'Unknown'} {product.code}",
                'template_type': 'collage',
                'template_data': template_config,
                'is_active': True,
                'is_auto_generated': True,
                'product_id': product.id,
                'brand_id': product.brand_id,
                'created_by': current_user.id,
                'visibility': 'PRIVATE'
            }
            
            # Veritabanına kaydet
            template = Template(**template_data)
            db.add(template)
            db.commit()
            db.refresh(template)
            
            logger.info(f"[AUTO TEMPLATE] Created template {template.id} for product {product.code}")
            return template
            
        except Exception as e:
            logger.error(f"[AUTO TEMPLATE] Error creating template: {e}")
            return None
    
    def _find_existing_product(self, db: Session, code: str, color: str, brand_id: int) -> Optional[Product]:
        """Enhanced duplicate product detection with fuzzy matching"""
        from services.product_helpers import ProductHelpers
        helpers = ProductHelpers()
        return helpers.find_existing_product(db, code, color, brand_id)
    
    def _extract_from_filename(self, filename: str) -> tuple:
        """Enhanced filename extraction with better error handling and security"""
        from services.product_helpers import ProductHelpers
        helpers = ProductHelpers()
        return helpers.extract_from_filename(filename)
    
    def _is_safe_filename(self, filename: str) -> bool:
        """Check if filename is safe from security threats"""
        from services.product_helpers import ProductHelpers
        helpers = ProductHelpers()
        return helpers.is_safe_filename(filename)
    
    def _sanitize_path_component(self, component: str) -> str:
        """Sanitize a path component for safe directory/file names"""
        from services.product_helpers import ProductHelpers
        helpers = ProductHelpers()
        return helpers.sanitize_path_component(component)
    
    def _is_safe_path(self, path: str) -> bool:
        """Check if path is safe from directory traversal attacks"""
        from services.product_helpers import ProductHelpers
        helpers = ProductHelpers()
        return helpers.is_safe_path(path)
    
    async def _update_job_progress(
        self,
        job_id: int,
        processed_count: int,
        failed_count: int,
        db: Session
    ):
        """Update upload job progress during processing"""
        try:
            job = db.query(UploadJob).filter(UploadJob.id == job_id).first()
            if job:
                job.processed_files = processed_count
                job.processing_log = {"failed_files": failed_count}
                job.status = 'processing'
                db.commit()
                logger.info(f"[PROGRESS UPDATE] Job {job_id}: {processed_count} files processed")
        except Exception as e:
            logger.error(f"Progress update error: {e}")
    
    async def _update_job_progress_detailed(
        self,
        job_id: int,
        processed_count: int,
        failed_count: int,
        total_tags: int,
        total_products: int,
        tags_processed: int,
        products_processed: int,
        db: Session,
        status_message: str
    ):
        """Update upload job progress with detailed information"""
        try:
            job = db.query(UploadJob).filter(UploadJob.id == job_id).first()
            if job:
                job.processed_files = processed_count
                job.processing_log = {
                    "total_files": total_tags + total_products,
                    "tag_images": total_tags,
                    "product_images": total_products,
                    "tags_processed": tags_processed,
                    "products_processed": products_processed,
                    "failed_files": failed_count,
                    "status": status_message
                }
                job.status = 'processing'
                db.commit()
                logger.info(f"[PROGRESS] {status_message} - {processed_count}/{total_tags + total_products}")
        except Exception as e:
            logger.error(f"Progress update error: {e}")

    def _update_upload_job(
        self,
        job_id: int,
        processed_count: int,
        failed_count: int,
        db: Session
    ):
        """Update upload job status"""
        try:
            job = db.query(UploadJob).filter(UploadJob.id == job_id).first()
            if job:
                job.processed_files = processed_count
                job.processing_log = {"failed_files": failed_count}
                job.status = 'completed' if failed_count == 0 else 'error'
                job.completed_at = datetime.now()
                if failed_count > 0:
                    job.error_message = f"{failed_count} files failed to process"
                db.commit()
        except Exception as e:
            logger.error(f"Job update error: {e}")
