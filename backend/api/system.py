from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from dependencies.auth import get_current_active_user, require_super_admin
from models.user import User
import psutil
import platform
from datetime import datetime
from typing import Dict, Any

router = APIRouter()

@router.get("/stats")
async def get_system_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get system resource usage statistics - DİNAMİK permission"""
    
    # DİNAMİK: users.manage yetkisi gerekli
    from services.permission_service import PermissionService
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'users.manage'):
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sistem istatistiklerini görme yetkiniz yok"
        )
    
    # CPU usage
    cpu_percent = psutil.cpu_percent(interval=1)
    cpu_count = psutil.cpu_count()
    
    # Memory usage
    memory = psutil.virtual_memory()
    memory_total = round(memory.total / (1024**3), 2)  # GB
    memory_used = round(memory.used / (1024**3), 2)    # GB
    memory_percent = memory.percent
    
    # Disk usage
    disk = psutil.disk_usage('/')
    disk_total = round(disk.total / (1024**3), 2)      # GB
    disk_used = round(disk.used / (1024**3), 2)       # GB
    disk_percent = round((disk.used / disk.total) * 100, 1)
    
    # System info
    system_info = {
        "platform": platform.system(),
        "platform_version": platform.version(),
        "python_version": platform.python_version(),
        "uptime": str(datetime.now() - datetime.fromtimestamp(psutil.boot_time())).split('.')[0]
    }
    
    # GPU info (if available)
    gpu_info = None
    try:
        import GPUtil
        gpus = GPUtil.getGPUs()
        if gpus:
            gpu = gpus[0]  # First GPU
            gpu_info = {
                "name": gpu.name,
                "memory_used": round(gpu.memoryUsed / 1024, 2),  # GB
                "memory_total": round(gpu.memoryTotal / 1024, 2), # GB
                "memory_percent": round((gpu.memoryUsed / gpu.memoryTotal) * 100, 1),
                "temperature": gpu.temperature,
                "load": round(gpu.load * 100, 1)
            }
    except ImportError:
        # GPUtil not installed
        pass
    except Exception:
        # GPU not available or other error
        pass
    
    return {
        "cpu": {
            "usage_percent": cpu_percent,
            "core_count": cpu_count
        },
        "memory": {
            "total_gb": memory_total,
            "used_gb": memory_used,
            "usage_percent": memory_percent
        },
        "disk": {
            "total_gb": disk_total,
            "used_gb": disk_used,
            "usage_percent": disk_percent
        },
        "gpu": gpu_info,
        "system": system_info,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/dashboard-stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Super Admin için tüm sistem istatistikleri"""
    
    # DİNAMİK: users.manage yetkisi gerekli (Super Admin)
    from services.permission_service import PermissionService
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'users.manage'):
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu istatistikleri görme yetkiniz yok"
        )
    
    from models.role import Role
    from models.brand import Brand
    from models.social_media_channel import SocialMediaChannel
    from models.employee_request import EmployeeRequest, RequestStatus
    from sqlalchemy import func, and_
    
    # Toplam kullanıcı sayısı
    total_users = db.query(User).count()
    
    # Aktif kullanıcı sayısı
    active_users = db.query(User).filter(User.is_active == True).count()
    
    # Rollere göre kullanıcı sayıları
    super_admin_role = db.query(Role).filter(Role.name == 'super_admin').first()
    brand_manager_role = db.query(Role).filter(Role.name == 'brand_manager').first()
    
    total_super_admins = 0
    total_brand_managers = 0
    total_employees = 0
    
    if super_admin_role:
        total_super_admins = db.query(User).filter(
            User.role_id == super_admin_role.id,
            User.is_active == True
        ).count()
    
    if brand_manager_role:
        total_brand_managers = db.query(User).filter(
            User.role_id == brand_manager_role.id,
            User.is_active == True
        ).count()
    
    # Çalışanlar - Super Admin ve Mağaza Yöneticisi olmayan aktif kullanıcılar
    excluded_role_ids = []
    if super_admin_role:
        excluded_role_ids.append(super_admin_role.id)
    if brand_manager_role:
        excluded_role_ids.append(brand_manager_role.id)
    
    if excluded_role_ids:
        total_employees = db.query(User).filter(
            User.role_id.notin_(excluded_role_ids),
            User.is_active == True
        ).count()
    else:
        # Eğer roller bulunamazsa, tüm aktif kullanıcıları çalışan say
        total_employees = active_users
    
    # Toplam marka sayısı
    total_brands = db.query(Brand).count()
    
    # Aktif marka sayısı
    active_brands = db.query(Brand).filter(Brand.is_active == True).count()
    
    # Toplam kanal sayısı
    total_channels = db.query(SocialMediaChannel).count()
    
    # Aktif kanal sayısı
    active_channels = db.query(SocialMediaChannel).filter(SocialMediaChannel.is_active == True).count()
    
    # Platform bazında kanal sayıları
    channels_by_platform = db.query(
        SocialMediaChannel.platform,
        func.count(SocialMediaChannel.id).label('count')
    ).group_by(SocialMediaChannel.platform).all()
    
    platform_stats = {platform: count for platform, count in channels_by_platform}
    
    # Toplam mesaj sayısı - messages tablosundan count
    from models.social_media_message import SocialMediaMessage
    total_messages = db.query(SocialMediaMessage).count()
    
    # Bekleyen çalışan talepleri
    pending_employee_requests = db.query(EmployeeRequest).filter(
        EmployeeRequest.status == RequestStatus.PENDING
    ).count()
    
    # Toplam çalışan talepleri (tüm durumlar)
    total_employee_requests = db.query(EmployeeRequest).count()
    
    # Onaylanan çalışan talepleri
    approved_employee_requests = db.query(EmployeeRequest).filter(
        EmployeeRequest.status == RequestStatus.APPROVED
    ).count()
    
    # Reddedilen çalışan talepleri
    rejected_employee_requests = db.query(EmployeeRequest).filter(
        EmployeeRequest.status == RequestStatus.REJECTED
    ).count()
    
    # Toplam rol sayısı
    total_roles = db.query(Role).count()
    
    # Aktif rol sayısı
    active_roles = db.query(Role).filter(Role.is_active == True).count()
    
    # Ürün istatistikleri
    from models.product import Product
    total_products = db.query(Product).count()
    
    # Toplam dosya boyutu (uploads klasöründen)
    import os
    uploads_path = os.path.join(os.getcwd(), 'uploads')
    total_storage_bytes = 0
    total_files = 0
    
    if os.path.exists(uploads_path):
        for root, dirs, files in os.walk(uploads_path):
            for file in files:
                file_path = os.path.join(root, file)
                try:
                    total_storage_bytes += os.path.getsize(file_path)
                    total_files += 1
                except:
                    pass
    
    # GB'ye çevir
    total_storage_gb = round(total_storage_bytes / (1024**3), 2)
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "super_admins": total_super_admins,
            "brand_managers": total_brand_managers,
            "employees": total_employees
        },
        "brands": {
            "total": total_brands,
            "active": active_brands
        },
        "channels": {
            "total": total_channels,
            "active": active_channels,
            "by_platform": platform_stats,
            "total_messages": total_messages
        },
        "employee_requests": {
            "total": total_employee_requests,
            "pending": pending_employee_requests,
            "approved": approved_employee_requests,
            "rejected": rejected_employee_requests
        },
        "roles": {
            "total": total_roles,
            "active": active_roles
        },
        "products": {
            "total": total_products,
            "total_files": total_files,
            "total_storage_gb": total_storage_gb
        },
        "timestamp": datetime.now().isoformat()
    }

