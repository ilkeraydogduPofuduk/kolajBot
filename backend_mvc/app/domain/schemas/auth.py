"""Authentication schemas bridging the legacy definitions."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import Field

from backend.schemas import auth as legacy_auth  # type: ignore

from .user import UserResponse

LoginRequest = legacy_auth.LoginRequest
RefreshTokenRequest = legacy_auth.RefreshTokenRequest
TwoFASetupResponse = legacy_auth.TwoFASetupResponse
TwoFAVerifyRequest = legacy_auth.TwoFAVerifyRequest
ChangePasswordRequest = legacy_auth.ChangePasswordRequest
ForceChangePasswordRequest = legacy_auth.ForceChangePasswordRequest


class RegisterRequest(legacy_auth.RegisterRequest):
    """Extended registration payload supporting optional role assignments."""

    role: Optional[str] = None
    brand_ids: Optional[list[int]] = None


class TokenResponse(legacy_auth.TokenResponse):
    """Token response that augments the legacy payload with metadata."""

    issued_at: datetime = Field(default_factory=datetime.utcnow)
    user: UserResponse


__all__ = [
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "RefreshTokenRequest",
    "TwoFASetupResponse",
    "TwoFAVerifyRequest",
    "ChangePasswordRequest",
    "ForceChangePasswordRequest",
]
