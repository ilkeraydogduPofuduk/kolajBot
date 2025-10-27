"""Template repository."""
from __future__ import annotations

from typing import Iterable

from sqlalchemy.orm import Session

from ..models import Template
from .base_repository import Repository


class TemplateRepository(Repository[Template]):
    model = Template

    def __init__(self, session: Session) -> None:
        super().__init__(session)

    def list_for_user(self, user_id: int) -> Iterable[Template]:
        return self.session.query(Template).filter(Template.created_by == user_id).all()
