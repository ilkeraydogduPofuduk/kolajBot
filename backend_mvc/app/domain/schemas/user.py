"""User schemas bridging the legacy definitions with MVC extensions."""
from __future__ import annotations

from typing import List

from pydantic import Field

from backend.schemas import user as legacy_user  # type: ignore

UserCreate = legacy_user.UserCreate
UserUpdate = legacy_user.UserUpdate
UserPasswordUpdate = legacy_user.UserPasswordUpdate


class UserResponse(legacy_user.UserResponse):
    """Extended user response that exposes permission metadata."""

    permissions: List[str] = Field(default_factory=list)


class UserListResponse(legacy_user.UserListResponse):
    """Ensure the user list payload utilises the extended response model."""

    users: List[UserResponse]


__all__ = [
    "UserCreate",
    "UserUpdate",
    "UserPasswordUpdate",
    "UserResponse",
    "UserListResponse",
]
