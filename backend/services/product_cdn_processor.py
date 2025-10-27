"""
Product CDN File Processor
Handles product file processing with Bunny CDN integration
"""

import os
import re
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.user import User
from models.brand import Brand
from models.product import Product, ProductImage
from services.bunny_cdn_service import bunny_cdn_service
from services.unified_ocr_service import UnifiedOCRService, ProductInfo
from core.logging import get_logger

logger = get_logger('product_cdn_processor')

class ProductCDNProcessor:
    """Process product files with CDN integration"""
    
    def __init__(self):
        self.ocr_service = UnifiedOCRService()
        self.ocr_cache: Dict[str, Any] = {}
        logger.info("Product CDN Processor initialized")
    
    async def process_single_file(
        self, 
        file, 
        current_user: User, 
        db: Session
    ) -> Dict[str, Any]:
        """Process single file and upload to CDN"""
        try:
            # Read file content
            file_content = await file.read()
            filename = file.filename
            
            logger.info(f"[CDN PROCESS] Processing file: {filename}")
            
            # Extract product info from filename
            product_code, color = self._extract_from_filename(filename)
            
            if not product_code:
                logger.warning(f"[CDN PROCESS] Could not extract product code from: {filename}")
                return {"success": False, "error": "Invalid filename format"}
            
            # Determine brand (auto-detection or user's brand)
            brand = await self._determine_brand(product_code, current_user, db)
            if not brand:
                logger.error(f"[CDN PROCESS] Could not determine brand for: {filename}")
                return {"success": False, "error": "Brand not found"}
            
            # Find or create product
            product = self._find_or_create_product(db, product_code, color, brand, current_user)
            
            # Check if this is a tag image (for OCR)
            is_tag_image = self._is_tag_image(filename)
            
            # Process OCR if it's a tag image
            ocr_data = None
            if is_tag_image:
                ocr_data = await self._process_ocr(file_content, filename, product_code)
                if ocr_data:
                    # Update product with OCR data
                    self._update_product_from_ocr(product, ocr_data, db)
            
            # Upload to CDN
            upload_result = await self._upload_to_cdn(
                file_content, filename, brand, current_user, product_code, color
            )
            
            if not upload_result["success"]:
                logger.error(f"[CDN PROCESS] Upload failed: {upload_result['error']}")
                return upload_result
            
            # Save image record to database with transaction safety
            try:
                image_record = self._create_image_record(
                    product, filename, upload_result, is_tag_image, db
                )
                
                # CRITICAL: Ensure transaction is committed immediately
                db.commit()
                logger.info(f"[CDN PROCESS] Database record committed: {filename}")
                
            except Exception as db_error:
                logger.error(f"[CDN PROCESS] Database error for {filename}: {db_error}")
                db.rollback()
                # Continue with success since file is uploaded to CDN
                image_record = None
            
            logger.info(f"[CDN PROCESS] Successfully processed: {filename} -> {upload_result['cdn_url']}")
            
            return {
                "success": True,
                "product_id": product.id,
                "product_code": product_code,
                "color": color,
                "cdn_url": upload_result["cdn_url"],
                "folder_path": upload_result["folder_path"],
                "image_id": image_record.id if image_record else None,
                "ocr_data": ocr_data
            }
            
        except Exception as e:
            logger.error(f"[CDN PROCESS] Error processing {filename}: {e}")
            return {"success": False, "error": str(e)}
    
    async def _upload_to_cdn(
        self, 
        file_content: bytes, 
        filename: str, 
        brand: Brand, 
        user: User, 
        product_code: str, 
        color: str
    ) -> Dict[str, Any]:
        """Upload file to CDN"""
        try:
            # Generate folder path
            upload_date = datetime.now()
            folder_path = bunny_cdn_service.generate_folder_path(
                brand, user, upload_date, product_code, color
            )
            
            # Upload file
            success, cdn_url, error = await bunny_cdn_service.upload_file(
                file_content, filename, folder_path
            )
            
            return {
                "success": success,
                "cdn_url": cdn_url,
                "folder_path": folder_path,
                "error": error
            }
            
        except Exception as e:
            logger.error(f"CDN upload error: {e}")
            return {"success": False, "cdn_url": "", "folder_path": "", "error": str(e)}
    
    def _create_image_record(
        self, 
        product: Product, 
        filename: str, 
        upload_result: Dict[str, Any], 
        is_tag_image: bool, 
        db: Session
    ) -> Optional[ProductImage]:
        """Create ProductImage record with CDN URL"""
        try:
            # Check if image already exists
            existing_image = db.query(ProductImage).filter(
                ProductImage.product_id == product.id,
                ProductImage.filename == filename
            ).first()
            
            if existing_image:
                # Update existing record with CDN URL
                existing_image.file_path = upload_result["cdn_url"]
                existing_image.updated_at = datetime.utcnow()
                db.commit()
                logger.info(f"[CDN DB] Updated existing image record: {filename}")
                return existing_image
            
            # Create new image record
            image_record = ProductImage(
                product_id=product.id,
                filename=filename,
                original_filename=filename,
                file_path=upload_result["cdn_url"],  # Store CDN URL
                image_type='tag' if is_tag_image else 'product',
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(image_record)
            db.commit()
            db.refresh(image_record)
            
            logger.info(f"[CDN DB] Created image record: {filename} -> Product ID: {product.id}")
            return image_record
            
        except Exception as e:
            logger.error(f"[CDN DB] Error creating image record: {e}")
            db.rollback()
            return None
    
    async def _process_ocr(
        self, 
        file_content: bytes, 
        filename: str, 
        product_code: str
    ) -> Optional[Dict[str, Any]]:
        """Process OCR for tag images"""
        try:
            # Check cache first
            cache_key = f"{product_code}_ocr"
            if cache_key in self.ocr_cache:
                logger.info(f"[CDN OCR] Using cached OCR for: {product_code}")
                return self.ocr_cache[cache_key]
            
            # Save temp file for OCR processing
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
                temp_file.write(file_content)
                temp_path = temp_file.name
            
            try:
                # Process with OCR
                ocr_result = await self.ocr_service.process_single_image(temp_path)
                
                if ocr_result and ocr_result.get('success'):
                    # Cache the result
                    self.ocr_cache[cache_key] = ocr_result
                    logger.info(f"[CDN OCR] Processed and cached: {filename}")
                    return ocr_result
                else:
                    logger.warning(f"[CDN OCR] No valid OCR result for: {filename}")
                    return None
                    
            finally:
                # Clean up temp file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                    
        except Exception as e:
            logger.error(f"[CDN OCR] Error processing {filename}: {e}")
            return None
    
    def _update_product_from_ocr(
        self, 
        product: Product, 
        ocr_data: Dict[str, Any], 
        db: Session
    ):
        """Update product with OCR extracted data"""
        try:
            updated = False
            
            # Extract data from OCR result
            if 'product_info' in ocr_data:
                info = ocr_data['product_info']
                
                # Update product type
                if info.get('product_type') and not product.product_type:
                    product.product_type = info['product_type']
                    updated = True
                
                # Update size range
                if info.get('size_range') and not product.size_range:
                    product.size_range = info['size_range']
                    updated = True
                
                # Update price
                if info.get('price') and not product.price:
                    product.price = float(info['price'])
                    updated = True
                
                # Store AI extracted data
                product.ai_extracted_data = ocr_data
                updated = True
            
            if updated:
                product.updated_at = datetime.utcnow()
                db.commit()
                logger.info(f"[CDN OCR] Updated product {product.code} with OCR data")
                
        except Exception as e:
            logger.error(f"[CDN OCR] Error updating product with OCR: {e}")
            db.rollback()
    
    async def _determine_brand(
        self, 
        product_code: str, 
        current_user: User, 
        db: Session
    ) -> Optional[Brand]:
        """Determine brand from product code or user"""
        try:
            # First, try to find brand from product code pattern
            brand = self._detect_brand_from_code(product_code, db)
            
            if brand:
                logger.info(f"[CDN BRAND] Detected brand from code: {brand.name}")
                return brand
            
            # Fallback: use user's primary brand or first available brand
            if hasattr(current_user, 'brand_id') and current_user.brand_id:
                brand = db.query(Brand).filter(Brand.id == current_user.brand_id).first()
                if brand:
                    logger.info(f"[CDN BRAND] Using user's brand: {brand.name}")
                    return brand
            
            # Last resort: get first active brand
            brand = db.query(Brand).filter(Brand.is_active == True).first()
            if brand:
                logger.info(f"[CDN BRAND] Using default brand: {brand.name}")
                return brand
            
            # Create default brand if none exists
            brand = Brand(name="Default Brand", is_active=True)
            db.add(brand)
            db.commit()
            db.refresh(brand)
            logger.info(f"[CDN BRAND] Created default brand: {brand.name}")
            return brand
            
        except Exception as e:
            logger.error(f"[CDN BRAND] Error determining brand: {e}")
            return None
    
    def _detect_brand_from_code(self, product_code: str, db: Session) -> Optional[Brand]:
        """Detect brand from product code patterns"""
        try:
            # Common brand prefixes
            brand_patterns = {
                'VV': 'Viva',
                'PF': 'Pofuduk',
                'KL': 'Kolaj',
                'BR': 'Brand'
            }
            
            # Extract prefix from product code
            code_upper = product_code.upper()
            for prefix, brand_name in brand_patterns.items():
                if code_upper.startswith(prefix):
                    # Try to find existing brand
                    brand = db.query(Brand).filter(
                        func.upper(Brand.name).like(f"%{brand_name.upper()}%")
                    ).first()
                    
                    if brand:
                        return brand
                    
                    # Create new brand if not found
                    brand = Brand(name=brand_name, is_active=True)
                    db.add(brand)
                    db.commit()
                    db.refresh(brand)
                    return brand
            
            return None
            
        except Exception as e:
            logger.error(f"Brand detection error: {e}")
            return None
    
    def _find_or_create_product(
        self, 
        db: Session, 
        product_code: str, 
        color: str, 
        brand: Brand, 
        current_user: User
    ) -> Product:
        """Find existing product or create new one"""
        try:
            # Try to find existing product
            existing_product = db.query(Product).filter(
                Product.code == product_code,
                Product.color == color,
                Product.brand_id == brand.id,
                Product.is_active == True
            ).first()
            
            if existing_product:
                logger.info(f"[CDN PRODUCT] Found existing product: {product_code} - {color}")
                return existing_product
            
            # Create new product
            product = Product(
                code=product_code,
                name=f"{product_code} - {color}",
                color=color,
                brand_id=brand.id,
                is_active=True,
                is_processed=False,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(product)
            db.commit()
            db.refresh(product)
            
            logger.info(f"[CDN PRODUCT] Created new product: {product_code} - {color}")
            return product
            
        except Exception as e:
            logger.error(f"[CDN PRODUCT] Error finding/creating product: {e}")
            db.rollback()
            raise
    
    def _extract_from_filename(self, filename: str) -> Tuple[str, str]:
        """Extract product code and color from filename"""
        try:
            # Remove file extension
            name_without_ext = filename.rsplit('.', 1)[0]
            
            # Common patterns for product codes
            patterns = [
                r'^([A-Z]{2,4}-?\d{3,6}(?:[-\s]?[A-Z])?)',  # VV-6124-B, VV-6124 B
                r'^([A-Z]{2,4}\d{3,6}(?:[A-Z])?)',          # VV6124B
            ]
            
            product_code = None
            for pattern in patterns:
                match = re.search(pattern, name_without_ext.upper())
                if match:
                    product_code = match.group(1)
                    # Normalize format: VV-6124 B -> VV-6124-B
                    product_code = re.sub(r'([A-Z]{2,4}-?\d{3,6})\s+([A-Z])$', r'\1-\2', product_code)
                    break
            
            if not product_code:
                logger.warning(f"Could not extract product code from: {filename}")
                return "", ""
            
            # Extract color (everything after product code)
            color_part = name_without_ext[len(product_code):].strip()
            
            # Remove common separators and numbers
            color_part = re.sub(r'^[-\s_]+', '', color_part)  # Remove leading separators
            color_part = re.sub(r'\s*\d+\s*$', '', color_part)  # Remove trailing numbers
            
            # Default color if not found
            if not color_part:
                color_part = "Default"
            
            logger.info(f"[CDN EXTRACT] {filename} -> Code: {product_code}, Color: {color_part}")
            return product_code, color_part
            
        except Exception as e:
            logger.error(f"Filename extraction error for {filename}: {e}")
            return "", ""
    
    def _is_tag_image(self, filename: str) -> bool:
        """Check if image is a tag image (for OCR processing)"""
        try:
            # Tag images typically don't have trailing numbers
            name_without_ext = filename.rsplit('.', 1)[0]
            
            # Check if filename ends with numbers (like " 11.jpg", " 14.jpg")
            has_trailing_numbers = bool(re.search(r'\s+\d+\s*$', name_without_ext))
            
            # Tag images don't have trailing numbers
            is_tag = not has_trailing_numbers
            
            logger.debug(f"[CDN TAG] {filename} -> is_tag: {is_tag}")
            return is_tag
            
        except Exception as e:
            logger.error(f"Tag detection error for {filename}: {e}")
            return False
    
    async def create_product_collage(
        self, 
        product_code: str, 
        current_user: User, 
        db: Session
    ) -> Optional[str]:
        """Create collage for product and upload to CDN"""
        try:
            # Find product
            product = db.query(Product).filter(
                Product.code == product_code,
                Product.is_active == True
            ).first()
            
            if not product:
                logger.warning(f"[CDN COLLAGE] Product not found: {product_code}")
                return None
            
            # Get product images
            images = db.query(ProductImage).filter(
                ProductImage.product_id == product.id,
                ProductImage.is_active == True,
                ProductImage.image_type == 'product'
            ).all()
            
            if len(images) < 2:
                logger.info(f"[CDN COLLAGE] Not enough images for collage: {product_code}")
                return None
            
            # Create collage folder on CDN
            collage_folder = await bunny_cdn_service.create_collage_folder(
                product.brand, current_user, product_code, product.color
            )
            
            if not collage_folder:
                logger.error(f"[CDN COLLAGE] Failed to create collage folder: {product_code}")
                return None
            
            # Create collage using professional collage maker
            collage_result = await self._create_and_upload_collage(
                product, images, collage_folder, current_user
            )
            
            if collage_result:
                logger.info(f"[CDN COLLAGE] Collage created and uploaded: {collage_result}")
                return collage_result
            else:
                logger.error(f"[CDN COLLAGE] Failed to create collage: {product_code}")
                return None
            
        except Exception as e:
            logger.error(f"[CDN COLLAGE] Error creating collage for {product_code}: {e}")
            return None
    
    async def _create_and_upload_collage(
        self,
        product: Product,
        images: List[ProductImage],
        collage_folder: str,
        current_user: User
    ) -> Optional[str]:
        """Create collage and upload to CDN - OPTIMIZED VERSION"""
        try:
            import tempfile
            import asyncio
            import aiohttp
            from services.professional_collage_maker import professional_collage_maker
            
            # OPTIMIZATION 1: Async parallel download with connection pooling
            temp_image_paths = []
            
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30),
                connector=aiohttp.TCPConnector(limit=10)
            ) as session:
                
                # Create download tasks for parallel execution
                download_tasks = []
                for image in images:
                    if image.file_path.startswith('http'):
                        download_tasks.append(self._download_image_async(session, image))
                
                # Execute downloads in parallel
                download_results = await asyncio.gather(*download_tasks, return_exceptions=True)
                
                # Process results
                for result in download_results:
                    if isinstance(result, Exception):
                        logger.warning(f"[CDN COLLAGE] Download failed: {result}")
                        continue
                    
                    if result and result['success']:
                        temp_image_paths.append(result['temp_path'])
                        logger.info(f"[CDN COLLAGE] Downloaded: {result['filename']}")
            
            if len(temp_image_paths) < 2:
                logger.warning(f"[CDN COLLAGE] Not enough images downloaded for collage")
                return None
            
            # Create collage using professional collage maker
            collage_filename = f"{product.code}_{product.color}_collage.jpg"
            
            # Create temp output file
            temp_output = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
            temp_output.close()
            
            try:
                # Create collage
                success = professional_collage_maker.create_professional_collage(
                    product_code=product.code,
                    color=product.color,
                    brand=product.brand.name if product.brand else "Unknown",
                    product_type=product.product_type or "Product",
                    size_range=product.size_range or "One Size",
                    price=product.price,
                    product_images=temp_image_paths,
                    output_path=temp_output.name
                )
                
                if not success:
                    logger.error(f"[CDN COLLAGE] Failed to create collage")
                    return None
                
                # Read collage file
                with open(temp_output.name, 'rb') as f:
                    collage_content = f.read()
                
                # Upload collage to CDN
                success, cdn_url, error = await bunny_cdn_service.upload_file(
                    collage_content, collage_filename, collage_folder
                )
                
                if success:
                    logger.info(f"[CDN COLLAGE] Uploaded collage: {cdn_url}")
                    return cdn_url
                else:
                    logger.error(f"[CDN COLLAGE] Upload failed: {error}")
                    return None
                    
            finally:
                # Clean up temp files
                for temp_path in temp_image_paths:
                    try:
                        os.unlink(temp_path)
                    except:
                        pass
                
                try:
                    os.unlink(temp_output.name)
                except:
                    pass
                    
        except Exception as e:
            logger.error(f"[CDN COLLAGE] Error creating and uploading collage: {e}")
            return None
    
    async def _download_image_async(self, session, image: ProductImage) -> Dict[str, Any]:
        """Download single image asynchronously"""
        try:
            import tempfile
            
            async with session.get(image.file_path) as response:
                if response.status == 200:
                    content = await response.read()
                    
                    # Create temp file
                    temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
                    temp_file.write(content)
                    temp_file.close()
                    
                    return {
                        'success': True,
                        'temp_path': temp_file.name,
                        'filename': image.filename
                    }
                else:
                    return {
                        'success': False,
                        'error': f"HTTP {response.status}"
                    }
                    
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

# Global instance
product_cdn_processor = ProductCDNProcessor()
