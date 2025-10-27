"""Database dependency for HTTP layer."""
from __future__ import annotations

from typing import Generator

from ...infrastructure.database import get_session


def get_db_session() -> Generator:
    yield from get_session()
