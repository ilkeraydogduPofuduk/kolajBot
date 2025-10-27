"""
Central Upload Service
Single point of entry for all upload operations
"""

from typing import Dict, Type
from .upload_interfaces import IUploadStrategy, IOCRProcessor, IStorageProvider, IProgressTracker
from .upload_interfaces import UploadRequest, UploadResult
from core.logging import get_logger

logger = get_logger('upload_service')

class UploadService:
    """Central upload service with strategy pattern"""
    
    def __init__(self):
        self._strategies: Dict[str, Type[IUploadStrategy]] = {}
        self._ocr_processor: IOCRProcessor = None
        self._storage_provider: IStorageProvider = None
        self._progress_tracker: IProgressTracker = None
    
    def register_strategy(self, name: str, strategy_class: Type[IUploadStrategy]):
        """Register upload strategy"""
        self._strategies[name] = strategy_class
        logger.info(f"Registered upload strategy: {name}")
    
    def set_ocr_processor(self, processor: IOCRProcessor):
        """Set OCR processor"""
        self._ocr_processor = processor
    
    def set_storage_provider(self, provider: IStorageProvider):
        """Set storage provider"""
        self._storage_provider = provider
    
    def set_progress_tracker(self, tracker: IProgressTracker):
        """Set progress tracker"""
        self._progress_tracker = tracker
    
    def get_strategy(self, strategy_name: str) -> IUploadStrategy:
        """Get upload strategy instance"""
        if strategy_name not in self._strategies:
            raise ValueError(f"Unknown upload strategy: {strategy_name}")
        
        strategy_class = self._strategies[strategy_name]
        return strategy_class(
            ocr_processor=self._ocr_processor,
            storage_provider=self._storage_provider,
            progress_tracker=self._progress_tracker
        )
    
    async def upload(self, request: UploadRequest, strategy: str = "fast") -> UploadResult:
        """Execute upload with specified strategy"""
        try:
            upload_strategy = self.get_strategy(strategy)
            result = await upload_strategy.upload(request)
            
            logger.info(f"Upload completed: {result.processed_files} files, strategy: {strategy}")
            return result
            
        except Exception as e:
            logger.error(f"Upload failed: {e}")
            return UploadResult(
                success=False,
                errors=[str(e)]
            )
    
    def list_strategies(self) -> List[str]:
        """List available upload strategies"""
        return list(self._strategies.keys())

# Global instance
upload_service = UploadService()
