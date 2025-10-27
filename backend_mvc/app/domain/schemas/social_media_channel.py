"""Social media channel schema exports that proxy the legacy definitions."""
from __future__ import annotations

from backend.schemas import social_media_channel as legacy_social_media_channel  # type: ignore

from ._legacy import expose

__all__ = expose(globals(), legacy_social_media_channel)
