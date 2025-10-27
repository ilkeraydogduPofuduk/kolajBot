# Doğru Upload Mimarisi

## 1. Core Interfaces (Abstract Base Classes)

```python
# interfaces/upload_interface.py
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class UploadRequest:
    files: List[Any]
    user_id: int
    brand_id: Optional[int]
    options: Dict[str, Any]

@dataclass 
class UploadResult:
    success: bool
    job_id: Optional[str]
    processed_files: int
    failed_files: int
    errors: List[str]

class IUploadStrategy(ABC):
    @abstractmethod
    async def upload(self, request: UploadRequest) -> UploadResult:
        pass

class IOCRProcessor(ABC):
    @abstractmethod
    async def process_image(self, image_path: str) -> Dict[str, Any]:
        pass

class IStorageProvider(ABC):
    @abstractmethod
    async def upload_file(self, content: bytes, path: str) -> str:
        pass
```

## 2. Concrete Implementations

```python
# services/upload/strategies/fast_upload_strategy.py
class FastUploadStrategy(IUploadStrategy):
    def __init__(self, ocr: IOCRProcessor, storage: IStorageProvider):
        self.ocr = ocr
        self.storage = storage
    
    async def upload(self, request: UploadRequest) -> UploadResult:
        # Fast upload logic
        pass

# services/upload/strategies/batch_upload_strategy.py  
class BatchUploadStrategy(IUploadStrategy):
    # Batch upload logic
    pass

# services/storage/bunny_cdn_provider.py
class BunnyCDNProvider(IStorageProvider):
    async def upload_file(self, content: bytes, path: str) -> str:
        # Bunny CDN specific logic
        pass
```

## 3. Central Upload Service (Factory Pattern)

```python
# services/upload/upload_service.py
class UploadService:
    def __init__(self):
        self.strategies = {
            'fast': FastUploadStrategy,
            'batch': BatchUploadStrategy,
            'enterprise': EnterpriseUploadStrategy
        }
        self.ocr_processor = GoogleAIOCRProcessor()
        self.storage_provider = BunnyCDNProvider()
    
    def get_strategy(self, strategy_type: str) -> IUploadStrategy:
        strategy_class = self.strategies[strategy_type]
        return strategy_class(self.ocr_processor, self.storage_provider)
    
    async def upload(self, request: UploadRequest, strategy: str = 'fast') -> UploadResult:
        upload_strategy = self.get_strategy(strategy)
        return await upload_strategy.upload(request)
```

## 4. Dependency Injection Container

```python
# core/container.py
class DIContainer:
    def __init__(self):
        self._services = {}
    
    def register(self, interface, implementation):
        self._services[interface] = implementation
    
    def get(self, interface):
        return self._services[interface]

# Setup
container = DIContainer()
container.register(IOCRProcessor, GoogleAIOCRProcessor())
container.register(IStorageProvider, BunnyCDNProvider())
container.register(IUploadService, UploadService())
```

## 5. Single API Endpoint

```python
# api/upload.py
@router.post("/upload")
async def upload_files(
    files: List[UploadFile],
    strategy: str = "fast",
    current_user: User = Depends(get_current_user)
):
    upload_service = container.get(IUploadService)
    
    request = UploadRequest(
        files=files,
        user_id=current_user.id,
        options={"strategy": strategy}
    )
    
    result = await upload_service.upload(request, strategy)
    return result
```

## Avantajları:
1. **Single Responsibility**: Her class tek işe odaklanır
2. **Open/Closed**: Yeni strategy eklemek kolay
3. **Dependency Inversion**: Interface'lere bağlı
4. **Testable**: Mock'lanabilir
5. **Maintainable**: Tek yerden yönetim
6. **Scalable**: Yeni provider/strategy kolay eklenir
