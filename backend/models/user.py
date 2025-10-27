from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(191), unique=True, index=True, nullable=False)  # 191 chars for utf8mb4 compatibility
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone_number = Column(String(20), nullable=True)  # İletişim telefonu için
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=False)  # Dinamik rol sistemi
    brand_id = Column(Integer, ForeignKey('brands.id'), nullable=True)  # Kullanıcının atandığı marka (tekil)
    brand_ids = Column(JSON, nullable=True)  # List of brand IDs user has access to (Super Admin için NULL)
    is_active = Column(Boolean, default=True)
    is_2fa_enabled = Column(Boolean, default=False)
    two_fa_secret = Column(String(32), nullable=True)
    must_change_password = Column(Boolean, default=False)  # İlk girişte şifre değiştirme zorunluluğu
    last_login = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    # audit_logs kaldırıldı
    role = relationship("Role", back_populates="users")
    brand = relationship("Brand", foreign_keys=[brand_id], back_populates="users")
    requested_employees = relationship("EmployeeRequest", foreign_keys="EmployeeRequest.requested_by_user_id", back_populates="requested_by")
    approved_employee_requests = relationship("EmployeeRequest", foreign_keys="EmployeeRequest.approved_by_user_id", back_populates="approved_by")
    
    # Product relationships
    created_products = relationship("Product", foreign_keys="Product.created_by", back_populates="creator")
    updated_products = relationship("Product", foreign_keys="Product.updated_by", back_populates="updater")
    templates = relationship("Template", foreign_keys="Template.created_by", back_populates="creator")
    
    # User-Brand many-to-many relationship
    user_brands = relationship("UserBrand", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        try:
            role_name = self.role_display_name if hasattr(self, 'role_display_name') else 'Unknown'
        except:
            role_name = 'Unknown'
        return f"<User(id={self.id}, email='{self.email}', role='{role_name}')>"
    
    def has_permission(self, permission_name: str, db_session=None) -> bool:
        """
        Kullanıcının belirli bir izni var mı kontrol et
        """
        if not db_session:
            from database import SessionLocal
            db = SessionLocal()
            try:
                return self._check_permission(permission_name, db)
            finally:
                db.close()
        else:
            return self._check_permission(permission_name, db_session)
    
    def _check_permission(self, permission_name: str, db_session) -> bool:
        """İzin kontrolü yapan yardımcı fonksiyon"""
        try:
            from services.permission_service import PermissionService
            permission_service = PermissionService(db_session)
            return permission_service.has_permission(self.id, permission_name)
        except Exception:
            return False
    
    def has_any_permission(self, permission_names: list, db_session=None) -> bool:
        """
        Kullanıcının belirtilen izinlerden herhangi birine sahip mi kontrol et
        """
        if not db_session:
            from database import SessionLocal
            db = SessionLocal()
            try:
                return self._check_any_permission(permission_names, db)
            finally:
                db.close()
        else:
            return self._check_any_permission(permission_names, db_session)
    
    def _check_any_permission(self, permission_names: list, db_session) -> bool:
        """Herhangi bir izin kontrolü yapan yardımcı fonksiyon"""
        try:
            from services.permission_service import PermissionService
            permission_service = PermissionService(db_session)
            return permission_service.has_any_permission(self.id, permission_names)
        except Exception:
            return False
    
    def has_all_permissions(self, permission_names: list, db_session=None) -> bool:
        """
        Kullanıcının belirtilen tüm izinlere sahip mi kontrol et
        """
        if not db_session:
            from database import SessionLocal
            db = SessionLocal()
            try:
                return self._check_all_permissions(permission_names, db)
            finally:
                db.close()
        else:
            return self._check_all_permissions(permission_names, db_session)
    
    def _check_all_permissions(self, permission_names: list, db_session) -> bool:
        """Tüm izin kontrolü yapan yardımcı fonksiyon"""
        try:
            from services.permission_service import PermissionService
            permission_service = PermissionService(db_session)
            return permission_service.has_all_permissions(self.id, permission_names)
        except Exception:
            return False
    
    def can_access_module(self, module_name: str, db_session=None) -> bool:
        """
        Kullanıcının belirli bir modüle erişimi var mı kontrol et
        """
        if not db_session:
            from database import SessionLocal
            db = SessionLocal()
            try:
                return self._check_module_access(module_name, db)
            finally:
                db.close()
        else:
            return self._check_module_access(module_name, db_session)
    
    def _check_module_access(self, module_name: str, db_session) -> bool:
        """Modül erişim kontrolü yapan yardımcı fonksiyon"""
        try:
            from services.permission_service import PermissionService
            permission_service = PermissionService(db_session)
            return permission_service.can_access_module(self.id, module_name)
        except Exception:
            return False
    
    def get_permissions(self, db_session=None) -> list:
        """
        Kullanıcının tüm izinlerini getir
        """
        if not db_session:
            from database import SessionLocal
            db = SessionLocal()
            try:
                return self._get_permissions(db)
            finally:
                db.close()
        else:
            return self._get_permissions(db_session)
    
    def _get_permissions(self, db_session) -> list:
        """İzinleri getiren yardımcı fonksiyon"""
        try:
            from services.permission_service import PermissionService
            permission_service = PermissionService(db_session)
            return permission_service.get_user_permission_names(self.id)
        except Exception:
            return []
    
    def get_permissions_by_module(self, db_session=None) -> dict:
        """
        Kullanıcının izinlerini modüle göre gruplamış şekilde getir
        """
        if not db_session:
            from database import SessionLocal
            db = SessionLocal()
            try:
                return self._get_permissions_by_module(db)
            finally:
                db.close()
        else:
            return self._get_permissions_by_module(db_session)
    
    def _get_permissions_by_module(self, db_session) -> dict:
        """Modüle göre izinleri getiren yardımcı fonksiyon"""
        try:
            from services.permission_service import PermissionService
            permission_service = PermissionService(db_session)
            return permission_service.get_user_permissions_by_module(self.id)
        except Exception:
            return {}
    
    @property
    def role_name(self):
        """Get role name from role"""
        if self.role:
            return self.role.name
        return None
    
    @property
    def role_display_name(self):
        """Get role display name from role"""
        if self.role:
            # Normalize Super Admin naming regardless of DB value
            if self.role.name == 'super_admin':
                return 'Super Admin'
            return self.role.display_name
        return "Rol Atanmamış"
    
# Backward compatibility: role relationship artık direkt kullanılabilir
    # role.display_name ile rol adına erişilebilir
    
    @property
    def permissions(self):
        """Get user permissions from role"""
        if self.role and self.role.role_permissions:
            # role_permissions -> RolePermission -> permission -> name
            return [rp.permission.name for rp in self.role.role_permissions if rp.permission and rp.permission.is_active]
        return []
    
    def has_permission(self, permission_name: str) -> bool:
        """Check if user has specific permission"""
        return permission_name in self.permissions
    
    def is_super_admin(self) -> bool:
        """Check if user is super admin"""
        return self.role_name == 'super_admin'
    
    def is_brand_manager(self) -> bool:
        """Check if user is market manager (brand manager)"""
        return self.role_name == 'market_manager'
