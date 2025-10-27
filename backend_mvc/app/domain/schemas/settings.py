"""Settings schema exports that proxy the legacy definitions."""
from __future__ import annotations

from backend.schemas import settings as legacy_settings  # type: ignore

from ._legacy import expose

__all__ = expose(globals(), legacy_settings)
