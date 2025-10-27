from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import Request
import redis
import logging
import os
from config.settings import settings
from database import engine, SessionLocal, get_db, create_tables
from database import schema_patch
from middleware.monitoring import MonitoringMiddleware, HealthCheckMiddleware, SecurityMonitoringMiddleware
from middleware.security import security_headers_middleware
from middleware.rate_limiting import rate_limit_middleware
from middleware.enterprise_security import enterprise_security_middleware
from services.logging_service import logging_service
from services.background_processor import BackgroundProcessor
from services.background_collage_scheduler import background_collage_scheduler

# Setup structured logging
logging_service.setup_logging()
logger = logging_service.get_logger(__name__)

# Suppress ConnectionResetError from asyncio (Windows issue when client disconnects)
logging.getLogger('asyncio').setLevel(logging.CRITICAL)

# Global background processor
background_processor = None

def get_background_processor():
    """Get the global background processor instance"""
    return background_processor

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global background_processor
    
    # Startup
    logger.info("Application starting up...")
    
    # Create database tables
    try:
        create_tables()
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
    
    # Align legacy databases with current models
    try:
        schema_patch.apply_schema_fixes()
        logger.info("Database schema patch applied successfully")
    except Exception as e:
        logger.error(f"Schema patch failed: {e}")
    
    # Apply database optimizations
    try:
        from config.database_optimization import DatabaseOptimizer
        DatabaseOptimizer.configure_engine_for_high_traffic(engine)
        logger.info("Database optimizations applied")
    except Exception as e:
        logger.error(f"Error applying database optimizations: {e}")
    
    # Start background processor
    try:
        background_processor = BackgroundProcessor(max_workers=8)  # Optimize edildi: 4 -> 8
        background_processor.start()
        logger.info("Background processor started successfully")
    except Exception as e:
        logger.error(f"Error starting background processor: {e}")
    
    # Start collage scheduler
    try:
        await background_collage_scheduler.start_scheduler(interval_seconds=30)
        logger.info("Background collage scheduler started successfully")
    except Exception as e:
        logger.error(f"Failed to start collage scheduler: {e}")
    
    # Start enterprise upload service worker
    try:
        from services.enterprise_upload_service import enterprise_upload_service
        import asyncio
        asyncio.create_task(enterprise_upload_service.process_upload_queue())
        logger.info("Enterprise upload service started successfully")
    except Exception as e:
        logger.error(f"Error starting enterprise upload service: {e}")
    
    # Start AI template generation scheduler
    try:
        from services.ai_template_generator import AITemplateGenerator
        ai_generator = AITemplateGenerator()
        asyncio.create_task(ai_generator.schedule_template_generation())
        logger.info("AI template generation scheduler started")
    except Exception as e:
        logger.error(f"Error starting AI template scheduler: {e}")
    
    # Log startup completion
    logger.info("=" * 60)
    logger.info("ENTERPRISE SYSTEM v2.0 READY")
    logger.info("High-traffic optimization: ENABLED")
    logger.info("Performance monitoring: ENABLED")
    logger.info("=" * 60)
    
    yield
    
    # Shutdown
    logger.info("Application shutting down...")
    
    # Stop background processor
    if background_processor:
        try:
            background_processor.executor.shutdown(wait=True)
            logger.info("Background processor stopped successfully")
        except Exception as e:
            logger.error(f"Error stopping background processor: {e}")
    
    # Stop collage scheduler
    try:
        await background_collage_scheduler.stop_scheduler()
        logger.info("Background collage scheduler stopped")
    except Exception as e:
        logger.error(f"Error stopping collage scheduler: {e}")
    
    logger.info("Application shutdown completed")

from api import auth, users, brands, employee_requests, roles, system, categories
from api import settings as settings_api
from api import social_media_channels
from api import social_media_messages
from api import telegram_bots
from api import products_enterprise
# from api import templates  # REMOVED - Manual template API not needed (auto-collage uses dynamic_templates)
from api import dynamic_templates
from api import ai_templates
from api import performance_monitor
from api import collages
from api import price_extraction
from api import label_extraction

# Initialize FastAPI app
app = FastAPI(
    title="Pofuduk DİJİTAL API",
    description="AI destekli dijital marka yönetim platformu",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False  # Disable automatic redirects for trailing slashes
)

# Redis connection for other purposes (optional)
try:
    redis_client = redis.from_url(settings.REDIS_URL)
except:
    redis_client = None

