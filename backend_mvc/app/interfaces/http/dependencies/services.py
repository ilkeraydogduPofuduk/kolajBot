"""Service dependencies."""
from __future__ import annotations

from fastapi import Depends
from sqlalchemy.orm import Session

from ...application.services.auth_service import AuthService
from .database import get_db_session


def get_auth_service(session: Session = Depends(get_db_session)) -> AuthService:
    return AuthService(session)
