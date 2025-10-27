"""KolajBot MVC application package."""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover - import only used for typing help
    from fastapi import FastAPI

    from .main import app as fastapi_app

__all__ = ["app"]


def __getattr__(name: str):  # pragma: no cover - thin proxy
    if name == "app":
        from .main import app as fastapi_app

        return fastapi_app
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
