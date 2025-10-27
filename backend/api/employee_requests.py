from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from database import get_db
from schemas.employee_request import (
    EmployeeRequestCreate, EmployeeRequestUpdate, EmployeeRequestResponse, 
    EmployeeRequestListResponse, RequestStatus
)
from services.employee_request import EmployeeRequestService
from dependencies.auth import get_current_active_user
from dependencies.permissions import require_permission
from models.employee_request import EmployeeRequest
from models.user import User
from models.brand import Brand
from models.role import Role

router = APIRouter()

@router.post("", response_model=EmployeeRequestResponse)
@router.post("/", response_model=EmployeeRequestResponse)
async def create_employee_request(
    request_data: EmployeeRequestCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Marka yöneticisi çalışan ekleme talebi oluşturur"""
    
    # DEBUG
    print(f"🔍 API CREATE REQUEST:")
    print(f"   User: {current_user.email}")
    print(f"   Request Data: {request_data.dict()}")
    
    # DİNAMİK: employee_requests.manage yetkisi gerekli
    from services.permission_service import PermissionService
    permission_service = PermissionService(db)
    
    if not permission_service.has_permission(current_user.id, 'employee_requests.manage'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sadece marka yöneticileri çalışan talebi oluşturabilir"
        )
    
    service = EmployeeRequestService(db)
    request, message = service.create_employee_request(request_data, current_user.id)
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Response için ek bilgileri hazırla
    response = await _prepare_request_response(request, db)
    return response

@router.get("/", response_model=EmployeeRequestListResponse)
async def get_employee_requests(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=1000),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Çalışan taleplerini listele - Dinamik yetki kontrolü"""
    
    from services.permission_service import PermissionService
    permission_service = PermissionService(db)
    
    # DEBUG: Log user role and permissions
    print(f"🔍 EMPLOYEE REQUESTS DEBUG:")
    print(f"   User ID: {current_user.id}")
    print(f"   User Email: {current_user.email}")
    print(f"   User Role: '{current_user.role_display_name}' (ID: {current_user.role_id})")
    
    # Dinamik yetki kontrolü - veritabanından
    # İki izinden birini kontrol et: employee_requests.manage veya view_employee_requests
    has_manage_permission = permission_service.has_permission(
        current_user.id, 
        "employee_requests.manage"
    )
    has_view_permission = permission_service.has_permission(
        current_user.id, 
        "view_employee_requests"
    )
    
    has_employee_requests_permission = has_manage_permission or has_view_permission
    
    print(f"   Has 'employee_requests.manage': {has_manage_permission}")
    print(f"   Has 'view_employee_requests': {has_view_permission}")
    print(f"   Has any employee_requests permission: {has_employee_requests_permission}")
    
    if not has_employee_requests_permission:
        print(f"❌ ACCESS DENIED: User does not have 'employee_requests' permission")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu sayfaya erişim yetkiniz yok"
        )
    
    service = EmployeeRequestService(db)
    
    # DİNAMİK: Tüm employee_requests görebilir permission'ı yoksa sadece kendi taleplerini görür
    requested_by_user_id = None
    if not permission_service.has_permission(current_user.id, 'employee_requests.manage'):
        requested_by_user_id = current_user.id
    
    requests, total = service.get_employee_requests(
        page=page, 
        per_page=per_page, 
        status=status_filter,
        requested_by_user_id=requested_by_user_id
    )
    
    # Response için ek bilgileri hazırla
    request_responses = []
    for req in requests:
        response = await _prepare_request_response(req, db)
        request_responses.append(response)
    
    return EmployeeRequestListResponse(
        requests=request_responses,
        total=total,
        page=page,
        per_page=per_page
    )

@router.get("/{request_id}", response_model=EmployeeRequestResponse)
async def get_employee_request(
    request_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Tek bir çalışan talebini getir"""
    
    service = EmployeeRequestService(db)
    request = service.get_employee_request(request_id)
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Talep bulunamadı"
        )
    
    # DİNAMİK: Yetki kontrolü
    from services.permission_service import PermissionService
    permission_service = PermissionService(db)
    
    # Eğer employee_requests.manage yetkisi yoksa sadece kendi taleplerini görebilir
    if not permission_service.has_permission(current_user.id, 'employee_requests.manage'):
        if request.requested_by_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bu talebi görme yetkiniz yok"
            )
    
    response = await _prepare_request_response(request, db)
    return response

@router.put("/{request_id}/approve")
async def approve_employee_request(
    request_id: int,
    request_data: Optional[dict] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Çalışan talebini onayla - DİNAMİK YETKİ"""
    
    # DİNAMİK: employee_requests.manage yetkisi gerekli
    from services.permission_service import PermissionService
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'employee_requests.manage'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Talep onaylama yetkiniz yok"
        )
    
    try:
        admin_notes = request_data.get('admin_notes') if request_data else None
        
        service = EmployeeRequestService(db)
        success, message = service.approve_employee_request(request_id, current_user.id, admin_notes)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
        
        return {"message": message}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Employee approval error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Onaylama işlemi sırasında hata oluştu: {str(e)}"
        )

