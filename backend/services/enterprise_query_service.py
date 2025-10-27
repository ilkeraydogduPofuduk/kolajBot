"""
Enterprise Query Service
High-performance database queries with proper pagination, filtering, and caching
"""

from sqlalchemy.orm import Session, selectinload, joinedload
from sqlalchemy import and_, or_, desc, func, text
from typing import List, Dict, Any, Optional, Tuple
from models.product import Product, ProductImage
from models.brand import Brand
from models.template import Template
from models.user import User
import redis
import json
import hashlib
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class EnterpriseQueryService:
    """
    Enterprise-level query optimization service
    - Proper pagination at database level
    - Eager loading to prevent N+1 queries
    - Intelligent caching
    - Query optimization
    """
    
    def __init__(self):
        try:
            self.redis_client = redis.from_url("redis://localhost:6379")
            self.cache_enabled = True
        except:
            self.redis_client = None
            self.cache_enabled = False
            logger.warning("Redis not available, caching disabled")
    
    def _generate_cache_key(self, prefix: str, **params) -> str:
        """Generate cache key from parameters"""
        key_data = f"{prefix}:{json.dumps(params, sort_keys=True)}"
        return f"enterprise:{hashlib.md5(key_data.encode()).hexdigest()}"
    
    def _get_from_cache(self, key: str) -> Optional[Dict]:
        """Get data from cache"""
        if not self.cache_enabled:
            return None
        
        try:
            cached = self.redis_client.get(key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.error(f"Cache get error: {e}")
        
        return None
    
    def _set_cache(self, key: str, data: Dict, ttl: int = 300):
        """Set data in cache"""
        if not self.cache_enabled:
            return
        
        try:
            self.redis_client.setex(key, ttl, json.dumps(data))
        except Exception as e:
            logger.error(f"Cache set error: {e}")
    
    def get_products_optimized(
        self,
        db: Session,
        page: int = 1,
        per_page: int = 20,
        brand_id: Optional[int] = None,
        search: Optional[str] = None,
        product_type: Optional[List[str]] = None,
        color: Optional[List[str]] = None,
        size_range: Optional[List[str]] = None,
        price_min: Optional[float] = None,
        price_max: Optional[float] = None,
        sort_by: str = "created_at",
        sort_direction: str = "desc"
    ) -> Dict[str, Any]:
        """
        Get products with proper database-level pagination and filtering
        """
        # Generate cache key
        cache_key = self._generate_cache_key(
            "products",
            page=page, per_page=per_page, brand_id=brand_id,
            search=search, product_type=product_type, color=color,
            size_range=size_range, price_min=price_min, price_max=price_max,
            sort_by=sort_by, sort_direction=sort_direction
        )
        
        # Try cache first
        cached_result = self._get_from_cache(cache_key)
        if cached_result:
            logger.debug(f"Cache HIT: products page {page}")
            return cached_result
        
        logger.debug(f"Cache MISS: products page {page}")
        
        # Build base query with eager loading
        query = db.query(Product).options(
            selectinload(Product.images),
            joinedload(Product.brand)
        )
        
        # Apply filters
        filters = []
        
        # Exclude UNKNOWN/DEFAULT products
        filters.extend([
            Product.code.notin_(['UNKNOWN', 'DEFAULT_CODE']),
            Product.color.notin_(['UNKNOWN', 'DEFAULT'])
        ])
        
        if brand_id:
            filters.append(Product.brand_id == brand_id)
        
        if search:
            search_term = f"%{search}%"
            filters.append(
                or_(
                    Product.name.ilike(search_term),
                    Product.code.ilike(search_term),
                    Product.color.ilike(search_term),
                    Product.product_type.ilike(search_term)
                )
            )
        
        if product_type:
            if isinstance(product_type, list):
                filters.append(Product.product_type.in_(product_type))
            else:
                filters.append(Product.product_type == product_type)
        
        if color:
            if isinstance(color, list):
                filters.append(Product.color.in_(color))
            else:
                filters.append(Product.color == color)
        
        if size_range:
            if isinstance(size_range, list):
                filters.append(Product.size_range.in_(size_range))
            else:
                filters.append(Product.size_range == size_range)
        
        if price_min is not None:
            filters.append(Product.price >= price_min)
        
        if price_max is not None:
            filters.append(Product.price <= price_max)
        
        # Apply all filters
        if filters:
            query = query.filter(and_(*filters))
        
        # Apply sorting
        if sort_by == "name":
            order_column = Product.name
        elif sort_by == "code":
            order_column = Product.code
        elif sort_by == "price":
            order_column = Product.price
        else:
            order_column = Product.created_at
        
        if sort_direction == "desc":
            query = query.order_by(order_column.desc())
        else:
            query = query.order_by(order_column.asc())
        
        # Get total count (optimized)
        total_query = query.statement.with_only_columns([func.count()])
        total = db.execute(total_query).scalar()
        
        # Apply pagination at database level
        offset = (page - 1) * per_page
        products = query.offset(offset).limit(per_page).all()
        
        # Format response
        result = {
            "products": [
                {
                    "id": product.id,
                    "name": product.name,
                    "code": product.code,
                    "color": product.color,
                    "product_type": product.product_type,
                    "size_range": product.size_range,
                    "price": product.price,
                    "currency": product.currency,
                    "brand_id": product.brand_id,
                    "brand": {
                        "id": product.brand.id,
                        "name": product.brand.name
                    } if product.brand else None,
                    "created_at": product.created_at.isoformat() if product.created_at else None,
                    "images": [
                        {
                            "id": img.id,
                            "filename": img.filename,
                            "file_path": img.file_path,
                            "image_type": img.image_type,
                            "is_cover": img.is_cover_image
                        } for img in product.images
                    ]
                } for product in products
            ],
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
        
        # Cache result
        self._set_cache(cache_key, result, ttl=300)
        
        return result
    
    def get_product_with_full_data(
        self,
        db: Session,
        product_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        Get single product with all related data
        """
        cache_key = self._generate_cache_key("product", id=product_id)
        
        # Try cache first
        cached_result = self._get_from_cache(cache_key)
        if cached_result:
            return cached_result
        
        # Single query with all relations
        product = db.query(Product).options(
            selectinload(Product.images),
            joinedload(Product.brand),
            selectinload(Product.templates)
        ).filter(Product.id == product_id).first()
        
        if not product:
            return None
        
        result = {
            "id": product.id,
            "name": product.name,
            "code": product.code,
            "color": product.color,
            "product_type": product.product_type,
            "size_range": product.size_range,
            "price": product.price,
            "currency": product.currency,
            "brand_id": product.brand_id,
            "brand": {
                "id": product.brand.id,
                "name": product.brand.name
            } if product.brand else None,
            "created_at": product.created_at.isoformat() if product.created_at else None,
            "images": [
                {
                    "id": img.id,
                    "filename": img.filename,
                    "file_path": img.file_path,
                    "image_type": img.image_type,
                    "is_cover": img.is_cover_image
                } for img in product.images
            ],
            "templates": [
                {
                    "id": template.id,
                    "name": template.name,
                    "template_type": template.template_type,
                    "is_active": template.is_active,
                    "created_at": template.created_at.isoformat() if template.created_at else None
                } for template in product.templates
            ]
        }
        
        # Cache result
        self._set_cache(cache_key, result, ttl=600)
        
        return result
    
    def get_templates_optimized(
        self,
        db: Session,
        page: int = 1,
        per_page: int = 20,
        product_id: Optional[int] = None,
        brand_id: Optional[int] = None,
        template_type: Optional[str] = None,
        search: Optional[str] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get templates with proper pagination and filtering
        """
        cache_key = self._generate_cache_key(
            "templates",
            page=page, per_page=per_page, product_id=product_id,
            brand_id=brand_id, template_type=template_type,
            search=search, user_id=user_id
        )
        
        # Try cache first
        cached_result = self._get_from_cache(cache_key)
        if cached_result:
            return cached_result
        
        # Build query with eager loading
        query = db.query(Template).options(
            joinedload(Template.product),
            joinedload(Template.brand),
            joinedload(Template.creator)
        )
        
        # Apply filters
        filters = []
        
        if product_id:
            filters.append(Template.product_id == product_id)
        
        if brand_id:
            filters.append(Template.brand_id == brand_id)
        
        if template_type:
            filters.append(Template.template_type == template_type)
        
        if search:
            search_term = f"%{search}%"
            filters.append(
                or_(
                    Template.name.ilike(search_term),
                    Template.description.ilike(search_term)
                )
            )
        
        if user_id:
            filters.append(Template.created_by == user_id)
        
        # Apply filters
        if filters:
            query = query.filter(and_(*filters))
        
        # Order by creation date
        query = query.order_by(desc(Template.created_at))
        
        # Get total count
        total_query = query.statement.with_only_columns([func.count()])
        total = db.execute(total_query).scalar()
        
        # Apply pagination
        offset = (page - 1) * per_page
        templates = query.offset(offset).limit(per_page).all()
        
        # Format response
        result = {
            "templates": [
                {
                    "id": template.id,
                    "name": template.name,
                    "description": template.description,
                    "template_type": template.template_type,
                    "is_active": template.is_active,
                    "is_default": template.is_default,
                    "is_auto_generated": template.is_auto_generated,
                    "visibility": template.visibility,
                    "usage_count": template.usage_count,
                    "created_at": template.created_at.isoformat() if template.created_at else None,
                    "product": {
                        "id": template.product.id,
                        "code": template.product.code,
                        "name": template.product.name
                    } if template.product else None,
                    "brand": {
                        "id": template.brand.id,
                        "name": template.brand.name
                    } if template.brand else None,
                    "creator": {
                        "id": template.creator.id,
                        "email": template.creator.email
                    } if template.creator else None
                } for template in templates
            ],
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
        
        # Cache result
        self._set_cache(cache_key, result, ttl=300)
        
        return result
    
    def get_brands_with_stats(
        self,
        db: Session,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
        category_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Get brands with statistics
        """
        cache_key = self._generate_cache_key(
            "brands",
            page=page, per_page=per_page, search=search, category_id=category_id
        )
        
        # Try cache first
        cached_result = self._get_from_cache(cache_key)
        if cached_result:
            return cached_result
        
        # Build query
        query = db.query(Brand).options(
            joinedload(Brand.category)
        )
        
        # Apply filters
        filters = []
        
        if search:
            search_term = f"%{search}%"
            filters.append(Brand.name.ilike(search_term))
        
        if category_id:
            filters.append(Brand.category_id == category_id)
        
        if filters:
            query = query.filter(and_(*filters))
        
        # Order by name
        query = query.order_by(Brand.name)
        
        # Get total count
        total_query = query.statement.with_only_columns([func.count()])
        total = db.execute(total_query).scalar()
        
        # Apply pagination
        offset = (page - 1) * per_page
        brands = query.offset(offset).limit(per_page).all()
        
        # Format response
        result = {
            "brands": [
                {
                    "id": brand.id,
                    "name": brand.name,
                    "category_id": brand.category_id,
                    "category": {
                        "id": brand.category.id,
                        "name": brand.category.name
                    } if brand.category else None,
                    "website_url": brand.website_url,
                    "product_count": brand.product_count,
                    "template_count": brand.template_count,
                    "last_upload_at": brand.last_upload_at.isoformat() if brand.last_upload_at else None,
                    "is_active": brand.is_active,
                    "created_at": brand.created_at.isoformat() if brand.created_at else None
                } for brand in brands
            ],
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": (total + per_page - 1) // per_page
        }
        
        # Cache result
        self._set_cache(cache_key, result, ttl=600)
        
        return result
    
    def invalidate_cache(self, pattern: str):
        """Invalidate cache entries matching pattern"""
        if not self.cache_enabled:
            return
        
        try:
            keys = self.redis_client.keys(f"enterprise:{pattern}*")
            if keys:
                self.redis_client.delete(*keys)
                logger.info(f"Invalidated {len(keys)} cache entries for pattern: {pattern}")
        except Exception as e:
            logger.error(f"Cache invalidation error: {e}")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.cache_enabled:
            return {"enabled": False}
        
        try:
            info = self.redis_client.info()
            return {
                "enabled": True,
                "used_memory": info.get("used_memory_human", "N/A"),
                "connected_clients": info.get("connected_clients", 0),
                "total_commands_processed": info.get("total_commands_processed", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0)
            }
        except Exception as e:
            return {"enabled": True, "error": str(e)}

# Global instance
enterprise_query_service = EnterpriseQueryService()
