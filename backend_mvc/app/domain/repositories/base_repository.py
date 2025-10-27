"""Generic repository base class."""
from __future__ import annotations

from typing import Generic, Iterable, Optional, Type, TypeVar

from sqlalchemy.orm import Session

from ..models import Base

TModel = TypeVar("TModel", bound=Base)


class Repository(Generic[TModel]):
    """Generic repository implementing basic CRUD operations."""

    model: Type[TModel]

    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, object_id: int) -> Optional[TModel]:
        return self.session.get(self.model, object_id)

    def list(self) -> Iterable[TModel]:
        return self.session.query(self.model).all()

    def add(self, instance: TModel) -> TModel:
        self.session.add(instance)
        return instance

    def delete(self, instance: TModel) -> None:
        self.session.delete(instance)

    def flush(self) -> None:
        self.session.flush()

    def commit(self) -> None:
        self.session.commit()

    def refresh(self, instance: TModel) -> TModel:
        self.session.refresh(instance)
        return instance
