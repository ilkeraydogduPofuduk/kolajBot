"""AI templates schema exports that proxy the legacy definitions."""
from __future__ import annotations

from backend.schemas import ai_templates as legacy_ai_templates  # type: ignore

from ._legacy import expose

__all__ = expose(globals(), legacy_ai_templates)
