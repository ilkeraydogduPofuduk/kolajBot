"""Permission repository."""
from __future__ import annotations

from typing import Iterable

from sqlalchemy.orm import Session

from ..models import Permission
from .base_repository import Repository


class PermissionRepository(Repository[Permission]):
    model = Permission

    def __init__(self, session: Session) -> None:
        super().__init__(session)

    def list_by_module(self, module: str) -> Iterable[Permission]:
        return self.session.query(Permission).filter(Permission.module == module).all()
