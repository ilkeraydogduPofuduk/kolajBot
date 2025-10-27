"""Role repository."""
from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from ..models import Role
from .base_repository import Repository


class RoleRepository(Repository[Role]):
    model = Role

    def __init__(self, session: Session) -> None:
        super().__init__(session)

    def get_by_name(self, name: str) -> Optional[Role]:
        return self.session.query(Role).filter(Role.name == name).first()
