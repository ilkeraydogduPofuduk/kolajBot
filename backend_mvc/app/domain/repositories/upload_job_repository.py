"""Upload job repository."""
from __future__ import annotations

from typing import Iterable

from sqlalchemy.orm import Session

from ..models import UploadJob
from .base_repository import Repository


class UploadJobRepository(Repository[UploadJob]):
    model = UploadJob

    def __init__(self, session: Session) -> None:
        super().__init__(session)

    def list_for_brand(self, brand_id: int) -> Iterable[UploadJob]:
        return self.session.query(UploadJob).filter(UploadJob.brand_id == brand_id).all()
