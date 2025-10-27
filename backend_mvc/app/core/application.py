"""Application builder for the new MVC architecture."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from .config import settings
from ..interfaces.http.routers.auth_router import router as auth_router


class ApplicationBuilder:
    """Factory responsible for creating the FastAPI application."""

    def __init__(self) -> None:
        from backend.main import lifespan as legacy_lifespan  # type: ignore

        self._app = FastAPI(
            title="KolajBot Platform API",
            description="Rebuilt MVC backend",
            version="2.0.0",
            lifespan=legacy_lifespan,
        )

    def configure(self) -> "ApplicationBuilder":
        self._configure_middleware()
        self._register_routes()
        return self

    def _configure_middleware(self) -> None:
        self._app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.allowed_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        self._app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=["*"],
        )

    def _register_routes(self) -> None:
        self._app.include_router(auth_router)
        self._register_legacy_routes()

    def _register_legacy_routes(self) -> None:
        from backend.api import (  # type: ignore
            ai_templates,
            brands,
            categories,
            collages,
            dynamic_templates,
            employee_requests,
            label_extraction,
            performance_monitor,
            price_extraction,
            products_enterprise,
            roles,
            settings as settings_api,
            social_media_channels,
            social_media_messages,
            system,
            telegram_bots,
            users,
        )

        legacy_modules = [
            ai_templates,
            brands,
            categories,
            collages,
            dynamic_templates,
            employee_requests,
            label_extraction,
            performance_monitor,
            price_extraction,
            products_enterprise,
            roles,
            settings_api,
            social_media_channels,
            social_media_messages,
            system,
            telegram_bots,
            users,
        ]

        for module in legacy_modules:
            if hasattr(module, "router"):
                self._app.include_router(module.router)

    def build(self) -> FastAPI:
        return self._app
