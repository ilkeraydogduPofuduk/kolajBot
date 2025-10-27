"""
AI Templates API
Endpoints for AI-generated template management
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import asyncio

from database import get_db
from api.auth import get_current_user_info
from models.user import User
from services.ai_template_generator import AITemplateGenerator, GeneratedTemplate
from schemas.ai_templates import (
    AITemplateResponse,
    AITemplateListResponse,
    GenerateTemplatesRequest,
    GenerateTemplatesResponse
)

router = APIRouter(prefix="/api/ai-templates", tags=["AI Templates"])

# Initialize AI template generator
ai_generator = AITemplateGenerator()

@router.get("/", response_model=AITemplateListResponse)
async def get_ai_templates(
    template_type: Optional[str] = None,
    platform: Optional[str] = None,
    current_user: User = Depends(get_current_user_info),
    db: Session = Depends(get_db)
):
    """Get all AI-generated templates"""
    try:
        templates = await ai_generator.get_generated_templates(template_type)
        
        # Filter by platform if specified
        if platform:
            templates = [t for t in templates if t.platform == platform]
        
        # Convert to response format
        template_responses = []
        for template in templates:
            template_responses.append(AITemplateResponse(
                id=template.id,
                name=template.name,
                description=template.description,
                template_type=template.template_type,
                platform=template.platform,
                preview_image_url=f"/api/ai-templates/{template.id}/preview",
                config=template.config.__dict__,
                created_at=template.created_at,
                is_active=template.is_active
            ))
        
        return AITemplateListResponse(
            success=True,
            templates=template_responses,
            total=len(template_responses)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting AI templates: {str(e)}")

@router.get("/{template_id}", response_model=AITemplateResponse)
async def get_ai_template(
    template_id: str,
    current_user: User = Depends(get_current_user_info),
    db: Session = Depends(get_db)
):
    """Get specific AI template"""
    try:
        templates = await ai_generator.get_generated_templates()
        template = next((t for t in templates if t.id == template_id), None)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return AITemplateResponse(
            id=template.id,
            name=template.name,
            description=template.description,
            template_type=template.template_type,
            platform=template.platform,
            preview_image_url=f"/api/ai-templates/{template.id}/preview",
            config=template.config.__dict__,
            created_at=template.created_at,
            is_active=template.is_active
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting AI template: {str(e)}")

@router.get("/{template_id}/preview")
async def get_ai_template_preview(
    template_id: str,
    current_user: User = Depends(get_current_user_info)
):
    """Get AI template preview image"""
    try:
        templates = await ai_generator.get_generated_templates()
        template = next((t for t in templates if t.id == template_id), None)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        if not template.preview_image_path or not os.path.exists(template.preview_image_path):
            raise HTTPException(status_code=404, detail="Preview image not found")
        
        from fastapi.responses import FileResponse
        return FileResponse(
            template.preview_image_path,
            media_type="image/jpeg",
            filename=f"{template.name}_preview.jpg"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting preview: {str(e)}")

@router.post("/generate", response_model=GenerateTemplatesResponse)
async def generate_ai_templates(
    request: GenerateTemplatesRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user_info),
    db: Session = Depends(get_db)
):
    """Generate new AI templates"""
    try:
        # Check if user has permission to generate templates
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Admin permission required")
        
        # Generate templates in background
        background_tasks.add_task(
            _generate_templates_background,
            request.social_media_count,
            request.product_count
        )
        
        return GenerateTemplatesResponse(
            success=True,
            message="Template generation started in background",
            estimated_time="2-5 minutes"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating templates: {str(e)}")

@router.post("/generate-social-media", response_model=GenerateTemplatesResponse)
async def generate_social_media_templates(
    count: int = 5,
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_user_info),
    db: Session = Depends(get_db)
):
    """Generate social media templates"""
    try:
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Admin permission required")
        
        # Generate templates
        templates = await ai_generator.generate_social_media_templates(count)
        
        return GenerateTemplatesResponse(
            success=True,
            message=f"Generated {len(templates)} social media templates",
            generated_count=len(templates)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating social media templates: {str(e)}")

@router.post("/generate-product", response_model=GenerateTemplatesResponse)
async def generate_product_templates(
    count: int = 3,
    current_user: User = Depends(get_current_user_info),
    db: Session = Depends(get_db)
):
    """Generate product showcase templates"""
    try:
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Admin permission required")
        
        # Generate templates
        templates = await ai_generator.generate_product_templates(count)
        
        return GenerateTemplatesResponse(
            success=True,
            message=f"Generated {len(templates)} product templates",
            generated_count=len(templates)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating product templates: {str(e)}")

@router.delete("/{template_id}")
async def delete_ai_template(
    template_id: str,
    current_user: User = Depends(get_current_user_info),
    db: Session = Depends(get_db)
):
    """Delete AI template"""
    try:
        if not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Admin permission required")
        
        # Find template
        templates = await ai_generator.get_generated_templates()
        template = next((t for t in templates if t.id == template_id), None)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Delete template files
        import os
        import shutil
        
        # Delete config file
        config_path = os.path.join(ai_generator.configs_dir, f"{template_id}.json")
        if os.path.exists(config_path):
            os.remove(config_path)
        
        # Delete preview image
        if template.preview_image_path and os.path.exists(template.preview_image_path):
            os.remove(template.preview_image_path)
        
        return {"success": True, "message": "Template deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting template: {str(e)}")

@router.get("/platforms/list")
async def get_supported_platforms(
    current_user: User = Depends(get_current_user_info)
):
    """Get supported platforms for AI templates"""
    try:
        platforms = {
            "social_media": ["whatsapp", "telegram", "instagram", "facebook"],
            "product_showcase": ["general", "collage", "showcase"]
        }
        
        return {
            "success": True,
            "platforms": platforms
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting platforms: {str(e)}")

@router.get("/stats/overview")
async def get_ai_templates_stats(
    current_user: User = Depends(get_current_user_info),
    db: Session = Depends(get_db)
):
    """Get AI templates statistics"""
    try:
        templates = await ai_generator.get_generated_templates()
        
        # Calculate stats
        total_templates = len(templates)
        social_media_count = len([t for t in templates if t.template_type == "social_media"])
        product_count = len([t for t in templates if t.template_type == "product_showcase"])
        
        # Platform breakdown
        platforms = {}
        for template in templates:
            platform = template.platform
            if platform not in platforms:
                platforms[platform] = 0
            platforms[platform] += 1
        
        # Recent templates (last 7 days)
        from datetime import datetime, timedelta
        week_ago = datetime.now() - timedelta(days=7)
        recent_count = len([t for t in templates if t.created_at >= week_ago])
        
        return {
            "success": True,
            "stats": {
                "total_templates": total_templates,
                "social_media_templates": social_media_count,
                "product_templates": product_count,
                "recent_templates": recent_count,
                "platforms": platforms
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")

async def _generate_templates_background(social_count: int, product_count: int):
    """Background task for template generation"""
    try:
        # Generate social media templates
        if social_count > 0:
            await ai_generator.generate_social_media_templates(social_count)
        
        # Generate product templates
        if product_count > 0:
            await ai_generator.generate_product_templates(product_count)
        
        print(f"Background template generation completed: {social_count} social, {product_count} product")
        
    except Exception as e:
        print(f"Error in background template generation: {e}")

# Start the scheduler when the module is imported
async def start_ai_scheduler():
    """Start the AI template generation scheduler"""
    try:
        # Start scheduler in background
        asyncio.create_task(ai_generator.schedule_template_generation())
        print("AI template generation scheduler started")
    except Exception as e:
        print(f"Error starting AI scheduler: {e}")

# Import required modules
import os
