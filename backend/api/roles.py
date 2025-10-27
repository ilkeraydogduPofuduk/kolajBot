from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from schemas.role import (
    RoleCreate, RoleUpdate, RoleResponse, 
    RoleListResponse, PermissionResponse, RolePermissionsResponse
)
from services.role import RoleService
from dependencies.auth import get_current_active_user
from services.permission_service import PermissionService
from dependencies.permissions import require_permission
from models.user import User

router = APIRouter()

@router.get("", response_model=RoleListResponse)  # Dual route for compatibility
@router.get("/", response_model=RoleListResponse)
async def get_roles(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(1000, ge=1, le=1000),
):
    """Rolleri listele - Tüm aktif kullanıcılar erişebilir (employee request oluşturmak için gerekli)"""
    
    service = RoleService(db)
    roles = await service.get_roles()
    
    # Super admin rolünü filtrele - sadece super adminler görebilir
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'roles.manage'):
        roles = [role for role in roles if role.name != 'super_admin']

    # Basit pagination (opsiyonel)
    start = (page - 1) * per_page
    end = start + per_page
    paged_roles = roles[start:end]
    
    return RoleListResponse(
        roles=paged_roles,
        total=len(roles),
        page=page,
        per_page=per_page
    )

@router.get("/permissions", response_model=List[PermissionResponse])
async def get_permissions(
    current_user: User = Depends(require_permission("roles.view")),
    db: Session = Depends(get_db)
):
    """İzinleri listele"""
    
    service = RoleService(db)
    permissions = await service.get_permissions()
    
    return permissions

@router.get("/debug/user-counts")
async def debug_user_counts(
    current_user: User = Depends(require_permission("roles.manage")),
    db: Session = Depends(get_db)
):
    """Debug: User count'ları kontrol et"""
    from sqlalchemy import text
    
    # Raw SQL ile user count'ları al
    result = db.execute(text("""
        SELECT 
            r.id,
            r.display_name,
            COUNT(u.id) as user_count
        FROM roles r
        LEFT JOIN users u ON u.role_id = r.id
        GROUP BY r.id, r.display_name
        ORDER BY r.id
    """)).fetchall()
    
    return {
        "role_user_counts": [
            {
                "role_id": row[0],
                "role_name": row[1],
                "user_count": row[2]
            }
            for row in result
        ],
        "total_users": db.execute(text("SELECT COUNT(*) FROM users")).scalar(),
        "total_roles": db.execute(text("SELECT COUNT(*) FROM roles")).scalar()
    }

@router.get("/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: int,
    current_user: User = Depends(require_permission("roles.view")),
    db: Session = Depends(get_db)
):
    """Rol detayını getir"""
    
    service = RoleService(db)
    role = await service.get_role(role_id)
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol bulunamadı"
        )
    
    return role

@router.get("/{role_id}/permissions", response_model=RolePermissionsResponse)
async def get_role_permissions(
    role_id: int,
    current_user: User = Depends(require_permission("roles.view")),
    db: Session = Depends(get_db)
):
    """Rolün izinlerini getir"""
    
    service = RoleService(db)
    role_permissions = await service.get_role_permissions(role_id)
    
    return role_permissions

@router.post("", response_model=RoleResponse)
@router.post("/", response_model=RoleResponse)
async def create_role(
    role_data: RoleCreate,
    current_user: User = Depends(require_permission("roles.create")),
    db: Session = Depends(get_db)
):
    """Rol oluştur"""
    
    service = RoleService(db)
    
    # Rol adı kontrolü
    existing_role = await service.get_role_by_name(role_data.name)
    if existing_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu rol adı zaten kullanılıyor"
        )
    
    try:
        role = await service.create_role(role_data, current_user.id)
        return role
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Rol oluşturulurken hata oluştu"
        )

@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: int,
    role_data: RoleUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Rol güncelle"""
    
    # DİNAMİK: roles.manage yetkisi gerekli
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'roles.manage'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rol güncelleme yetkiniz yok"
        )
    
    service = RoleService(db)
    
    # Rol var mı kontrol et
    existing_role = await service.get_role(role_id)
    if not existing_role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol bulunamadı"
        )
    
    # Sistem rolü kontrolü
    if existing_role.is_system_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sistem rolleri değiştirilemez"
        )
    
    try:
        updated_role = await service.update_role(role_id, role_data, current_user.id)
        return updated_role
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Rol güncellenirken hata oluştu: {str(e)}"
        )

@router.post("/{role_id}/permissions", response_model=dict)
async def assign_permissions_to_role(
    role_id: int,
    permission_ids: List[int],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Role izinler ata"""
    
    # DİNAMİK: roles.manage yetkisi gerekli
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'roles.manage'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="İzin atama yetkiniz yok"
        )
    
    service = RoleService(db)
    
    # Rol var mı kontrol et
    role = await service.get_role(role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol bulunamadı"
        )
    
    # Sistem rolü kontrolü
    if role.is_system_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sistem rollerinin izinleri değiştirilemez"
        )
    
    try:
        await service.assign_permissions_to_role(role_id, permission_ids, current_user.id)
        return {"message": "İzinler başarıyla atandı", "role_id": role_id, "permission_count": len(permission_ids)}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="İzinler atanırken hata oluştu"
        )

@router.delete("/{role_id}/permissions/{permission_id}", response_model=dict)
async def remove_permission_from_role(
    role_id: int,
    permission_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Rolden izin kaldır"""
    
    # DİNAMİK: roles.manage yetkisi gerekli
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'roles.manage'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="İzin kaldırma yetkiniz yok"
        )
    
    service = RoleService(db)
    
    # Rol var mı kontrol et
    role = await service.get_role(role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol bulunamadı"
        )
    
    # Sistem rolü kontrolü
    if role.is_system_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sistem rollerinin izinleri değiştirilemez"
        )
    
    try:
        await service.remove_permission_from_role(role_id, permission_id, current_user.id)
        return {"message": "İzin başarıyla kaldırıldı", "role_id": role_id, "permission_id": permission_id}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="İzin kaldırılırken hata oluştu"
        )

@router.patch("/{role_id}/toggle-status", response_model=RoleResponse)
async def toggle_role_status(
    role_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Rol durumunu değiştir (aktif/pasif)"""
    
    # DİNAMİK: roles.manage yetkisi gerekli
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'roles.manage'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rol durumu değiştirme yetkiniz yok"
        )
    
    service = RoleService(db)
    
    # Rol var mı kontrol et
    role = await service.get_role(role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol bulunamadı"
        )
    
    # Sistem rolü kontrolü
    if role.is_system_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sistem rollerinin durumu değiştirilemez"
        )
    
    try:
        updated_role = await service.toggle_role_status(role_id, current_user.id)
        return updated_role
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Rol durumu değiştirilirken hata oluştu"
        )

@router.delete("/{role_id}", response_model=dict)
async def delete_role(
    role_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Rol sil"""
    
    # DİNAMİK: roles.manage yetkisi gerekli
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'roles.manage'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rol silme yetkiniz yok"
        )
    
    service = RoleService(db)
    
    # Rol var mı kontrol et
    role = await service.get_role(role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol bulunamadı"
        )
    
    # Sistem rolü kontrolü
    if role.is_system_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sistem rolleri silinemez"
        )
    
    # Rol kullanımda mı kontrol et
    user_count = await service.get_role_user_count(role_id)
    if user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bu role sahip {user_count} kullanıcı olduğu için silinemez"
        )
    
    try:
        await service.delete_role(role_id, current_user.id)
        return {"message": "Rol başarıyla silindi", "role_id": role_id}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Rol silinirken hata oluştu"
        )
