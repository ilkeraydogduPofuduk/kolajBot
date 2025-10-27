"""Category repository."""
from __future__ import annotations

from sqlalchemy.orm import Session

from ..models import Category
from .base_repository import Repository


class CategoryRepository(Repository[Category]):
    model = Category

    def __init__(self, session: Session) -> None:
        super().__init__(session)
