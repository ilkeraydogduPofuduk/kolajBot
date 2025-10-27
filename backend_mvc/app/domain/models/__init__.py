"""Aggregate exports for domain models reusing the legacy definitions."""

from backend.database import Base  # type: ignore
from backend.models.brand import Brand, BrandRequest  # type: ignore
from backend.models.category import Category  # type: ignore
from backend.models.employee_request import (  # type: ignore
    EmployeeRequest,
    RequestStatus,
)
from backend.models.permissions import Permission  # type: ignore
from backend.models.product import Product, ProductImage  # type: ignore
from backend.models.role import Role  # type: ignore
from backend.models.role_permissions import RolePermission  # type: ignore
from backend.models.settings import Settings  # type: ignore
from backend.models.social_media_channel import SocialMediaChannel  # type: ignore
from backend.models.social_media_message import SocialMediaMessage  # type: ignore
from backend.models.telegram_bot import TelegramBot  # type: ignore
from backend.models.template import Template  # type: ignore
from backend.models.template_permission import TemplatePermission  # type: ignore
from backend.models.upload_job import UploadJob  # type: ignore
from backend.models.user import User  # type: ignore
from backend.models.user_brand import UserBrand  # type: ignore

__all__ = [
    "Base",
    "Brand",
    "BrandRequest",
    "Category",
    "EmployeeRequest",
    "RequestStatus",
    "Permission",
    "Product",
    "ProductImage",
    "Role",
    "RolePermission",
    "Settings",
    "SocialMediaChannel",
    "SocialMediaMessage",
    "TelegramBot",
    "Template",
    "TemplatePermission",
    "UploadJob",
    "User",
    "UserBrand",
]
