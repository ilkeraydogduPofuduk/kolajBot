"""
Enterprise Image API
High-performance image serving with optimization and caching
"""

from fastapi import APIRouter, Query, HTTPException, Depends
from fastapi.responses import Response, FileResponse
from sqlalchemy.orm import Session
from database import get_db
from services.enterprise_image_service import enterprise_image_service
import os
import urllib.parse
from core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

@router.get("/optimized/{file_path:path}")
async def get_optimized_image(
    file_path: str,
    size: str = Query("md", description="Image size: xs, sm, md, lg, xl"),
    quality: str = Query("web", description="Image quality: thumbnail, web, print"),
    format: str = Query("JPEG", description="Image format: JPEG, PNG, WEBP")
):
    """
    Get optimized image with specified size and quality
    """
    try:
        # Security: Prevent directory traversal
        if ".." in file_path or file_path.startswith("/"):
            raise HTTPException(status_code=400, detail="Invalid file path")
        
        # Build full path
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads")
        full_path = os.path.join(uploads_dir, file_path)
        
        # Normalize path
        full_path = os.path.normpath(full_path)
        
        # Security: Ensure path is within uploads directory
        if not full_path.startswith(os.path.normpath(uploads_dir)):
            raise HTTPException(status_code=400, detail="Access denied")
        
        if not os.path.exists(full_path):
            raise HTTPException(status_code=404, detail="Image not found")
        
        # Optimize image
        optimized_data = enterprise_image_service.optimize_image(
            full_path, 
            size=size, 
            quality=quality, 
            format=format
        )
        
        # Determine content type
        content_type = "image/jpeg"
        if format.upper() == "PNG":
            content_type = "image/png"
        elif format.upper() == "WEBP":
            content_type = "image/webp"
        
        # Return optimized image
        return Response(
            content=optimized_data,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=31536000",  # Cache for 1 year
                "X-Content-Type-Options": "nosniff",
                "X-Optimized": "true",
                "Access-Control-Allow-Origin": "*",  # CORS header for Fabric.js
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image optimization error: {e}")
        raise HTTPException(status_code=500, detail=f"Image optimization failed: {str(e)}")

@router.get("/thumbnail/{file_path:path}")
async def get_thumbnail(
    file_path: str,
    size: str = Query("sm", description="Thumbnail size: xs, sm, md, lg, xl")
):
    """
    Get thumbnail for image
    """
    try:
        # Security: Prevent directory traversal
        if ".." in file_path or file_path.startswith("/"):
            raise HTTPException(status_code=400, detail="Invalid file path")
        
        # Build full path
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads")
        full_path = os.path.join(uploads_dir, file_path)
        
        # Normalize path
        full_path = os.path.normpath(full_path)
        
        # Security: Ensure path is within uploads directory
        if not full_path.startswith(os.path.normpath(uploads_dir)):
            raise HTTPException(status_code=400, detail="Access denied")
        
        if not os.path.exists(full_path):
            raise HTTPException(status_code=404, detail="Image not found")
        
        # Generate thumbnail
        thumbnail_data = enterprise_image_service.generate_thumbnail(full_path, size=size)
        
        # Return thumbnail
        return Response(
            content=thumbnail_data,
            media_type="image/jpeg",
            headers={
                "Cache-Control": "public, max-age=31536000",  # Cache for 1 year
                "X-Content-Type-Options": "nosniff",
                "X-Thumbnail": "true",
                "Access-Control-Allow-Origin": "*",  # CORS header for Fabric.js
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Thumbnail generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Thumbnail generation failed: {str(e)}")

@router.get("/metadata/{file_path:path}")
async def get_image_metadata(file_path: str):
    """
    Get image metadata
    """
    try:
        # Security: Prevent directory traversal
        if ".." in file_path or file_path.startswith("/"):
            raise HTTPException(status_code=400, detail="Invalid file path")
        
        # Build full path
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads")
        full_path = os.path.join(uploads_dir, file_path)
        
        # Normalize path
        full_path = os.path.normpath(full_path)
        
        # Security: Ensure path is within uploads directory
        if not full_path.startswith(os.path.normpath(uploads_dir)):
            raise HTTPException(status_code=400, detail="Access denied")
        
        # Get metadata
        metadata = enterprise_image_service.get_image_metadata(full_path)
        
        return metadata
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image metadata error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get image metadata: {str(e)}")

@router.get("/progressive/{file_path:path}")
async def get_progressive_image(
    file_path: str,
    quality_steps: str = Query("10,30,60,90", description="Quality steps separated by commas")
):
    """
    Get progressive JPEG with multiple quality steps
    """
    try:
        # Security: Prevent directory traversal
        if ".." in file_path or file_path.startswith("/"):
            raise HTTPException(status_code=400, detail="Invalid file path")
        
        # Build full path
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads")
        full_path = os.path.join(uploads_dir, file_path)
        
        # Normalize path
        full_path = os.path.normpath(full_path)
        
        # Security: Ensure path is within uploads directory
        if not full_path.startswith(os.path.normpath(uploads_dir)):
            raise HTTPException(status_code=400, detail="Access denied")
        
        if not os.path.exists(full_path):
            raise HTTPException(status_code=404, detail="Image not found")
        
        # Parse quality steps
        try:
            steps = [int(q.strip()) for q in quality_steps.split(",")]
        except ValueError:
            steps = [10, 30, 60, 90]
        
        # Generate progressive images
        progressive_images = enterprise_image_service.create_progressive_image(full_path, steps)
        
        # Return first (lowest quality) image
        return Response(
            content=progressive_images[0],
            media_type="image/jpeg",
            headers={
                "Cache-Control": "public, max-age=31536000",
                "X-Content-Type-Options": "nosniff",
                "X-Progressive": "true",
                "X-Quality-Steps": ",".join(map(str, steps)),
                "Access-Control-Allow-Origin": "*",  # CORS header for Fabric.js
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Progressive image error: {e}")
        raise HTTPException(status_code=500, detail=f"Progressive image generation failed: {str(e)}")

@router.post("/invalidate-cache/{file_path:path}")
async def invalidate_image_cache(file_path: str):
    """
    Invalidate cache for specific image
    """
    try:
        # Security: Prevent directory traversal
        if ".." in file_path or file_path.startswith("/"):
            raise HTTPException(status_code=400, detail="Invalid file path")
        
        # Invalidate cache
        enterprise_image_service.invalidate_image_cache(file_path)
        
        return {"message": "Cache invalidated successfully"}
        
    except Exception as e:
        logger.error(f"Cache invalidation error: {e}")
        raise HTTPException(status_code=500, detail=f"Cache invalidation failed: {str(e)}")

@router.get("/{file_path:path}")
async def get_image(file_path: str):
    """
    Simple image serving endpoint for frontend
    """
    try:
        # URL decode the file path
        original_path = file_path
        decoded_path = urllib.parse.unquote(file_path)
        logger.info(f"[SIMPLE IMAGE API] Request: {original_path}")
        logger.info(f"[SIMPLE IMAGE API] Decoded: {decoded_path}")
        
        # Security: Prevent directory traversal
        if ".." in decoded_path:
            raise HTTPException(status_code=400, detail="Invalid file path")
        
        # Handle full paths from frontend
        if "/" in decoded_path or "\\" in decoded_path:
            logger.info(f"[SIMPLE IMAGE API] Full path detected: {decoded_path}")
            
            # Try to find the file directly
            if os.path.exists(decoded_path):
                logger.info(f"[SIMPLE IMAGE API] Found file at: {decoded_path}")
                return FileResponse(
                    path=decoded_path,
                    media_type="image/jpeg",
                    headers={
                        "Cache-Control": "public, max-age=3600",
                        "Access-Control-Allow-Origin": "*"
                    }
                )
        else:
            # Just filename, search in uploads directory
            logger.info(f"[SIMPLE IMAGE API] Searching for filename: {decoded_path}")
            
            # Get uploads directory - ROOT/uploads (where collages are)
            uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
            logger.info(f"[SIMPLE IMAGE API] Uploads dir: {uploads_dir}")
            
            # Search for the file
            found_path = None
            for root, dirs, files in os.walk(uploads_dir):
                if decoded_path in files:
                    found_path = os.path.join(root, decoded_path)
                    logger.info(f"[SIMPLE IMAGE API] Found file at: {found_path}")
                    break
            
            if found_path:
                return FileResponse(
                    path=found_path,
                    media_type="image/jpeg",
                    headers={
                        "Cache-Control": "public, max-age=3600",
                        "Access-Control-Allow-Origin": "*"
                    }
                )
            else:
                logger.error(f"[SIMPLE IMAGE API] File not found: {decoded_path}")
                raise HTTPException(status_code=404, detail="Image not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[SIMPLE IMAGE API] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to serve image: {str(e)}")

@router.get("/cache-stats")
async def get_image_cache_stats():
    """
    Get image cache statistics
    """
    try:
        stats = enterprise_image_service.get_cache_stats()
        return stats
        
    except Exception as e:
        logger.error(f"Cache stats error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get cache stats: {str(e)}")
