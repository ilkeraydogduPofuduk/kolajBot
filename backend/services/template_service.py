"""
Template Service
Handles template management and brand-specific default templates
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from models.template import Template, TemplateVisibility
from models.brand import Brand
from models.user import User
from core.logging import get_logger

logger = get_logger('template_service')

class TemplateService:
    """Service for managing templates and brand-specific defaults"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_default_template_for_brand(self, brand_id: int) -> Optional[Template]:
        """Get default template for a specific brand"""
        try:
            template = self.db.query(Template).filter(
                Template.brand_id == brand_id,
                Template.is_default == True,
                Template.is_active == True
            ).first()
            
            if template:
                logger.info(f"Found default template for brand {brand_id}: {template.name}")
                return template
            
            # If no brand-specific default, get a general default
            template = self.db.query(Template).filter(
                Template.is_default == True,
                Template.is_active == True,
                Template.visibility == TemplateVisibility.PUBLIC
            ).first()
            
            if template:
                logger.info(f"Using general default template for brand {brand_id}: {template.name}")
                return template
            
            logger.warning(f"No default template found for brand {brand_id}")
            return None
            
        except Exception as e:
            logger.error(f"Error getting default template for brand: {e}")
            return None
    
    def get_available_templates_for_brand(self, brand_id: int, user_id: int) -> List[Template]:
        """Get all available templates for a brand (including public and brand-specific)"""
        try:
            templates = self.db.query(Template).filter(
                Template.is_active == True,
                Template.brand_id == brand_id
            ).all()
            
            # Also get public templates
            public_templates = self.db.query(Template).filter(
                Template.is_active == True,
                Template.visibility == TemplateVisibility.PUBLIC
            ).all()
            
            # Combine and remove duplicates
            all_templates = templates + public_templates
            unique_templates = []
            seen_ids = set()
            
            for template in all_templates:
                if template.id not in seen_ids:
                    unique_templates.append(template)
                    seen_ids.add(template.id)
            
            logger.info(f"Found {len(unique_templates)} templates for brand {brand_id}")
            return unique_templates
            
        except Exception as e:
            logger.error(f"Error getting templates for brand: {e}")
            return []
    
    def create_default_template_for_brand(self, brand_id: int, brand_name: str) -> Optional[Template]:
        """Create a default template for a brand if none exists"""
        try:
            # Check if default template already exists
            existing = self.get_default_template_for_brand(brand_id)
            if existing:
                return existing
            
            # Create default template data - senin verdiğin şablona göre
            default_template_data = {
                "version": "5.3.1",
                "objects": [
                    {
                        "type": "textbox",
                        "left": 50,
                        "top": 20,
                        "width": 980,
                        "text": "{brand}",
                        "fontSize": 48,
                        "fontFamily": "Arial",
                        "fill": "#666",
                        "fontWeight": "bold",
                        "textAlign": "center",
                        "editable": True
                    },
                    {
                        "type": "image",
                        "left": 20,
                        "top": 80,
                        "width": 500,
                        "height": 750,
                        "rx": 20,
                        "ry": 20,
                        "src": "{image_0}",
                        "crossOrigin": "anonymous"
                    },
                    {
                        "type": "image",
                        "left": 550,
                        "top": 80,
                        "width": 500,
                        "height": 350,
                        "rx": 20,
                        "ry": 20,
                        "src": "{image_1}",
                        "crossOrigin": "anonymous"
                    },
                    {
                        "type": "image",
                        "left": 550,
                        "top": 450,
                        "width": 500,
                        "height": 350,
                        "rx": 20,
                        "ry": 20,
                        "src": "{image_2}",
                        "crossOrigin": "anonymous"
                    },
                    {
                        "type": "rect",
                        "left": 20,
                        "top": 1140,
                        "width": 120,
                        "height": 80,
                        "fill": "#ffffff",
                        "rx": 10,
                        "ry": 10,
                        "stroke": "#666",
                        "strokeWidth": 2
                    },
                    {
                        "type": "textbox",
                        "left": 30,
                        "top": 1150,
                        "width": 100,
                        "text": "my8-design",
                        "fontSize": 24,
                        "fontFamily": "Arial",
                        "fill": "#000",
                        "fontWeight": "bold",
                        "textAlign": "center",
                        "editable": True
                    },
                    {
                        "type": "textbox",
                        "left": 160,
                        "top": 1150,
                        "width": 700,
                        "text": "{product_info}",
                        "fontSize": 28,
                        "fontFamily": "Arial",
                        "fill": "#000",
                        "fontWeight": "bold",
                        "editable": True
                    },
                    {
                        "type": "textbox",
                        "left": 160,
                        "top": 1180,
                        "width": 700,
                        "text": "{product_info_2}",
                        "fontSize": 28,
                        "fontFamily": "Arial",
                        "fill": "#000",
                        "fontWeight": "bold",
                        "editable": True
                    },
                    {
                        "type": "rect",
                        "left": 900,
                        "top": 1140,
                        "width": 120,
                        "height": 50,
                        "fill": "#666",
                        "rx": 25,
                        "ry": 25
                    },
                    {
                        "type": "textbox",
                        "left": 910,
                        "top": 1150,
                        "width": 100,
                        "text": "{price}",
                        "fontSize": 30,
                        "fill": "#fff",
                        "fontWeight": "bold",
                        "editable": True
                    },
                    {
                        "type": "rect",
                        "left": 900,
                        "top": 1190,
                        "width": 120,
                        "height": 50,
                        "fill": "#666",
                        "rx": 25,
                        "ry": 25
                    },
                    {
                        "type": "textbox",
                        "left": 910,
                        "top": 1200,
                        "width": 100,
                        "text": "{price_2}",
                        "fontSize": 30,
                        "fill": "#fff",
                        "fontWeight": "bold",
                        "editable": True
                    }
                ],
                "background": "#ffffff"
            }
            
            # Create template
            template = Template(
                name=f"{brand_name} - Varsayılan Şablon",
                description=f"{brand_name} markası için varsayılan şablon",
                product_id=1,  # Dummy product ID for default template
                brand_id=brand_id,
                created_by=1,  # System user
                template_type="default",
                template_data=default_template_data,
                is_default=True,
                is_active=True,
                visibility=TemplateVisibility.BRAND
            )
            
            self.db.add(template)
            self.db.commit()
            
            logger.info(f"Created default template for brand {brand_id}: {template.name}")
            return template
            
        except Exception as e:
            logger.error(f"Error creating default template for brand: {e}")
            self.db.rollback()
            return None
    
    def get_template_for_product(self, product_id: int, brand_id: int) -> Optional[Template]:
        """Get the best template for a product (brand default or product-specific)"""
        try:
            # First, try to get product-specific template
            product_template = self.db.query(Template).filter(
                Template.product_id == product_id,
                Template.is_active == True
            ).first()
            
            if product_template:
                logger.info(f"Using product-specific template for product {product_id}")
                return product_template
            
            # If no product-specific template, use brand default
            brand_template = self.get_default_template_for_brand(brand_id)
            if brand_template:
                logger.info(f"Using brand default template for product {product_id}")
                return brand_template
            
            # If no brand default, create one
            brand = self.db.query(Brand).filter(Brand.id == brand_id).first()
            if brand:
                brand_template = self.create_default_template_for_brand(brand_id, brand.name)
                if brand_template:
                    logger.info(f"Created and using new brand default template for product {product_id}")
                    return brand_template
            
            logger.warning(f"No template found for product {product_id}")
            return None
            
        except Exception as e:
            logger.error(f"Error getting template for product: {e}")
            return None
    
    def update_template_usage(self, template_id: int):
        """Update template usage statistics"""
        try:
            template = self.db.query(Template).filter(Template.id == template_id).first()
            if template:
                template.increment_usage()
                self.db.commit()
                logger.info(f"Updated usage for template {template_id}")
                
        except Exception as e:
            logger.error(f"Error updating template usage: {e}")
            self.db.rollback()