@router.put("/{request_id}/reject")
async def reject_employee_request(
    request_id: int,
    update_data: EmployeeRequestUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Çalışan talebini reddet - DİNAMİK YETKİ"""
    
    # DİNAMİK: employee_requests.manage yetkisi gerekli
    from services.permission_service import PermissionService
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'employee_requests.manage'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Talep reddetme yetkiniz yok"
        )
    
    print(f"🔍 REJECT REQUEST DEBUG:")
    print(f"   Request ID: {request_id}")
    print(f"   Update Data: {update_data}")
    print(f"   Admin Notes: {update_data.admin_notes}")
    print(f"   Current User: {current_user.id} ({current_user.role_display_name})")
    
    if not update_data.admin_notes:
        print("❌ Admin notes is empty or None")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Red nedeni belirtilmelidir"
        )
    
    service = EmployeeRequestService(db)
    success, message = service.reject_employee_request(request_id, current_user.id, update_data.admin_notes)
    
    print(f"🔍 SERVICE RESULT: success={success}, message={message}")
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"message": message}

@router.get("/stats/brand-manager")
async def get_brand_manager_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Marka yöneticisi için istatistikler"""
    
    # DİNAMİK: employee_requests.manage yetkisi gerekli
    from services.permission_service import PermissionService
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'employee_requests.manage'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu bilgilere erişim yetkiniz yok"
        )
    
    service = EmployeeRequestService(db)
    stats = service.get_brand_manager_stats(current_user.id)
    
    return stats

@router.put("/{request_id}", response_model=EmployeeRequestResponse)
async def update_employee_request(
    request_id: int,
    request_data: EmployeeRequestCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Admin çalışan talebi bilgilerini günceller"""
    
    # DİNAMİK: employee_requests.manage yetkisi gerekli
    from services.permission_service import PermissionService
    permission_service = PermissionService(db)
    if not permission_service.has_permission(current_user.id, 'employee_requests.manage'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Talep bilgilerini güncelleme yetkiniz yok"
        )
    
    service = EmployeeRequestService(db)
    request, message = service.update_employee_request(request_id, request_data)
    
    if not request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Response için ek bilgileri hazırla
    response = await _prepare_request_response(request, db)
    return response

# Yardımcı fonksiyon
async def _prepare_request_response(request, db: Session) -> EmployeeRequestResponse:
    """EmployeeRequest için response hazırla"""
    
    # Talep eden kullanıcı bilgisi
    requested_by = db.query(User).filter(User.id == request.requested_by_user_id).first()
    requested_by_name = f"{requested_by.first_name} {requested_by.last_name}" if requested_by else None
    requested_by_brand_ids = requested_by.brand_ids if requested_by and requested_by.brand_ids else []
    
    # Onaylayan kullanıcı bilgisi
    approved_by_name = None
    if request.approved_by_user_id:
        approved_by = db.query(User).filter(User.id == request.approved_by_user_id).first()
        approved_by_name = f"{approved_by.first_name} {approved_by.last_name}" if approved_by else None
    
    # Rol bilgisi
    role = db.query(Role).filter(Role.id == request.role_id).first()
    role_name = role.display_name if role else None
    
    # Marka bilgileri
    brand_names = []
    if request.brand_ids:
        brands = db.query(Brand).filter(Brand.id.in_(request.brand_ids)).all()
        brand_names = [brand.name for brand in brands]
    
    return EmployeeRequestResponse(
        id=request.id,
        requested_by_user_id=request.requested_by_user_id,
        email=request.email,
        first_name=request.first_name,
        last_name=request.last_name,
        phone_number=request.phone_number,
        role_id=request.role_id,
        brand_ids=request.brand_ids or [],
        status=request.status,
        request_message=request.request_message,
        admin_notes=request.admin_notes,
        approved_by_user_id=request.approved_by_user_id,
        approved_at=request.approved_at,
        created_at=request.created_at,
        updated_at=getattr(request, 'updated_at', request.created_at),
        requested_by_name=requested_by_name,
        approved_by_name=approved_by_name,
        role_name=role_name,
        brand_names=brand_names,
        requested_by_brand_ids=requested_by_brand_ids
    )

