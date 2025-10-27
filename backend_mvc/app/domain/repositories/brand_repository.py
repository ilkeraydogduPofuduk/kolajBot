"""Brand repository."""
from __future__ import annotations

from typing import Iterable

from sqlalchemy.orm import Session

from ..models import Brand
from .base_repository import Repository


class BrandRepository(Repository[Brand]):
    model = Brand

    def __init__(self, session: Session) -> None:
        super().__init__(session)

    def list_active(self) -> Iterable[Brand]:
        return self.session.query(Brand).filter(Brand.is_active.is_(True)).all()
