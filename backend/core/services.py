"""
Merkezi Servis Yönetim Sistemi
Tüm servisler tek yerden yönetilir
"""

from typing import Dict, Any, Optional, Type, TypeVar
from abc import ABC, abstractmethod
from core.config import settings
from core.logging import get_logger
from core.exceptions import BaseAppException, ExternalServiceError

logger = get_logger('services')

T = TypeVar('T')

class BaseService(ABC):
    """Base service class"""
    
    def __init__(self):
        self.logger = get_logger(self.__class__.__name__)
        self.config = settings
    
    @abstractmethod
    async def initialize(self) -> bool:
        """Initialize service"""
        pass
    
    @abstractmethod
    async def cleanup(self) -> bool:
        """Cleanup service"""
        pass
    
    def get_config(self) -> Dict[str, Any]:
        """Get service configuration"""
        return {}

class ServiceRegistry:
    """Service registry for dependency injection"""
    
    def __init__(self):
        self._services: Dict[str, BaseService] = {}
        self._initialized: Dict[str, bool] = {}
    
    def register(self, name: str, service: BaseService) -> None:
        """Register a service"""
        self._services[name] = service
        self._initialized[name] = False
        logger.info(f"Service registered: {name}")
    
    def get(self, name: str) -> Optional[BaseService]:
        """Get a service"""
        return self._services.get(name)
    
    async def initialize_all(self) -> bool:
        """Initialize all services"""
        success = True
        for name, service in self._services.items():
            try:
                if not self._initialized[name]:
                    await service.initialize()
                    self._initialized[name] = True
                    logger.info(f"Service initialized: {name}")
            except Exception as e:
                logger.error(f"Failed to initialize service {name}: {e}")
                success = False
        return success
    
    async def cleanup_all(self) -> bool:
        """Cleanup all services"""
        success = True
        for name, service in self._services.items():
            try:
                if self._initialized[name]:
                    await service.cleanup()
                    self._initialized[name] = False
                    logger.info(f"Service cleaned up: {name}")
            except Exception as e:
                logger.error(f"Failed to cleanup service {name}: {e}")
                success = False
        return success
    
    def is_initialized(self, name: str) -> bool:
        """Check if service is initialized"""
        return self._initialized.get(name, False)

# Global service registry
service_registry = ServiceRegistry()

def register_service(name: str, service: BaseService) -> None:
    """Register a service"""
    service_registry.register(name, service)

def get_service(name: str) -> Optional[BaseService]:
    """Get a service"""
    return service_registry.get(name)

async def initialize_services() -> bool:
    """Initialize all services"""
    return await service_registry.initialize_all()

async def cleanup_services() -> bool:
    """Cleanup all services"""
    return await service_registry.cleanup_all()
