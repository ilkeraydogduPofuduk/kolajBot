from sqlalchemy.orm import Session
from typing import List, Optional
from models.role import Role
from models.permissions import Permission
from models.role_permissions import RolePermission
from models.user import User
from schemas.role import RoleCreate, RoleUpdate, RoleResponse, PermissionResponse, RolePermissionsResponse
from datetime import datetime

class RoleService:
    def __init__(self, db: Session):
        self.db = db

    async def get_roles(self) -> List[RoleResponse]:
        """Tüm rolleri getir"""
        roles = self.db.query(Role).all()
        
        result = []
        for role in roles:
            # Bu rolü kullanan kullanıcı sayısını hesapla
            user_count = self.db.query(User).filter(User.role_id == role.id).count()
            
            # Rol izinlerini getir
            permissions = self.db.query(Permission).join(
                RolePermission, RolePermission.permission_id == Permission.id
            ).filter(RolePermission.role_id == role.id).all()
            
            role_response = RoleResponse(
                id=role.id,
                name=role.name,
                display_name=role.display_name,
                description=role.description,
                is_active=role.is_active,
                is_system_role=role.is_system_role,
                user_count=user_count,
                permissions=[
                    PermissionResponse(
                        id=p.id,
                        name=p.name,
                        display_name=p.display_name,
                        description=p.description,
                        module=p.module,
                        is_active=p.is_active,
                        created_at=p.created_at
                    ) for p in permissions
                ],
                created_at=role.created_at,
                updated_at=role.updated_at
            )
            result.append(role_response)
        
        return result

    async def get_permissions(self) -> List[PermissionResponse]:
        """Tüm izinleri getir"""
        permissions = self.db.query(Permission).filter(Permission.is_active == True).all()
        
        return [
            PermissionResponse(
                id=p.id,
                name=p.name,
                display_name=p.display_name,
                description=p.description,
                module=p.module,
                is_active=p.is_active,
                created_at=p.created_at
            ) for p in permissions
        ]

    async def get_role(self, role_id: int) -> Optional[RoleResponse]:
        """Rol detayını getir"""
        role = self.db.query(Role).filter(Role.id == role_id).first()
        
        if not role:
            return None
        
        # Bu rolü kullanan kullanıcı sayısını hesapla
        user_count = self.db.query(User).filter(User.role_id == role.id).count()
        
        # Rol izinlerini getir
        permissions = self.db.query(Permission).join(
            RolePermission, RolePermission.permission_id == Permission.id
        ).filter(RolePermission.role_id == role.id).all()
        
        return RoleResponse(
            id=role.id,
            name=role.name,
            display_name=role.display_name,
            description=role.description,
            is_active=role.is_active,
            is_system_role=role.is_system_role,
            user_count=user_count,
            permissions=[
                PermissionResponse(
                    id=p.id,
                    name=p.name,
                    display_name=p.display_name,
                    description=p.description,
                    module=p.module,
                    is_active=p.is_active,
                    created_at=p.created_at
                ) for p in permissions
            ],
            created_at=role.created_at,
            updated_at=role.updated_at
        )

    async def get_role_by_name(self, name: str) -> Optional[Role]:
        """Role adına göre rol getir"""
        return self.db.query(Role).filter(Role.name == name).first()

    async def get_role_permissions(self, role_id: int) -> RolePermissionsResponse:
        """Rolün izinlerini getir"""
        role = self.db.query(Role).filter(Role.id == role_id).first()
        
        if not role:
            raise ValueError("Rol bulunamadı")
        
        permissions = self.db.query(Permission).join(
            RolePermission, RolePermission.permission_id == Permission.id
        ).filter(RolePermission.role_id == role_id).all()
        
        return RolePermissionsResponse(
            role_id=role_id,
            role_name=role.name,
            role_display_name=role.display_name,
            permissions=[
                PermissionResponse(
                    id=p.id,
                    name=p.name,
                    display_name=p.display_name,
                    description=p.description,
                    module=p.module,
                    is_active=p.is_active,
                    created_at=p.created_at
                ) for p in permissions
            ]
        )

    async def create_role(self, role_data: RoleCreate, created_by_user_id: int) -> RoleResponse:
        """Yeni rol oluştur"""
        
        # Rol adı kontrolü
        existing_role = self.db.query(Role).filter(Role.name == role_data.name).first()
        if existing_role:
            raise ValueError("Bu rol adı zaten kullanılıyor")
        
        # Yeni rol oluştur
        db_role = Role(
            name=role_data.name,
            display_name=role_data.display_name,
            description=role_data.description,
            is_active=True,
            is_system_role=False
        )
        
        self.db.add(db_role)
        self.db.commit()
        self.db.refresh(db_role)
        
        # İzinleri ata
        if role_data.permission_ids:
            await self.assign_permissions_to_role(db_role.id, role_data.permission_ids, created_by_user_id)
        
        return await self.get_role(db_role.id)

    async def update_role(self, role_id: int, role_data: RoleUpdate, updated_by_user_id: int) -> RoleResponse:
        """Rol güncelle"""
        
        role = self.db.query(Role).filter(Role.id == role_id).first()
        if not role:
            raise ValueError("Rol bulunamadı")
        
        if role.is_system_role:
            raise ValueError("Sistem rolleri değiştirilemez")
        
        # Rol bilgilerini güncelle
        if role_data.name is not None:
            # Aynı isimde başka rol var mı kontrol et
            existing_role = self.db.query(Role).filter(
                Role.name == role_data.name, 
                Role.id != role_id
            ).first()
            if existing_role:
                raise ValueError("Bu rol adı zaten kullanılıyor")
            role.name = role_data.name
        
        if role_data.display_name is not None:
            role.display_name = role_data.display_name
        
        if role_data.description is not None:
            role.description = role_data.description
        
        role.updated_at = datetime.utcnow()
        
        # İzinleri güncelle
        if role_data.permission_ids is not None:
            # Mevcut izinleri temizle
            self.db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()
            
            # Yeni izinleri ekle
            if role_data.permission_ids:
                await self.assign_permissions_to_role(role_id, role_data.permission_ids, updated_by_user_id)
        
        self.db.commit()
        self.db.refresh(role)
        
        # Return updated role data
        role_response = await self.get_role(role_id)
        if not role_response:
            raise ValueError("Güncellenen rol bulunamadı")
        return role_response

    async def assign_permissions_to_role(self, role_id: int, permission_ids: List[int], assigned_by_user_id: int):
        """Role izinler ata"""
        
        role = self.db.query(Role).filter(Role.id == role_id).first()
        if not role:
            raise ValueError("Rol bulunamadı")
        
        if role.is_system_role:
            raise ValueError("Sistem rollerinin izinleri değiştirilemez")
        
        # İzinlerin geçerli olduğunu kontrol et
        valid_permissions = self.db.query(Permission).filter(
            Permission.id.in_(permission_ids),
            Permission.is_active == True
        ).all()
        
        if len(valid_permissions) != len(permission_ids):
            raise ValueError("Geçersiz izin ID'leri var")
        
        # Mevcut izinleri temizle (eğer varsa)
        self.db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()
        
        # Yeni izinleri ekle
        for permission_id in permission_ids:
            role_permission = RolePermission(
                role_id=role_id,
                permission_id=permission_id
            )
            self.db.add(role_permission)
        
        self.db.commit()

    async def remove_permission_from_role(self, role_id: int, permission_id: int, removed_by_user_id: int):
        """Rolden izin kaldır"""
        
        role = self.db.query(Role).filter(Role.id == role_id).first()
        if not role:
            raise ValueError("Rol bulunamadı")
        
        if role.is_system_role:
            raise ValueError("Sistem rollerinin izinleri değiştirilemez")
        
        # İzin atamasını bul ve sil
        role_permission = self.db.query(RolePermission).filter(
            RolePermission.role_id == role_id,
            RolePermission.permission_id == permission_id
        ).first()
        
        if not role_permission:
            raise ValueError("Bu izin bu role atanmamış")
        
        self.db.delete(role_permission)
        self.db.commit()

    async def toggle_role_status(self, role_id: int, updated_by_user_id: int) -> RoleResponse:
        """Rol durumunu değiştir"""
        
        role = self.db.query(Role).filter(Role.id == role_id).first()
        if not role:
            raise ValueError("Rol bulunamadı")
        
        if role.is_system_role:
            raise ValueError("Sistem rollerinin durumu değiştirilemez")
        
        role.is_active = not role.is_active
        role.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(role)
        
        return await self.get_role(role_id)

    async def delete_role(self, role_id: int, deleted_by_user_id: int):
        """Rol sil"""
        
        role = self.db.query(Role).filter(Role.id == role_id).first()
        if not role:
            raise ValueError("Rol bulunamadı")
        
        if role.is_system_role:
            raise ValueError("Sistem rolleri silinemez")
        
        # Bu rolü kullanan kullanıcı var mı kontrol et
        user_count = self.db.query(User).filter(User.role_id == role_id).count()
        if user_count > 0:
            raise ValueError(f"Bu role sahip {user_count} kullanıcı olduğu için silinemez")
        
        # Önce rol izinlerini sil
        self.db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()
        
        # Rolü sil
        self.db.delete(role)
        self.db.commit()

    async def get_role_user_count(self, role_id: int) -> int:
        """Rolü kullanan kullanıcı sayısını getir"""
        return self.db.query(User).filter(User.role_id == role_id).count()

    async def get_user_permissions(self, user_id: int) -> List[PermissionResponse]:
        """Kullanıcının izinlerini getir"""
        user = self.db.query(User).filter(User.id == user_id).first()
        
        if not user or not user.role_id:
            return []
        
        permissions = self.db.query(Permission).join(
            RolePermission, RolePermission.permission_id == Permission.id
        ).filter(RolePermission.role_id == user.role_id).all()
        
        return [
            PermissionResponse(
                id=p.id,
                name=p.name,
                display_name=p.display_name,
                description=p.description,
                module=p.module,
                is_active=p.is_active,
                created_at=p.created_at
            ) for p in permissions
        ]

    async def user_has_permission(self, user_id: int, permission_name: str) -> bool:
        """Kullanıcının belirli bir izni var mı kontrol et"""
        user = self.db.query(User).filter(User.id == user_id).first()
        
        if not user or not user.role_id:
            return False
        
        permission = self.db.query(Permission).join(
            RolePermission, RolePermission.permission_id == Permission.id
        ).filter(
            RolePermission.role_id == user.role_id,
            Permission.name == permission_name,
            Permission.is_active == True
        ).first()
        
        return permission is not None
