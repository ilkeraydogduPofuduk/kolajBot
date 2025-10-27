"""Telegram bot schema exports that proxy the legacy definitions."""
from __future__ import annotations

from backend.schemas import telegram_bot as legacy_telegram_bot  # type: ignore

from ._legacy import expose

__all__ = expose(globals(), legacy_telegram_bot)
