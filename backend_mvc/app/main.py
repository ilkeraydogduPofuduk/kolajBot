"""FastAPI application entry point."""
from __future__ import annotations

from .core.application import ApplicationBuilder

app = ApplicationBuilder().configure().build()
