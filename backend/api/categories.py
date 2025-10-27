from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from dependencies.auth import get_current_active_user
from database import get_db
from schemas.category import Category, CategoryCreate, CategoryUpdate
from models.user import User
from services.category import CategoryService

router = APIRouter()


@router.get("/", response_model=Dict[str, Any])
def get_categories(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None, description="Kategori adında arama"),
    is_active: Optional[bool] = Query(None, description="Aktiflik durumu filtresi"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Kategorileri listele"""
    skip = (page - 1) * per_page
    
    categories = CategoryService.get_categories(
        db=db,
        skip=skip,
        limit=per_page,
        search=search,
        is_active=is_active
    )
    
    total = CategoryService.count_categories(
        db=db,
        search=search,
        is_active=is_active
    )
    
    return {
        "categories": categories,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page
        }
    }


@router.get("/all", response_model=List[Category])
def get_all_active_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Tüm kategorileri getir (dropdown için)"""
    return CategoryService.get_categories(
        db=db,
        skip=0,
        limit=1000
    )


@router.get("/{category_id}", response_model=Category)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Kategori detayını getir"""
    category = CategoryService.get_category_by_id(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    return category


@router.post("", response_model=Category)
@router.post("/", response_model=Category)
def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Yeni kategori oluştur"""
    # Sadece Super Admin kategori oluşturabilir
    if current_user.role.name != "super_admin":
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    # Aynı isimde kategori var mı kontrol et
    existing = CategoryService.get_category_by_name(db, category_data.name)
    if existing:
        raise HTTPException(status_code=400, detail="Bu isimde bir kategori zaten mevcut")
    
    return CategoryService.create_category(db, category_data)


@router.put("/{category_id}", response_model=Category)
def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Kategori güncelle"""
    # Sadece Super Admin kategori güncelleyebilir
    if current_user.role.name != "super_admin":
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    # İsim değişiyorsa aynı isimde başka kategori var mı kontrol et
    if category_data.name:
        existing = CategoryService.get_category_by_name(db, category_data.name)
        if existing and existing.id != category_id:
            raise HTTPException(status_code=400, detail="Bu isimde bir kategori zaten mevcut")
    
    category = CategoryService.update_category(db, category_id, category_data)
    if not category:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    
    return category


@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Kategori sil"""
    # Sadece Super Admin kategori silebilir
    if current_user.role.name != "super_admin":
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    success = CategoryService.delete_category(db, category_id)
    if not success:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    
    return {"message": "Kategori başarıyla silindi"}


@router.patch("/{category_id}/toggle-status", response_model=Category)
def toggle_category_status(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Kategori aktiflik durumunu değiştir"""
    # Sadece Super Admin kategori durumunu değiştirebilir
    if current_user.role.name != "super_admin":
        raise HTTPException(status_code=403, detail="Bu işlem için yetkiniz yok")
    
    category = CategoryService.toggle_category_status(db, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    
    return category

# /active endpoint moved to main.py as public endpoint
