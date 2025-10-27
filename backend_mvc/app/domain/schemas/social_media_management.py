"""Social media management schema exports that proxy the legacy definitions."""
from __future__ import annotations

from backend.schemas import social_media_management as legacy_social_media_management  # type: ignore

from ._legacy import expose

__all__ = expose(globals(), legacy_social_media_management)
