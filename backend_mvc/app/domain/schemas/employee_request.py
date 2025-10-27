"""Employee request schema exports that proxy the legacy definitions."""
from __future__ import annotations

from backend.schemas import employee_request as legacy_employee_request  # type: ignore

from ._legacy import expose

__all__ = expose(globals(), legacy_employee_request)
