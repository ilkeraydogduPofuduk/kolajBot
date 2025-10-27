"""Product repository."""
from __future__ import annotations

from typing import Iterable

from sqlalchemy.orm import Session

from ..models import Product
from .base_repository import Repository


class ProductRepository(Repository[Product]):
    model = Product

    def __init__(self, session: Session) -> None:
        super().__init__(session)

    def list_for_brand(self, brand_id: int) -> Iterable[Product]:
        return self.session.query(Product).filter(Product.brand_id == brand_id).all()
