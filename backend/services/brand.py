from sqlalchemy.orm import Session
from typing import Tuple, List, Optional
from models.brand import Brand, BrandRequest
from models.user import User
from schemas.brand import BrandCreate, BrandUpdate, BrandRequestCreate, BrandRequestUpdate
from sqlalchemy import and_, or_
import logging

logger = logging.getLogger(__name__)

class BrandService:
    def __init__(self, db: Session):
        self.db = db

    def get_brand(self, brand_id: int) -> Optional[Brand]:
        """Get a brand by ID"""
        try:
            return self.db.query(Brand).filter(Brand.id == brand_id).first()
        except Exception as e:
            logger.error(f"Error getting brand: {e}")
            return None

    def get_brands(self, page: int = 1, per_page: int = 10) -> Tuple[List[Brand], int]:
        """Get paginated list of brands"""
        try:
            offset = (page - 1) * per_page
            brands = self.db.query(Brand).offset(offset).limit(per_page).all()
            total = self.db.query(Brand).count()
            return brands, total
        except Exception as e:
            logger.error(f"Error getting brands: {e}")
            return [], 0

    def get_brands_by_ids(self, brand_ids: List[int], page: int = 1, per_page: int = 10) -> Tuple[List[Brand], int]:
        """Get paginated list of brands by IDs"""
        try:
            offset = (page - 1) * per_page
            brands = self.db.query(Brand).filter(Brand.id.in_(brand_ids)).offset(offset).limit(per_page).all()
            total = self.db.query(Brand).filter(Brand.id.in_(brand_ids)).count()
            return brands, total
        except Exception as e:
            logger.error(f"Error getting brands by IDs: {e}")
            return [], 0

    def create_brand(self, brand_data: BrandCreate) -> Optional[Brand]:
        """Create a new brand"""
        try:
            # Check if brand with same name already exists
            existing_brand = self.db.query(Brand).filter(Brand.name == brand_data.name).first()
            if existing_brand:
                return None  # Brand already exists

            # Validate logo URL
            if not brand_data.logo_url or not brand_data.logo_url.strip():
                raise ValueError("Logo URL is required")
            
            # Eğer geçici URL ise, geçerli bir URL ile değiştir
            if brand_data.logo_url == "temp":
                brand_data.logo_url = "/uploads/brand_logos/default.png"

            brand = Brand(
                name=brand_data.name,
                category_id=brand_data.category_id,
                logo_url=brand_data.logo_url
            )
            self.db.add(brand)
            self.db.commit()
            self.db.refresh(brand)
            return brand
        except Exception as e:
            logger.error(f"Error creating brand: {e}")
            self.db.rollback()
            return None

    def update_brand(self, brand_id: int, brand_data: BrandUpdate) -> Optional[Brand]:
        """Update brand information"""
        try:
            brand = self.db.query(Brand).filter(Brand.id == brand_id).first()
            if not brand:
                return None

            # Update fields if provided
            if brand_data.name is not None:
                brand.name = brand_data.name
            if brand_data.category_id is not None:
                brand.category_id = brand_data.category_id
            if brand_data.logo_url is not None:
                brand.logo_url = brand_data.logo_url
            if brand_data.product_ids is not None:
                brand.product_ids = brand_data.product_ids
            if brand_data.template_ids is not None:
                brand.template_ids = brand_data.template_ids
            if brand_data.is_active is not None:
                brand.is_active = brand_data.is_active

            self.db.commit()
            self.db.refresh(brand)
            return brand
        except Exception as e:
            logger.error(f"Error updating brand: {e}")
            self.db.rollback()
            return None

    def activate_brand(self, brand_id: int) -> Tuple[bool, str]:
        """Activate brand"""
        try:
            brand = self.db.query(Brand).filter(Brand.id == brand_id).first()
            if not brand:
                return False, "Brand not found"

            brand.is_active = True
            self.db.commit()
            return True, "Brand activated successfully"
        except Exception as e:
            logger.error(f"Error activating brand: {e}")
            self.db.rollback()
            return False, "Error activating brand"

    def deactivate_brand(self, brand_id: int) -> Tuple[bool, str]:
        """Deactivate brand"""
        try:
            brand = self.db.query(Brand).filter(Brand.id == brand_id).first()
            if not brand:
                return False, "Brand not found"

            brand.is_active = False
            self.db.commit()
            return True, "Brand deactivated successfully"
        except Exception as e:
            logger.error(f"Error deactivating brand: {e}")
            self.db.rollback()
            return False, "Error deactivating brand"


