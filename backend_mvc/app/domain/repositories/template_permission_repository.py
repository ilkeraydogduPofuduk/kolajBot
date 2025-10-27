"""Template permission repository."""
from __future__ import annotations

from typing import Iterable

from sqlalchemy.orm import Session

from ..models import TemplatePermission
from .base_repository import Repository


class TemplatePermissionRepository(Repository[TemplatePermission]):
    model = TemplatePermission

    def __init__(self, session: Session) -> None:
        super().__init__(session)

    def list_for_template(self, template_id: int) -> Iterable[TemplatePermission]:
        return (
            self.session.query(TemplatePermission)
            .filter(TemplatePermission.template_id == template_id)
            .all()
        )
