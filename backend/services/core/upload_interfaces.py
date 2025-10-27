"""
Upload System Interfaces
Core abstractions for upload system
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from models.user import User
from models.brand import Brand

@dataclass
class UploadRequest:
    """Upload request data"""
    files: List[Any]
    user: User
    brand: Optional[Brand] = None
    options: Dict[str, Any] = None

@dataclass
class UploadResult:
    """Upload result data"""
    success: bool
    job_id: Optional[str] = None
    processed_files: int = 0
    failed_files: int = 0
    errors: List[str] = None
    processing_time: float = 0.0
    metadata: Dict[str, Any] = None

@dataclass
class OCRResult:
    """OCR processing result"""
    text: str
    confidence: float
    product_info: Dict[str, Any]
    success: bool = True

class IUploadStrategy(ABC):
    """Upload strategy interface"""
    
    @abstractmethod
    async def upload(self, request: UploadRequest) -> UploadResult:
        """Execute upload strategy"""
        pass

class IOCRProcessor(ABC):
    """OCR processor interface"""
    
    @abstractmethod
    async def process_image(self, image_path: str) -> OCRResult:
        """Process image with OCR"""
        pass

class IStorageProvider(ABC):
    """Storage provider interface"""
    
    @abstractmethod
    async def upload_file(self, content: bytes, filename: str, folder_path: str) -> Dict[str, Any]:
        """Upload file to storage"""
        pass
    
    @abstractmethod
    def generate_folder_path(self, brand: Brand, user: User, product_code: str, color: str = None) -> str:
        """Generate folder path for file"""
        pass

class IProgressTracker(ABC):
    """Progress tracking interface"""
    
    @abstractmethod
    async def update_progress(self, job_id: str, progress: int, status: str):
        """Update upload progress"""
        pass
    
    @abstractmethod
    async def get_progress(self, job_id: str) -> Dict[str, Any]:
        """Get upload progress"""
        pass
