"""
AI Template Generator Service
Generates dynamic templates for social media and product showcases using AI
"""
import asyncio
import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from PIL import Image, ImageDraw, ImageFont
import random
import math

from core.logging import get_logger
# from services.base_service import BaseService

logger = get_logger('ai_template_generator')

@dataclass
class TemplateConfig:
    """Template configuration"""
    name: str
    description: str
    template_type: str  # 'social_media', 'product_showcase', 'collage'
    platform: str  # 'whatsapp', 'telegram', 'instagram', 'facebook'
    width: int
    height: int
    background_color: Tuple[int, int, int]
    text_color: Tuple[int, int, int]
    accent_color: Tuple[int, int, int]
    font_size: int
    layout_type: str  # 'single', 'dual', 'grid', 'story'
    elements: List[Dict]

@dataclass
class GeneratedTemplate:
    """Generated template result"""
    id: str
    name: str
    description: str
    template_type: str
    platform: str
    config: TemplateConfig
    preview_image_path: str
    template_data: Dict
    created_at: datetime
    is_active: bool = True

class AITemplateGenerator:
    """AI-powered template generator"""
    
    def __init__(self):
        # Get the backend directory (one level up from backend/services)
        backend_dir = os.path.dirname(os.path.dirname(__file__))
        self.templates_dir = os.path.join(backend_dir, "data", "ai_templates")
        self.preview_dir = os.path.join(backend_dir, "data", "ai_templates", "previews")
        self.configs_dir = os.path.join(backend_dir, "data", "ai_templates", "configs")
        
        # Create directories
        os.makedirs(self.templates_dir, exist_ok=True)
        os.makedirs(self.preview_dir, exist_ok=True)
        os.makedirs(self.configs_dir, exist_ok=True)
        
        # Template generation patterns - Enhanced for Telegram & WhatsApp
        self.social_media_patterns = {
            'whatsapp': {
                'width': 1080,
                'height': 1080,
                'layouts': ['single', 'dual', 'grid', 'story', 'status'],
                'colors': [
                    {'bg': (25, 25, 25), 'text': (255, 255, 255), 'accent': (37, 211, 102)},  # WhatsApp Green Dark
                    {'bg': (255, 255, 255), 'text': (25, 25, 25), 'accent': (37, 211, 102)},  # WhatsApp Green Light
                    {'bg': (240, 248, 255), 'text': (25, 25, 25), 'accent': (37, 211, 102)},  # WhatsApp Green Soft
                    {'bg': (37, 211, 102), 'text': (255, 255, 255), 'accent': (255, 255, 255)},  # WhatsApp Green Primary
                    {'bg': (0, 0, 0), 'text': (37, 211, 102), 'accent': (37, 211, 102)},  # WhatsApp Black
                ],
                'special_features': ['status_format', 'message_bubble', 'contact_card', 'business_card'],
                'text_styles': ['bold', 'italic', 'monospace', 'strikethrough'],
                'elements': ['qr_code', 'contact_info', 'business_hours', 'location']
            },
            'telegram': {
                'width': 1080,
                'height': 1080,
                'layouts': ['single', 'dual', 'story', 'channel', 'group'],
                'colors': [
                    {'bg': (0, 136, 204), 'text': (255, 255, 255), 'accent': (255, 255, 255)},  # Telegram Blue Dark
                    {'bg': (255, 255, 255), 'text': (0, 136, 204), 'accent': (0, 136, 204)},  # Telegram Blue Light
                    {'bg': (240, 248, 255), 'text': (0, 136, 204), 'accent': (0, 136, 204)},  # Telegram Blue Soft
                    {'bg': (0, 136, 204), 'text': (255, 255, 255), 'accent': (255, 255, 255)},  # Telegram Blue Primary
                    {'bg': (0, 0, 0), 'text': (0, 136, 204), 'accent': (0, 136, 204)},  # Telegram Black
                ],
                'special_features': ['channel_header', 'group_invite', 'bot_command', 'inline_keyboard'],
                'text_styles': ['bold', 'italic', 'code', 'pre', 'link', 'mention'],
                'elements': ['bot_info', 'channel_info', 'group_rules', 'invite_link']
            },
            'instagram': {
                'width': 1080,
                'height': 1080,
                'layouts': ['single', 'grid', 'story'],
                'colors': [
                    {'bg': (255, 255, 255), 'text': (25, 25, 25), 'accent': (225, 48, 108)},  # Instagram Pink
                    {'bg': (25, 25, 25), 'text': (255, 255, 255), 'accent': (225, 48, 108)},
                    {'bg': (240, 248, 255), 'text': (25, 25, 25), 'accent': (225, 48, 108)},
                ]
            },
            'facebook': {
                'width': 1200,
                'height': 630,
                'layouts': ['single', 'dual'],
                'colors': [
                    {'bg': (255, 255, 255), 'text': (25, 25, 25), 'accent': (24, 119, 242)},  # Facebook Blue
                    {'bg': (25, 25, 25), 'text': (255, 255, 255), 'accent': (24, 119, 242)},
                    {'bg': (240, 248, 255), 'text': (25, 25, 25), 'accent': (24, 119, 242)},
                ]
            }
        }
        
        # Product showcase patterns
        self.product_patterns = {
            'collage': {
                'width': 1080,
                'height': 1920,
                'layouts': ['single', 'dual', 'grid'],
                'colors': [
                    {'bg': (245, 245, 245), 'text': (50, 50, 50), 'accent': (150, 120, 90)},
                    {'bg': (255, 255, 255), 'text': (25, 25, 25), 'accent': (200, 50, 50)},
                    {'bg': (240, 248, 255), 'text': (25, 25, 25), 'accent': (100, 150, 200)},
                ]
            },
            'showcase': {
                'width': 1080,
                'height': 1080,
                'layouts': ['single', 'dual'],
                'colors': [
                    {'bg': (255, 255, 255), 'text': (25, 25, 25), 'accent': (150, 120, 90)},
                    {'bg': (25, 25, 25), 'text': (255, 255, 255), 'accent': (200, 200, 200)},
                ]
            }
        }
    
    async def generate_social_media_templates(self, count: int = 5) -> List[GeneratedTemplate]:
        """Generate social media templates using AI patterns"""
        logger.info(f"Generating {count} social media templates")
        
        templates = []
        
        for i in range(count):
            try:
                # Random platform selection
                platform = random.choice(list(self.social_media_patterns.keys()))
                platform_config = self.social_media_patterns[platform]
                
                # Random color scheme
                color_scheme = random.choice(platform_config['colors'])
                
                # Random layout
                layout = random.choice(platform_config['layouts'])
                
                # Generate platform-specific template
                if platform == 'whatsapp':
                    template = await self._generate_whatsapp_template(i+1, layout, color_scheme, platform_config)
                elif platform == 'telegram':
                    template = await self._generate_telegram_template(i+1, layout, color_scheme, platform_config)
                else:
                    template = await self._generate_single_template(
                        name=f"AI {platform.title()} Template {i+1}",
                        description=f"AI-generated {platform} template with {layout} layout",
                        template_type="social_media",
                        platform=platform,
                        width=platform_config['width'],
                        height=platform_config['height'],
                        background_color=color_scheme['bg'],
                        text_color=color_scheme['text'],
                        accent_color=color_scheme['accent'],
                        layout_type=layout
                    )
                
                templates.append(template)
                logger.info(f"Generated template: {template.name}")
                
            except Exception as e:
                logger.error(f"Error generating template {i+1}: {e}")
                continue
        
        return templates
    
    async def generate_product_templates(self, count: int = 3) -> List[GeneratedTemplate]:
        """Generate product showcase templates"""
        logger.info(f"Generating {count} product templates")
        
        templates = []
        
        for i in range(count):
            try:
                # Random product type
                product_type = random.choice(list(self.product_patterns.keys()))
                product_config = self.product_patterns[product_type]
                
                # Random color scheme
                color_scheme = random.choice(product_config['colors'])
                
                # Random layout
                layout = random.choice(product_config['layouts'])
                
                # Generate template
                template = await self._generate_single_template(
                    name=f"AI Product {product_type.title()} Template {i+1}",
                    description=f"AI-generated {product_type} template for product showcase",
                    template_type="product_showcase",
                    platform="general",
                    width=product_config['width'],
                    height=product_config['height'],
                    background_color=color_scheme['bg'],
                    text_color=color_scheme['text'],
                    accent_color=color_scheme['accent'],
                    layout_type=layout
                )
                
                templates.append(template)
                logger.info(f"Generated product template: {template.name}")
                
            except Exception as e:
                logger.error(f"Error generating product template {i+1}: {e}")
                continue
        
        return templates
    
    async def _generate_whatsapp_template(self, index: int, layout: str, color_scheme: dict, platform_config: dict) -> GeneratedTemplate:
        """Generate WhatsApp-specific template with special features"""
        special_feature = random.choice(platform_config['special_features'])
        text_style = random.choice(platform_config['text_styles'])
        element = random.choice(platform_config['elements'])
        
        template_name = f"WhatsApp {special_feature.replace('_', ' ').title()} Template {index}"
        description = f"WhatsApp {layout} template with {special_feature} and {text_style} styling"
        
        # WhatsApp-specific elements
        elements = self._generate_whatsapp_elements(layout, special_feature, element, platform_config)
        
        config = TemplateConfig(
            name=template_name,
            description=description,
            template_type="social_media",
            platform="whatsapp",
            width=platform_config['width'],
            height=platform_config['height'],
            background_color=color_scheme['bg'],
            text_color=color_scheme['text'],
            accent_color=color_scheme['accent'],
            font_size=random.randint(24, 48),
            layout_type=layout,
            elements=elements
        )
        
        # Add WhatsApp-specific metadata
        config.metadata = {
            'special_feature': special_feature,
            'text_style': text_style,
            'element': element,
            'whatsapp_version': '2.0',
            'features': platform_config['special_features']
        }
        
        return await self._create_template_from_config(config)
    
    async def _generate_telegram_template(self, index: int, layout: str, color_scheme: dict, platform_config: dict) -> GeneratedTemplate:
        """Generate Telegram-specific template with special features"""
        special_feature = random.choice(platform_config['special_features'])
        text_style = random.choice(platform_config['text_styles'])
        element = random.choice(platform_config['elements'])
        
        template_name = f"Telegram {special_feature.replace('_', ' ').title()} Template {index}"
        description = f"Telegram {layout} template with {special_feature} and {text_style} styling"
        
        # Telegram-specific elements
        elements = self._generate_telegram_elements(layout, special_feature, element, platform_config)
        
        config = TemplateConfig(
            name=template_name,
            description=description,
            template_type="social_media",
            platform="telegram",
            width=platform_config['width'],
            height=platform_config['height'],
            background_color=color_scheme['bg'],
            text_color=color_scheme['text'],
            accent_color=color_scheme['accent'],
            font_size=random.randint(24, 48),
            layout_type=layout,
            elements=elements
        )
        
        # Add Telegram-specific metadata
        config.metadata = {
            'special_feature': special_feature,
            'text_style': text_style,
            'element': element,
            'telegram_version': '2.0',
            'features': platform_config['special_features']
        }
        
        return await self._create_template_from_config(config)
    
    def _generate_whatsapp_elements(self, layout: str, special_feature: str, element: str, platform_config: dict) -> List[Dict]:
        """Generate WhatsApp-specific elements"""
        elements = []
        width = platform_config['width']
        height = platform_config['height']
        
        if special_feature == 'status_format':
            # WhatsApp Status format
            elements.extend([
                {
                    'type': 'image',
                    'id': 'status_image',
                    'x': width // 8,
                    'y': height // 8,
                    'width': width * 3 // 4,
                    'height': height * 3 // 4,
                    'properties': {
                        'border_radius': 20,
                        'shadow': True,
                        'whatsapp_status': True
                    }
                },
                {
                    'type': 'text',
                    'id': 'status_text',
                    'x': width // 2,
                    'y': height // 8 + height * 3 // 4 + 20,
                    'text': 'WhatsApp Status',
                    'properties': {
                        'font_size': 28,
                        'font_weight': 'bold',
                        'text_align': 'center',
                        'whatsapp_green': True
                    }
                }
            ])
        
        elif special_feature == 'message_bubble':
            # WhatsApp message bubble
            elements.extend([
                {
                    'type': 'shape',
                    'id': 'message_bubble',
                    'x': width // 4,
                    'y': height // 3,
                    'width': width // 2,
                    'height': height // 3,
                    'properties': {
                        'shape': 'bubble',
                        'whatsapp_bubble': True,
                        'corner_radius': 15
                    }
                },
                {
                    'type': 'text',
                    'id': 'message_text',
                    'x': width // 2,
                    'y': height // 2,
                    'text': 'Mesajınız',
                    'properties': {
                        'font_size': 24,
                        'text_align': 'center',
                        'inside_bubble': True
                    }
                }
            ])
        
        elif special_feature == 'contact_card':
            # WhatsApp contact card
            elements.extend([
                {
                    'type': 'shape',
                    'id': 'contact_card',
                    'x': width // 6,
                    'y': height // 6,
                    'width': width * 2 // 3,
                    'height': height * 2 // 3,
                    'properties': {
                        'shape': 'card',
                        'contact_card': True,
                        'border_radius': 10
                    }
                },
                {
                    'type': 'text',
                    'id': 'contact_name',
                    'x': width // 2,
                    'y': height // 3,
                    'text': 'İletişim',
                    'properties': {
                        'font_size': 32,
                        'font_weight': 'bold',
                        'text_align': 'center'
                    }
                },
                {
                    'type': 'text',
                    'id': 'contact_number',
                    'x': width // 2,
                    'y': height // 2,
                    'text': '+90 555 123 45 67',
                    'properties': {
                        'font_size': 20,
                        'text_align': 'center',
                        'monospace': True
                    }
                }
            ])
        
        return elements
    
    def _generate_telegram_elements(self, layout: str, special_feature: str, element: str, platform_config: dict) -> List[Dict]:
        """Generate Telegram-specific elements"""
        elements = []
        width = platform_config['width']
        height = platform_config['height']
        
        if special_feature == 'channel_header':
            # Telegram channel header
            elements.extend([
                {
                    'type': 'shape',
                    'id': 'channel_header',
                    'x': 0,
                    'y': 0,
                    'width': width,
                    'height': height // 4,
                    'properties': {
                        'shape': 'header',
                        'telegram_header': True,
                        'gradient': True
                    }
                },
                {
                    'type': 'text',
                    'id': 'channel_name',
                    'x': width // 2,
                    'y': height // 8,
                    'text': 'Kanal Adı',
                    'properties': {
                        'font_size': 36,
                        'font_weight': 'bold',
                        'text_align': 'center',
                        'telegram_blue': True
                    }
                },
                {
                    'type': 'text',
                    'id': 'channel_description',
                    'x': width // 2,
                    'y': height // 8 + 50,
                    'text': 'Kanal açıklaması',
                    'properties': {
                        'font_size': 18,
                        'text_align': 'center',
                        'opacity': 0.8
                    }
                }
            ])
        
        elif special_feature == 'group_invite':
            # Telegram group invite
            elements.extend([
                {
                    'type': 'shape',
                    'id': 'invite_card',
                    'x': width // 8,
                    'y': height // 4,
                    'width': width * 3 // 4,
                    'height': height // 2,
                    'properties': {
                        'shape': 'card',
                        'group_invite': True,
                        'border_radius': 15
                    }
                },
                {
                    'type': 'text',
                    'id': 'group_name',
                    'x': width // 2,
                    'y': height // 2 - 50,
                    'text': 'Grup Daveti',
                    'properties': {
                        'font_size': 28,
                        'font_weight': 'bold',
                        'text_align': 'center'
                    }
                },
                {
                    'type': 'text',
                    'id': 'invite_link',
                    'x': width // 2,
                    'y': height // 2 + 20,
                    'text': 't.me/groupname',
                    'properties': {
                        'font_size': 16,
                        'text_align': 'center',
                        'monospace': True,
                        'telegram_link': True
                    }
                }
            ])
        
        elif special_feature == 'bot_command':
            # Telegram bot command
            elements.extend([
                {
                    'type': 'shape',
                    'id': 'command_box',
                    'x': width // 6,
                    'y': height // 3,
                    'width': width * 2 // 3,
                    'height': height // 3,
                    'properties': {
                        'shape': 'box',
                        'bot_command': True,
                        'border_radius': 8
                    }
                },
                {
                    'type': 'text',
                    'id': 'bot_name',
                    'x': width // 2,
                    'y': height // 2 - 30,
                    'text': '@botname',
                    'properties': {
                        'font_size': 24,
                        'font_weight': 'bold',
                        'text_align': 'center',
                        'telegram_mention': True
                    }
                },
                {
                    'type': 'text',
                    'id': 'command_text',
                    'x': width // 2,
                    'y': height // 2 + 10,
                    'text': '/start',
                    'properties': {
                        'font_size': 20,
                        'text_align': 'center',
                        'monospace': True,
                        'telegram_command': True
                    }
                }
            ])
        
        return elements
    
    async def _create_template_from_config(self, config: TemplateConfig) -> GeneratedTemplate:
        """Create template from config"""
        # Generate preview image
        preview_path = await self._generate_preview_image(config)
        
        # Create template data
        template_data = {
            'config': config.__dict__,
            'elements': config.elements,
            'metadata': getattr(config, 'metadata', {}),
            'metadata': {
                'generated_by': 'ai',
                'generation_time': datetime.now().isoformat(),
                'version': '2.0'
            }
        }
        
        # Save template config
        template_id = f"ai_{config.template_type}_{config.platform}_{int(datetime.now().timestamp())}"
        config_path = os.path.join(self.configs_dir, f"{template_id}.json")
        
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(template_data, f, indent=2, ensure_ascii=False)
        
        # Create GeneratedTemplate object
        template = GeneratedTemplate(
            id=template_id,
            name=config.name,
            description=config.description,
            template_type=config.template_type,
            platform=config.platform,
            config=config,
            preview_image_path=preview_path,
            template_data=template_data,
            created_at=datetime.now()
        )
        
        return template
    
    async def _generate_single_template(
        self,
        name: str,
        description: str,
        template_type: str,
        platform: str,
        width: int,
        height: int,
        background_color: Tuple[int, int, int],
        text_color: Tuple[int, int, int],
        accent_color: Tuple[int, int, int],
        layout_type: str
    ) -> GeneratedTemplate:
        """Generate a single template"""
        
        # Create template config
        config = TemplateConfig(
            name=name,
            description=description,
            template_type=template_type,
            platform=platform,
            width=width,
            height=height,
            background_color=background_color,
            text_color=text_color,
            accent_color=accent_color,
            font_size=random.randint(24, 48),
            layout_type=layout_type,
            elements=self._generate_template_elements(layout_type, width, height)
        )
        
        # Generate preview image
        preview_path = await self._generate_preview_image(config)
        
        # Create template data
        template_data = {
            'config': config.__dict__,
            'elements': config.elements,
            'metadata': {
                'generated_by': 'ai',
                'generation_time': datetime.now().isoformat(),
                'version': '1.0'
            }
        }
        
        # Save template config
        template_id = f"ai_{template_type}_{platform}_{int(datetime.now().timestamp())}"
        config_path = os.path.join(self.configs_dir, f"{template_id}.json")
        
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(template_data, f, indent=2, ensure_ascii=False)
        
        # Create GeneratedTemplate object
        template = GeneratedTemplate(
            id=template_id,
            name=name,
            description=description,
            template_type=template_type,
            platform=platform,
            config=config,
            preview_image_path=preview_path,
            template_data=template_data,
            created_at=datetime.now()
        )
        
        return template
    
    def _generate_template_elements(self, layout_type: str, width: int, height: int) -> List[Dict]:
        """Generate template elements based on layout type"""
        elements = []
        
        if layout_type == 'single':
            # Single product layout
            elements = [
                {
                    'type': 'image',
                    'id': 'main_image',
                    'x': width // 4,
                    'y': height // 4,
                    'width': width // 2,
                    'height': height // 2,
                    'properties': {
                        'border_radius': 10,
                        'shadow': True
                    }
                },
                {
                    'type': 'text',
                    'id': 'title',
                    'x': width // 2,
                    'y': height // 2 + height // 4 + 20,
                    'text': 'Ürün Başlığı',
                    'properties': {
                        'font_size': 32,
                        'font_weight': 'bold',
                        'text_align': 'center'
                    }
                },
                {
                    'type': 'text',
                    'id': 'price',
                    'x': width // 2,
                    'y': height // 2 + height // 4 + 60,
                    'text': '₺ 150',
                    'properties': {
                        'font_size': 24,
                        'font_weight': 'bold',
                        'text_align': 'center',
                        'color': 'accent'
                    }
                }
            ]
        
        elif layout_type == 'dual':
            # Dual product layout
            elements = [
                {
                    'type': 'image',
                    'id': 'left_image',
                    'x': width // 8,
                    'y': height // 4,
                    'width': width // 3,
                    'height': height // 2,
                    'properties': {
                        'border_radius': 10,
                        'shadow': True
                    }
                },
                {
                    'type': 'image',
                    'id': 'right_image',
                    'x': width // 2 + width // 8,
                    'y': height // 4,
                    'width': width // 3,
                    'height': height // 2,
                    'properties': {
                        'border_radius': 10,
                        'shadow': True
                    }
                },
                {
                    'type': 'text',
                    'id': 'title',
                    'x': width // 2,
                    'y': height // 2 + height // 4 + 20,
                    'text': 'Ürün Koleksiyonu',
                    'properties': {
                        'font_size': 28,
                        'font_weight': 'bold',
                        'text_align': 'center'
                    }
                }
            ]
        
        elif layout_type == 'grid':
            # Grid layout
            grid_size = 3
            cell_width = width // grid_size
            cell_height = height // grid_size
            
            for i in range(grid_size):
                for j in range(grid_size):
                    elements.append({
                        'type': 'image',
                        'id': f'grid_image_{i}_{j}',
                        'x': j * cell_width + 10,
                        'y': i * cell_height + 10,
                        'width': cell_width - 20,
                        'height': cell_height - 20,
                        'properties': {
                            'border_radius': 8,
                            'shadow': True
                        }
                    })
        
        elif layout_type == 'story':
            # Story layout (vertical)
            elements = [
                {
                    'type': 'image',
                    'id': 'story_image',
                    'x': width // 8,
                    'y': height // 8,
                    'width': width * 3 // 4,
                    'height': height * 3 // 4,
                    'properties': {
                        'border_radius': 15,
                        'shadow': True
                    }
                },
                {
                    'type': 'text',
                    'id': 'story_title',
                    'x': width // 2,
                    'y': height // 8 + height * 3 // 4 + 30,
                    'text': 'Hikaye Başlığı',
                    'properties': {
                        'font_size': 24,
                        'font_weight': 'bold',
                        'text_align': 'center'
                    }
                }
            ]
        
        return elements
    
    async def _generate_preview_image(self, config: TemplateConfig) -> str:
        """Generate preview image for template"""
        try:
            # Create image
            img = Image.new('RGB', (config.width, config.height), config.background_color)
            draw = ImageDraw.Draw(img)
            
            # Draw elements
            for element in config.elements:
                if element['type'] == 'image':
                    # Draw placeholder rectangle
                    x, y = element['x'], element['y']
                    w, h = element['width'], element['height']
                    
                    # Draw placeholder
                    draw.rectangle([x, y, x + w, y + h], 
                                 fill=(200, 200, 200), 
                                 outline=config.accent_color, 
                                 width=2)
                    
                    # Draw placeholder text
                    try:
                        font = ImageFont.truetype("arial.ttf", 16)
                    except:
                        font = ImageFont.load_default()
                    
                    text = "Görsel"
                    bbox = draw.textbbox((0, 0), text, font=font)
                    text_width = bbox[2] - bbox[0]
                    text_height = bbox[3] - bbox[1]
                    
                    text_x = x + (w - text_width) // 2
                    text_y = y + (h - text_height) // 2
                    
                    draw.text((text_x, text_y), text, fill=config.text_color, font=font)
                
                elif element['type'] == 'text':
                    # Draw text
                    x, y = element['x'], element['y']
                    text = element['text']
                    
                    try:
                        font_size = element['properties'].get('font_size', config.font_size)
                        font = ImageFont.truetype("arial.ttf", font_size)
                    except:
                        font = ImageFont.load_default()
                    
                    # Handle text alignment
                    if element['properties'].get('text_align') == 'center':
                        bbox = draw.textbbox((0, 0), text, font=font)
                        text_width = bbox[2] - bbox[0]
                        x = x - text_width // 2
                    
                    color = config.accent_color if element['properties'].get('color') == 'accent' else config.text_color
                    draw.text((x, y), text, fill=color, font=font)
            
            # Add AI watermark
            watermark_text = "AI Generated"
            try:
                watermark_font = ImageFont.truetype("arial.ttf", 12)
            except:
                watermark_font = ImageFont.load_default()
            
            bbox = draw.textbbox((0, 0), watermark_text, font=watermark_font)
            watermark_width = bbox[2] - bbox[0]
            watermark_height = bbox[3] - bbox[1]
            
            watermark_x = config.width - watermark_width - 10
            watermark_y = config.height - watermark_height - 10
            
            # Semi-transparent background for watermark
            draw.rectangle([watermark_x - 5, watermark_y - 2, 
                          watermark_x + watermark_width + 5, 
                          watermark_y + watermark_height + 2], 
                         fill=(0, 0, 0, 128))
            
            draw.text((watermark_x, watermark_y), watermark_text, 
                     fill=(255, 255, 255), font=watermark_font)
            
            # Save preview
            preview_filename = f"preview_{config.name.replace(' ', '_')}_{int(datetime.now().timestamp())}.jpg"
            preview_path = os.path.join(self.preview_dir, preview_filename)
            
            img.save(preview_path, 'JPEG', quality=90)
            
            return preview_path
            
        except Exception as e:
            logger.error(f"Error generating preview image: {e}")
            return ""
    
    async def get_generated_templates(self, template_type: Optional[str] = None) -> List[GeneratedTemplate]:
        """Get all generated templates"""
        templates = []
        
        try:
            config_files = [f for f in os.listdir(self.configs_dir) if f.endswith('.json')]
            
            for config_file in config_files:
                try:
                    config_path = os.path.join(self.configs_dir, config_file)
                    
                    with open(config_path, 'r', encoding='utf-8') as f:
                        template_data = json.load(f)
                    
                    config_dict = template_data['config']
                    config = TemplateConfig(**config_dict)
                    
                    # Filter by type if specified
                    if template_type and config.template_type != template_type:
                        continue
                    
                    template = GeneratedTemplate(
                        id=config_file.replace('.json', ''),
                        name=config.name,
                        description=config.description,
                        template_type=config.template_type,
                        platform=config.platform,
                        config=config,
                        preview_image_path=template_data.get('preview_path', ''),
                        template_data=template_data,
                        created_at=datetime.fromisoformat(template_data['metadata']['generation_time'])
                    )
                    
                    templates.append(template)
                    
                except Exception as e:
                    logger.error(f"Error loading template {config_file}: {e}")
                    continue
            
            # Sort by creation date (newest first)
            templates.sort(key=lambda x: x.created_at, reverse=True)
            
        except Exception as e:
            logger.error(f"Error getting generated templates: {e}")
        
        return templates
    
    async def schedule_template_generation(self):
        """Schedule template generation every 2 days"""
        logger.info("Starting AI template generation scheduler")
        
        while True:
            try:
                # Check if it's time to generate new templates
                last_generation = await self._get_last_generation_time()
                now = datetime.now()
                
                if last_generation is None or (now - last_generation).days >= 2:
                    logger.info("Generating new AI templates...")
                    
                    # Generate social media templates
                    social_templates = await self.generate_social_media_templates(3)
                    logger.info(f"Generated {len(social_templates)} social media templates")
                    
                    # Generate product templates
                    product_templates = await self.generate_product_templates(2)
                    logger.info(f"Generated {len(product_templates)} product templates")
                    
                    # Update last generation time
                    await self._update_last_generation_time(now)
                    
                    logger.info("AI template generation completed")
                
                # Wait 1 hour before checking again
                await asyncio.sleep(3600)
                
            except Exception as e:
                logger.error(f"Error in template generation scheduler: {e}")
                await asyncio.sleep(3600)  # Wait 1 hour before retry
    
    async def _get_last_generation_time(self) -> Optional[datetime]:
        """Get last template generation time"""
        try:
            timestamp_file = os.path.join(self.templates_dir, "last_generation.txt")
            
            if os.path.exists(timestamp_file):
                with open(timestamp_file, 'r') as f:
                    timestamp_str = f.read().strip()
                    return datetime.fromisoformat(timestamp_str)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting last generation time: {e}")
            return None
    
    async def _update_last_generation_time(self, timestamp: datetime):
        """Update last template generation time"""
        try:
            timestamp_file = os.path.join(self.templates_dir, "last_generation.txt")
            
            with open(timestamp_file, 'w') as f:
                f.write(timestamp.isoformat())
                
        except Exception as e:
            logger.error(f"Error updating last generation time: {e}")
