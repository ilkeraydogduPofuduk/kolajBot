"""Telegram discovery schema exports that proxy the legacy definitions."""
from __future__ import annotations

from backend.schemas import telegram_discovery as legacy_telegram_discovery  # type: ignore

from ._legacy import expose

__all__ = expose(globals(), legacy_telegram_discovery)
