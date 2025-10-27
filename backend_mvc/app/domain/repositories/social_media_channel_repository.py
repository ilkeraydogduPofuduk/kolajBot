"""Social media channel repository."""
from __future__ import annotations

from typing import Iterable

from sqlalchemy.orm import Session

from ..models import SocialMediaChannel
from .base_repository import Repository


class SocialMediaChannelRepository(Repository[SocialMediaChannel]):
    model = SocialMediaChannel

    def __init__(self, session: Session) -> None:
        super().__init__(session)

    def list_for_brand(self, brand_id: int) -> Iterable[SocialMediaChannel]:
        return (
            self.session.query(SocialMediaChannel)
            .filter(SocialMediaChannel.brand_id == brand_id)
            .all()
        )
