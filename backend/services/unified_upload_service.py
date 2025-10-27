"""
Unified Upload Service
Tüm upload işlemleri tek yerden yönetilir
"""

import asyncio
import os
import uuid
import tempfile
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageOps
from core.services import BaseService
from core.config import settings
from core.logging import get_logger, log_performance_metric, log_business_event
from core.exceptions import ValidationError, ExternalServiceError
from services.unified_ocr_service import unified_ocr_service, ProductInfo
from services.directory_manager import DirectoryManager

logger = get_logger('unified_upload')

@dataclass
class UploadResult:
    """Upload result data class"""
    success: bool
    file_path: Optional[str] = None
    file_size: int = 0
    file_type: Optional[str] = None
    error_message: Optional[str] = None
    processing_time: float = 0.0
    metadata: Dict[str, Any] = None

@dataclass
class ProductUploadResult:
    """Product upload result data class"""
    success: bool
    product_id: Optional[int] = None
    product_code: Optional[str] = None
    color: Optional[str] = None
    brand_name: Optional[str] = None
    images: List[UploadResult] = None
    ocr_results: List[ProductInfo] = None
    error_message: Optional[str] = None
    processing_time: float = 0.0

class UnifiedUploadService(BaseService):
    """Unified upload service combining file upload and OCR processing"""
    
    def __init__(self):
        super().__init__()
        self.directory_manager = DirectoryManager()
        self.max_file_size = settings.upload.max_file_size_mb * 1024 * 1024  # Convert to bytes
        
        # Thumbnail settings
        self.thumbnail_sizes = {
            'small': (150, 150),
            'medium': (300, 300),
            'large': (600, 600)
        }
        self.max_file_count = settings.upload.max_file_count
        self.allowed_extensions = settings.upload.allowed_extensions
        self.total_upload_size_limit = settings.upload.total_upload_size_mb * 1024 * 1024
        self.storage_path = settings.upload.storage_path
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    def create_thumbnails(self, image_path: str, output_dir: str) -> Dict[str, str]:
        """Create multiple thumbnail sizes for an image"""
        try:
            thumbnails = {}
            
            with Image.open(image_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                for size_name, (width, height) in self.thumbnail_sizes.items():
                    # Create thumbnail maintaining aspect ratio
                    thumbnail = img.copy()
                    thumbnail.thumbnail((width, height), Image.Resampling.LANCZOS)
                    
                    # Save thumbnail
                    thumbnail_filename = f"{Path(image_path).stem}_{size_name}.jpg"
                    thumbnail_path = os.path.join(output_dir, thumbnail_filename)
                    thumbnail.save(thumbnail_path, 'JPEG', quality=85, optimize=True)
                    
                    thumbnails[size_name] = thumbnail_path
                    
            return thumbnails
            
        except Exception as e:
            logger.error(f"Error creating thumbnails for {image_path}: {e}")
            return {}
        
        # Create storage directory (only when needed, not on startup)
        # Path(self.storage_path).mkdir(exist_ok=True)
    
    async def initialize(self) -> bool:
        """Initialize upload service"""
        try:
            # Initialize OCR service
            await unified_ocr_service.initialize()
            
            # Initialize directory manager
            await self.directory_manager.initialize()
            
            logger.info("Unified Upload Service initialized")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize upload service: {e}")
            return False
    
    async def cleanup(self) -> bool:
        """Cleanup upload service"""
        try:
            if self.executor:
                self.executor.shutdown(wait=True)
            
            await unified_ocr_service.cleanup()
            await self.directory_manager.cleanup()
            
            logger.info("Unified Upload Service cleaned up")
            return True
        except Exception as e:
            logger.error(f"Failed to cleanup upload service: {e}")
            return False
    
    async def upload_files(
        self,
        files: List[Any],
        user_id: int,
        brand_id: Optional[int] = None,
        auto_process: bool = True
    ) -> ProductUploadResult:
        """Upload multiple files with automatic processing"""
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Validate files
            self._validate_files(files)
            
            # Save files temporarily
            temp_files = await self._save_temp_files(files)
            
            # Process with OCR
            ocr_results = []
            if auto_process:
                ocr_results = await unified_ocr_service.process_images_batch(temp_files)
            
            # Extract product information
            product_info = self._extract_product_info(ocr_results)
            
            # Create product directory structure
            product_path = await self._create_product_directory(
                product_info, brand_id, user_id
            )
            
            # Move files to final location
            upload_results = await self._move_files_to_final_location(
                temp_files, product_path
            )
            
            # Clean up temp files
            await self._cleanup_temp_files(temp_files)
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            # Log business event
            log_business_event(
                'product_upload_completed',
                user_id=user_id,
                details={
                    'file_count': len(files),
                    'product_code': product_info.product_code,
                    'brand_name': product_info.brand_name,
                    'processing_time': processing_time
                }
            )
            
            return ProductUploadResult(
                success=True,
                product_code=product_info.product_code,
                color=product_info.color,
                brand_name=product_info.brand_name,
                images=upload_results,
                ocr_results=ocr_results,
                processing_time=processing_time
            )
            
        except Exception as e:
            logger.error(f"File upload failed: {e}")
            return ProductUploadResult(
                success=False,
                error_message=str(e),
                processing_time=asyncio.get_event_loop().time() - start_time
            )
    
    def _validate_files(self, files: List[Any]) -> None:
        """Validate uploaded files"""
        if not files:
            raise ValidationError("No files provided")
        
        if len(files) > self.max_file_count:
            raise ValidationError(f"Too many files. Maximum allowed: {self.max_file_count}")
        
        total_size = 0
        for file in files:
            # Check file size
            if hasattr(file, 'size') and file.size > self.max_file_size:
                raise ValidationError(f"File too large. Maximum allowed: {self.max_file_size} bytes")
            
            # Check file extension
            if hasattr(file, 'filename'):
                extension = Path(file.filename).suffix.lower().lstrip('.')
                if extension not in self.allowed_extensions:
                    raise ValidationError(f"File type not allowed: {extension}")
            
            # Calculate total size
            if hasattr(file, 'size'):
                total_size += file.size
        
        if total_size > self.total_upload_size_limit:
            raise ValidationError(f"Total upload size too large. Maximum allowed: {self.total_upload_size_limit} bytes")
    
    async def _save_temp_files(self, files: List[Any]) -> List[str]:
        """Save files to temporary location"""
        temp_files = []
        
        for file in files:
            try:
                # Create temporary file
                temp_file = tempfile.NamedTemporaryFile(
                    delete=False,
                    suffix=Path(file.filename).suffix,
                    dir=tempfile.gettempdir()
                )
                
                # Write file content
                content = await file.read()
                temp_file.write(content)
                temp_file.close()
                
                temp_files.append(temp_file.name)
                
            except Exception as e:
                logger.error(f"Failed to save temp file: {e}")
                raise ExternalServiceError(f"Failed to save temporary file: {str(e)}")
        
        return temp_files
    
    def _extract_product_info(self, ocr_results: List[Any]) -> ProductInfo:
        """Extract product information from OCR results"""
        if not ocr_results:
            return ProductInfo()
        
        # Use the first result as primary
        primary_result = ocr_results[0]
        
        # Extract information
        product_code = primary_result.product_code
        color = primary_result.color
        brand_name = primary_result.brand_name
        size = primary_result.size
        material = primary_result.material
        price = primary_result.price
        barcode = primary_result.barcode
        
        # If primary result is incomplete, try to fill from other results
        for result in ocr_results[1:]:
            if not product_code and result.product_code:
                product_code = result.product_code
            if not color and result.color:
                color = result.color
            if not brand_name and result.brand_name:
                brand_name = result.brand_name
            if not size and result.size:
                size = result.size
            if not material and result.material:
                material = result.material
            if not price and result.price:
                price = result.price
            if not barcode and result.barcode:
                barcode = result.barcode
        
        return ProductInfo(
            product_code=product_code,
            color=color,
            brand_name=brand_name,
            size=size,
            material=material,
            price=price,
            barcode=barcode,
            confidence=primary_result.confidence,
            raw_text=primary_result.raw_text
        )
    
    async def _create_product_directory(
        self,
        product_info: ProductInfo,
        brand_id: Optional[int],
        user_id: int
    ) -> str:
        """Create product directory structure"""
        try:
            # Determine brand name
            brand_name = product_info.brand_name or "DEFAULT"
            
            # Determine product code
            product_code = product_info.product_code or "DEFAULT_CODE"
            
            # Determine color
            color = product_info.color or "DEFAULT"
            
            # Create directory path
            directory_path = os.path.join(
                self.storage_path,
                brand_name,
                product_code,
                color
            )
            
            # Create directory
            Path(directory_path).mkdir(parents=True, exist_ok=True)
            
            return directory_path
            
        except Exception as e:
            logger.error(f"Failed to create product directory: {e}")
            raise ExternalServiceError(f"Failed to create product directory: {str(e)}")
    
    async def _move_files_to_final_location(
        self,
        temp_files: List[str],
        final_directory: str
    ) -> List[UploadResult]:
        """Move files from temporary location to final directory"""
        upload_results = []
        
        for i, temp_file in enumerate(temp_files):
            try:
                # Generate unique filename
                file_extension = Path(temp_file).suffix
                unique_filename = f"{uuid.uuid4()}{file_extension}"
                final_path = os.path.join(final_directory, unique_filename)
                
                # Move file
                os.rename(temp_file, final_path)
                
                # Get file info
                file_size = os.path.getsize(final_path)
                
                upload_results.append(UploadResult(
                    success=True,
                    file_path=final_path,
                    file_size=file_size,
                    file_type=file_extension,
                    processing_time=0.0
                ))
                
            except Exception as e:
                logger.error(f"Failed to move file {temp_file}: {e}")
                upload_results.append(UploadResult(
                    success=False,
                    error_message=str(e)
                ))
        
        return upload_results
    
    async def _cleanup_temp_files(self, temp_files: List[str]) -> None:
        """Clean up temporary files"""
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
            except Exception as e:
                logger.warning(f"Failed to cleanup temp file {temp_file}: {e}")
    
    async def get_upload_stats(self) -> Dict[str, Any]:
        """Get upload statistics"""
        try:
            # Count files in storage
            total_files = 0
            total_size = 0
            
            for root, dirs, files in os.walk(self.storage_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    if os.path.exists(file_path):
                        total_files += 1
                        total_size += os.path.getsize(file_path)
            
            return {
                'total_files': total_files,
                'total_size_bytes': total_size,
                'total_size_mb': total_size / (1024 * 1024),
                'storage_path': self.storage_path,
                'max_file_size_mb': settings.upload.max_file_size_mb,
                'max_file_count': settings.upload.max_file_count,
                'allowed_extensions': settings.upload.allowed_extensions
            }
            
        except Exception as e:
            logger.error(f"Failed to get upload stats: {e}")
            return {}

# Global upload service instance
unified_upload_service = UnifiedUploadService()
