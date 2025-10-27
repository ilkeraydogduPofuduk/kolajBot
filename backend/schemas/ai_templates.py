"""
AI Templates Schemas
Pydantic models for AI-generated templates
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime

class TemplateConfigSchema(BaseModel):
    """Template configuration schema"""
    name: str
    description: str
    template_type: str
    platform: str
    width: int
    height: int
    background_color: Tuple[int, int, int]
    text_color: Tuple[int, int, int]
    accent_color: Tuple[int, int, int]
    font_size: int
    layout_type: str
    elements: List[Dict[str, Any]]

class AITemplateResponse(BaseModel):
    """AI template response schema"""
    id: str
    name: str
    description: str
    template_type: str
    platform: str
    preview_image_url: str
    config: TemplateConfigSchema
    created_at: datetime
    is_active: bool = True

class AITemplateListResponse(BaseModel):
    """AI template list response schema"""
    success: bool
    templates: List[AITemplateResponse]
    total: int

class GenerateTemplatesRequest(BaseModel):
    """Generate templates request schema"""
    social_media_count: int = Field(default=5, ge=1, le=20, description="Number of social media templates to generate")
    product_count: int = Field(default=3, ge=1, le=10, description="Number of product templates to generate")

class GenerateTemplatesResponse(BaseModel):
    """Generate templates response schema"""
    success: bool
    message: str
    generated_count: Optional[int] = None
    estimated_time: Optional[str] = None

class AITemplateStatsResponse(BaseModel):
    """AI template statistics response schema"""
    success: bool
    stats: Dict[str, Any]

class PlatformListResponse(BaseModel):
    """Supported platforms response schema"""
    success: bool
    platforms: Dict[str, List[str]]
