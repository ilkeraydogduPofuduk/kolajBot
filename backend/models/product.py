from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)  # Ürün adı (dosya adından çıkarılacak)
    slug = Column(String(255), nullable=True)  # SEO-friendly URL slug
    
    # İLK ÜRÜN BİLGİLERİ
    code = Column(String(100), nullable=False)  # Ürün kodu (EL-4446)
    color = Column(String(50), nullable=False)  # Renk (BLACK, BROWN, etc.)
    product_type = Column(String(100), nullable=True)  # ELBİSE, PANTOLON, etc.
    size_range = Column(String(50), nullable=True)  # 36-42, 44-50, etc.
    price = Column(Float, nullable=True)  # Fiyat (dolar)
    currency = Column(String(10), default="USD")
    
    # İKİNCİ ÜRÜN BİLGİLERİ (Eğer görselde 2 etiket varsa)
    code_2 = Column(String(100), nullable=True)  # İkinci ürün kodu
    color_2 = Column(String(50), nullable=True)  # İkinci ürün rengi
    product_type_2 = Column(String(100), nullable=True)  # İkinci ürün tipi
    size_range_2 = Column(String(50), nullable=True)  # İkinci ürün bedeni
    price_2 = Column(Float, nullable=True)  # İkinci ürün fiyatı
    currency_2 = Column(String(10), nullable=True)  # İkinci ürün para birimi
    
    # AI tarafından çıkarılan bilgiler
    ai_extracted_data = Column(JSON, nullable=True)  # OCR'dan çıkarılan ham veri
    
    # Durum
    is_active = Column(Boolean, default=True)
    is_processed = Column(Boolean, default=False)  # AI işlemi tamamlandı mı
    
    # İlişkiler
    brand_id = Column(Integer, ForeignKey('brands.id'), nullable=False)
    brand = relationship("Brand", back_populates="products")
    
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    creator = relationship("User", foreign_keys=[created_by])
    
    updated_by = Column(Integer, ForeignKey('users.id'))
    updater = relationship("User", foreign_keys=[updated_by])
    
    # Ürün görselleri
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    
    # Şablonlar - Template'ler product'a bağlı değil, user'a bağlı
    # templates = relationship("Template", back_populates="product", cascade="all, delete-orphan")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Product(id={self.id}, code='{self.code}', color='{self.color}')>"

class ProductImage(Base):
    __tablename__ = "product_images"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    product = relationship("Product", back_populates="images")
    
    # Görsel bilgileri
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    
    # Görsel türü
    image_type = Column(String(50), nullable=False)  # 'product', 'tag', 'cover'
    angle = Column(String(20), nullable=True)  # 'front', 'back', 'side', 'tag'
    angle_number = Column(Integer, nullable=True)  # 1, 2, 3, etc.
    
    # AI analiz sonuçları
    is_cover_image = Column(Boolean, default=False)  # Kapak görseli mi?
    ai_analysis = Column(JSON, nullable=True)  # AI analiz sonuçları
    
    # Durum
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<ProductImage(id={self.id}, product_id={self.product_id}, type='{self.image_type}')>"

# ProductTemplate modeli kaldırıldı - Template modeli kullanılıyor
