"""Social media message repository."""
from __future__ import annotations

from typing import Iterable

from sqlalchemy.orm import Session

from ..models import SocialMediaMessage
from .base_repository import Repository


class SocialMediaMessageRepository(Repository[SocialMediaMessage]):
    model = SocialMediaMessage

    def __init__(self, session: Session) -> None:
        super().__init__(session)

    def list_for_channel(self, channel_id: int) -> Iterable[SocialMediaMessage]:
        return (
            self.session.query(SocialMediaMessage)
            .filter(SocialMediaMessage.channel_id == channel_id)
            .all()
        )
