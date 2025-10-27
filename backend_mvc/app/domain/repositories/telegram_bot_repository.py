"""Telegram bot repository."""
from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from ..models import TelegramBot
from .base_repository import Repository


class TelegramBotRepository(Repository[TelegramBot]):
    model = TelegramBot

    def __init__(self, session: Session) -> None:
        super().__init__(session)

    def get_by_username(self, username: str) -> Optional[TelegramBot]:
        return self.session.query(TelegramBot).filter(TelegramBot.bot_username == username).first()
