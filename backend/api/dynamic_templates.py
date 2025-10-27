"""
Dinamik Şablon API
OCR sonrası otomatik şablon oluşturma ve düzenleme endpoint'leri
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from database import get_db
from dependencies.auth import get_current_active_user
from models.template import Template
from models.product import Product
from models.brand import Brand
from models.user import User
from services.dynamic_template_service import dynamic_template_service
from core.logging import get_logger

logger = get_logger('dynamic_templates_api')

router = APIRouter()

# Pydantic Models
class TemplateCreateRequest(BaseModel):
    product_id: int
    brand_id: int
    category: Optional[str] = None

class TemplateUpdateRequest(BaseModel):
    template_id: int
    product_id: int
    brand_id: int
    category: Optional[str] = None

class TemplateResponse(BaseModel):
    id: int
    name: str
    description: str
    template_data: Dict[str, Any]
    product_id: int
    brand_id: int
    is_active: bool
    template_type: str
    preview_url: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

class TemplateAnalysisResponse(BaseModel):
    product_code: str
    brand_name: str
    suggested_category: str
    template_config: Dict[str, Any]
    confidence_score: float

class TelegramExportResponse(BaseModel):
    template_id: int
    template_name: str
    brand_name: str
    product_code: str
    category: str
    canvas_data: Dict[str, Any]
    preview_url: Optional[str] = None
    exported_at: str

@router.post("/analyze-product", response_model=TemplateAnalysisResponse)
async def analyze_product_for_template(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Ürünü şablon oluşturmak için analiz et"""
    try:
        # Ürün ve marka bilgilerini al
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Ürün bulunamadı")
        
        brand = db.query(Brand).filter(Brand.id == product.brand_id).first()
        if not brand:
            raise HTTPException(status_code=404, detail="Marka bulunamadı")
        
        # Ürün analizi
        template_config = dynamic_template_service.analyze_product_for_template(product, brand)
        
        # Güven skoru hesapla (basit algoritma)
        confidence_score = 0.8
        if product.color and product.product_type:
            confidence_score += 0.1
        if brand.name.lower() in dynamic_template_service.brand_template_mapping:
            confidence_score += 0.1
        
        return TemplateAnalysisResponse(
            product_code=product.code,
            brand_name=brand.name,
            suggested_category=template_config['category'],
            template_config=template_config,
            confidence_score=min(confidence_score, 1.0)
        )
        
    except Exception as e:
        logger.error(f"Error analyzing product: {e}")
        raise HTTPException(status_code=500, detail=f"Ürün analizi hatası: {str(e)}")

