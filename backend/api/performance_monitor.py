"""
Performance Monitoring API
Sistem performansını izleme endpoint'leri
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from dependencies.auth import get_current_active_user
from models.user import User
from config.database_optimization import DatabaseHealthCheck
import psutil
import os
from datetime import datetime

router = APIRouter()

@router.get("/performance/system")
async def get_system_performance(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Sistem performans metrikleri
    Sadece Super Admin erişebilir
    """
    if current_user.role_name != 'super_admin':
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # CPU Usage
    cpu_percent = psutil.cpu_percent(interval=1, percpu=True)
    cpu_count = psutil.cpu_count()
    
    # Memory Usage
    memory = psutil.virtual_memory()
    
    # Disk Usage
    disk = psutil.disk_usage('/')
    
    # Process Info
    process = psutil.Process(os.getpid())
    process_memory = process.memory_info()
    
    return {
        'timestamp': datetime.now().isoformat(),
        'cpu': {
            'total_cores': cpu_count,
            'per_core_usage': cpu_percent,
            'average_usage': sum(cpu_percent) / len(cpu_percent) if cpu_percent else 0
        },
        'memory': {
            'total_gb': memory.total / (1024**3),
            'available_gb': memory.available / (1024**3),
            'used_gb': memory.used / (1024**3),
            'percent': memory.percent
        },
        'disk': {
            'total_gb': disk.total / (1024**3),
            'used_gb': disk.used / (1024**3),
            'free_gb': disk.free / (1024**3),
            'percent': disk.percent
        },
        'process': {
            'memory_mb': process_memory.rss / (1024**2),
            'cpu_percent': process.cpu_percent()
        }
    }

@router.get("/performance/database")
async def get_database_performance(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Database performans metrikleri
    """
    if current_user.role_name != 'super_admin':
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    from database import engine
    
    # Connection pool status
    pool_status = DatabaseHealthCheck.check_connection_pool(engine)
    
    # Table sizes
    table_sizes = DatabaseHealthCheck.get_table_sizes(db)
    
    return {
        'timestamp': datetime.now().isoformat(),
        'connection_pool': pool_status,
        'table_sizes': [
            {
                'table': row[0],
                'size_mb': float(row[1]),
                'rows': row[2]
            }
            for row in table_sizes
        ]
    }

@router.get("/performance/upload-queue")
async def get_upload_queue_stats(
    current_user: User = Depends(get_current_active_user)
):
    """
    Upload queue statistics
    """
    from services.enterprise_upload_service import enterprise_upload_service
    
    return enterprise_upload_service.get_queue_stats()

@router.get("/performance/template-cache")
async def get_template_cache_stats(
    current_user: User = Depends(get_current_active_user)
):
    """
    Template cache statistics
    """
    from services.enterprise_template_service import enterprise_template_service
    
    return enterprise_template_service.get_stats()

