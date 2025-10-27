"""
Product File Processor - Modüler Yapı
Tek dosya işleme mantığı
"""

import os
import shutil
import tempfile
import unicodedata
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from models.user import User
from models.brand import Brand
from models.product import Product, ProductImage
from services.unified_ocr_service import ProductInfo
from services.brand_permission_service import BrandPermissionService
from services.image_optimizer import image_optimizer
from core.logging import get_logger

logger = get_logger('product_file_processor')

class ProductFileProcessor:
    """Handles processing of individual product files"""
    
    def __init__(self, upload_manager):
        self.upload_manager = upload_manager
        self.dual_product_info = None
    
    async def process_single_file(
        self,
        file,
        current_user: User,
        db
    ):
        """Process single file with proper directory structure"""
        original_filename = file.filename
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
            contents = await file.read()
            tmp_file.write(contents)
            tmp_path = tmp_file.name
        
        try:
            logger.info(f"[UPLOAD] Processing file: {original_filename}")
            
            # Determine if this is a tag image or product image
            import re
            filename_without_extension = original_filename.rsplit('.', 1)[0]
            has_trailing_number = bool(re.search(r'\s+\d+\s*$', filename_without_extension))
            is_tag_image = not has_trailing_number
            
            logger.info(f"[TAG DETECTION] {original_filename} -> Tag: {is_tag_image} (trailing_number: {has_trailing_number})")
            
            # Extract information from filename
            logger.info(f"[FILENAME EXTRACT] Extracting from filename: {original_filename}")
            filename_code, filename_color, filename_brand, self.dual_product_info = self.upload_manager._extract_from_filename(original_filename)
            
            logger.info(f"[FILENAME RESULT] Brand: {filename_brand}, Code: {filename_code}, Color: {filename_color}")
            
            # Initialize product_info with filename data
            product_info = ProductInfo(
                brand_name=filename_brand,
                product_code=filename_code,
                color=filename_color,
                raw_text=original_filename,
                confidence=0.8 if filename_code and filename_color else 0.3
            )
            
            # For tag images, run OCR
            if is_tag_image:
                await self._process_tag_image(tmp_path, product_info)
            else:
                # For non-tag images, try to use cached OCR data from tag image
                cache_key = f"{filename_code}_{filename_color}".upper()
                if cache_key in self.upload_manager.ocr_cache:
                    logger.info(f"[OCR CACHE HIT] Using cached data for non-tag image: {cache_key}")
                    cached_ocr = self.upload_manager.ocr_cache[cache_key]
                    # Merge cached OCR data - THIS WILL UPDATE THE BRAND!
                    self._merge_ocr_data(product_info, cached_ocr)
                    logger.info(f"[CACHE APPLIED] Brand updated to: {product_info.brand_name}")
                else:
                    logger.warning(f"[OCR CACHE MISS] No cached data for: {cache_key}. Upload tag image first!")
            
            # Validate brand access using new permission service
            brand_permission_service = BrandPermissionService(db)
            is_valid, brand, error_message = brand_permission_service.validate_brand_access_for_product(
                current_user, product_info.brand_name
            )
            
            if not is_valid:
                logger.error(f"[BRAND PERMISSION] {error_message}")
                raise ValueError(error_message)
            
            logger.info(f"[BRAND PERMISSION] User has access to brand {brand.name}")
            
            # CRITICAL FIX: For dual products (tags with 2 codes), skip validation until after OCR
            # The OCR will extract the codes and we'll process them separately
            if not product_info.product_code and is_tag_image:
                logger.info(f"[DUAL PRODUCT TAG] No single code found - this is likely a dual product tag. OCR will extract codes.")
                # Don't return here - let OCR process the tag
                # After OCR, the dual_product_info will be populated and we can create products
                # But we won't create a product for the tag itself
                if not self.dual_product_info:
                    logger.warning(f"[DUAL PRODUCT TAG] No dual product info found. This tag may not be processable.")
                    return
                # Continue to allow OCR processing
            elif not product_info.product_code:
                logger.error(f"[VALIDATION FAILED] Skipping {original_filename}: code={product_info.product_code}")
                return
            
            # For dual products, color might be None initially - try to extract from dual product info
            if not product_info.color and self.dual_product_info:
                # Try to get color from dual product info
                if 'color_2' in self.dual_product_info and self.dual_product_info['color_2']:
                    product_info.color = self.dual_product_info['color_2']
                    logger.info(f"[DUAL PRODUCT] Using color from dual product: {product_info.color}")
                elif 'color_1' in self.dual_product_info and self.dual_product_info['color_1']:
                    product_info.color = self.dual_product_info['color_1']
                    logger.info(f"[DUAL PRODUCT] Using color from dual product: {product_info.color}")
            
            if not product_info.color:
                logger.error(f"[VALIDATION FAILED] Skipping {original_filename}: code={product_info.product_code}, color={product_info.color}")
                return
            
            logger.info(f"[PRODUCT INFO] Code: {product_info.product_code}, Color: {product_info.color}, Brand: {brand.name}")
            
            # Check for existing product
            existing_product = self.upload_manager._find_existing_product(db, product_info.product_code, product_info.color, brand.id)
            
            if existing_product:
                product = existing_product
                await self._update_existing_product(product, product_info, is_tag_image, db)
            else:
                product = await self._create_new_product(product_info, brand, current_user, db)
            
            # Create directory structure and save file
            await self._save_file_to_directory(file, product, current_user, db, tmp_path)
            
            # Only save file to directory - collages will be created when product is complete
            # await self._create_templates_and_collages(product, current_user, db)
            
            logger.info(f"[SUCCESS] {brand.name}/{product.code}/{product.color}")
            
        except Exception as e:
            logger.error(f"Single file processing error: {e}")
            raise
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    
    async def _process_tag_image(self, tmp_path: str, product_info: ProductInfo):
        """Process tag image with OCR"""
        try:
            # CRITICAL FIX: For dual products, OCR will find the codes, so use filename initially
            # We'll update cache with actual codes after OCR
            cache_key = f"{product_info.product_code or 'DUAL'}_{product_info.color or 'TAG'}".upper()
            
            if cache_key in self.upload_manager.ocr_cache:
                logger.info(f"[OCR CACHE HIT] Using cached OCR for: {cache_key}")
                ocr_product_info = self.upload_manager.ocr_cache[cache_key]
            else:
                logger.info(f"[OCR] Tag image detected, running OCR")
                ocr_result = await self.upload_manager.ocr_service.process_image(tmp_path)
                ocr_product_info = await self.upload_manager.ocr_service.extract_product_info(ocr_result)
                
                # Save to cache with actual OCR-extracted code
                # CRITICAL FIX: Always use FILENAME product_code format for cache key
                # This ensures consistency between tag caching and non-tag lookup
                # Filename: AN-50226 B BLACK.jpg → code=AN-50226-B, color=BLACK
                # Cache key should be: AN-50226-B_BLACK (not just 50226_BLACK)
                
                cache_product_code = product_info.product_code if product_info.product_code else ocr_product_info.product_code
                cache_color = product_info.color if product_info.color and product_info.color != "Eksik" else ocr_product_info.color
                
                if cache_product_code and cache_color:
                    real_cache_key = f"{cache_product_code}_{cache_color}".upper()
                    self.upload_manager.ocr_cache[real_cache_key] = ocr_product_info
                    logger.info(f"[OCR CACHED] Saved to cache: {real_cache_key}")
                else:
                    # Fallback to original cache key for dual products
                    self.upload_manager.ocr_cache[cache_key] = ocr_product_info
                    logger.info(f"[OCR CACHED] Saved to cache (fallback): {cache_key}")
            
            logger.info(f"[OCR RESULT] Type: {ocr_product_info.product_type}, Size: {ocr_product_info.size}, Price: {ocr_product_info.price}")
            
            # Handle dual product OCR analysis
            if self.dual_product_info and ocr_product_info.raw_text:
                await self._process_dual_product_ocr(ocr_product_info)
            
            # Merge OCR data with filename data
            self._merge_ocr_data(product_info, ocr_product_info)
            
        except Exception as e:
            logger.warning(f"[OCR] Failed for tag image: {e}")
    
    async def _process_dual_product_ocr(self, ocr_product_info: ProductInfo):
        """Process OCR for dual products"""
        try:
            logger.info(f"[DUAL OCR] Analyzing OCR text for second product...")
            
            ocr_code2 = self.upload_manager.ocr_service._extract_product_code(ocr_product_info.raw_text)
            ocr_color2 = self.upload_manager.ocr_service._extract_color(ocr_product_info.raw_text)
            
            if ocr_code2 and ocr_color2:
                logger.info(f"[DUAL OCR] Found second product: {ocr_code2} {ocr_color2}")
                if self.dual_product_info:
                    self.dual_product_info['code_2'] = ocr_code2
                    self.dual_product_info['color_2'] = ocr_color2
            
            # Extract additional info for second product
            ocr_type2 = self.upload_manager.ocr_service._extract_product_type(ocr_product_info.raw_text)
            ocr_size2 = self.upload_manager.ocr_service._extract_size(ocr_product_info.raw_text)
            ocr_price2 = self.upload_manager.ocr_service._extract_price(ocr_product_info.raw_text)
            
            if ocr_type2 or ocr_size2 or ocr_price2:
                if self.dual_product_info:
                    self.dual_product_info.update({
                        'product_type_2': ocr_type2,
                        'size_range_2': ocr_size2,
                        'price_2': ocr_price2
                    })
                logger.info(f"[DUAL OCR] Second product details: type={ocr_type2}, size={ocr_size2}, price={ocr_price2}")
                
        except Exception as e:
            logger.error(f"[DUAL OCR] Error extracting second product info: {e}")
    
    def _merge_ocr_data(self, product_info: ProductInfo, ocr_product_info: ProductInfo):
        """Merge OCR data with filename data - OCR brand takes priority over 'Eksik'"""
        if ocr_product_info.product_type:
            product_info.product_type = ocr_product_info.product_type
        if ocr_product_info.size:
            product_info.size = ocr_product_info.size
        if ocr_product_info.price:
            product_info.price = ocr_product_info.price
        if ocr_product_info.barcode:
            product_info.barcode = ocr_product_info.barcode
        if ocr_product_info.material:
            product_info.material = ocr_product_info.material
        
        # OCR brand takes priority if:
        # 1. No brand from filename
        # 2. Filename brand is "Eksik"
        # 3. OCR found a valid brand
        if ocr_product_info.brand_name and (
            not product_info.brand_name or 
            product_info.brand_name.lower() == "eksik"
        ):
            # ASCII-safe logging
            old_brand_safe = product_info.brand_name.encode('ascii', 'ignore').decode('ascii') if product_info.brand_name else 'None'
            new_brand_safe = ocr_product_info.brand_name.encode('ascii', 'ignore').decode('ascii')
            logger.info(f"[BRAND MERGE] Replacing '{old_brand_safe}' with OCR brand '{new_brand_safe}'")
            product_info.brand_name = ocr_product_info.brand_name
    
    def _normalize_brand_name(self, name: str) -> str:
        """Normalize brand name for matching - TURKISH CHARACTER AWARE"""
        import unicodedata
        
        # CRITICAL: Handle DİZAYN vs DZAYN specifically
        name_upper = name.upper()
        if 'DİZAYN' in name_upper or 'DIZAYN' in name_upper:
            name = name_upper.replace('DİZAYN', 'DZAYN').replace('DIZAYN', 'DZAYN')
        
        # TURKISH CHARACTER REPLACEMENTS FIRST (critical for DİZAYN vs DZAYN)
        turkish_map = {
            'İ': 'I', 'ı': 'i', 'Ş': 'S', 'ş': 's',
            'Ğ': 'G', 'ğ': 'g', 'Ü': 'U', 'ü': 'u',
            'Ö': 'O', 'ö': 'o', 'Ç': 'C', 'ç': 'c'
        }
        
        for turkish_char, replacement in turkish_map.items():
            name = name.replace(turkish_char, replacement)
        
        # Remove accents and special chars
        normalized = unicodedata.normalize('NFKD', name)
        normalized = ''.join([c for c in normalized if not unicodedata.combining(c)])
        # Remove &, spaces, lowercase
        normalized = normalized.replace('&', '').replace(' ', '').lower()
        return normalized
    
    async def _determine_brand(self, brand_name: str, current_user: User, db) -> Optional[Brand]:
        """Determine brand with smart matching and normalization"""
        from sqlalchemy import func
        
        brand = None
        
        if brand_name:
            logger.info(f"[BRAND] Trying extracted brand: {brand_name}")
            
            # Strategy 1: Exact match
            brand = db.query(Brand).filter(
                func.lower(Brand.name) == brand_name.lower(),
                Brand.is_active == True
            ).first()
            
            # Strategy 2: Normalized matching (removes &, spaces, accents)
            if not brand:
                normalized_input = self._normalize_brand_name(brand_name)
                all_brands = db.query(Brand).filter(Brand.is_active == True).all()
                
                for db_brand in all_brands:
                    normalized_db = self._normalize_brand_name(db_brand.name)
                    if normalized_input == normalized_db:
                        brand = db_brand
                        logger.info(f"[BRAND] Normalized match: '{brand_name}' -> '{db_brand.name}'")
                        break
            
            # Strategy 3: Smart partial matching
            if not brand:
                all_brands = db.query(Brand).filter(Brand.is_active == True).all()
                
                for db_brand in all_brands:
                    if brand_name.lower() in db_brand.name.lower():
                        brand = db_brand
                        logger.info(f"[BRAND] Partial match: '{brand_name}' -> '{db_brand.name}'")
                        break
                    
                    if db_brand.name.lower() in brand_name.lower():
                        brand = db_brand
                        logger.info(f"[BRAND] Reverse match: '{brand_name}' -> '{db_brand.name}'")
                        break
                
                if brand:
                    logger.info(f"[BRAND] Found extracted brand: {brand.name} (ID: {brand.id})")
        
        # Fallback to user's brand
        if not brand:
            if brand_name:
                logger.warning(f"[BRAND] Extracted brand '{brand_name}' not found, using user's brand")
            else:
                logger.info(f"[BRAND] No brand extracted, using user's brand")
            
            if current_user.brand_id:
                brand = db.query(Brand).filter(
                    Brand.id == current_user.brand_id,
                    Brand.is_active == True
                ).first()
                
                if brand:
                    logger.info(f"[BRAND] Using user's brand: {brand.name} (ID: {brand.id})")
        
        return brand
    
    async def _update_existing_product(self, product: Product, product_info: ProductInfo, is_tag_image: bool, db):
        """Update existing product with new information"""
        if is_tag_image and product_info:
            updated_fields = []
            if product_info.product_type and not product.product_type:
                product.product_type = product_info.product_type
                updated_fields.append(f"type={product_info.product_type}")
            if product_info.size and not product.size_range:
                product.size_range = product_info.size
                updated_fields.append(f"size={product_info.size}")
            if product_info.price and product_info.price != 'Eksik' and not product.price:
                try:
                    product.price = float(product_info.price)
                    updated_fields.append(f"price=${product_info.price}")
                except (ValueError, TypeError):
                    logger.warning(f"[PRICE] Could not convert to float: {product_info.price}")
            
            if updated_fields:
                db.commit()
                db.refresh(product)
                logger.info(f"[PRODUCT UPDATED] {product.code} - {product.color} (ID: {product.id}) | Updated: {', '.join(updated_fields)}")
        
        logger.info(f"[EXISTING PRODUCT] Found: {product.code} - {product.color} (ID: {product.id}) | Type: {product.product_type}, Size: {product.size_range}, Price: ${product.price}")
    
    async def _create_new_product(self, product_info: ProductInfo, brand: Brand, current_user: User, db) -> Product:
        """Create new product"""
        if self.dual_product_info:
            # Dual product
            second_code = self.dual_product_info.get('code_2', '')
            second_color = self.dual_product_info.get('color_2', '')
            product_name = f"{brand.name} {product_info.product_code} {product_info.color} - {second_code} {second_color}"
            
            product = Product(
                name=product_name,
                code=product_info.product_code,
                color=product_info.color,
                brand_id=brand.id,
                price=float(product_info.price) if product_info.price and product_info.price != 'Eksik' else None,
                product_type=product_info.product_type,
                size_range=product_info.size,
                code_2=self.dual_product_info.get('code_2'),
                color_2=self.dual_product_info.get('color_2'),
                product_type_2=self.dual_product_info.get('product_type_2'),
                size_range_2=self.dual_product_info.get('size_range_2'),
                price_2=float(self.dual_product_info.get('price_2')) if self.dual_product_info.get('price_2') and self.dual_product_info.get('price_2') != 'Eksik' else None,
                ai_extracted_data={
                    "barcode": product_info.barcode,
                    "material": product_info.material,
                    "raw_text": product_info.raw_text,
                    "confidence": product_info.confidence,
                    "extracted_brand": product_info.brand_name,
                    "ocr_product_type": product_info.product_type,
                    "ocr_size": product_info.size,
                    "ocr_price": product_info.price,
                    "dual_product_info": self.dual_product_info
                },
                created_by=current_user.id,
                is_active=True,
                is_processed=False
            )
        else:
            # Single product
            product = Product(
                name=f"{brand.name} {product_info.product_code} - {product_info.color}",
                code=product_info.product_code,
                color=product_info.color,
                brand_id=brand.id,
                price=float(product_info.price) if product_info.price and product_info.price != 'Eksik' else None,
                product_type=product_info.product_type,
                size_range=product_info.size,
                ai_extracted_data={
                    "barcode": product_info.barcode,
                    "material": product_info.material,
                    "raw_text": product_info.raw_text,
                    "confidence": product_info.confidence,
                    "extracted_brand": product_info.brand_name,
                    "ocr_product_type": product_info.product_type,
                    "ocr_size": product_info.size,
                    "ocr_price": product_info.price
                },
                created_by=current_user.id,
                is_active=True,
                is_processed=False
            )
        
        db.add(product)
        db.commit()
        db.refresh(product)
        logger.info(f"[NEW PRODUCT] Created: {product.code} - {product.color} (ID: {product.id}) | Type: {product.product_type}, Size: {product.size_range}, Price: ${product.price}")
        
        return product
    
    async def _save_file_to_directory(self, file, product: Product, current_user: User, db, tmp_path: str):
        """Save file to proper directory structure - UNIFIED PATH STRUCTURE"""
        # CRITICAL FIX: Use same path structure as collages!
        # Path: backend/uploads/products/{product_id}/
        
        # Root uploads directory (backend/uploads)
        root_uploads = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
        
        if not self.upload_manager._is_safe_path(root_uploads):
            logger.error(f"[SECURITY] Unsafe root path: {root_uploads}")
            return
        
        # Build path: backend/uploads/products/{product_id}/
        product_dir = os.path.join(root_uploads, "products", str(product.id))
        
        if not self.upload_manager._is_safe_path(product_dir):
            logger.error(f"[SECURITY] Unsafe product directory: {product_dir}")
            return
        
        os.makedirs(product_dir, exist_ok=True)
        logger.info(f"[UNIFIED PATH] Saving to: {product_dir}")
        
        # FAST MODE: Skip optimization for speed, just copy the file
        permanent_path = os.path.join(product_dir, file.filename)
        try:
            # Check file size - only optimize if > 2MB
            file_size = os.path.getsize(tmp_path)
            if file_size > 2 * 1024 * 1024:  # 2MB
                optimize_result = image_optimizer.optimize_image(
                    input_path=tmp_path,
                    output_dir=product_dir,
                    filename=file.filename
                )
                logger.info(f"[IMAGE OPTIMIZED] {file.filename}: "
                           f"{optimize_result['original_size']/1024:.1f}KB -> "
                           f"{optimize_result['optimized_size']/1024:.1f}KB "
                           f"({optimize_result['compression_ratio']:.1f}% saved)")
            else:
                # Small file - just copy it (FAST!)
                shutil.copy2(tmp_path, permanent_path)
                logger.info(f"[IMAGE COPIED] {file.filename}: {file_size/1024:.1f}KB (no optimization needed)")
            
        except Exception as e:
            logger.error(f"[OPTIMIZE ERROR] {file.filename}: {e}")
            # Fallback: Orijinal dosyayı kullan
            shutil.copy2(tmp_path, permanent_path)
        
        # Check if this image already exists for this product
        existing_image = db.query(ProductImage).filter(
            ProductImage.product_id == product.id,
            ProductImage.filename == file.filename
        ).first()
        
        if not existing_image:
            # Additional check: Same user, same brand, same filename
            duplicate_image = db.query(ProductImage).join(Product).filter(
                Product.brand_id == product.brand_id,
                ProductImage.filename == file.filename,
                ProductImage.is_active == True
            ).first()
            
            if duplicate_image:
                logger.warning(f"[DUPLICATE PREVENTION] {file.filename} already exists in brand {product.brand.name} by another user")
                return  # Skip this upload
            
            # Create ProductImage record
            product_image = ProductImage(
                product_id=product.id,
                filename=file.filename,
                original_filename=file.filename,
                file_path=permanent_path,
                image_type='product',
                is_active=True
            )
            db.add(product_image)
            db.commit()
            logger.info(f"[IMAGE ADDED] {file.filename} -> Product ID: {product.id} ({product.code} - {product.color})")
        else:
            logger.info(f"[IMAGE EXISTS] {file.filename} already exists for Product ID: {product.id}")
    
    async def _check_and_create_collages_if_complete(self, product: Product, current_user: User, db):
        """Check if all images for this product have been uploaded and create collages if complete"""
        # Check if there are at least 1 non-tag image to create collage
        product_images = db.query(ProductImage).filter(
            ProductImage.product_id == product.id,
            ProductImage.is_active == True
        ).all()
        
        # Count non-tag images
        non_tag_images = []
        for img in product_images:
            if img.file_path and os.path.exists(img.file_path):
                # Skip tag images (images with 'tag' in filename or image_type)
                if img.image_type == 'tag' or 'tag' in img.filename.lower():
                    continue
                # Skip etiket images (etiket in filename)
                if 'etiket' in img.filename.lower():
                    continue
                non_tag_images.append(img.file_path)
        
        # Only create collages when we have at least 1 non-tag image and are done processing
        # For this, we'll create collages after a reasonable number of images have been processed
        # We'll do this if there are at least 1 non-tag image
        if len(non_tag_images) >= 1:
            # Check if this is the time to create the collage
            # We'll create collage once total processing is complete
            # For now, we'll just call the collage creation to replace the old method
            await self._create_templates_and_collages(product, current_user, db)
    
    async def _create_templates_and_collages(self, product: Product, current_user: User, db):
        """Create templates and collages for the product"""
        try:
            # Flush DB to ensure product.images is up to date
            db.flush()
            
            # Count existing images
            existing_images_count = db.query(ProductImage).filter(
                ProductImage.product_id == product.id,
                ProductImage.is_active == True
            ).count()
            
            # Create collage if we have at least 1 image
            should_create_collage = existing_images_count >= 1
            
            if should_create_collage:
                # Collage file path - use the actual product code and color
                collage_filename = f"{product.code}_{product.color}_collage.jpg"
                collage_path = os.path.join(
                    os.path.dirname(product.images[0].file_path) if product.images else "",
                    collage_filename
                )
                
                # Create template and Fabric.js template only on first image
                template = None
                template_id = None
                
                if existing_images_count == 1:
                    # Create auto template (only on first image)
                    template = await self.upload_manager._create_auto_template(product, current_user, db)
                    template_id = template.id if template else None
                    logger.info(f"[TEMPLATE] Auto template created for product {product.code}")
                else:
                    logger.info(f"[TEMPLATE] Skipped - already exists for product {product.code}")
                
                # Create professional collage (örnek görsellere göre)
                from services.professional_collage_maker import professional_collage_maker
                from services.telegram_service import TelegramService
                from services.template_service import TemplateService
                telegram_service = TelegramService()
                template_service = TemplateService(db)
                
                # Get product image paths (exclude tag images, max 4 images)
                product_image_paths = []
                for img in product.images:
                    if img.file_path and os.path.exists(img.file_path):
                        # Skip tag images (images with 'tag' in filename or image_type)
                        if img.image_type == 'tag' or 'tag' in img.filename.lower():
                            continue
                        # Skip etiket images (etiket in filename)
                        if 'etiket' in img.filename.lower():
                            continue
                        product_image_paths.append(img.file_path)
                        
                        # Limit to max 3 images for collage (etiket hariç)
                        if len(product_image_paths) >= 3:
                            break
                
                # Second product info
                code2 = getattr(product, 'code_2', None)
                color2 = getattr(product, 'color_2', None)
                ptype2 = getattr(product, 'product_type_2', None)
                size2 = getattr(product, 'size_range_2', None)
                price2 = getattr(product, 'price_2', None)
                
                # Get OCR data
                ocr_brand_logo = None
                ocr_raw_text = None
                
                if hasattr(product, 'ai_extracted_data') and product.ai_extracted_data:
                    ai_data = product.ai_extracted_data
                    if isinstance(ai_data, dict):
                        ocr_raw_text = ai_data.get('raw_text')
                        if ocr_raw_text:
                            if 'kokart' in ocr_raw_text.lower():
                                ocr_brand_logo = 'kokART'
                            elif 'lilium' in ocr_raw_text.lower():
                                ocr_brand_logo = 'LİLİUM'
                            elif 'my8' in ocr_raw_text.lower():
                                ocr_brand_logo = 'my8-design'
                
                # Detect badge (NEW!, PLUS SIZE!, etc.)
                badge = None
                if hasattr(product, 'is_new') and product.is_new:
                    badge = "NEW!"
                elif 'plus' in (product.size_range or "").lower() or 'büyük' in (product.size_range or "").lower():
                    badge = "PLUS SIZE!"
                
                # Determine logo from OCR or brand
                logo = ocr_brand_logo if ocr_brand_logo else "my8"
                if logo == 'kokART':
                    logo = 'kokart'
                elif logo == 'my8-design':
                    logo = 'my8'
                elif logo == 'LİLİUM':
                    logo = 'lilium'
                
                # Create professional collage (örnek görsellere göre)
                if professional_collage_maker.create_professional_collage(
                    product_code=product.code,
                    color=product.color,
                    brand=product.brand.name if product.brand else "",
                    product_type=product.product_type or "ITEM",
                    size_range=product.size_range or "Standard",
                    price=product.price if product.price else 25.0,
                    product_images=product_image_paths,
                    output_path=collage_path,
                    # Dual product support
                    product_code_2=code2,
                    color_2=color2,
                    product_type_2=ptype2,
                    size_range_2=size2,
                    price_2=price2,
                    # Badge and logo
                    badge=badge,
                    logo=logo
                ):
                    logger.info(f"[PROFESSIONAL COLLAGE] Created/Updated: {collage_filename}")
                    
                    # Save collage to product as an image
                    from models.product import ProductImage
                    collage_image = ProductImage(
                        product_id=product.id,
                        file_path=collage_path,
                        filename=collage_filename,
                        image_type='collage',
                        is_primary=False
                    )
                    db.add(collage_image)
                    db.commit()
                    logger.info(f"[COLLAGE SAVED] Added collage to product images: {collage_filename}")
                    
                    # Save collage as a template
                    await self._save_collage_as_template(product, collage_path, collage_filename, db)
                    
                    # Send to brand-specific Telegram channel - just the image, no message text
                    product_info = {
                        'product_code': product.code,
                        'color': product.color,
                        'brand': product.brand.name if product.brand else "MARKA",
                        'product_type': product.product_type,
                        'size_range': product.size_range,
                        'price': f"{product.price} USD" if product.price else "Fiyat Belirtilmemiş"
                    }
                    
                    # Send collage to brand-specific Telegram channel (just the image)
                    telegram_success = telegram_service.send_collage(
                        image_path=collage_path,
                        caption="",  # Empty caption - image only
                        product_info=product_info,
                        brand_id=product.brand_id,
                        db=db
                    )
                    
                    if telegram_success:
                        logger.info(f"[TELEGRAM] Sent collage for {product.code} to brand {product.brand_id}")
                        
                        # Check for video and send it after collage
                        video_path = self._find_product_video(product)
                        if video_path:
                            logger.info(f"[VIDEO] Found video for {product.code}: {video_path}")
                            video_success = telegram_service.send_video(
                                video_path=video_path,
                                caption="",  # Empty caption - video only
                                product_info=product_info,
                                brand_id=product.brand_id,
                                db=db
                            )
                            if video_success:
                                logger.info(f"[TELEGRAM] Sent video for {product.code} to brand {product.brand_id}")
                            else:
                                logger.warning(f"[TELEGRAM] Failed to send video for {product.code}")
                        else:
                            logger.debug(f"[VIDEO] No video found for {product.code}")
                    else:
                        logger.warning(f"[TELEGRAM] Failed to send collage for {product.code} to brand {product.brand_id}")
                
                else:
                    logger.warning(f"[PROFESSIONAL COLLAGE] Failed for {product.code}")
            else:
                logger.info(f"[COLLAGE] Skipped - no images to process")
                
        except Exception as e:
            logger.error(f"[COLLAGE] Error creating collage: {e}")
    
    async def create_product_collage(self, product_code: str, current_user, db):
        """Create collage for a specific product (called after all images are uploaded)"""
        try:
            from models.product import Product
            
            # Find product
            product = db.query(Product).filter(
                Product.code == product_code,
                Product.is_active == True
            ).first()
            
            if not product:
                logger.warning(f"[COLLAGE] Product not found: {product_code}")
                return
            
            logger.info(f"[COLLAGE] Creating collage for product: {product.code} - {product.color}")
            
            # Create collage
            await self._create_collage_for_product(product, current_user, db)
            
        except Exception as e:
            logger.error(f"[COLLAGE] Error creating collage for {product_code}: {e}")
    
    async def _create_collage_for_product(self, product, current_user, db):
        """Internal method to create collage for a product"""
        try:
            # Get collage directory - ÜRÜN KLASÖRÜ İÇİNDE /collages/
            product_dir = os.path.join(self.upload_manager.uploads_dir, 'products', str(product.id))
            collage_dir = os.path.join(product_dir, 'collages')
            os.makedirs(collage_dir, exist_ok=True)
            
            # Prepare collage filename
            collage_filename = f"{product.code}_{product.color}_collage.jpg".replace(' ', '_')
            collage_path = os.path.join(collage_dir, collage_filename)
            
            # Import services
            from services.professional_collage_maker import professional_collage_maker
            from services.telegram_service import TelegramService
            telegram_service = TelegramService()
            
            # Get product images (exclude tags and collages)
            # Etiket = dosya adında sayı OLMAYAN veya 'tag'/'etiket' içeren
            product_image_paths = []
            for img in product.images:
                if not img.file_path or not os.path.exists(img.file_path):
                    continue
                
                # Kolajları atla
                if img.image_type == 'collage':
                    continue
                
                # Etiketleri atla (image_type='tag' veya dosya adında 'tag'/'etiket')
                if img.image_type == 'tag':
                    continue
                if 'tag' in img.filename.lower() or 'etiket' in img.filename.lower():
                    continue
                
                # Dosya adında sayı OLMAYAN görseller etiket olabilir - atla
                import re
                if not re.search(r'\d+\.jpg$', img.filename, re.IGNORECASE):
                    logger.info(f"[COLLAGE] Skipping potential tag (no number): {img.filename}")
                    continue
                
                product_image_paths.append(img.file_path)
                if len(product_image_paths) >= 3:
                    break
            
            if not product_image_paths:
                logger.warning(f"[COLLAGE] No product images found for {product.code}")
                return
            
            # Detect badge and logo
            badge = None
            if hasattr(product, 'is_new') and product.is_new:
                badge = "NEW!"
            elif 'plus' in (product.size_range or "").lower() or 'büyük' in (product.size_range or "").lower():
                badge = "PLUS SIZE!"
            
            logo = "my8"  # Default
            
            # Create collage
            if professional_collage_maker.create_professional_collage(
                product_code=product.code,
                color=product.color,
                brand=product.brand.name if product.brand else "",
                product_type=product.product_type or "Ürün",
                size_range=product.size_range or "Standart",
                price=product.price if product.price else None,  # None = Fiyat Belirtilmemiş
                product_images=product_image_paths,
                output_path=collage_path,
                badge=badge,
                logo=logo
            ):
                logger.info(f"[COLLAGE] Created: {collage_filename}")
                
                # Save to product images
                from models.product import ProductImage
                
                # Check if collage already exists
                existing_collage = db.query(ProductImage).filter(
                    ProductImage.product_id == product.id,
                    ProductImage.image_type == 'collage'
                ).first()
                
                if not existing_collage:
                    collage_image = ProductImage(
                        product_id=product.id,
                        file_path=collage_path,
                        filename=collage_filename,
                        original_filename=collage_filename,
                        image_type='collage'
                    )
                    db.add(collage_image)
                    db.commit()
                    logger.info(f"[COLLAGE] Saved to product images")
                
                # Check if product has missing information
                has_missing_info = self._check_missing_product_info(product)
                
                if not has_missing_info:
                    # Send to Telegram only if no missing information
                    product_info = {
                        'product_code': product.code,
                        'color': product.color,
                        'brand': product.brand.name if product.brand else "MARKA",
                        'product_type': product.product_type,
                        'size_range': product.size_range,
                        'price': f"{product.price} USD" if product.price else "Fiyat Belirtilmemiş"
                    }
                    
                    telegram_success = telegram_service.send_collage(
                        image_path=collage_path,
                        caption="",  # No caption
                        product_info=product_info,
                        brand_id=product.brand_id,
                        db=db
                    )
                    
                    if telegram_success:
                        logger.info(f"[TELEGRAM] Sent collage to channel")
                    
                    # Check for video
                    video_path = self._find_product_video(product)
                    if video_path:
                        logger.info(f"[VIDEO] Found: {video_path}")
                        telegram_service.send_video(
                            video_path=video_path,
                            caption="",
                            product_info=product_info,
                            brand_id=product.brand_id,
                            db=db
                        )
                else:
                    logger.info(f"[COLLAGE] Created but not sent to Telegram due to missing information: {product.code}")
                
                return True  # Collage created successfully
                    
        except Exception as e:
            logger.error(f"[COLLAGE] Error: {e}")
            return False
    
    def _check_missing_product_info(self, product) -> bool:
        """Check if product has missing information"""
        try:
            missing_fields = []
            
            # Check required fields
            if not product.product_type or product.product_type == "Eksik":
                missing_fields.append("product_type")
            
            if not product.size_range or product.size_range == "Eksik":
                missing_fields.append("size_range")
            
            if not product.price or product.price == 0:
                missing_fields.append("price")
            
            if missing_fields:
                logger.info(f"[MISSING INFO] Product {product.code} missing: {', '.join(missing_fields)}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"[MISSING INFO CHECK] Error: {e}")
            return True  # Assume missing if error
    
    def _find_product_video(self, product: 'Product') -> Optional[str]:
        """Ürün için video dosyası bul (ürün kodu ile aynı isimde .mp4)"""
        try:
            # Ürün görsellerinin bulunduğu dizini bul
            if not product.images or len(product.images) == 0:
                return None
            
            first_image = product.images[0]
            if not first_image.file_path:
                return None
            
            # Görsel dizini
            image_dir = os.path.dirname(first_image.file_path)
            
            # Video dosya adları (ürün kodu ile)
            possible_video_names = [
                f"{product.code}.mp4",
                f"{product.code}.MP4",
                f"{product.code}_{product.color}.mp4",
                f"{product.code}_{product.color}.MP4",
                f"{product.code.lower()}.mp4",
                f"{product.code.upper()}.mp4"
            ]
            
            # Video dosyasını ara
            for video_name in possible_video_names:
                video_path = os.path.join(image_dir, video_name)
                if os.path.exists(video_path):
                    logger.info(f"[VIDEO] Found video: {video_path}")
                    return video_path
            
            # Bulunamadı
            return None
            
        except Exception as e:
            logger.error(f"[VIDEO] Error finding video: {e}")
            return None
    
    async def _save_collage_as_template(self, product, collage_path: str, collage_filename: str, db: Session):
        """Save automatically generated collage as a template"""
        try:
            from models.template import Template
            
            # Create template name
            template_name = f"Otomatik Kolaj - {product.code} {product.color}"
            
            # Check if template already exists
            existing_template = db.query(Template).filter(
                Template.name == template_name,
                Template.is_auto_generated == True,
                Template.created_by == product.created_by
            ).first()
            
            if existing_template:
                # Update existing template
                existing_template.template_data = {
                    'type': 'auto_collage',
                    'product_code': product.code,
                    'color': product.color,
                    'brand': product.brand.name if product.brand else '',
                    'product_type': product.product_type,
                    'size_range': product.size_range,
                    'price': product.price,
                    'collage_path': collage_path,
                    'collage_filename': collage_filename
                }
                existing_template.updated_at = datetime.now()
                logger.info(f"[TEMPLATE] Updated existing auto-collage template: {template_name}")
            else:
                # Create new template
                template = Template(
                    name=template_name,
                    description=f"Otomatik oluşturulan kolaj şablonu - {product.code} {product.color}",
                    template_type='collage',
                    template_data={
                        'type': 'auto_collage',
                        'product_code': product.code,
                        'color': product.color,
                        'brand': product.brand.name if product.brand else '',
                        'product_type': product.product_type,
                        'size_range': product.size_range,
                        'price': product.price,
                        'collage_path': collage_path,
                        'collage_filename': collage_filename
                    },
                    is_active=True,
                    is_auto_generated=True,
                    is_master_template=False,
                    created_by=product.created_by,
                    visibility='PRIVATE',
                    placeholders=[],
                    assigned_brands=[product.brand_id] if product.brand_id else []
                )
                db.add(template)
                logger.info(f"[TEMPLATE] Created new auto-collage template: {template_name}")
            
            db.commit()
            
        except Exception as e:
            logger.error(f"[TEMPLATE] Error saving collage as template: {e}")
            db.rollback()
