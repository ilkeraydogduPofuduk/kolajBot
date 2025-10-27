"""Auth controller using service layer."""
from __future__ import annotations

from fastapi import HTTPException, status

from ...application.services.auth_service import AuthService
from ...domain.schemas.auth import (
    ChangePasswordRequest,
    ForceChangePasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
    TwoFASetupResponse,
    TwoFAVerifyRequest,
)


class AuthController:
    def __init__(self, service: AuthService) -> None:
        self.service = service

    def login(self, request: LoginRequest, ip: str | None, user_agent: str | None) -> TokenResponse:
        try:
            return self.service.login(request, ip, user_agent)
        except ValueError as exc:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    def register(self, request: RegisterRequest, ip: str | None, user_agent: str | None) -> dict:
        try:
            return self.service.register(request, ip, user_agent)
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    def refresh(self, request: RefreshTokenRequest) -> TokenResponse:
        try:
            return self.service.refresh(request.refresh_token)
        except ValueError as exc:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    def setup_2fa(self, user_id: int) -> TwoFASetupResponse:
        try:
            return self.service.setup_2fa(user_id)
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    def verify_2fa(self, user_id: int, request: TwoFAVerifyRequest) -> dict:
        try:
            message = self.service.verify_2fa(user_id, request)
            return {"message": message}
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    def disable_2fa(self, user_id: int, request: TwoFAVerifyRequest) -> dict:
        try:
            message = self.service.disable_2fa(user_id, request)
            return {"message": message}
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    def change_password(self, user_id: int, request: ChangePasswordRequest) -> dict:
        try:
            message = self.service.change_password(user_id, request)
            return {"message": message}
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    def force_change_password(self, user_id: int, request: ForceChangePasswordRequest) -> dict:
        try:
            message = self.service.force_change_password(user_id, request)
            return {"message": message}
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    def logout(self) -> dict:
        return {"message": "Logout successful"}

    def current_user(self, user) -> dict:
        return self.service.build_user_payload(user)
