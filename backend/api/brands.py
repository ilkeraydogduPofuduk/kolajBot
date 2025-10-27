from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.brand import Brand, BrandRequest
from models.user import User
from schemas.brand import BrandCreate, BrandUpdate, BrandRequestCreate, BrandRequestUpdate
from services.brand import BrandService, BrandRequestService
from dependencies.auth import get_current_active_user
from dependencies.role_checker import brand_access, require_brands_manage
from services.permission_service import PermissionService
import os
import uuid
from datetime import datetime

router = APIRouter()

@router.get("/with-products")
async def get_brands_with_products(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get brands that have products (for filtering) with role-based access"""
    from sqlalchemy import func
    from models.product import Product
    
    # Sadece ürünü olan markaları getir
    # Note: Brand.is_active might not exist in current schema, so we'll use a safer query
    try:
        query = db.query(Brand).join(Product).filter(
            Brand.is_active == True,
            Product.is_active == True
        )
    except Exception:
        # Fallback if is_active column doesn't exist
        query = db.query(Brand).join(Product).filter(
            Product.is_active == True
        )
    
    # DİNAMİK: Kullanıcının erişebileceği markalar
    accessible_brand_ids = brand_access.get_accessible_brand_ids(current_user, db)
    
    if accessible_brand_ids is not None:  # None = tüm markalar (brands.manage yetkisi)
        if not accessible_brand_ids:
            return {"brands": []}
        query = query.filter(Brand.id.in_(accessible_brand_ids))
    
    brands_with_products = query.distinct().all()
    
    return {
        "brands": [
            {
                "id": brand.id,
                "name": brand.name,
                "product_count": db.query(func.count(Product.id)).filter(
                    Product.brand_id == brand.id,
                    Product.is_active == True
                ).scalar()
            }
            for brand in brands_with_products
        ]
    }

@router.get("")  # Changed from "/" to "" - matches both /brands and /brands/
@router.get("/")  # Keep both for compatibility
async def get_brands(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=1000),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get paginated list of brands with role-based filtering"""
    service = BrandService(db)
    
    # DİNAMİK: Kullanıcının erişebileceği markalar
    accessible_brand_ids = brand_access.get_accessible_brand_ids(current_user, db)
    
    if accessible_brand_ids is None:
        # brands.manage yetkisi var - tüm markalar
        brands, total = service.get_brands(page, per_page)
    elif not accessible_brand_ids:
        # Hiç markası yok
        brands, total = [], 0
    else:
        # Belirli markalar
        brands, total = service.get_brands_by_ids(accessible_brand_ids, page, per_page)
    
    return {
        "brands": brands,
        "total": total,
        "page": page,
        "per_page": per_page
    }

@router.get("/{brand_id}")
async def get_brand(
    brand_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get brand by ID"""
    service = BrandService(db)
    brand = service.get_brand(brand_id)
    
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    
    # DİNAMİK: Marka erişim kontrolü
    if not brand_access.check_brand_access(current_user, brand_id, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu markaya erişim yetkiniz yok")
    
    return brand

@router.post("")
@router.post("/")
async def create_brand(
    brand_data: BrandCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new brand - DİNAMİK YETKİ"""
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'brands.manage'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Marka oluşturma yetkiniz yok")
    
    service = BrandService(db)
    try:
        brand = service.create_brand(brand_data)
        if not brand:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Brand creation failed")
        return brand
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Brand creation failed: {str(e)}")

@router.put("/{brand_id}")
async def update_brand(
    brand_id: int,
    brand_data: BrandUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update brand information - DİNAMİK YETKİ"""
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'brands.manage'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Marka güncelleme yetkiniz yok")
    
    service = BrandService(db)
    brand = service.update_brand(brand_id, brand_data)
    
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    
    return brand

@router.put("/{brand_id}/activate")
async def activate_brand(
    brand_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Activate brand - DİNAMİK YETKİ"""
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'brands.manage'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Marka aktifleştirme yetkiniz yok")
    
    service = BrandService(db)
    success, message = service.activate_brand(brand_id)
    
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    
    return {"message": message}

@router.put("/{brand_id}/deactivate")
async def deactivate_brand(
    brand_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Deactivate brand - DİNAMİK YETKİ"""
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'brands.manage'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Marka pasifleştirme yetkiniz yok")
    
    service = BrandService(db)
    success, message = service.deactivate_brand(brand_id)
    
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    
    return {"message": message}

# Brand Request Endpoints
@router.post("/request")
async def create_brand_request(
    request_data: BrandRequestCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a brand request - DİNAMİK YETKİ"""
    # Kullanıcının brand_ids listesi olmalı (marka yöneticisi)
    if not current_user.brand_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Marka talebi oluşturma yetkiniz yok")
    
    service = BrandRequestService(db)
    brand_request = service.create_brand_request(current_user.id, request_data)
    
    if not brand_request:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Brand request creation failed")
    
    return brand_request

@router.get("/requests")
async def get_brand_requests(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=1000),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get paginated list of brand requests"""
    service = BrandRequestService(db)
    
    # DİNAMİK: brands.manage yetkisi varsa tüm talepleri görür, yoksa sadece kendi taleplerini
    permission_service = PermissionService(db)
    
    if permission_service.has_permission(current_user.id, 'brands.manage'):
        brand_requests, total = service.get_brand_requests(page, per_page, status)
    elif current_user.brand_ids:
        brand_requests, total = service.get_brand_requests_by_user(current_user.id, page, per_page, status)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Erişim yetkiniz yok")
    
    return {
        "requests": brand_requests,
        "total": total,
        "page": page,
        "per_page": per_page
    }

@router.get("/requests/{request_id}")
async def get_brand_request(
    request_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get brand request by ID"""
    service = BrandRequestService(db)
    brand_request = service.get_brand_request(request_id)
    
    if not brand_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand request not found")
    
    # DİNAMİK: Sadece kendi talepleri veya brands.manage yetkisi
    from services.permission_service import PermissionService
    permission_service = PermissionService(db)
    has_manage_permission = permission_service.has_permission(current_user.id, 'brands.manage')
    
    if not has_manage_permission and brand_request.requested_by_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu talebi görme yetkiniz yok")
    
    return brand_request

@router.put("/requests/{request_id}")
async def update_brand_request(
    request_id: int,
    request_data: BrandRequestUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update brand request (only for the user who created it and if status is pending)"""
    service = BrandRequestService(db)
    brand_request = service.get_brand_request(request_id)
    
    if not brand_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand request not found")
    
    if brand_request.requested_by_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    if brand_request.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only update pending requests")
    
    updated_request = service.update_brand_request(request_id, request_data)
    
    if not updated_request:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Brand request update failed")
    
    return updated_request

@router.put("/requests/{request_id}/approve")
async def approve_brand_request(
    request_id: int,
    admin_notes: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Approve brand request (Super Admin only)"""
    if current_user.role_display_name != "Super Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Super Admin can approve brand requests")
    
    service = BrandRequestService(db)
    brand_request = service.get_brand_request(request_id)
    if not brand_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand request not found")
    
    if brand_request.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Brand request is not pending")
    
    # Create the actual brand first
    brand_service = BrandService(db)
    brand_data = BrandCreate(
        name=brand_request.name,
        category_id=brand_request.category_id,
        website_url=brand_request.website_url
    )
    created_brand = brand_service.create_brand(brand_data)
    
    if not created_brand:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Brand creation failed")
    
    # Approve the request after brand creation
    result = service.approve_brand_request(request_id, current_user.id, admin_notes)
    
    if not result:
        # If approval fails, we might want to delete the created brand, but for now just return error
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Brand request approval failed after brand creation")
    
    return {"message": "Brand request approved successfully and brand created"}

@router.put("/requests/{request_id}/reject")
async def reject_brand_request(
    request_id: int,
    admin_notes: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Reject brand request (Super Admin only)"""
    if current_user.role_display_name != "Super Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Super Admin can reject brand requests")
    
    service = BrandRequestService(db)
    result = service.reject_brand_request(request_id, current_user.id, admin_notes)
    
    if not result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Brand request rejection failed")
    
    return {"message": "Brand request rejected successfully"}

@router.post("/{brand_id}/logo")
async def upload_brand_logo(
    brand_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload brand logo"""
    # DİNAMİK: Logo yükleme yetkisi kontrolü - brands.manage veya marka erişimi
    from services.permission_service import PermissionService
    permission_service = PermissionService(db)
    has_manage_permission = permission_service.has_permission(current_user.id, 'brands.manage')
    
    if not has_manage_permission:
        # Manage yetkisi yoksa en azından markaya erişimi olmalı
        if not brand_access.check_brand_access(current_user, brand_id, db):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Logo yükleme yetkiniz yok")
    
    # Check if brand exists
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    
    # DİNAMİK: Marka erişim kontrolü
    if not brand_access.check_brand_access(current_user, brand_id, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu markaya erişim yetkiniz yok")
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files are allowed")
    
    # Validate file extension
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename is required")
    
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File extension not allowed")
    
    # Validate filename (no path traversal)
    if '..' in file.filename or '/' in file.filename or '\\' in file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename")
    
    # Validate file size (max 5MB)
    if file.size and file.size > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File size must be less than 5MB")
    
    # Additional security: Check file content
    content = await file.read()
    await file.seek(0)  # Reset file pointer
    
    # Check for malicious file signatures
    malicious_signatures = [
        b'<script', b'<?php', b'<html', b'<iframe', b'<object', b'<embed',
        b'javascript:', b'vbscript:', b'data:text/html', b'data:application/javascript'
    ]
    
    for signature in malicious_signatures:
        if signature in content[:1024]:  # Check first 1KB
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file content")
    
    # Check file size again after reading content
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File size must be less than 5MB")
    
    # Validate image file headers
    if file_extension in ['.jpg', '.jpeg']:
        if not content.startswith(b'\xff\xd8\xff'):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JPEG file")
    elif file_extension == '.png':
        if not content.startswith(b'\x89PNG\r\n\x1a\n'):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid PNG file")
    elif file_extension == '.gif':
        if not content.startswith(b'GIF87a') and not content.startswith(b'GIF89a'):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid GIF file")
    elif file_extension == '.webp':
        if not content.startswith(b'RIFF') or b'WEBP' not in content[:12]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid WebP file")
    
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "brand_logos"))
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate filename based on brand name (sanitized)
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        # Sanitize brand name for filename
        brand_name_safe = brand.name.lower()
        brand_name_safe = brand_name_safe.replace(' ', '_')
        brand_name_safe = brand_name_safe.replace('ç', 'c').replace('ğ', 'g').replace('ı', 'i')
        brand_name_safe = brand_name_safe.replace('ö', 'o').replace('ş', 's').replace('ü', 'u')
        brand_name_safe = ''.join(c for c in brand_name_safe if c.isalnum() or c in '_-')
        
        unique_filename = f"{brand_name_safe}{file_extension}"
        
        # Check if file already exists, if so add a number
        counter = 1
        original_filename = unique_filename
        while os.path.exists(os.path.join(upload_dir, unique_filename)):
            name_without_ext = os.path.splitext(original_filename)[0]
            unique_filename = f"{name_without_ext}_{counter}{file_extension}"
            counter += 1
        
        # Ensure file path is safe (no path traversal)
        file_path = os.path.join(upload_dir, unique_filename)
        if not file_path.startswith(os.path.abspath(upload_dir)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file path")
        
        # Delete old logo file if exists
        if brand.logo_url and brand.logo_url.startswith('/uploads/brand_logos/'):
            old_file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", brand.logo_url.lstrip('/')))
            if os.path.exists(old_file_path):
                try:
                    os.remove(old_file_path)
                except Exception as e:
                    print(f"Warning: Could not delete old logo file: {e}")
        
        # Save file with error handling
        try:
            with open(file_path, "wb") as buffer:
                buffer.write(content)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save file")
        
        # Update brand logo URL
        logo_url = f"/uploads/brand_logos/{unique_filename}"
        brand.logo_url = logo_url
        brand.updated_at = datetime.now()
        db.commit()
        
        return {
            "message": "Logo uploaded successfully",
            "logo_url": logo_url
        }
        
    except Exception as e:
        # Clean up file if database update fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Logo upload failed: {str(e)}")


@router.delete("/{brand_id}")
def delete_brand(
    brand_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Delete a brand - Super Admin only
    
    SOFT DELETE: Marka pasifleştirilir, ilişkili veriler korunur.
    - Ürünler: Pasifleştirilir (is_active=False)
    - Kullanıcılar: brand_ids listesinden çıkarılır
    - Sosyal medya kanalları: Pasifleştirilir
    - Şablonlar: Korunur (başka markalarda kullanılabilir)
    """
    # Check permissions - DİNAMİK YETKİ
    if current_user.role_display_name != "Super Admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sadece Super Admin marka silebilir")
    
    # Get brand
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Marka bulunamadı")
    
    # Check if brand is already inactive
    if not brand.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Marka zaten pasif durumda")
    
    try:
        from models.product import Product
        from models.social_media_channel import SocialMediaChannel
        
        # 1. Pasifleştir - Markayı soft delete
        brand.is_active = False
        
        # 2. İlişkili ürünleri pasifleştir
        products = db.query(Product).filter(Product.brand_id == brand_id).all()
        deactivated_products = 0
        for product in products:
            if product.is_active:
                product.is_active = False
                deactivated_products += 1
        
        # 3. İlişkili sosyal medya kanallarını pasifleştir
        channels = db.query(SocialMediaChannel).filter(SocialMediaChannel.brand_id == brand_id).all()
        deactivated_channels = 0
        for channel in channels:
            if channel.is_active:
                channel.is_active = False
                deactivated_channels += 1
        
        # 4. Kullanıcıların brand_ids listesinden bu markayı çıkar
        users_with_brand = db.query(User).filter(User.brand_ids.contains([brand_id])).all()
        updated_users = 0
        for user in users_with_brand:
            if user.brand_ids and brand_id in user.brand_ids:
                user.brand_ids = [bid for bid in user.brand_ids if bid != brand_id]
                updated_users += 1
        
        db.commit()
        
        # Özet bilgi
        summary = {
            "message": "Marka başarıyla pasifleştirildi (soft delete)",
            "brand_name": brand.name,
            "deactivated_products": deactivated_products,
            "deactivated_channels": deactivated_channels,
            "updated_users": updated_users,
            "note": "Marka ve ilişkili veriler veritabanında korundu ancak pasif duruma getirildi"
        }
        
        return summary
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Marka silinirken hata oluştu: {str(e)}"
        )