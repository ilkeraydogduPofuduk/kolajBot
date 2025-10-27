"""
Enterprise Template Service
Professional Fabric.js template generation with 5 different patterns
"""

from typing import Dict, List, Any, Optional
import json
import random
from PIL import Image, ImageDraw, ImageFont
import os
from models.product import Product
from models.template import Template
from core.logging import get_logger

logger = get_logger('enterprise_template_service')

class EnterpriseTemplateService:
    """Enterprise-level template generation service"""
    
    def __init__(self):
        self.template_patterns = TemplatePatterns()
    
    def create_fabric_template(self, product: Product, output_path: str, template_id: Optional[int] = None) -> bool:
        """Create Fabric.js template for a product"""
        try:
            logger.info(f"[FABRIC TEMPLATE] Creating template for product: {product.code}")
            
            # Generate template data
            fabric_data = self.generate_fabric_template_data(product)
            
            if not fabric_data:
                logger.warning(f"[FABRIC TEMPLATE] Failed to generate data for {product.code}")
                return False
            
            # Save as JSON
            json_path = output_path.replace('.jpg', '.json').replace('.png', '.json')
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(fabric_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"[FABRIC TEMPLATE] Created successfully: {json_path}")
            return True
            
        except Exception as e:
            logger.error(f"[FABRIC TEMPLATE] Error creating template: {e}")
            return False
    
    def generate_fabric_template_data(self, product: Product) -> Dict[str, Any]:
        """Generate Fabric.js template data"""
        try:
            # Prepare image URLs
            images = []
            if product.images:
                for image in product.images[:3]:  # First 3 images
                    if image.file_path:
                        image_url = f"http://localhost:8005/api/images/optimized/{image.file_path.split('uploads/')[-1]}"
                        images.append(image_url)
            
            # Prepare product data
            product_data = {
                'images': images,
                'brand_name': product.brand.name if product.brand else '',
                'code': product.code,
                'color': product.color,
                'product_type': product.product_type or 'PRODUCT',
                'size_range': product.size_range,
                'price': product.price,
                'has_second_product': bool(product.code_2),
                'code_2': product.code_2,
                'color_2': product.color_2,
                'product_type_2': product.product_type_2,
                'size_range_2': product.size_range_2,
                'price_2': product.price_2
            }
            
            # Select template based on product type
            if product.product_type and 'PANT' in product.product_type.upper():
                template_index = random.choice([0, 4])
            elif product.product_type and 'JACKET' in product.product_type.upper():
                template_index = 2
            else:
                template_index = random.randint(0, 4)
            
            # Generate template
            template_data = self.template_patterns.get_template_by_index(template_index, product_data)
            
            logger.info(f"[FABRIC TEMPLATE] Created template type {template_index + 1} for product {product.code}")
            return template_data
            
        except Exception as e:
            logger.error(f"[FABRIC TEMPLATE] Error generating template data: {e}")
            return {}


