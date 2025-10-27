"""
Collage Management API
Eksik bilgili ürünler için kolaj yönetimi
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional, List, Dict, Any
from datetime import datetime
import os

from database import get_db
from dependencies.auth import get_current_active_user
from dependencies.role_checker import brand_access, resource_access
from models.user import User
from models.product import Product, ProductImage
from models.brand import Brand
from services.professional_collage_maker import ProfessionalCollageMaker
from services.telegram_service import telegram_service
from core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(
    prefix="/api/collages",
    tags=["collages"]
)

@router.get("/pending")
async def get_pending_collages(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    brand_id: Optional[int] = None,
    search: Optional[str] = Query(None),
    filter_type: Optional[str] = Query(None),  # 'missing', 'complete', 'has_collage', 'no_collage', 'sent', 'not_sent'
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get ALL products (with flexible filtering) - NOT just pending ones
    """
    try:
        # CRITICAL FIX: Base query gets ALL products, filtering happens below
        query = db.query(Product).filter(Product.is_active == True)
        
        # DİNAMİK: Kullanıcının erişebileceği ürünler
        accessible_brand_ids = brand_access.get_accessible_brand_ids(current_user, db)
        
        if accessible_brand_ids is not None:  # None = tüm markalar
            if not accessible_brand_ids:
                # Hiç markası yok - sadece kendi oluşturdukları
                query = query.filter(Product.created_by == current_user.id)
            else:
                # Belirli markalar veya kendi oluşturdukları
                query = query.filter(
                    or_(
                        Product.brand_id.in_(accessible_brand_ids),
                        Product.created_by == current_user.id
                    )
                )
        
        # Brand filter
        if brand_id:
            query = query.filter(Product.brand_id == brand_id)
        
        # Search filter
        if search:
            query = query.filter(
                or_(
                    Product.code.ilike(f"%{search}%"),
                    Product.color.ilike(f"%{search}%"),
                    Product.name.ilike(f"%{search}%")
                )
            )
        
        # Apply filter type
        if filter_type == 'missing':
            # Only products with missing info (EKSIK)
            query = query.filter(
                or_(
                    Product.price == None,
                    Product.brand_id == None,
                    Product.product_type == None,
                    Product.size_range == None
                )
            )
        elif filter_type == 'complete':
            # Products with all info complete (TAM)
            query = query.filter(
                and_(
                    Product.price != None,
                    Product.brand_id != None,
                    Product.product_type != None,
                    Product.size_range != None
                )
            )
        elif filter_type == 'has_collage':
            # Products that have collage (KOLAJ VAR)
            query = query.filter(
                Product.images.any(ProductImage.image_type == 'collage')
            )
        elif filter_type == 'no_collage':
            # Products without collage (KOLAJ YOK)
            query = query.filter(
                ~Product.images.any(ProductImage.image_type == 'collage')
            )
        elif filter_type == 'sent':
            # Products sent to telegram (GÖNDERİLDİ)
            query = query.filter(
                and_(
                    Product.images.any(ProductImage.image_type == 'collage'),
                    Product.telegram_sent == True
                )
            )
        elif filter_type == 'not_sent':
            # Products not sent to telegram (GÖNDERİLMEDİ)
            query = query.filter(
                or_(
                    ~Product.images.any(ProductImage.image_type == 'collage'),
                    Product.telegram_sent != True
                )
            )
        
        # Order by created_at DESC (newest first)
        query = query.order_by(Product.created_at.desc())
        
        # Get total and paginate
        total = query.count()
        products = query.offset((page - 1) * per_page).limit(per_page).all()
        
        # Format response
        pending_collages = []
        for product in products:
            # Check what's missing
            missing_fields = []
            if not product.price:
                missing_fields.append('price')
            if not product.brand_id:
                missing_fields.append('brand')
            if not product.product_type:
                missing_fields.append('type')
            if not product.size_range:
                missing_fields.append('size')
            
            # Check if has collage
            has_collage = any(img.image_type == 'collage' for img in product.images)
            
            # Get cover image - ÖNCE KOLAJ GÖRSELİ, YOKSA ÜRÜN GÖRSELİ
            cover_image_url = None
            collage_url = None
            
            # Get collage image if exists (KAPAK RESMİ)
            collage_images = [img for img in product.images if img.image_type == 'collage']
            if collage_images:
                collage_url = f"/api/images/{collage_images[0].filename}"
                cover_image_url = collage_url  # KOLAJ GÖRSELİ KAPAK RESMİ OLARAK
            else:
                # Get all non-tag images
                non_tag_images = [img for img in product.images if img.image_type != 'collage' and img.image_type != 'tag']
                if non_tag_images:
                    # Sort by filename to get the one with lowest number
                    non_tag_images.sort(key=lambda x: x.filename)
                    cover_image_url = f"/api/images/{non_tag_images[0].filename}"
            
            pending_collages.append({
                'id': product.id,
                'code': product.code,
                'color': product.color,
                'brand': product.brand.name if product.brand else None,
                'brand_id': product.brand_id,
                'product_type': product.product_type,
                'size_range': product.size_range,
                'price': product.price,
                'missing_fields': missing_fields,
                'has_collage': has_collage,
                'telegram_sent': product.telegram_sent if hasattr(product, 'telegram_sent') else False,
                'image_count': len([img for img in product.images if img.image_type != 'collage']),
                'created_at': product.created_at.isoformat() if product.created_at else None,
                'can_create_collage': len(missing_fields) == 0 and not has_collage,
                'can_edit': len(missing_fields) > 0,  # Eksik bilgi varsa düzenlenebilir
                'cover_image_url': cover_image_url,
                'collage_url': collage_url,
                'all_images': [{'url': f"/api/images/{img.filename}", 'type': img.image_type} for img in product.images if img.image_type != 'tag']
            })
        
        return {
            'products': pending_collages,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }
        
    except Exception as e:
        logger.error(f"Error getting pending collages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.put("/products/{product_id}/complete")
async def complete_product_info(
    product_id: int,
    data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update missing product info and create collage
    """
    try:
        # Get product
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        # DİNAMİK: Ürün erişim kontrolü
        if not resource_access.check_product_access(current_user, product.brand_id, product.created_by, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu ürünü düzenleme yetkiniz yok"
            )
        
        # Update product info
        updated_fields = []
        
        if 'brand_id' in data and data['brand_id']:
            # Verify brand exists and user has access
            brand = db.query(Brand).filter(Brand.id == data['brand_id']).first()
            if not brand:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Brand not found"
                )
            product.brand_id = data['brand_id']
            updated_fields.append('brand')
        
        if 'product_type' in data and data['product_type']:
            product.product_type = data['product_type']
            updated_fields.append('type')
        
        if 'size_range' in data and data['size_range']:
            product.size_range = data['size_range']
            updated_fields.append('size')
        
        if 'price' in data and data['price'] is not None:
            try:
                product.price = float(data['price'])
                updated_fields.append('price')
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid price format"
                )
        
        # Save changes
        db.commit()
        db.refresh(product)
        
        logger.info(f"[COLLAGE] Updated product {product.id}: {', '.join(updated_fields)}")
        
        # ALWAYS recreate collage and share if all info is complete
        auto_shared = False
        collage_created = False
        
        if product.brand_id and product.price is not None:
            # Get product images (excluding tags and old collages)
            product_images = [img for img in product.images if img.image_type not in ['collage', 'tag']]
            
            if product_images:
                # CRITICAL: Delete old collage first (to force recreation)
                old_collages = [img for img in product.images if img.image_type == 'collage']
                for old_collage in old_collages:
                    logger.info(f"[COLLAGE] Removing old collage: {old_collage.filename}")
                    db.delete(old_collage)
                    # Delete physical file
                    import os
                    if os.path.exists(old_collage.file_path):
                        try:
                            os.remove(old_collage.file_path)
                            logger.info(f"[COLLAGE] Deleted old file: {old_collage.file_path}")
                        except Exception as e:
                            logger.error(f"[COLLAGE] Error deleting old file: {e}")
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
                    logger.info(f"[COLLAGE] Created NEW collage for product {product.id}")
                    
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
                    
                    return {
                        'message': 'Ürün güncellendi, yeni kolaj oluşturuldu ve otomatik paylaşıldı!' if auto_shared else 'Ürün güncellendi ve yeni kolaj oluşturuldu',
                        'updated_fields': updated_fields,
                        'collage_created': collage_created,
                        'auto_shared': auto_shared
                    }
        
        return {
            'message': 'Product updated',
            'updated_fields': updated_fields,
            'collage_created': False,
            'auto_shared': False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating product info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/products/{product_id}/create-collage")
async def create_collage_manually(
    product_id: int,
    send_to_telegram: bool = True,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Manually create collage for a product
    """
    try:
        # Get product
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        # DİNAMİK: Ürün erişim kontrolü
        if not resource_access.check_product_access(current_user, product.brand_id, product.created_by, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu ürün için kolaj oluşturma yetkiniz yok"
            )
        
        # Check if product has required info
        if not product.brand_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product must have a brand to create collage"
            )
        
        # Get product images
        product_images = [img for img in product.images if img.image_type != 'collage']
        if not product_images:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product must have at least one image to create collage"
            )
        
        # Create collage
        from services.product_file_processor import ProductFileProcessor
        from services.product_upload_manager import ProductUploadManager
        
        upload_manager = ProductUploadManager()
        processor = ProductFileProcessor(upload_manager)
        
        # Create collage
        success = await processor._create_collage_for_product(product, current_user, db)
        
        if success:
            logger.info(f"[COLLAGE] Manually created collage for product {product.id}")
            
            # Get the created collage
            collage_image = next((img for img in product.images if img.image_type == 'collage'), None)
            
            return {
                'message': 'Collage created successfully',
                'collage_path': collage_image.file_path if collage_image else None,
                'sent_to_telegram': send_to_telegram and collage_image is not None
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create collage"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating collage manually: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/statistics")
async def get_collage_statistics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get collage statistics
    """
    try:
        # Base query
        query = db.query(Product).filter(Product.is_active == True)
        
        # DİNAMİK: Kullanıcının erişebileceği markalar
        accessible_brand_ids = brand_access.get_accessible_brand_ids(current_user, db)
        
        if accessible_brand_ids is not None:  # None = tüm markalar
            if not accessible_brand_ids:
                query = query.filter(Product.created_by == current_user.id)
            else:
                query = query.filter(
                    or_(
                        Product.created_by == current_user.id,
                        Product.brand_id.in_(accessible_brand_ids)
                    )
                )
        
        # Get all products
        products = query.all()
        
        # Calculate statistics
        total_products = len(products)
        products_with_collage = 0
        products_missing_info = 0
        products_ready_for_collage = 0
        
        for product in products:
            has_collage = any(img.image_type == 'collage' for img in product.images)
            has_images = any(img.image_type != 'collage' for img in product.images)
            
            if has_collage:
                products_with_collage += 1
            
            missing_info = (
                not product.price or
                not product.brand_id or
                not product.product_type
            )
            
            if missing_info:
                products_missing_info += 1
            elif not has_collage and has_images:
                products_ready_for_collage += 1
        
        return {
            'total_products': total_products,
            'products_with_collage': products_with_collage,
            'products_missing_info': products_missing_info,
            'products_ready_for_collage': products_ready_for_collage,
            'completion_rate': round(products_with_collage / total_products * 100, 1) if total_products > 0 else 0
        }
        
    except Exception as e:
        logger.error(f"Error getting collage statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
