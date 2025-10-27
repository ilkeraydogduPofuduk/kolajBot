"""
ENTERPRISE-LEVEL PRODUCT UPLOAD API
Version 3.0 - Modüler Yapı

Features:
- Instant upload response
- Background processing
- Advanced directory structure
- Multi-color support
- OCR on tags only
- Template generation
- Error recovery
- Modular architecture
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Query
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Dict, Any, Optional
import os
from datetime import datetime

from database import get_db
from dependencies.auth import get_current_active_user
from dependencies.role_checker import resource_access, brand_access
from models.user import User
from models.brand import Brand
from models.upload_job import UploadJob
from models.product import Product, ProductImage
from services.product_upload_manager import ProductUploadManager
from services.product_helpers import ProductHelpers
from core.logging import get_logger

logger = get_logger('products_enterprise')

router = APIRouter()

# Global manager instance
upload_manager = ProductUploadManager()
product_helpers = ProductHelpers()

@router.post("/upload-v2")
async def upload_products_v2(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Enterprise product upload endpoint"""
    try:
        result = await upload_manager.process_upload(
            files, current_user, db, background_tasks
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")

@router.get("/upload-status/{job_id}")
async def get_upload_status(
    job_id: int,
    db: Session = Depends(get_db)
):
    """Get upload job status"""
    try:
        job = db.query(UploadJob).filter(UploadJob.id == job_id).first()
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Extract failed files count from processing_log
        failed_files = 0
        if job.processing_log and isinstance(job.processing_log, dict):
            failed_files = job.processing_log.get('failed_files', 0)
        
        return {
            'job_id': job.id,
            'status': job.status,
            'total_files': job.total_files,
            'processed_files': job.processed_files,
            'failed_files': failed_files,
            'created_at': job.created_at,
            'completed_at': job.completed_at
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status check error: {e}")
        raise HTTPException(status_code=500, detail="Status check failed")

@router.put("/{product_id}")
async def update_product(
    product_id: int,
    update_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update product information"""
    try:
        # Find product
        product = db.query(Product).filter(
            Product.id == product_id,
            Product.is_active == True
        ).first()
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # DİNAMİK: Ürün erişim kontrolü
        if not resource_access.check_product_access(current_user, product.brand_id, product.created_by, db):
            raise HTTPException(status_code=403, detail="Bu ürüne erişim yetkiniz yok")
        
        # Update fields
        if 'product_type' in update_data:
            product.product_type = update_data['product_type']
        if 'size_range' in update_data:
            product.size_range = update_data['size_range']
        if 'price' in update_data:
            product.price = update_data['price']
        if 'brand_id' in update_data:
            product.brand_id = update_data['brand_id']
        if 'color' in update_data:
            product.color = update_data['color']
        
        product.updated_at = datetime.now()
        
        db.commit()
        db.refresh(product)
        
        # OTOMATIK KOLAJ: Bilgiler tamamsa kolaj oluştur ve paylaş
        collage_created = False
        auto_shared = False
        
        if product.brand_id and product.price is not None:
            # Get product images (excluding tags and old collages)
            product_images = [img for img in product.images if img.image_type not in ['collage', 'tag']]
            
            if product_images:
                try:
                    # CRITICAL: Delete old collage first (to force recreation)
                    old_collages = [img for img in product.images if img.image_type == 'collage']
                    for old_collage in old_collages:
                        logger.info(f"[AUTO COLLAGE] Removing old collage: {old_collage.filename}")
                        db.delete(old_collage)
                        # Delete physical file
                        import os
                        if os.path.exists(old_collage.file_path):
                            try:
                                os.remove(old_collage.file_path)
                                logger.info(f"[AUTO COLLAGE] Deleted old file: {old_collage.file_path}")
                            except Exception as e:
                                logger.error(f"[AUTO COLLAGE] Error deleting old file: {e}")
                    db.commit()
                    db.refresh(product)
                    
                    # Create NEW collage
                    from services.product_file_processor import ProductFileProcessor
                    from services.product_upload_manager import ProductUploadManager
                    
                    upload_manager = ProductUploadManager()
                    processor = ProductFileProcessor(upload_manager)
                    
                    # Create collage
                    success = await processor._create_collage_for_product(product, current_user, db)
                    
                    if success:
                        collage_created = True
                        logger.info(f"[AUTO COLLAGE] Created NEW collage for product {product.id}")
                        
                        # OTOMATIK PAYLAŞIM - Bilgiler tamamlandığında kolajı Telegram'a gönder
                        try:
                            from services.telegram_service import telegram_service
                            
                            # Refresh to get new collage
                            db.refresh(product)
                            
                            # Get collage path
                            collage_images = [img for img in product.images if img.image_type == 'collage']
                            if collage_images:
                                collage_path = collage_images[0].file_path
                                
                                # Send to telegram
                                caption = f"✅ Güncel Kolaj\n{product.brand.name if product.brand else 'N/A'}\n{product.code} - {product.color}\nFiyat: {product.price} TL"
                                
                                result = await telegram_service.send_collage_to_brand(
                                    collage_path=collage_path,
                                    brand_id=product.brand_id,
                                    caption=caption,
                                    db=db
                                )
                                
                                if result:
                                    product.telegram_sent = True
                                    db.commit()
                                    auto_shared = True
                                    logger.info(f"[AUTO SHARE] Collage automatically sent to Telegram for product {product.id}")
                        
                        except Exception as e:
                            logger.error(f"[AUTO SHARE] Error: {e}")
                
                except Exception as e:
                    logger.error(f"[AUTO COLLAGE] Error: {e}")
        
        return {
            "success": True,
            "message": "Ürün güncellendi, yeni kolaj oluşturuldu ve otomatik paylaşıldı!" if auto_shared else "Ürün güncellendi",
            "collage_created": collage_created,
            "auto_shared": auto_shared,
            "product": {
                "id": product.id,
                "code": product.code,
                "color": product.color,
                "product_type": product.product_type,
                "size_range": product.size_range,
                "price": product.price,
                "brand_id": product.brand_id
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating product: {e}")
        raise HTTPException(status_code=500, detail="Update failed")

@router.get("")
@router.get("/")
async def get_products(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=1000),
    search: Optional[str] = Query(None),
    brand_id: Optional[int] = Query(None),
    color: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get products with enterprise query optimization and role-based filtering"""
    try:
        query = db.query(Product).filter(Product.is_active == True)
        
        # DİNAMİK: Kullanıcının erişebileceği markalar
        accessible_brand_ids = brand_access.get_accessible_brand_ids(current_user, db)
        
        if accessible_brand_ids is not None:  # None = tüm markalar
            if not accessible_brand_ids:
                # Hiç markası yok - sadece kendi oluşturdukları
                query = query.filter(Product.created_by == current_user.id)
            else:
                # Belirli markalar veya kendi oluşturdukları
                query = query.filter(
                    or_(
                        Product.created_by == current_user.id,
                        Product.brand_id.in_(accessible_brand_ids)
                    )
                )
        
        # Apply filters
        if search:
            query = query.filter(
                or_(
                    Product.code.ilike(f"%{search}%"),
                    Product.name.ilike(f"%{search}%")
                )
            )
        
        if brand_id:
            query = query.filter(Product.brand_id == brand_id)
        
        if color:
            query = query.filter(Product.color.ilike(f"%{color}%"))
        
        # Order by created_at DESC (newest first)
        query = query.order_by(Product.created_at.desc())
        
        # Pagination
        total = query.count()
        products = query.offset((page - 1) * per_page).limit(per_page).all()
        
        # Add images to each product and convert to response format
        product_responses = []
        for product in products:
            # Get images
            images = db.query(ProductImage).filter(
                ProductImage.product_id == product.id,
                ProductImage.is_active == True
            ).all()
            
            # Get brand name
            brand = db.query(Brand).filter(Brand.id == product.brand_id).first()
            brand_name = brand.name if brand else None
            
            # Convert to response model
            product_dict = {
                'id': product.id,
                'name': product.name,
                'code': product.code,
                'color': product.color,
                'product_type': product.product_type,
                'size_range': product.size_range,
                'price': product.price,
                'currency': product.currency if hasattr(product, 'currency') else 'USD',
                'brand_id': product.brand_id,
                'brand_name': brand_name,
                'ai_extracted_data': product.ai_extracted_data,
                'is_active': product.is_active,
                'is_processed': product.is_processed,
                'created_at': product.created_at.isoformat() if product.created_at else None,
                'updated_at': product.updated_at.isoformat() if product.updated_at else None,
                'images': [{
                    'id': img.id,
                    'product_id': img.product_id,
                    'filename': img.filename,
                    'original_filename': img.original_filename,
                    'file_path': img.file_path,
                    'image_type': img.image_type,
                    'angle': img.angle if hasattr(img, 'angle') else None,
                    'angle_number': img.angle_number if hasattr(img, 'angle_number') else None,
                    'is_cover_image': img.is_cover_image if hasattr(img, 'is_cover_image') else False,
                    'file_size': img.file_size if hasattr(img, 'file_size') else None,
                    'mime_type': img.mime_type if hasattr(img, 'mime_type') else None,
                    'ai_analysis': img.ai_analysis if hasattr(img, 'ai_analysis') else None,
                    'is_active': img.is_active,
                    'created_at': img.created_at.isoformat() if img.created_at else None,
                    'updated_at': img.updated_at.isoformat() if img.updated_at else None
                } for img in images],
                'templates': []  # Empty for now
            }
            product_responses.append(product_dict)
        
        return JSONResponse(
            content={
                'products': product_responses,
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page
            },
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*"
            }
        )
    except Exception as e:
        logger.error(f"Products query error: {e}")
        return JSONResponse(
            content={
                'products': [],
                'total': 0,
                'page': page,
                'per_page': per_page,
                'total_pages': 0
            },
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*"
            }
        )

@router.get("/filter-options", response_model=Dict[str, List[str]])
async def get_filter_options(
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get available filter options for dropdowns"""
    try:
        from sqlalchemy import distinct
        
        # Get distinct product types
        product_types = db.query(distinct(Product.product_type)).filter(
            Product.product_type.isnot(None),
            Product.product_type != ''
        ).all()
        
        # Get distinct colors
        colors = db.query(distinct(Product.color)).filter(
            Product.color.isnot(None),
            Product.color != ''
        ).all()
        
        # Get distinct size ranges
        size_ranges = db.query(distinct(Product.size_range)).filter(
            Product.size_range.isnot(None),
            Product.size_range != ''
        ).all()
        
        # Get distinct brands
        brands = db.query(distinct(Brand.name)).filter(
            Brand.is_active == True
        ).all()
        
        return {
            "product_types": [pt[0] for pt in product_types if pt[0]],
            "colors": [c[0] for c in colors if c[0]],
            "size_ranges": [sr[0] for sr in size_ranges if sr[0]],
            "brands": [b[0] for b in brands if b[0]]
        }
    except Exception as e:
        logger.error(f"Filter options error: {e}")
        raise HTTPException(status_code=500, detail=f"Filter options error: {str(e)}")

@router.get("/{product_id}")
async def get_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    """Get single product"""
    try:
        product = db.query(Product).filter(
            Product.id == product_id,
            Product.is_active == True
        ).first()
        
        if not product:
            return JSONResponse(
                content={"detail": "Product not found"},
                status_code=404,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "*"
                }
            )
        
        # Add images to product and convert to response format
        images = db.query(ProductImage).filter(
            ProductImage.product_id == product.id,
            ProductImage.is_active == True
        ).all()
        
        # Get brand name
        brand = db.query(Brand).filter(Brand.id == product.brand_id).first()
        brand_name = brand.name if brand else None
        
        # Convert to response model
        product_dict = {
            'id': product.id,
            'name': product.name,
            'code': product.code,
            'color': product.color,
            'product_type': product.product_type,
            'size_range': product.size_range,
            'price': product.price,
            'currency': product.currency if hasattr(product, 'currency') else 'USD',
            'brand_id': product.brand_id,
            'brand_name': brand_name,
            'ai_extracted_data': product.ai_extracted_data,
            'is_active': product.is_active,
            'is_processed': product.is_processed,
            'created_at': product.created_at.isoformat() if product.created_at else None,
            'updated_at': product.updated_at.isoformat() if product.updated_at else None,
            'images': [{
                'id': img.id,
                'product_id': img.product_id,
                'filename': img.filename,
                'original_filename': img.original_filename,
                'file_path': img.file_path,
                'image_type': img.image_type,
                'angle': img.angle if hasattr(img, 'angle') else None,
                'angle_number': img.angle_number if hasattr(img, 'angle_number') else None,
                'is_cover_image': img.is_cover_image if hasattr(img, 'is_cover_image') else False,
                'file_size': img.file_size if hasattr(img, 'file_size') else None,
                'mime_type': img.mime_type if hasattr(img, 'mime_type') else None,
                'ai_analysis': img.ai_analysis if hasattr(img, 'ai_analysis') else None,
                'is_active': img.is_active,
                'created_at': img.created_at.isoformat() if img.created_at else None,
                'updated_at': img.updated_at.isoformat() if img.updated_at else None
            } for img in images],
            'templates': []  # Empty for now
        }
        
        return JSONResponse(
            content=product_dict,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Product query error: {e}")
        return JSONResponse(
            content={},
            status_code=404,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*"
            }
        )

@router.get("/{product_id}/collage")
async def get_product_collage(
    product_id: int,
    db: Session = Depends(get_db)
):
    """Ürün için oluşturulan kolaj dosyasını getir"""
    try:
        # Find collage in product images
        collage_image = db.query(ProductImage).filter(
            ProductImage.product_id == product_id,
            ProductImage.image_type == 'collage'
        ).first()
        
        if not collage_image:
            raise HTTPException(status_code=404, detail="Collage not found for this product")
        
        collage_path = collage_image.file_path
        
        # Check if file exists
        if os.path.exists(collage_path):
            return FileResponse(
                collage_path,
                media_type="image/jpeg",
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "*"
                }
            )
        else:
            raise HTTPException(status_code=404, detail="Collage file not found on disk")
            
    except Exception as e:
        logger.error(f"Error getting product collage: {e}")
        return JSONResponse(
            content={
                "success": False,
                "error": str(e)
            },
            status_code=500,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*"
            }
        )
