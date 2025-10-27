"""Unit tests for the MVC auth service facade."""
from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

import pytest

pytest.importorskip("pydantic")

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend_mvc.app.application.services.auth_service import AuthService
from backend_mvc.app.domain.schemas.auth import LoginRequest


class LegacyAuthStub:
    """Lightweight stub that mimics the legacy auth service API."""

    def __init__(self) -> None:
        self.login_response = self._success_response()
        self.permissions = ["brands:view", "products:list"]

    @staticmethod
    def _user_payload() -> dict:
        now = datetime.utcnow()
        return {
            "id": 1,
            "email": "user@example.com",
            "first_name": "Test",
            "last_name": "User",
            "phone_number": None,
            "role_id": 2,
            "role": "Admin",
            "brand_ids": [1, 2],
            "is_active": True,
            "is_2fa_enabled": False,
            "must_change_password": False,
            "last_login": None,
            "created_at": now.isoformat(),
            "updated_at": (now + timedelta(minutes=5)).isoformat(),
        }

    @classmethod
    def _success_response(cls) -> tuple[dict, str]:
        return (
            {
                "access_token": "access-token",
                "refresh_token": "refresh-token",
                "token_type": "bearer",
                "expires_in": 3600,
                "user": cls._user_payload(),
            },
            "OK",
        )

    def login(self, *_args, **_kwargs):
        return self.login_response

    def refresh_token(self, _refresh_token: str):
        return self._success_response()

    def register(self, *_args, **_kwargs):
        return ({"message": "registered"}, "Registered")

    def setup_2fa(self, _user_id: int):
        return ({"qr_code_url": "http://qr", "secret": "SECRET"}, "Setup")

    def verify_2fa_setup(self, _user_id: int, code: str):
        return (code == "123456", "Verified" if code == "123456" else "Invalid")

    def disable_2fa(self, user_id: int, code: str):
        return self.verify_2fa_setup(user_id, code)

    def change_password(self, *_args, **_kwargs):
        return (True, "Changed")

    def force_change_password(self, *_args, **_kwargs):
        return (True, "Changed")

    def get_user_permissions(self, _user_id: int):
        return self.permissions


def test_login_success_returns_token_response():
    legacy = LegacyAuthStub()
    service = AuthService(session=SimpleNamespace(), legacy_service=legacy)

    result = service.login(
        LoginRequest(email="user@example.com", password="password123"),
        ip="127.0.0.1",
        user_agent="pytest",
    )

    assert result.access_token == "access-token"
    assert result.refresh_token == "refresh-token"
    assert result.user.email == "user@example.com"
    assert result.issued_at <= datetime.utcnow()


def test_login_failure_raises_value_error():
    legacy = LegacyAuthStub()
    legacy.login_response = (None, "Invalid credentials")
    service = AuthService(session=SimpleNamespace(), legacy_service=legacy)

    with pytest.raises(ValueError) as exc:
        service.login(
            LoginRequest(email="bad@example.com", password="wrong"),
            ip=None,
            user_agent=None,
        )

    assert "Invalid credentials" in str(exc.value)


def test_build_user_payload_includes_permissions():
    legacy = LegacyAuthStub()
    user = SimpleNamespace(
        id=1,
        email="user@example.com",
        first_name="Test",
        last_name="User",
        phone_number="5550000",
        role_id=2,
        role_display_name="Admin",
        brand_ids=[1],
        is_active=True,
        is_2fa_enabled=True,
        must_change_password=False,
        last_login=datetime(2024, 1, 1, 12, 0, 0),
        created_at=datetime(2023, 12, 31, 8, 30, 0),
    )

    service = AuthService(session=SimpleNamespace(), legacy_service=legacy)
    payload = service.build_user_payload(user)

    assert payload["permissions"] == legacy.permissions
    assert payload["role"] == "Admin"
    assert payload["is_2fa_enabled"] is True
