from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from database import Base


class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True, comment="Kategori adı: Spor, Moda, Teknoloji")
    
    # Relationships
    brands = relationship("Brand", back_populates="category")
    
    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}')>"
