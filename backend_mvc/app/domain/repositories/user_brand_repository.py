"""User-brand repository."""
from __future__ import annotations

from typing import Iterable

from sqlalchemy.orm import Session

from ..models import UserBrand
from .base_repository import Repository


class UserBrandRepository(Repository[UserBrand]):
    model = UserBrand

    def __init__(self, session: Session) -> None:
        super().__init__(session)

    def list_for_user(self, user_id: int) -> Iterable[UserBrand]:
        return self.session.query(UserBrand).filter(UserBrand.user_id == user_id).all()
