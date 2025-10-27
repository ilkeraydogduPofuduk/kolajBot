from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, text
from typing import List, Optional, Tuple
from models.user import User
from models.brand import Brand
from models.role import Role
from schemas.user import UserCreate, UserUpdate, UserPasswordUpdate
from utils.security import verify_password, get_password_hash
from services.email import EmailService
from services.session_service import SessionService
from datetime import datetime
import re

def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_password(password: str) -> Tuple[bool, str]:
    """Validate password strength"""
    if len(password) < 6:
        return False, "Password must be at least 6 characters long"
    return True, "Valid password"

def validate_name(name: str) -> bool:
    """Validate name format"""
    return bool(name and len(name.strip()) >= 2)

class UserService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_user(self, user_data: UserCreate, created_by_id: int) -> Tuple[Optional[User], str]:
        """Create a new user"""
        # Validate input
        if not validate_email(user_data.email):
            return None, "Invalid email format"
        
        is_valid, password_msg = validate_password(user_data.password)
        if not is_valid:
            return None, password_msg
        
        if not validate_name(user_data.first_name) or not validate_name(user_data.last_name):
            return None, "Invalid name format"
        
        # Role validation will be done via foreign key constraint
        
        # Check if user already exists
        existing_user = self.db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            return None, "User with this email already exists"
        
        # Validate brand IDs if provided
        if user_data.brand_ids:
            valid_brands = self.db.query(Brand).filter(Brand.id.in_(user_data.brand_ids)).count()
            if valid_brands != len(user_data.brand_ids):
                return None, "One or more brand IDs are invalid"
        
        # Validate branch if provided - REMOVED (branches eliminated)
        
        # Create user
        user = User(
            email=user_data.email,
            password_hash=get_password_hash(user_data.password),
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            role_id=user_data.role_id,
            brand_ids=user_data.brand_ids or [],
            must_change_password=True  # Yeni oluşturulan kullanıcılar ilk girişte şifre değiştirmeli
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        return user, "User created successfully"
    
    def get_user(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.db.query(User).filter(User.email == email).first()
    
    def get_users(self, page: int = 1, per_page: int = 10, role: str = None, brand_id: int = None) -> Tuple[List[User], int]:
        """Get paginated list of users with optional filters"""
        query = self.db.query(User)
        
        if role:
            # Filter by role display name through join
            query = query.join(User.role).filter(Role.display_name == role)
        
        if brand_id:
            # Use raw SQL for MySQL JSON_CONTAINS function
            query = query.filter(text(f"JSON_CONTAINS(users.brand_ids, '{brand_id}', '$')"))
        
        total = query.count()
        users = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return users, total
    
    def get_users_by_brands(self, brand_ids: List[int], page: int = 1, per_page: int = 10, role: str = None) -> Tuple[List[User], int]:
        """Belirtilen markalardaki kullanıcıları getir"""
        query = self.db.query(User)
        
        if role:
            # Filter by role display name through join
            query = query.join(User.role).filter(Role.display_name == role)
        
        # Kullanıcının marka ID'lerinden herhangi biri ile eşleşenler
        brand_conditions = []
        for brand_id in brand_ids:
            brand_conditions.append(text(f"JSON_CONTAINS(users.brand_ids, '{brand_id}', '$')"))
        
        if brand_conditions:
            query = query.filter(or_(*brand_conditions))
        
        total = query.count()
        users = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return users, total
    
    def update_user(self, user_id: int, user_data: UserUpdate, updated_by_id: int, send_email: bool = True) -> Tuple[Optional[User], str]:
        """Update user information"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return None, "User not found"
        
        # Validate email if provided
        if user_data.email and user_data.email != user.email:
            if not validate_email(user_data.email):
                return None, "Invalid email format"
            
            # Check if email is already taken
            existing_user = self.db.query(User).filter(
                and_(User.email == user_data.email, User.id != user_id)
            ).first()
            if existing_user:
                return None, "Email is already taken"
        
        # Validate name if provided
        if user_data.first_name and not validate_name(user_data.first_name):
            return None, "Invalid first name format"
        
        if user_data.last_name and not validate_name(user_data.last_name):
            return None, "Invalid last name format"
        
        # Role validation will be done via foreign key constraint
        
        # Validate brand IDs if provided
        if user_data.brand_ids is not None:
            valid_brands = self.db.query(Brand).filter(Brand.id.in_(user_data.brand_ids)).count()
            if valid_brands != len(user_data.brand_ids):
                return None, "One or more brand IDs are invalid"
        
        # Validate branch if provided - REMOVED (branches eliminated)
        
        # Handle password update separately
        password_to_update = None
        if user_data.password:
            password_to_update = user_data.password
            # Remove password from update data to avoid setting it directly
            update_data = user_data.dict(exclude_unset=True, exclude={'password'})
        else:
            update_data = user_data.dict(exclude_unset=True)
        
        # Update user fields
        for field, value in update_data.items():
            setattr(user, field, value)
        
        # Update password if provided
        if password_to_update:
            # Validate new password
            is_valid, password_msg = validate_password(password_to_update)
            if not is_valid:
                return None, password_msg
            
            # Update password
            user.password_hash = get_password_hash(password_to_update)
        
        self.db.commit()
        self.db.refresh(user)
        
        # Send email notification only if password was changed and send_email is True
        if password_to_update and send_email:
            try:
                email_service = EmailService(self.db)
                now = datetime.now()
                email_service.send_password_changed_email(
                    email=user.email,
                    first_name=user.first_name,
                    last_name=user.last_name,
                    change_date=now.strftime("%d.%m.%Y"),
                    change_time=now.strftime("%H:%M"),
                    ip_address="Sistem",
                    user_agent="Admin Panel"
                )
            except Exception as e:
                print(f"Email gönderim hatası: {e}")
        
        return user, "User updated successfully"
    
    def update_password(self, user_id: int, password_data: UserPasswordUpdate, 
                       ip_address: str = None, user_agent: str = None, 
                       changed_by_admin: bool = False) -> Tuple[bool, str]:
        """Update user password with email notification and session invalidation"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False, "User not found"
        
        # Verify current password only if provided (for regular users changing their own password)
        if password_data.current_password:
            if not verify_password(password_data.current_password, user.password_hash):
                return False, "Current password is incorrect"
        
        # Validate new password
        is_valid, password_msg = validate_password(password_data.new_password)
        if not is_valid:
            return False, password_msg
        
        # Update password
        user.password_hash = get_password_hash(password_data.new_password)
        self.db.commit()
        
        # Send email notification
        try:
            email_service = EmailService(self.db)
            now = datetime.now()
            email_service.send_password_changed_email(
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                change_date=now.strftime("%d.%m.%Y"),
                change_time=now.strftime("%H:%M"),
                ip_address=ip_address or "Bilinmiyor",
                user_agent=user_agent or "Bilinmiyor"
            )
        except Exception as e:
            print(f"Email gönderim hatası: {e}")
        
        # Invalidate all user sessions
        try:
            session_service = SessionService(self.db)
            invalidated_count = session_service.invalidate_all_user_sessions(user_id)
            print(f"Kullanıcı {user_id} için {invalidated_count} oturum sonlandırıldı")
        except Exception as e:
            print(f"Session sonlandırma hatası: {e}")
        
        return True, "Password updated successfully"
    
    def deactivate_user(self, user_id: int, deactivated_by_id: int) -> Tuple[bool, str]:
        """Deactivate user account"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False, "User not found"
        
        user.is_active = False
        self.db.commit()
        
        return True, "User deactivated successfully"
    
    def activate_user(self, user_id: int, activated_by_id: int) -> Tuple[bool, str]:
        """Activate user account"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False, "User not found"
        
        user.is_active = True
        self.db.commit()
        
        return True, "User activated successfully"
    
    def delete_user(self, user_id: int, deleted_by_id: int) -> Tuple[bool, str]:
        """Delete user account (soft delete by deactivating)"""
        return self.deactivate_user(user_id, deleted_by_id)
    
    def get_users_by_brand(self, brand_id: int) -> List[User]:
        """Get all users assigned to a specific brand"""
        return self.db.query(User).filter(User.brand_ids.contains([brand_id])).all()
    
    def assign_brand_to_user(self, user_id: int, brand_id: int) -> Tuple[bool, str]:
        """Assign a brand to a user"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False, "User not found"
        
        brand = self.db.query(Brand).filter(Brand.id == brand_id).first()
        if not brand:
            return False, "Brand not found"
        
        if user.brand_ids is None:
            user.brand_ids = []
        
        if brand_id not in user.brand_ids:
            user.brand_ids.append(brand_id)
            self.db.commit()
            return True, "Brand assigned successfully"
        else:
            return False, "User is already assigned to this brand"
    
    def remove_brand_from_user(self, user_id: int, brand_id: int) -> Tuple[bool, str]:
        """Remove a brand from a user"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False, "User not found"
        
        if user.brand_ids and brand_id in user.brand_ids:
            user.brand_ids.remove(brand_id)
            self.db.commit()
            return True, "Brand removed successfully"
        else:
            return False, "User is not assigned to this brand"
