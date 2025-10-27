"""Database infrastructure module bridging the legacy engine."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

from backend.database import (  # type: ignore
    Base as LegacyBase,
    SessionLocal as LegacySessionLocal,
    create_tables as legacy_create_tables,
    engine as legacy_engine,
)

# Re-export the legacy engine and session factory so the new MVC layer
# collaborates with the original infrastructure instead of duplicating it.
engine = legacy_engine
SessionLocal = LegacySessionLocal
Base = LegacyBase


def get_session() -> Generator:
    """FastAPI dependency for a database session."""

    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@contextmanager
def session_scope() -> Generator:
    """Provide a transactional scope around a series of operations."""

    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def create_all_tables() -> None:
    """Create database tables using the legacy metadata."""

    # Ensure the legacy models are imported so metadata is populated.
    from ..domain import models  # noqa: F401

    legacy_create_tables()