class BrandRequestService:
    def __init__(self, db: Session):
        self.db = db

    def get_brand_request(self, request_id: int) -> Optional[BrandRequest]:
        """Get a brand request by ID"""
        try:
            return self.db.query(BrandRequest).filter(BrandRequest.id == request_id).first()
        except Exception as e:
            logger.error(f"Error getting brand request: {e}")
            return None

    def get_brand_requests(self, page: int = 1, per_page: int = 10, status: Optional[str] = None) -> Tuple[List[BrandRequest], int]:
        """Get paginated list of brand requests"""
        try:
            query = self.db.query(BrandRequest)
            
            if status:
                query = query.filter(BrandRequest.status == status)
            
            offset = (page - 1) * per_page
            requests = query.offset(offset).limit(per_page).all()
            total = query.count()  # Reset query to count all matching records
            if status:
                total = self.db.query(BrandRequest).filter(BrandRequest.status == status).count()
            else:
                total = self.db.query(BrandRequest).count()
                
            return requests, total
        except Exception as e:
            logger.error(f"Error getting brand requests: {e}")
            return [], 0

    def get_brand_requests_by_user(self, user_id: int, page: int = 1, per_page: int = 10, status: Optional[str] = None) -> Tuple[List[BrandRequest], int]:
        """Get paginated list of brand requests by user"""
        try:
            query = self.db.query(BrandRequest).filter(BrandRequest.requested_by_user_id == user_id)
            
            if status:
                query = query.filter(BrandRequest.status == status)
            
            offset = (page - 1) * per_page
            requests = query.offset(offset).limit(per_page).all()
            
            # Count total for pagination
            total_query = self.db.query(BrandRequest).filter(BrandRequest.requested_by_user_id == user_id)
            if status:
                total_query = total_query.filter(BrandRequest.status == status)
            total = total_query.count()
                
            return requests, total
        except Exception as e:
            logger.error(f"Error getting brand requests by user: {e}")
            return [], 0

    def create_brand_request(self, user_id: int, request_data: BrandRequestCreate) -> Optional[BrandRequest]:
        """Create a new brand request"""
        try:
            # Check if same brand name already requested by this user and is pending
            existing_request = self.db.query(BrandRequest).filter(
                and_(
                    BrandRequest.name == request_data.name,
                    BrandRequest.requested_by_user_id == user_id,
                    BrandRequest.status == 'pending'
                )
            ).first()
            
            if existing_request:
                return None  # Already have a pending request for this brand

            # Validate logo URL
            if not request_data.logo_url or not request_data.logo_url.strip():
                raise ValueError("Logo URL is required")

            brand_request = BrandRequest(
                requested_by_user_id=user_id,
                name=request_data.name,
                category_id=request_data.category_id,
                logo_url=request_data.logo_url,
                request_message=request_data.request_message,
                status='pending'
            )
            self.db.add(brand_request)
            self.db.commit()
            self.db.refresh(brand_request)
            return brand_request
        except Exception as e:
            logger.error(f"Error creating brand request: {e}")
            self.db.rollback()
            return None

    def update_brand_request(self, request_id: int, request_data: BrandRequestUpdate) -> Optional[BrandRequest]:
        """Update brand request information (only for pending requests)"""
        try:
            brand_request = self.db.query(BrandRequest).filter(BrandRequest.id == request_id).first()
            if not brand_request or brand_request.status != 'pending':
                return None

            # Update fields if provided
            if request_data.name is not None:
                brand_request.name = request_data.name
            if request_data.category_id is not None:
                brand_request.category_id = request_data.category_id
            if request_data.website_url is not None:
                brand_request.website_url = request_data.website_url
            if request_data.request_message is not None:
                brand_request.request_message = request_data.request_message

            self.db.commit()
            self.db.refresh(brand_request)
            return brand_request
        except Exception as e:
            logger.error(f"Error updating brand request: {e}")
            self.db.rollback()
            return None

    def approve_brand_request(self, request_id: int, approved_by_user_id: int, admin_notes: Optional[str] = None) -> bool:
        """Approve brand request"""
        try:
            brand_request = self.db.query(BrandRequest).filter(BrandRequest.id == request_id).first()
            if not brand_request or brand_request.status != 'pending':
                return False

            brand_request.status = 'approved'
            brand_request.approved_by_user_id = approved_by_user_id
            brand_request.admin_notes = admin_notes
            brand_request.approved_at = self.db.query(BrandRequest).filter(BrandRequest.id == request_id).first().approved_at  # will be updated to current time
            # Update approved_at to current time
            from sqlalchemy.sql import func
            brand_request.approved_at = func.now()

            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Error approving brand request: {e}")
            self.db.rollback()
            return False

    def reject_brand_request(self, request_id: int, rejected_by_user_id: int, admin_notes: str) -> bool:
        """Reject brand request"""
        try:
            brand_request = self.db.query(BrandRequest).filter(BrandRequest.id == request_id).first()
            if not brand_request or brand_request.status != 'pending':
                return False

            brand_request.status = 'rejected'
            brand_request.approved_by_user_id = rejected_by_user_id  # Use same field for tracking who handled it
            brand_request.admin_notes = admin_notes

            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Error rejecting brand request: {e}")
            self.db.rollback()
            return False