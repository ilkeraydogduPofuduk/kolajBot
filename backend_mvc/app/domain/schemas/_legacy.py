"""Helpers for exposing legacy Pydantic schemas."""
from __future__ import annotations

from types import ModuleType
from typing import Iterable, List


def expose(globals_dict: dict[str, object], module: ModuleType, include: Iterable[str] | None = None) -> List[str]:
    """Populate ``globals_dict`` with classes from a legacy schema module."""

    if include is None:
        if hasattr(module, "__all__"):
            names = list(module.__all__)  # type: ignore[attr-defined]
        else:
            names = [
                name
                for name, value in vars(module).items()
                if isinstance(value, type)
            ]
    else:
        names = list(include)

    for name in names:
        globals_dict[name] = getattr(module, name)

    return names
