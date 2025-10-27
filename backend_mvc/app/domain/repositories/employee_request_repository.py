"""Employee request repository."""
from __future__ import annotations

from typing import Iterable

from sqlalchemy.orm import Session

from ..models import EmployeeRequest, RequestStatus
from .base_repository import Repository


class EmployeeRequestRepository(Repository[EmployeeRequest]):
    model = EmployeeRequest

    def __init__(self, session: Session) -> None:
        super().__init__(session)

    def list_by_status(self, status: RequestStatus) -> Iterable[EmployeeRequest]:
        return self.session.query(EmployeeRequest).filter(EmployeeRequest.status == status).all()
