from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Base Models
class ProductBase(BaseModel):
    name: str
    code: str
    color: str
    product_type: Optional[str] = None
    size_range: Optional[str] = None
    price: Optional[float] = None
    currency: str = "USD"

class ProductImageBase(BaseModel):
    filename: str
    original_filename: str
    file_path: str
    image_type: str
    angle: Optional[str] = None
    angle_number: Optional[int] = None
    is_cover_image: bool = False

class ProductTemplateBase(BaseModel):
    name: str
    template_type: str = "social_media"
    template_data: Dict[str, Any]
    generated_image_path: Optional[str] = None
    is_default: bool = False

# Create Models
class ProductCreate(ProductBase):
    brand_id: int

class ProductImageCreate(ProductImageBase):
    product_id: int

class ProductTemplateCreate(ProductTemplateBase):
    product_id: int
    brand_id: int

# Response Models
class ProductImageResponse(ProductImageBase):
    id: int
    product_id: int
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProductTemplateResponse(ProductTemplateBase):
    id: int
    product_id: int
    brand_id: int
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProductResponse(ProductBase):
    id: int
    brand_id: int
    ai_extracted_data: Optional[Dict[str, Any]] = None
    is_active: bool = True
    is_processed: bool = False
    created_at: datetime
    updated_at: datetime
    
    # İlişkiler
    brand_name: Optional[str] = None
    images: List[ProductImageResponse] = []
    templates: List[ProductTemplateResponse] = []

    class Config:
        from_attributes = True

# Specialized Models
class ProductGroupResponse(BaseModel):
    """AI tarafından gruplandırılmış ürün bilgileri"""
    code: str
    color: str
    product_images: List[Dict[str, Any]]
    tag_images: List[Dict[str, Any]]
    total_images: int
    is_valid: bool = True
    warnings: List[str] = []
    errors: List[str] = []

class ProductUploadResponse(BaseModel):
    """Toplu yükleme yanıtı"""
    success: bool
    message: str
    uploaded_files: int
    created_products: int
    products: List[ProductResponse]

class ProductListResponse(BaseModel):
    """Ürün listesi yanıtı"""
    products: List[ProductResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class ProductProcessingResponse(BaseModel):
    """AI işleme yanıtı"""
    success: bool
    message: str
    processing_data: Optional[Dict[str, Any]] = None

class TemplateGenerationResponse(BaseModel):
    """Şablon oluşturma yanıtı"""
    success: bool
    message: str
    template_path: Optional[str] = None
    template_data: Optional[Dict[str, Any]] = None

# AI Analysis Models
class AIExtractionResult(BaseModel):
    """AI çıkarım sonucu"""
    raw_text: str
    product_type: Optional[str] = None
    product_code: Optional[str] = None
    color: Optional[str] = None
    size_range: Optional[str] = None
    price: Optional[float] = None
    currency: str = "USD"
    brand_name: Optional[str] = None
    collection: Optional[str] = None
    confidence: float = 0.0
    extraction_method: str = "tesseract_ocr"

class ImageAnalysisResult(BaseModel):
    """Görsel analiz sonucu"""
    width: int
    height: int
    blur_score: float
    brightness: float
    contrast: float
    is_good_quality: bool
    image_type: Optional[str] = None
    angle: Optional[str] = None

class ProductValidationResult(BaseModel):
    """Ürün doğrulama sonucu"""
    is_valid: bool
    warnings: List[str] = []
    errors: List[str] = []
    recommendations: List[str] = []
    score: float = 0.0

# Template Models
class TemplateLayout(BaseModel):
    """Şablon düzeni"""
    brand_name: Dict[str, Any]
    product_images: Dict[str, Any]
    product_info: Dict[str, Any]
    logo_area: Dict[str, Any]

class TemplateData(BaseModel):
    """Şablon verisi"""
    template_type: str
    template_version: str
    product_info: Dict[str, Any]
    layout: TemplateLayout
    images_used: List[str]
    created_at: str

# Bulk Operations
class BulkProductUpload(BaseModel):
    """Toplu ürün yükleme"""
    brand_id: int
    files: List[str]  # Dosya yolları
    auto_process: bool = True

class BulkProductProcess(BaseModel):
    """Toplu ürün işleme"""
    product_ids: List[int]
    force_reprocess: bool = False
