"""Product schema exports that proxy the legacy definitions."""
from __future__ import annotations

from backend.schemas import product as legacy_product  # type: ignore

from ._legacy import expose

__all__ = expose(globals(), legacy_product)
