from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional, Dict, Any
from models.category import Category
from schemas.category import CategoryCreate, CategoryUpdate


class CategoryService:
    @staticmethod
    def get_categories(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> List[Category]:
        """Kategorileri listele"""
        query = db.query(Category)
        
        # Arama filtresi
        if search:
            search_filter = f"%{search}%"
            query = query.filter(Category.name.ilike(search_filter))
        
        return query.order_by(Category.name).offset(skip).limit(limit).all()

    @staticmethod
    def count_categories(
        db: Session,
        search: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> int:
        """Kategori sayısını döndür"""
        query = db.query(Category)
        
        if search:
            search_filter = f"%{search}%"
            query = query.filter(Category.name.ilike(search_filter))
        
        return query.count()

    @staticmethod
    def get_category_by_id(db: Session, category_id: int) -> Optional[Category]:
        """ID ile kategori getir"""
        return db.query(Category).filter(Category.id == category_id).first()

    @staticmethod
    def get_category_by_name(db: Session, name: str) -> Optional[Category]:
        """İsim ile kategori getir"""
        return db.query(Category).filter(Category.name == name).first()

    @staticmethod
    def create_category(db: Session, category_data: CategoryCreate) -> Category:
        """Yeni kategori oluştur"""
        category = Category(**category_data.model_dump())
        db.add(category)
        db.commit()
        db.refresh(category)
        return category

    @staticmethod
    def update_category(
        db: Session, 
        category_id: int, 
        category_data: CategoryUpdate
    ) -> Optional[Category]:
        """Kategori güncelle"""
        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            return None
        
        # Sadece None olmayan alanları güncelle
        update_data = category_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(category, field, value)
        
        db.commit()
        db.refresh(category)
        return category

    @staticmethod
    def delete_category(db: Session, category_id: int) -> bool:
        """Kategori sil"""
        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            return False
        
        db.delete(category)
        db.commit()
        return True

    @staticmethod
    def toggle_category_status(db: Session, category_id: int) -> Optional[Category]:
        """Kategori aktiflik durumunu değiştir (artık desteklenmiyor)"""
        # is_active kolonu kaldırıldı, bu fonksiyon artık çalışmaz
        return None
    
    @staticmethod
    def get_all_active_categories(db: Session) -> List[Category]:
        """Tüm kategorileri getir (artık aktif/pasif ayrımı yok)"""
        return db.query(Category).all()
