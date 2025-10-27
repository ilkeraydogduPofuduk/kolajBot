"""Template schema exports that proxy the legacy definitions."""
from __future__ import annotations

from backend.schemas import template as legacy_template  # type: ignore

from ._legacy import expose

__all__ = expose(globals(), legacy_template)
