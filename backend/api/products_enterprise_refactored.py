"""
ENTERPRISE-LEVEL PRODUCT UPLOAD API
Version 2.0 - Refactored for Modularity

Features:
- Instant upload response
- Background processing
- Advanced directory structure
- Multi-color support
- OCR on tags only
- Template generation
- Error recovery
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Dict, Any, Optional
import os
import uuid
import re
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor

from database import get_db
from dependencies.auth import get_current_active_user
from models.user import User
from models.brand import Brand
from models.upload_job import UploadJob
from models.product import Product, ProductImage
from core.logging import get_logger
from core.exceptions import BaseAppException
from core.validation import validate_upload_files
from core.services import get_service
from services.unified_ocr_service import UnifiedOCRService
from services.unified_upload_service import UnifiedUploadService
from services.enterprise_template_service import EnterpriseTemplateService
from services.brand_permission_service import BrandPermissionService

logger = get_logger('products_enterprise')

router = APIRouter()

class ProductUploadManager:
    """Product upload manager for enterprise operations"""
    
    def __init__(self):
        self.ocr_service = UnifiedOCRService()
        self.upload_service = UnifiedUploadService()
        self.template_service = EnterpriseTemplateService()
        self.permission_service = BrandPermissionService()
    
    async def process_upload(
        self,
        files: List[UploadFile],
        current_user: User,
        db: Session,
        background_tasks: BackgroundTasks
    ) -> Dict[str, Any]:
        """Process product upload with enterprise features"""
        try:
            # Validate files
            validation_result = validate_upload_files(files)
            if not validation_result['valid']:
                raise HTTPException(status_code=400, detail=validation_result['errors'])
            
            # Create upload job
            upload_job = self._create_upload_job(current_user, len(files), db)
            
            # Process files in background
            background_tasks.add_task(
                self._process_files_background,
                files, current_user, upload_job.id, db
            )
            
            return {
                'success': True,
                'message': 'Upload başlatıldı',
                'job_id': upload_job.id,
                'status': 'processing'
            }
            
        except Exception as e:
            logger.error(f"Upload processing error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    def _create_upload_job(self, user: User, file_count: int, db: Session) -> UploadJob:
        """Create upload job record"""
        upload_job = UploadJob(
            user_id=user.id,
            status='processing',
            total_files=file_count,
            processed_files=0,
            failed_files=0
        )
        db.add(upload_job)
        db.commit()
        db.refresh(upload_job)
        return upload_job
    
    async def _process_files_background(
        self,
        files: List[UploadFile],
        current_user: User,
        job_id: int,
        db: Session
    ):
        """Process files in background"""
        try:
            processed_count = 0
            failed_count = 0
            
            for file in files:
                try:
                    await self._process_single_file(file, current_user, db)
                    processed_count += 1
                except Exception as e:
                    logger.error(f"File processing error: {e}")
                    failed_count += 1
            
            # Update job status
            self._update_upload_job(job_id, processed_count, failed_count, db)
            
        except Exception as e:
            logger.error(f"Background processing error: {e}")
    
    async def _process_single_file(
        self,
        file: UploadFile,
        current_user: User,
        db: Session
    ):
        """Process single file"""
        try:
            # Extract product info using OCR
            product_info = await self.ocr_service.extract_product_info(file)
            
            # Check brand permissions
            if not self.permission_service.has_brand_permission(
                current_user, product_info.get('brand_id')
            ):
                raise BaseAppException("Brand permission denied")
            
            # Create product
            product = await self.upload_service.create_product(
                product_info, current_user, db
            )
            
            # Generate template
            await self.template_service.generate_template(product, db)
            
        except Exception as e:
            logger.error(f"Single file processing error: {e}")
            raise
    
    def _update_upload_job(
        self,
        job_id: int,
        processed_count: int,
        failed_count: int,
        db: Session
    ):
        """Update upload job status"""
        try:
            job = db.query(UploadJob).filter(UploadJob.id == job_id).first()
            if job:
                job.processed_files = processed_count
                job.failed_files = failed_count
                job.status = 'completed' if failed_count == 0 else 'partial'
                job.completed_at = datetime.now()
                db.commit()
        except Exception as e:
            logger.error(f"Job update error: {e}")

# Global manager instance
upload_manager = ProductUploadManager()

@router.post("/upload-v2")
async def upload_products_v2(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Enterprise product upload endpoint"""
    try:
        result = await upload_manager.process_upload(
            files, current_user, db, background_tasks
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")

@router.get("/upload-status/{job_id}")
async def get_upload_status(
    job_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get upload job status"""
    try:
        job = db.query(UploadJob).filter(
            UploadJob.id == job_id,
            UploadJob.user_id == current_user.id
        ).first()
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {
            'job_id': job.id,
            'status': job.status,
            'total_files': job.total_files,
            'processed_files': job.processed_files,
            'failed_files': job.failed_files,
            'created_at': job.created_at,
            'completed_at': job.completed_at
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status check error: {e}")
        raise HTTPException(status_code=500, detail="Status check failed")

@router.get("/")
async def get_products(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    brand_id: Optional[int] = Query(None),
    color: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get products with enterprise query optimization"""
    try:
        query = db.query(Product).filter(Product.is_active == True)
        
        # Apply filters
        if search:
            query = query.filter(
                or_(
                    Product.code.ilike(f"%{search}%"),
                    Product.name.ilike(f"%{search}%")
                )
            )
        
        if brand_id:
            query = query.filter(Product.brand_id == brand_id)
        
        if color:
            query = query.filter(Product.color.ilike(f"%{color}%"))
        
        # Pagination
        total = query.count()
        products = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return {
            'products': products,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }
    except Exception as e:
        logger.error(f"Products query error: {e}")
        raise HTTPException(status_code=500, detail="Query failed")

@router.get("/{product_id}")
async def get_product(
    product_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get single product"""
    try:
        product = db.query(Product).filter(
            Product.id == product_id,
            Product.is_active == True
        ).first()
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return product
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Product query error: {e}")
        raise HTTPException(status_code=500, detail="Query failed")
