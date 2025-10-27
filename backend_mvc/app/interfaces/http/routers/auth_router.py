"""Auth router."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request

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
from ..dependencies.services import get_auth_service
from ..dependencies.security import get_current_active_user
from ..controllers.auth_controller import AuthController

router = APIRouter(prefix="/auth", tags=["auth"])


def _controller(service=Depends(get_auth_service)) -> AuthController:
    return AuthController(service)


@router.post("/login", response_model=TokenResponse)
async def login(request: Request, payload: LoginRequest, controller: AuthController = Depends(_controller)):
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return controller.login(payload, ip, user_agent)


@router.post("/register")
async def register(request: Request, payload: RegisterRequest, controller: AuthController = Depends(_controller)):
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return controller.register(payload, ip, user_agent)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshTokenRequest, controller: AuthController = Depends(_controller)):
    return controller.refresh(payload)


@router.post("/setup-2fa", response_model=TwoFASetupResponse)
async def setup_2fa(current_user=Depends(get_current_active_user), controller: AuthController = Depends(_controller)):
    return controller.setup_2fa(current_user.id)


@router.post("/verify-2fa")
async def verify_2fa(payload: TwoFAVerifyRequest, current_user=Depends(get_current_active_user), controller: AuthController = Depends(_controller)):
    return controller.verify_2fa(current_user.id, payload)


@router.post("/disable-2fa")
async def disable_2fa(payload: TwoFAVerifyRequest, current_user=Depends(get_current_active_user), controller: AuthController = Depends(_controller)):
    return controller.disable_2fa(current_user.id, payload)


@router.post("/change-password")
async def change_password(payload: ChangePasswordRequest, current_user=Depends(get_current_active_user), controller: AuthController = Depends(_controller)):
    return controller.change_password(current_user.id, payload)


@router.post("/force-change-password")
async def force_change_password(payload: ForceChangePasswordRequest, current_user=Depends(get_current_active_user), controller: AuthController = Depends(_controller)):
    return controller.force_change_password(current_user.id, payload)


@router.post("/logout")
async def logout(controller: AuthController = Depends(_controller)):
    return controller.logout()


@router.get("/me")
async def current_user(controller: AuthController = Depends(_controller), current_user=Depends(get_current_active_user)):
    return controller.current_user(current_user)