@router.post("/create-from-product", response_model=TemplateResponse)
async def create_template_from_product(
    request: TemplateCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Ürün için dinamik şablon oluştur"""
    try:
        # Ürün ve marka bilgilerini al
        product = db.query(Product).filter(Product.id == request.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Ürün bulunamadı")
        
        brand = db.query(Brand).filter(Brand.id == request.brand_id).first()
        if not brand:
            raise HTTPException(status_code=404, detail="Marka bulunamadı")
        
        # Şablon oluştur
        template = dynamic_template_service.create_template_from_product(product, brand, db)
        
        # Arka planda görsel oluştur
        background_tasks.add_task(
            dynamic_template_service._generate_template_image,
            template,
            template.template_data,
            product
        )
        
        # Response hazırla
        template_data = template.template_data if isinstance(template.template_data, dict) else {}
        
        return TemplateResponse(
            id=template.id,
            name=template.name,
            description=template.description,
            template_data=template_data,
            product_id=template.product_id,
            brand_id=template.brand_id,
            is_active=template.is_active,
            template_type=template.template_type,
            preview_url=dynamic_template_service.get_template_preview(template),
            created_at=template.created_at.isoformat(),
            updated_at=template.updated_at.isoformat() if template.updated_at else None
        )
        
    except Exception as e:
        logger.error(f"Error creating template from product: {e}")
        raise HTTPException(status_code=500, detail=f"Şablon oluşturma hatası: {str(e)}")

@router.put("/update-from-product", response_model=TemplateResponse)
async def update_template_from_product(
    request: TemplateUpdateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Ürün bilgileri değiştiğinde şablonu güncelle"""
    try:
        # Şablon, ürün ve marka bilgilerini al
        template = db.query(Template).filter(Template.id == request.template_id).first()
        if not template:
            raise HTTPException(status_code=404, detail="Şablon bulunamadı")
        
        product = db.query(Product).filter(Product.id == request.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Ürün bulunamadı")
        
        brand = db.query(Brand).filter(Brand.id == request.brand_id).first()
        if not brand:
            raise HTTPException(status_code=404, detail="Marka bulunamadı")
        
        # Şablonu güncelle
        updated_template = dynamic_template_service.update_template_from_product(template, product, brand, db)
        
        # Arka planda görsel oluştur
        background_tasks.add_task(
            dynamic_template_service._generate_template_image,
            updated_template,
            updated_template.template_data,
            product
        )
        
        # Response hazırla
        template_data = updated_template.template_data if isinstance(updated_template.template_data, dict) else {}
        
        return TemplateResponse(
            id=updated_template.id,
            name=updated_template.name,
            description=updated_template.description,
            template_data=template_data,
            product_id=updated_template.product_id,
            brand_id=updated_template.brand_id,
            is_active=updated_template.is_active,
            template_type=updated_template.template_type,
            preview_url=dynamic_template_service.get_template_preview(updated_template),
            created_at=updated_template.created_at.isoformat(),
            updated_at=updated_template.updated_at.isoformat() if updated_template.updated_at else None
        )
        
    except Exception as e:
        logger.error(f"Error updating template from product: {e}")
        raise HTTPException(status_code=500, detail=f"Şablon güncelleme hatası: {str(e)}")

@router.get("/preview/{template_id}")
async def get_template_preview(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Şablon önizleme URL'i döndür"""
    try:
        template = db.query(Template).filter(Template.id == template_id).first()
        if not template:
            raise HTTPException(status_code=404, detail="Şablon bulunamadı")
        
        preview_url = dynamic_template_service.get_template_preview(template)
        if not preview_url:
            raise HTTPException(status_code=404, detail="Önizleme görseli bulunamadı")
        
        return {"preview_url": preview_url}
        
    except Exception as e:
        logger.error(f"Error getting template preview: {e}")
        raise HTTPException(status_code=500, detail=f"Önizleme hatası: {str(e)}")

@router.post("/export-for-telegram/{template_id}", response_model=TelegramExportResponse)
async def export_template_for_telegram(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Telegram için şablon verisi dışa aktar"""
    try:
        template = db.query(Template).filter(Template.id == template_id).first()
        if not template:
            raise HTTPException(status_code=404, detail="Şablon bulunamadı")
        
        # Telegram için dışa aktar
        telegram_data = dynamic_template_service.export_template_for_telegram(template)
        
        return TelegramExportResponse(**telegram_data)
        
    except Exception as e:
        logger.error(f"Error exporting template for telegram: {e}")
        raise HTTPException(status_code=500, detail=f"Dışa aktarma hatası: {str(e)}")

@router.get("/categories")
async def get_template_categories():
    """Mevcut şablon kategorilerini döndür"""
    try:
        categories = dynamic_template_service.template_categories
        return {"categories": categories}
        
    except Exception as e:
        logger.error(f"Error getting template categories: {e}")
        raise HTTPException(status_code=500, detail=f"Kategori listesi hatası: {str(e)}")

@router.get("/brand-mapping")
async def get_brand_template_mapping():
    """Marka-şablon eşleştirmesini döndür"""
    try:
        mapping = dynamic_template_service.brand_template_mapping
        return {"brand_mapping": mapping}
        
    except Exception as e:
        logger.error(f"Error getting brand mapping: {e}")
        raise HTTPException(status_code=500, detail=f"Marka eşleştirme hatası: {str(e)}")

@router.post("/auto-create-for-products")
async def auto_create_templates_for_products(
    product_ids: List[int],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Birden fazla ürün için otomatik şablon oluştur"""
    try:
        created_templates = []
        failed_products = []
        
        for product_id in product_ids:
            try:
                # Ürün ve marka bilgilerini al
                product = db.query(Product).filter(Product.id == product_id).first()
                if not product:
                    failed_products.append({"product_id": product_id, "error": "Ürün bulunamadı"})
                    continue
                
                brand = db.query(Brand).filter(Brand.id == product.brand_id).first()
                if not brand:
                    failed_products.append({"product_id": product_id, "error": "Marka bulunamadı"})
                    continue
                
                # Şablon oluştur
                template = dynamic_template_service.create_template_from_product(product, brand, db)
                created_templates.append({
                    "template_id": template.id,
                    "product_id": product_id,
                    "product_code": product.code,
                    "brand_name": brand.name
                })
                
            except Exception as e:
                failed_products.append({"product_id": product_id, "error": str(e)})
        
        return {
            "created_templates": created_templates,
            "failed_products": failed_products,
            "total_processed": len(product_ids),
            "success_count": len(created_templates),
            "failure_count": len(failed_products)
        }
        
    except Exception as e:
        logger.error(f"Error auto-creating templates: {e}")
        raise HTTPException(status_code=500, detail=f"Otomatik şablon oluşturma hatası: {str(e)}")

@router.get("/stats")
async def get_template_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Şablon istatistiklerini döndür"""
    try:
        # Toplam şablon sayısı
        total_templates = db.query(Template).count()
        
        # Aktif şablon sayısı
        active_templates = db.query(Template).filter(Template.is_active == True).count()
        
        # Kategori bazında sayılar
        category_stats = db.query(Template.template_type, db.func.count(Template.id)).group_by(Template.template_type).all()
        
        # Marka bazında sayılar
        brand_stats = db.query(Brand.name, db.func.count(Template.id)).join(Template).group_by(Brand.name).all()
        
        return {
            "total_templates": total_templates,
            "active_templates": active_templates,
            "category_stats": dict(category_stats),
            "brand_stats": dict(brand_stats)
        }
        
    except Exception as e:
        logger.error(f"Error getting template stats: {e}")
        raise HTTPException(status_code=500, detail=f"İstatistik hatası: {str(e)}")
