"""Category schema exports that proxy the legacy definitions."""
from __future__ import annotations

from backend.schemas import category as legacy_category  # type: ignore

from ._legacy import expose

__all__ = expose(globals(), legacy_category)
