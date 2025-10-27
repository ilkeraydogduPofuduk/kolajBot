from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Tuple, Optional
from models.employee_request import EmployeeRequest, RequestStatus
from models.user import User
from models.role import Role
from models.brand import Brand
from schemas.employee_request import EmployeeRequestCreate, EmployeeRequestUpdate
from services.user import UserService
from services.auth import AuthService
from services.email import EmailService
from datetime import datetime

class EmployeeRequestService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_employee_request(self, request_data: EmployeeRequestCreate, requested_by_user_id: int) -> Tuple[Optional[EmployeeRequest], str]:
        """Marka yöneticisi tarafından çalışan ekleme talebi oluştur"""
        
        # Get requesting user
        requesting_user = self.db.query(User).filter(User.id == requested_by_user_id).first()
        if not requesting_user:
            return None, "Kullanıcı bulunamadı"
        
        # Email'in zaten sistemde olup olmadığını kontrol et
        existing_user = self.db.query(User).filter(User.email == request_data.email).first()
        if existing_user:
            return None, "Bu e-posta adresi zaten sistemde kayıtlı"
        
        # Bekleyen aynı email talebi var mı kontrol et
        existing_request = self.db.query(EmployeeRequest).filter(
            and_(
                EmployeeRequest.email == request_data.email,
                EmployeeRequest.status == RequestStatus.PENDING
            )
        ).first()
        if existing_request:
            return None, "Bu e-posta adresi için bekleyen bir talep zaten mevcut"
        
        # Rol kontrolü
        role = self.db.query(Role).filter(Role.id == request_data.role_id).first()
        if not role:
            # Mevcut rolleri listele
            available_roles = self.db.query(Role).filter(Role.name != 'super_admin').all()
            role_list = ", ".join([f"{r.display_name} (ID: {r.id})" for r in available_roles])
            return None, f"Geçersiz rol ID: {request_data.role_id}. Mevcut roller: {role_list}"
        
        # Super Admin rolü için talep oluşturulamaz
        if role.name == 'super_admin':
            return None, "Super Admin rolü için talep oluşturulamaz"
        
        # DEBUG
        print(f"🔍 CREATE EMPLOYEE REQUEST DEBUG:")
        print(f"   Requesting User: {requesting_user.email}")
        print(f"   User Brand IDs: {requesting_user.brand_ids}")
        print(f"   Request Brand IDs: {request_data.brand_ids}")
        
        # Kullanıcının brand_ids'i olmalı
        if not requesting_user.brand_ids or len(requesting_user.brand_ids) == 0:
            return None, "Çalışan talebi oluşturmak için bir markaya atanmış olmalısınız"
        
        # Talep edilen markalar, talep eden kullanıcının markalarının alt kümesi olmalı
        if not all(brand_id in requesting_user.brand_ids for brand_id in request_data.brand_ids):
            return None, "Sadece kendi markalarınız için çalışan talebi oluşturabilirsiniz"
        
        # Talep oluştur
        employee_request = EmployeeRequest(
            requested_by_user_id=requested_by_user_id,
            email=request_data.email,
            first_name=request_data.first_name,
            last_name=request_data.last_name,
            phone_number=request_data.phone_number,
            role_id=request_data.role_id,
            brand_ids=request_data.brand_ids,
            request_message=request_data.request_message,
            status=RequestStatus.PENDING
        )
        
        self.db.add(employee_request)
        self.db.commit()
        
        return employee_request, "Çalışan ekleme talebi başarıyla oluşturuldu"
    
    def get_employee_requests(self, page: int = 1, per_page: int = 10, status: Optional[str] = None, 
                            requested_by_user_id: Optional[int] = None) -> Tuple[List[EmployeeRequest], int]:
        """Çalışan taleplerini listele"""
        query = self.db.query(EmployeeRequest)
        
        # Durum filtresi
        if status:
            try:
                status_enum = RequestStatus(status)
                query = query.filter(EmployeeRequest.status == status_enum)
            except ValueError:
                pass
        
        # Talep eden kullanıcı filtresi (marka yöneticisi sadece kendi taleplerini görebilir)
        if requested_by_user_id:
            query = query.filter(EmployeeRequest.requested_by_user_id == requested_by_user_id)
        
        total = query.count()
        
        requests = query.order_by(EmployeeRequest.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
        
        return requests, total
    
    def approve_employee_request(self, request_id: int, approved_by_user_id: int, admin_notes: Optional[str] = None) -> Tuple[bool, str]:
        """Çalışan talebini onayla ve kullanıcı oluştur"""
        
        # Talep kontrolü
        request = self.db.query(EmployeeRequest).filter(EmployeeRequest.id == request_id).first()
        if not request:
            return False, "Talep bulunamadı"
        
        if request.status != RequestStatus.PENDING:
            return False, "Sadece bekleyen talepler onaylanabilir"
        
        # Onaylayan kullanıcının Super Admin olduğunu kontrol et
        approving_user = self.db.query(User).filter(User.id == approved_by_user_id).first()
        if not approving_user or not approving_user.is_super_admin():
            return False, "Sadece Super Admin çalışan taleplerini onaylayabilir"
        
        # Email'in hala müsait olduğunu kontrol et
        existing_user = self.db.query(User).filter(User.email == request.email).first()
        if existing_user:
            request.status = RequestStatus.REJECTED
            request.admin_notes = "E-posta adresi artık sistemde mevcut"
            request.approved_by_user_id = approved_by_user_id
            request.approved_at = datetime.utcnow()
            self.db.commit()
            return False, "Bu e-posta adresi artık sistemde kayıtlı"
        
        try:
            # Kullanıcı oluştur
            user_service = UserService(self.db)
            
            # Orta zorlukta güvenli şifre oluştur
            from utils.password_generator import PasswordGenerator
            temp_password = PasswordGenerator.generate_medium_password(12)
            
            # Role bilgisini al
            role = self.db.query(Role).filter(Role.id == request.role_id).first()
            
            # UserCreate objesi oluştur
            from schemas.user import UserCreate
            user_data = UserCreate(
                email=request.email,
                password=temp_password,
                first_name=request.first_name,
                last_name=request.last_name,
                phone_number=request.phone_number,
                role_id=request.role_id,
                brand_ids=request.brand_ids
            )
            
            user, message = user_service.create_user(user_data, approved_by_user_id)
            success = user is not None
            
            if success:
                # Talebi onayla
                request.status = RequestStatus.APPROVED
                request.admin_notes = admin_notes
                request.approved_by_user_id = approved_by_user_id
                request.approved_at = datetime.utcnow()
                self.db.commit()
                
                # E-posta gönder - Yeni dinamik mail sistemi
                try:
                    from services.email import EmailService
                    from models.brand import Brand
                    
                    email_service = EmailService(self.db)
                    
                    # Marka bilgisini al - tüm markaları al
                    brand_names = []
                    if request.brand_ids and len(request.brand_ids) > 0:
                        brands = self.db.query(Brand).filter(Brand.id.in_(request.brand_ids)).all()
                        brand_names = [brand.name for brand in brands]
                    
                    # Marka isimlerini virgülle ayır
                    brand_name = ", ".join(brand_names) if brand_names else "Pofuduk Dijital"
                    
                    # Talep eden kişinin bilgisini al (çalışanı talep eden mağaza yöneticisi)
                    manager_name = "Sistem Yöneticisi"
                    if request.requested_by_user_id:
                        requested_user = self.db.query(User).filter(User.id == request.requested_by_user_id).first()
                        if requested_user:
                            manager_name = f"{requested_user.first_name.strip()} {requested_user.last_name.strip()}"
                    
                    # Onaylayan kişi bilgisini al
                    approver_name = "Sistem Yöneticisi"
                    if approving_user:
                        approver_name = f"{approving_user.first_name.strip()} {approving_user.last_name.strip()}"
                    
                    success = email_service.send_welcome_employee_email(
                        email=request.email,
                        first_name=request.first_name.strip(),
                        last_name=request.last_name.strip(),
                        password=temp_password,
                        brand_name=brand_name,
                        role_name=role.display_name if role else "Çalışan",
                        manager_name=manager_name,  # Talep eden kişi
                        approver_name=approver_name  # Onaylayan kişi
                    )
                    
                    if success:
                        return True, f"Çalışan başarıyla oluşturuldu ve hoşgeldin e-postası gönderildi."
                    else:
                        return True, f"Çalışan oluşturuldu ancak e-posta gönderilemedi. Şifre: {temp_password}"
                        
                except Exception as email_error:
                    print(f"E-posta gönderim hatası: {email_error}")
                    return True, f"Çalışan oluşturuldu ancak e-posta gönderilemedi. Şifre: {temp_password}"
            else:
                return False, f"Kullanıcı oluşturulamadı: {message}"
                
        except Exception as e:
            self.db.rollback()
            return False, f"Hata oluştu: {str(e)}"
    
    def reject_employee_request(self, request_id: int, approved_by_user_id: int, admin_notes: str) -> Tuple[bool, str]:
        """Çalışan talebini reddet"""
        
        # Talep kontrolü
        request = self.db.query(EmployeeRequest).filter(EmployeeRequest.id == request_id).first()
        if not request:
            return False, "Talep bulunamadı"
        
        if request.status != RequestStatus.PENDING:
            return False, "Sadece bekleyen talepler reddedilebilir"
        
        # Reddeden kullanıcının Super Admin olduğunu kontrol et
        approving_user = self.db.query(User).filter(User.id == approved_by_user_id).first()
        if not approving_user or not approving_user.is_super_admin():
            return False, "Sadece Super Admin çalışan taleplerini reddedebilir"
        
        # Talebi reddet
        request.status = RequestStatus.REJECTED
        request.admin_notes = admin_notes
        request.approved_by_user_id = approved_by_user_id
        request.approved_at = datetime.utcnow()
        self.db.commit()
        
        # E-posta gönder - Reddedildi bildirimi
        try:
            from services.email import EmailService
            from models.brand import Brand
            
            email_service = EmailService(self.db)
            
            # Marka bilgisini al
            brand_name = "Pofuduk Digital"
            if request.brand_ids and len(request.brand_ids) > 0:
                brand = self.db.query(Brand).filter(Brand.id == request.brand_ids[0]).first()
                if brand:
                    brand_name = brand.name
            
            success = email_service.send_request_rejected_email(
                email=request.email,
                first_name=request.first_name,
                last_name=request.last_name,
                brand_name=brand_name,
                rejection_reason=admin_notes
            )
            
            if success:
                return True, "Çalışan talebi reddedildi ve bildirim e-postası gönderildi."
            else:
                return True, "Çalışan talebi reddedildi ancak e-posta gönderilemedi."
                
        except Exception as email_error:
            print(f"E-posta gönderim hatası: {email_error}")
            return True, "Çalışan talebi reddedildi ancak e-posta gönderilemedi."
    
    def get_employee_request(self, request_id: int) -> Optional[EmployeeRequest]:
        """Tek bir çalışan talebini getir"""
        return self.db.query(EmployeeRequest).filter(EmployeeRequest.id == request_id).first()
    
    def get_pending_requests_count_by_user(self, user_id: int) -> int:
        """Kullanıcının bekleyen talep sayısını getir"""
        return self.db.query(EmployeeRequest).filter(
            and_(
                EmployeeRequest.requested_by_user_id == user_id,
                EmployeeRequest.status == RequestStatus.PENDING
            )
        ).count()
    
    def get_brand_manager_stats(self, user_id: int) -> dict:
        """Marka yöneticisi için istatistikler"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.brand_ids or len(user.brand_ids) == 0:
            return {}
        
        # Çalışan sayıları
        employees = self.db.query(User).filter(
            and_(
                User.brand_ids.op('JSON_OVERLAPS')(user.brand_ids),
                User.role != 'Super Admin',
                User.role != 'Marka Yöneticisi'
            )
        ).all()
        
        total_employees = len(employees)
        active_employees = len([e for e in employees if e.is_active])
        
        # Bekleyen talep sayısı
        pending_requests = self.get_pending_requests_count_by_user(user_id)
        
        return {
            'total_employees': total_employees,
            'active_employees': active_employees,
            'pending_requests': pending_requests,
            'managed_brands_count': len(user.brand_ids)
        }
    
    # _send_welcome_email metodu kaldırıldı - Yeni EmailService kullanılıyor
    
    def update_employee_request(self, request_id: int, request_data: EmployeeRequestCreate) -> Tuple[Optional[EmployeeRequest], str]:
        """Admin çalışan talebi bilgilerini günceller"""
        
        # Talebi bul
        request = self.db.query(EmployeeRequest).filter(EmployeeRequest.id == request_id).first()
        if not request:
            return None, "Talep bulunamadı"
        
        # Bekleyen ve reddedilmiş talepler güncellenebilir
        if request.status not in [RequestStatus.PENDING, RequestStatus.REJECTED]:
            return None, "Sadece bekleyen ve reddedilmiş talepler güncellenebilir"
        
        # Email değişikliği varsa, yeni email'in müsait olduğunu kontrol et
        if request.email != request_data.email:
            existing_user = self.db.query(User).filter(User.email == request_data.email).first()
            if existing_user:
                return None, "Bu e-posta adresi zaten sistemde kayıtlı"
            
            # Aynı email ile bekleyen başka talep var mı kontrol et
            existing_request = self.db.query(EmployeeRequest).filter(
                and_(
                    EmployeeRequest.email == request_data.email,
                    EmployeeRequest.status == RequestStatus.PENDING,
                    EmployeeRequest.id != request_id
                )
            ).first()
            if existing_request:
                return None, "Bu e-posta adresi için bekleyen başka bir talep mevcut"
        
        # Rol kontrolü
        role = self.db.query(Role).filter(Role.id == request_data.role_id).first()
        if not role:
            # Mevcut rolleri listele
            available_roles = self.db.query(Role).filter(Role.name != 'super_admin').all()
            role_list = ", ".join([f"{r.display_name} (ID: {r.id})" for r in available_roles])
            return None, f"Geçersiz rol ID: {request_data.role_id}. Mevcut roller: {role_list}"
        
        # Super Admin rolü için talep oluşturulamaz
        if role.name == 'super_admin':
            return None, "Super Admin rolü için talep oluşturulamaz"
        
        # Marka kontrolü ve yetki kontrolü
        if request_data.brand_ids:
            # Talep sahibi kullanıcıyı al
            request_creator = self.db.query(User).filter(User.id == request.requested_by_user_id).first()
            
            for brand_id in request_data.brand_ids:
                brand = self.db.query(Brand).filter(Brand.id == brand_id).first()
                if not brand:
                    return None, f"Geçersiz marka ID: {brand_id}"
                
                # Talep sahibinin bu markaya yetkisi var mı kontrol et
                if request_creator and request_creator.brand_ids:
                    if brand_id not in request_creator.brand_ids:
                        return None, f"Talep sahibinin '{brand.name}' markasına yetkisi bulunmamaktadır"
        
        try:
            # Bilgileri güncelle
            request.email = request_data.email
            request.first_name = request_data.first_name
            request.last_name = request_data.last_name
            request.phone_number = request_data.phone_number
            request.role_id = request_data.role_id
            request.brand_ids = request_data.brand_ids
            request.request_message = request_data.request_message
            request.updated_at = datetime.utcnow()
            
            # Eğer talep reddedilmişse, pending'e çevir
            if request.status == RequestStatus.REJECTED:
                request.status = RequestStatus.PENDING
                request.admin_notes = None
                request.approved_by_user_id = None
                request.approved_at = None
            
            self.db.commit()
            return request, "Talep başarıyla güncellendi"
            
        except Exception as e:
            self.db.rollback()
            return None, f"Güncelleme sırasında hata oluştu: {str(e)}"
