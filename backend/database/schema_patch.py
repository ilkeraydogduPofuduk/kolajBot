"""Database schema patching utilities.

This module applies idempotent alterations so that legacy deployments
match the expectations of the current codebase. It is intentionally
lightweight and only touches tables/columns that are known to differ
between older MySQL dumps and the ORM models.
"""

from __future__ import annotations

import logging
from typing import Dict

from sqlalchemy import text

import sys
import os
# Add the parent directory to sys.path to import database.py
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
import database

logger = logging.getLogger(__name__)


def _get_schema_name() -> str:
    db_name = database.engine.url.database
    if not db_name:
        raise RuntimeError("Database name could not be determined from engine URL")
    return db_name


def _table_engine(conn, table_name: str) -> str | None:
    result = conn.execute(
        text(
            """
            SELECT ENGINE
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table
            """
        ),
        {"schema": _get_schema_name(), "table": table_name},
    ).scalar()
    return result.upper() if result else None


def _ensure_innodb(conn, table_name: str) -> None:
    engine_name = _table_engine(conn, table_name)
    if engine_name and engine_name != "INNODB":
        logger.info("Converting %s to InnoDB (was %s)", table_name, engine_name)
        conn.execute(text(f"ALTER TABLE {table_name} ENGINE=InnoDB"))


def _column_exists(conn, table_name: str, column_name: str) -> bool:
    result = conn.execute(
        text(
            """
            SELECT COUNT(*)
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = :schema
              AND TABLE_NAME = :table
              AND COLUMN_NAME = :column
            """
        ),
        {"schema": _get_schema_name(), "table": table_name, "column": column_name},
    ).scalar()
    return bool(result)


def _ensure_column(conn, table: str, column: str, definition: str) -> None:
    if not _column_exists(conn, table, column):
        logger.info("Adding missing column %s.%s", table, column)
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}"))


def _ensure_columns(conn, table: str, definitions: Dict[str, str]) -> None:
    for column, definition in definitions.items():
        _ensure_column(conn, table, column, definition)


def _ensure_products_schema(conn) -> None:
    _ensure_innodb(conn, "products")
    product_columns = {
        "code": "VARCHAR(100) NULL AFTER name",
        "color": "VARCHAR(50) NULL AFTER code",
        "product_type": "VARCHAR(100) NULL AFTER color",
        "size_range": "VARCHAR(50) NULL AFTER product_type",
        "currency": "VARCHAR(10) NOT NULL DEFAULT 'USD' AFTER price",
        "code_2": "VARCHAR(100) NULL AFTER currency",
        "color_2": "VARCHAR(50) NULL AFTER code_2",
        "product_type_2": "VARCHAR(100) NULL AFTER color_2",
        "size_range_2": "VARCHAR(50) NULL AFTER product_type_2",
        "price_2": "DECIMAL(10,2) NULL AFTER size_range_2",
        "currency_2": "VARCHAR(10) NULL AFTER price_2",
        "ai_extracted_data": "JSON NULL AFTER specifications",
        "is_processed": "TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active",
        "telegram_sent": "TINYINT(1) NOT NULL DEFAULT 0 AFTER is_processed",
    }
    _ensure_columns(conn, "products", product_columns)


def _ensure_templates_schema(conn) -> None:
    _ensure_innodb(conn, "templates")
    _ensure_column(
        conn,
        "templates",
        "permissions",
        "JSON NULL AFTER assigned_brands",
    )


def _ensure_users_schema(conn) -> None:
    _ensure_innodb(conn, "users")
    user_columns = {
        "phone_number": "VARCHAR(20) NULL AFTER last_name",
        "brand_id": "INT NULL AFTER role_id",
        "brand_ids": "JSON NULL AFTER brand_id",
        "branch_id": "INT NULL AFTER brand_ids",
        "is_2fa_enabled": "TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active",
        "two_fa_secret": "VARCHAR(32) NULL AFTER is_2fa_enabled",
        "failed_login_attempts": "INT NOT NULL DEFAULT 0 AFTER two_fa_secret",
        "locked_until": "DATETIME NULL AFTER failed_login_attempts",
    }
    _ensure_columns(conn, "users", user_columns)


def apply_schema_fixes() -> None:
    """Apply idempotent schema adjustments required by the application."""
    try:
        with database.engine.connect() as conn:
            trans = conn.begin()
            _ensure_users_schema(conn)
            _ensure_products_schema(conn)
            _ensure_templates_schema(conn)
            trans.commit()
            logger.info("Database schema checks completed")
    except Exception as exc:
        logger.exception("Schema patching failed: %s", exc)
        raise
