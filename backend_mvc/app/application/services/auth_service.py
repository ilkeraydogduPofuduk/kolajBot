"""Auth service bridging legacy logic with new architecture."""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:  # pragma: no cover - only for static analysis
    from sqlalchemy.orm import Session  # type: ignore
else:  # pragma: no cover - runtime fallback when SQLAlchemy isn't installed
    Session = Any

from ...domain.schemas.auth import (
    ChangePasswordRequest,
    ForceChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    TwoFASetupResponse,
    TwoFAVerifyRequest,
)


class AuthService:
    """Facade around the legacy AuthService with structured responses."""

    def __init__(self, session: Session, legacy_service: Any | None = None) -> None:
        if legacy_service is None:
            from backend.services.auth import AuthService as LegacyAuthService  # type: ignore

            legacy_service = LegacyAuthService(session)

        self._legacy = legacy_service

    def login(self, payload: LoginRequest, ip: str | None, user_agent: str | None) -> TokenResponse:
        data, message = self._legacy.login(payload, ip, user_agent)
        if not data:
            raise ValueError(message)
        data["issued_at"] = datetime.utcnow()
        return TokenResponse.model_validate(data)

    def register(self, payload: RegisterRequest, ip: str | None, user_agent: str | None) -> dict:
        data, message = self._legacy.register(payload, ip, user_agent)
        if not data:
            raise ValueError(message)
        return data

    def refresh(self, refresh_token: str) -> TokenResponse:
        data, message = self._legacy.refresh_token(refresh_token)
        if not data:
            raise ValueError(message)
        data["issued_at"] = datetime.utcnow()
        return TokenResponse.model_validate(data)

    def setup_2fa(self, user_id: int) -> TwoFASetupResponse:
        data, message = self._legacy.setup_2fa(user_id)
        if not data:
            raise ValueError(message)
        return TwoFASetupResponse.model_validate(data)

    def verify_2fa(self, user_id: int, payload: TwoFAVerifyRequest) -> str:
        success, message = self._legacy.verify_2fa_setup(user_id, payload.code)
        if not success:
            raise ValueError(message)
        return message

    def disable_2fa(self, user_id: int, payload: TwoFAVerifyRequest) -> str:
        success, message = self._legacy.disable_2fa(user_id, payload.code)
        if not success:
            raise ValueError(message)
        return message

    def change_password(self, user_id: int, payload: ChangePasswordRequest) -> str:
        success, message = self._legacy.change_password(user_id, payload.old_password or "", payload.new_password)
        if not success:
            raise ValueError(message)
        return message

    def force_change_password(self, user_id: int, payload: ForceChangePasswordRequest) -> str:
        success, message = self._legacy.force_change_password(user_id, payload.new_password)
        if not success:
            raise ValueError(message)
        return message

    def build_user_payload(self, user, include_permissions: bool = True) -> dict:
        permissions = []
        if include_permissions:
            permissions = self._legacy.get_user_permissions(user.id)

        return {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone_number": getattr(user, "phone_number", None),
            "role_id": getattr(user, "role_id", None),
            "role": getattr(user, "role_display_name", None) or (user.role.display_name if getattr(user, "role", None) else None),
            "brand_ids": user.brand_ids or [],
            "is_active": user.is_active,
            "is_2fa_enabled": getattr(user, "is_2fa_enabled", False),
            "must_change_password": getattr(user, "must_change_password", False),
            "last_login": user.last_login.isoformat() if getattr(user, "last_login", None) else None,
            "created_at": user.created_at.isoformat() if getattr(user, "created_at", None) else None,
            "permissions": permissions,
        }
