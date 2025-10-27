"""
Dynamic Template Service
Automatically generate templates after OCR processing
"""

from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from models.product import Product
from models.template import Template
from models.brand import Brand
from services.enterprise_template_service import EnterpriseTemplateService
from core.logging import get_logger

logger = get_logger('dynamic_template_service')

class DynamicTemplateService:
    """Service for dynamically generating templates"""
    
    def __init__(self):
        self.enterprise_template_service = EnterpriseTemplateService()
    
    def create_template_for_product(
        self, 
        product: Product, 
        db: Session,
        template_type: str = 'auto'
    ) -> Optional[Template]:
        """Create a template for a product"""
        try:
            logger.info(f"[DYNAMIC TEMPLATE] Creating template for product {product.code}")
            
            # Generate Fabric.js template data
            template_data = self.enterprise_template_service.generate_fabric_template_data(product)
            
            if not template_data:
                logger.warning(f"[DYNAMIC TEMPLATE] Failed to generate data for {product.code}")
                return None
            
            # Create template record
            template = Template(
                name=f"Auto Template - {product.code}",
                description=f"Auto-generated template for {product.code}",
                product_id=product.id,
                brand_id=product.brand_id,
                created_by=product.created_by if hasattr(product, 'created_by') else 1,
                template_type=template_type,
                template_data=template_data,
                is_active=True,
                is_auto_generated=True,
                visibility='PRIVATE'
            )
            
            db.add(template)
            db.commit()
            db.refresh(template)
            
            logger.info(f"[DYNAMIC TEMPLATE] Created template {template.id} for product {product.code}")
            return template
            
        except Exception as e:
            logger.error(f"[DYNAMIC TEMPLATE] Error creating template: {e}")
            db.rollback()
            return None
    
    def update_template(
        self,
        template_id: int,
        product: Product,
        db: Session
    ) -> Optional[Template]:
        """Update an existing template"""
        try:
            template = db.query(Template).filter(Template.id == template_id).first()
            
            if not template:
                logger.warning(f"[DYNAMIC TEMPLATE] Template {template_id} not found")
                return None
            
            # Generate new template data
            template_data = self.enterprise_template_service.generate_fabric_template_data(product)
            
            if not template_data:
                logger.warning(f"[DYNAMIC TEMPLATE] Failed to generate data for {product.code}")
                return None
            
            # Update template
            template.template_data = template_data
            template.description = f"Updated template for {product.code}"
            
            db.commit()
            db.refresh(template)
            
            logger.info(f"[DYNAMIC TEMPLATE] Updated template {template_id}")
            return template
            
        except Exception as e:
            logger.error(f"[DYNAMIC TEMPLATE] Error updating template: {e}")
            db.rollback()
            return None
    
    def get_template(self, template_id: int, db: Session) -> Optional[Template]:
        """Get a template by ID"""
        try:
            template = db.query(Template).filter(Template.id == template_id).first()
            return template
        except Exception as e:
            logger.error(f"[DYNAMIC TEMPLATE] Error getting template: {e}")
            return None
    
    def get_templates_for_product(self, product_id: int, db: Session) -> list:
        """Get all templates for a product"""
        try:
            templates = db.query(Template).filter(
                Template.product_id == product_id,
                Template.is_active == True
            ).all()
            return templates
        except Exception as e:
            logger.error(f"[DYNAMIC TEMPLATE] Error getting templates: {e}")
            return []
    
    def delete_template(self, template_id: int, db: Session) -> bool:
        """Delete a template"""
        try:
            template = db.query(Template).filter(Template.id == template_id).first()
            
            if not template:
                logger.warning(f"[DYNAMIC TEMPLATE] Template {template_id} not found")
                return False
            
            db.delete(template)
            db.commit()
            
            logger.info(f"[DYNAMIC TEMPLATE] Deleted template {template_id}")
            return True
            
        except Exception as e:
            logger.error(f"[DYNAMIC TEMPLATE] Error deleting template: {e}")
            db.rollback()
            return False


# Global instance
dynamic_template_service = DynamicTemplateService()

