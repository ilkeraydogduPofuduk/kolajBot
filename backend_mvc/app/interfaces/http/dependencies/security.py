"""Security dependencies bridging legacy implementation."""
from __future__ import annotations

from backend.dependencies.auth import get_current_active_user  # type: ignore

__all__ = ["get_current_active_user"]