@router.get("/my-stats")
async def get_my_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Kullanıcının kendi istatistikleri - Mağaza Yöneticisi ve Çalışan için"""
    
    from models.product import Product
    from models.brand import Brand
    import os
    
    # Kullanıcının oluşturduğu ürünler
    my_products = db.query(Product).filter(Product.created_by == current_user.id).count()
    
    # Kullanıcının yüklediği dosya boyutu
    my_storage_bytes = 0
    my_files = 0
    
    # Kullanıcının uploads klasörü
    user_uploads_path = os.path.join(os.getcwd(), 'uploads', 'users', str(current_user.id))
    if os.path.exists(user_uploads_path):
        for root, dirs, files in os.walk(user_uploads_path):
            for file in files:
                file_path = os.path.join(root, file)
                try:
                    my_storage_bytes += os.path.getsize(file_path)
                    my_files += 1
                except:
                    pass
    
    my_storage_gb = round(my_storage_bytes / (1024**3), 2)
    
    # Mağaza Yöneticisi ise - altındaki çalışanlar ve markalar
    if current_user.brand_ids and len(current_user.brand_ids) > 0:
        # Markalarındaki toplam ürünler
        brand_products = db.query(Product).filter(
            Product.brand_id.in_(current_user.brand_ids)
        ).count()
        
        # Markalarındaki çalışanlar (aynı markalara erişimi olan kullanıcılar)
        from sqlalchemy import and_, or_
        my_employees = db.query(User).filter(
            and_(
                User.id != current_user.id,
                or_(*[
                    User.brand_ids.contains([brand_id])
                    for brand_id in current_user.brand_ids
                ])
            )
        ).count()
        
        # Markalarındaki toplam dosya boyutu
        brand_storage_bytes = 0
        brand_files = 0
        
        for brand_id in current_user.brand_ids:
            brand_uploads_path = os.path.join(os.getcwd(), 'uploads', 'brands', str(brand_id))
            if os.path.exists(brand_uploads_path):
                for root, dirs, files in os.walk(brand_uploads_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        try:
                            brand_storage_bytes += os.path.getsize(file_path)
                            brand_files += 1
                        except:
                            pass
        
        brand_storage_gb = round(brand_storage_bytes / (1024**3), 2)
        
        return {
            "my_products": my_products,
            "my_files": my_files,
            "my_storage_gb": my_storage_gb,
            "brand_products": brand_products,
            "brand_files": brand_files,
            "brand_storage_gb": brand_storage_gb,
            "my_employees": my_employees,
            "my_brands": len(current_user.brand_ids),
            "timestamp": datetime.now().isoformat()
        }
    
    # Çalışan ise - sadece kendi verileri
    return {
        "my_products": my_products,
        "my_files": my_files,
        "my_storage_gb": my_storage_gb,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/health")
async def get_system_health():
    """Get basic system health status (no auth required)"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "uptime": str(datetime.now() - datetime.fromtimestamp(psutil.boot_time())).split('.')[0]
    }
