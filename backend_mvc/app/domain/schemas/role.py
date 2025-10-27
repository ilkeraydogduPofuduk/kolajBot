"""Role schema exports that proxy the legacy definitions."""
from __future__ import annotations

from backend.schemas import role as legacy_role  # type: ignore

from ._legacy import expose

__all__ = expose(globals(), legacy_role)
