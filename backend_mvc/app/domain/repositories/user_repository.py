"""User repository."""
from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from ..models import User
from .base_repository import Repository


class UserRepository(Repository[User]):
    model = User

    def __init__(self, session: Session) -> None:
        super().__init__(session)

    def get_by_email(self, email: str) -> Optional[User]:
        return self.session.query(User).filter(User.email == email).first()