# CORS middleware - MUST BE FIRST!
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Monitoring middleware - ENABLED FOR PRODUCTION
app.add_middleware(MonitoringMiddleware)
app.add_middleware(HealthCheckMiddleware)
app.add_middleware(SecurityMonitoringMiddleware)

# Security headers middleware - ENABLED FOR PRODUCTION
app.middleware("http")(security_headers_middleware)

# Rate limiting middleware - ENABLED FOR PRODUCTION
app.middleware("http")(rate_limit_middleware)

# Enterprise Security Middleware - ENABLED FOR PRODUCTION
app.middleware("http")(enterprise_security_middleware)

# Trusted host middleware - ENABLED FOR PRODUCTION
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.brandhub.ai"]
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(brands.router, prefix="/api/brands", tags=["Brands"])
# Branches router removed - branches functionality eliminated
app.include_router(employee_requests.router, prefix="/api/employee-requests", tags=["Employee Requests"])
app.include_router(roles.router, prefix="/api/roles", tags=["Roles"])
app.include_router(system.router, prefix="/api/system", tags=["System"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(settings_api.router, prefix="/api/settings", tags=["Settings"])

app.include_router(social_media_channels.router, prefix="/api/social-media", tags=["Social Media Channels"])
app.include_router(social_media_messages.router, prefix="/api/social-media", tags=["Social Media Messages"])
app.include_router(telegram_bots.router, tags=["Telegram Bots"])
app.include_router(products_enterprise.router, prefix="/api/products", tags=["Products"])
# app.include_router(templates.router, prefix="/api/templates", tags=["Templates"])  # REMOVED
app.include_router(dynamic_templates.router, prefix="/api/dynamic-templates", tags=["Dynamic Templates"])
app.include_router(ai_templates.router, tags=["AI Templates"])
app.include_router(performance_monitor.router, prefix="/api", tags=["Performance Monitoring"])
app.include_router(collages.router, tags=["Collages"])
app.include_router(price_extraction.router, tags=["Price Extraction"])
app.include_router(label_extraction.router, tags=["Label Extraction"])

# Custom static files handler with CORS headers
@app.get("/uploads/{file_path:path}")
async def serve_uploaded_file(file_path: str):
    """Serve uploaded files with CORS headers"""
    uploads_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
    # Normalize path separators for cross-platform compatibility
    normalized_file_path = file_path.replace('/', os.sep)
    
    # Try multiple possible paths
    possible_paths = [
        os.path.join(uploads_path, normalized_file_path),
        os.path.join(uploads_path, "Pofudk_DIJITAL", "admin_pfdk_me", "06102025", normalized_file_path)
    ]
    
    # Also try to find the file by searching in subdirectories
    if not any(os.path.exists(p) for p in possible_paths):
        # Search in all subdirectories
        for root, dirs, files in os.walk(uploads_path):
            for file in files:
                if file == os.path.basename(normalized_file_path):
                    possible_paths.append(os.path.join(root, file))
                    break
    
    full_path = None
    for path in possible_paths:
        if os.path.exists(path) and os.path.isfile(path):
            full_path = path
            break    
    
    if full_path and os.path.exists(full_path) and os.path.isfile(full_path):
        return FileResponse(
            full_path,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Credentials": "true"
            }
        )
    else:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="File not found")

# Template images handler - REMOVED (now using dynamic templates)

# Enterprise Image API - AFTER uploads route to avoid conflicts
from api import images
app.include_router(images.router, prefix="/api/images", tags=["Images"])

# Mount static files for uploads - kök dizinden
# Backend klasörünün bir üstündeki uploads klasörü
uploads_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
if os.path.exists(uploads_path):
    print(f"[OK] Uploads dizini bulundu: {uploads_path}")
else:
    print(f"[WARNING] uploads dizini bulunamadi: {uploads_path}")


# Mount static files
import os
uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {"message": "Pofuduk DİJİTAL API is running"}

@app.get("/health")
async def health_check():
    logger.info("Health check endpoint accessed")
    return {"status": "healthy", "version": "1.0.0"}

@app.get("/api/categories-public/active")
async def get_active_categories_public():
    """Public endpoint for all categories (no authentication required)"""
    try:
        from models.category import Category
        from database import SessionLocal
        db = SessionLocal()
        try:
            # Tüm kategorileri getir
            categories = db.query(Category).all()
            result = []
            for cat in categories:
                result.append({
                    "id": cat.id,
                    "name": cat.name
                })
            logger.info(f"Returning {len(result)} categories")
            return result
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Error getting categories: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return []


if __name__ == "__main__":
    import uvicorn
    logger.info("Starting server...")
    uvicorn.run(app, host="127.0.0.1", port=8000)