class TemplatePatterns:
    """5 different professional template patterns"""
    
    @staticmethod
    def get_template_1(product_data: Dict[str, Any]) -> Dict[str, Any]:
        """DIZAYN&ELLA - BLOUSE + PANT (DAMSON) style template"""
        images = product_data.get('images', [])
        brand_name = product_data.get('brand_name', 'DIZAYN&ELLA')
        has_second_product = product_data.get('has_second_product', False)
        
        objects = [
            {
                "type": "textbox",
                "left": 50,
                "top": 20,
                "width": 980,
                "text": brand_name,
                "fontSize": 48,
                "fontFamily": "Playfair Display",
                "fill": "#000",
                "fontWeight": "bold",
                "textAlign": "center",
                "editable": True
            }
        ]
        
        # Images
        if len(images) > 0:
            objects.append({
                "type": "image",
                "left": 20,
                "top": 80,
                "width": 500,
                "height": 750,
                "rx": 20,
                "ry": 20,
                "src": images[0],
                "crossOrigin": "anonymous"
            })
        
        if len(images) > 1:
            objects.append({
                "type": "image",
                "left": 550,
                "top": 80,
                "width": 500,
                "height": 350,
                "rx": 20,
                "ry": 20,
                "src": images[1],
                "crossOrigin": "anonymous"
            })
        
        if len(images) > 2:
            objects.append({
                "type": "image",
                "left": 550,
                "top": 450,
                "width": 500,
                "height": 350,
                "rx": 20,
                "ry": 20,
                "src": images[2],
                "crossOrigin": "anonymous"
            })
        
        # Product info
        product_text_1 = f"{product_data.get('product_type', 'BLOUSE')}: {product_data.get('code', '')} {product_data.get('color', '')} {product_data.get('size_range', '')}".strip()
        objects.append({
            "type": "textbox",
            "left": 50,
            "top": 1150,
            "width": 700,
            "text": product_text_1,
            "fontSize": 28,
            "fontFamily": "Arial",
            "fill": "#333",
            "fontWeight": "bold",
            "editable": True
        })
        
        # Second product if exists
        if has_second_product:
            product_text_2 = f"{product_data.get('product_type_2', 'PANT')}: {product_data.get('code_2', '')} {product_data.get('color_2', '')} {product_data.get('size_range_2', '')}".strip()
            objects.append({
                "type": "textbox",
                "left": 50,
                "top": 1180,
                "width": 700,
                "text": product_text_2,
                "fontSize": 28,
                "fontFamily": "Arial",
                "fill": "#333",
                "fontWeight": "bold",
                "editable": True
            })
        
        # Price box 1
        if product_data.get('price'):
            objects.extend([
                {
                    "type": "rect",
                    "left": 900,
                    "top": 1140,
                    "width": 120,
                    "height": 50,
                    "fill": "#333",
                    "rx": 25,
                    "ry": 25
                },
                {
                    "type": "textbox",
                    "left": 910,
                    "top": 1150,
                    "width": 100,
                    "text": f"${product_data['price']}",
                    "fontSize": 30,
                    "fill": "#fff",
                    "fontWeight": "bold",
                    "editable": True
                }
            ])
        
        # Second price box
        if has_second_product and product_data.get('price_2'):
            objects.extend([
                {
                    "type": "rect",
                    "left": 900,
                    "top": 1190,
                    "width": 120,
                    "height": 50,
                    "fill": "#333",
                    "rx": 25,
                    "ry": 25
                },
                {
                    "type": "textbox",
                    "left": 910,
                    "top": 1200,
                    "width": 100,
                    "text": f"${product_data['price_2']}",
                    "fontSize": 30,
                    "fill": "#fff",
                    "fontWeight": "bold",
                    "editable": True
                }
            ])
        
        return {
            "version": "5.3.1",
            "objects": objects,
            "background": "#fdf6e9"
        }
    
    @staticmethod
    def get_template_2(product_data: Dict[str, Any]) -> Dict[str, Any]:
        """DIZAYN BRANDS - BLOUSE (INDIGO) + LOGO style template"""
        images = product_data.get('images', [])
        brand_name = product_data.get('brand_name', 'DIZAYN BRANDS')
        
        objects = [
            {
                "type": "textbox",
                "left": 50,
                "top": 20,
                "width": 980,
                "text": brand_name,
                "fontSize": 48,
                "fontFamily": "Arial",
                "fill": "#666",
                "fontWeight": "bold",
                "textAlign": "center",
                "editable": True
            }
        ]
        
        # Images
        if len(images) > 0:
            objects.append({
                "type": "image",
                "left": 20,
                "top": 80,
                "width": 500,
                "height": 750,
                "rx": 20,
                "ry": 20,
                "src": images[0],
                "crossOrigin": "anonymous"
            })
        
        if len(images) > 1:
            objects.append({
                "type": "image",
                "left": 550,
                "top": 80,
                "width": 500,
                "height": 350,
                "rx": 20,
                "ry": 20,
                "src": images[1],
                "crossOrigin": "anonymous"
            })
        
        if len(images) > 2:
            objects.append({
                "type": "image",
                "left": 550,
                "top": 450,
                "width": 500,
                "height": 350,
                "rx": 20,
                "ry": 20,
                "src": images[2],
                "crossOrigin": "anonymous"
            })
        
        # Logo box
        objects.extend([
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
                "top": 1160,
                "width": 100,
                "text": "kokART",
                "fontSize": 24,
                "fontFamily": "Arial",
                "fill": "#000",
                "fontWeight": "bold",
                "textAlign": "center",
                "editable": True
            }
        ])
        
        # Product info
        product_text = f"{product_data.get('product_type', 'BLOUSE')}: {product_data.get('code', '')} {product_data.get('color', '')} {product_data.get('size_range', '')}".strip()
        objects.append({
            "type": "textbox",
            "left": 160,
            "top": 1150,
            "width": 700,
            "text": product_text,
            "fontSize": 28,
            "fontFamily": "Arial",
            "fill": "#000",
            "fontWeight": "bold",
            "editable": True
        })
        
        # Price box
        if product_data.get('price'):
            objects.extend([
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
                    "text": f"${product_data['price']}",
                    "fontSize": 30,
                    "fill": "#fff",
                    "fontWeight": "bold",
                    "editable": True
                }
            ])
        
        return {
            "version": "5.3.1",
            "objects": objects,
            "background": "#ffffff"
        }
    
    @staticmethod
    def get_template_3(product_data: Dict[str, Any]) -> Dict[str, Any]:
        """DIZAYN BRANDS - JACKET (VISON) + LOGO style template"""
        # Similar to template 2, but with different logo
        template = TemplatePatterns.get_template_2(product_data)
        
        # Change logo text
        for obj in template['objects']:
            if obj.get('type') == 'textbox' and obj.get('left') == 30 and obj.get('top') == 1160:
                obj['text'] = 'PiZARA Line'
                break
        
        return template
    
    @staticmethod
    def get_template_4(product_data: Dict[str, Any]) -> Dict[str, Any]:
        """DIZAYN BRANDS - BLOUSE (VISON) + LOGO style template"""
        return TemplatePatterns.get_template_2(product_data)
    
    @staticmethod
    def get_template_5(product_data: Dict[str, Any]) -> Dict[str, Any]:
        """DIZAYN BRANDS - BLOUSE + PANT (BLACK) + LOGO style template"""
        images = product_data.get('images', [])
        brand_name = product_data.get('brand_name', 'DIZAYN BRANDS')
        has_second_product = product_data.get('has_second_product', False)
        
        objects = [
            {
                "type": "textbox",
                "left": 50,
                "top": 20,
                "width": 980,
                "text": brand_name,
                "fontSize": 48,
                "fontFamily": "Arial",
                "fill": "#666",
                "fontWeight": "bold",
                "textAlign": "center",
                "editable": True
            }
        ]
        
        # Images
        if len(images) > 0:
            objects.append({
                "type": "image",
                "left": 20,
                "top": 80,
                "width": 500,
                "height": 750,
                "rx": 20,
                "ry": 20,
                "src": images[0],
                "crossOrigin": "anonymous"
            })
        
        if len(images) > 1:
            objects.append({
                "type": "image",
                "left": 550,
                "top": 80,
                "width": 500,
                "height": 350,
                "rx": 20,
                "ry": 20,
                "src": images[1],
                "crossOrigin": "anonymous"
            })
        
        if len(images) > 2:
            objects.append({
                "type": "image",
                "left": 550,
                "top": 450,
                "width": 500,
                "height": 350,
                "rx": 20,
                "ry": 20,
                "src": images[2],
                "crossOrigin": "anonymous"
            })
        
        # Logo box
        objects.extend([
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
                "top": 1160,
                "width": 100,
                "text": "kokART",
                "fontSize": 24,
                "fontFamily": "Arial",
                "fill": "#000",
                "fontWeight": "bold",
                "textAlign": "center",
                "editable": True
            }
        ])
        
        # Product info
        product_text_1 = f"{product_data.get('product_type', 'BLOUSE')}: {product_data.get('code', '')} {product_data.get('color', '')} {product_data.get('size_range', '')}".strip()
        objects.append({
            "type": "textbox",
            "left": 160,
            "top": 1150,
            "width": 700,
            "text": product_text_1,
            "fontSize": 28,
            "fontFamily": "Arial",
            "fill": "#000",
            "fontWeight": "bold",
            "editable": True
        })
        
        # Second product if exists
        if has_second_product:
            product_text_2 = f"{product_data.get('product_type_2', 'PANT')}: {product_data.get('code_2', '')} {product_data.get('color_2', '')} {product_data.get('size_range_2', '')}".strip()
            objects.append({
                "type": "textbox",
                "left": 160,
                "top": 1180,
                "width": 700,
                "text": product_text_2,
                "fontSize": 28,
                "fontFamily": "Arial",
                "fill": "#000",
                "fontWeight": "bold",
                "editable": True
            })
        
        # Price box 1
        if product_data.get('price'):
            objects.extend([
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
                    "text": f"${product_data['price']}",
                    "fontSize": 30,
                    "fill": "#fff",
                    "fontWeight": "bold",
                    "editable": True
                }
            ])
        
        # Second price box
        if has_second_product and product_data.get('price_2'):
            objects.extend([
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
                    "text": f"${product_data['price_2']}",
                    "fontSize": 30,
                    "fill": "#fff",
                    "fontWeight": "bold",
                    "editable": True
                }
            ])
        
        return {
            "version": "5.3.1",
            "objects": objects,
            "background": "#ffffff"
        }
    
    @staticmethod
    def get_random_template(product_data: Dict[str, Any]) -> Dict[str, Any]:
        """Select random template"""
        templates = [
            TemplatePatterns.get_template_1,
            TemplatePatterns.get_template_2,
            TemplatePatterns.get_template_3,
            TemplatePatterns.get_template_4,
            TemplatePatterns.get_template_5
        ]
        
        selected_template = random.choice(templates)
        return selected_template(product_data)
    
    @staticmethod
    def get_template_by_index(index: int, product_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get template by index"""
        templates = [
            TemplatePatterns.get_template_1,
            TemplatePatterns.get_template_2,
            TemplatePatterns.get_template_3,
            TemplatePatterns.get_template_4,
            TemplatePatterns.get_template_5
        ]
        
        if 0 <= index < len(templates):
            return templates[index](product_data)
        else:
            return TemplatePatterns.get_random_template(product_data)

