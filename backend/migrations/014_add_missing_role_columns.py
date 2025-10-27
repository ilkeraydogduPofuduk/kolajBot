"""
Migration 014: Add Missing Role Columns
Add is_active and is_system_role columns to roles table
"""
import pymysql
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from config.settings import settings

def get_connection():
    """MySQL bağlantısı"""
    url = settings.DATABASE_URL.replace('mysql+pymysql://', '')
    user, password = url.split('@')[0].split(':')
    host_port, database = url.split('@')[1].split('/')
    host, port = host_port.split(':')

    return pymysql.connect(
        host=host,
        user=user,
        password=password,
        database=database,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

def upgrade():
    """Add missing columns to roles table"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        print("Migration 014: Add Missing Role Columns")
        print("=" * 50)

        # Add missing columns to roles table
        columns_to_add = [
            ("is_active", "TINYINT(1) DEFAULT 1 AFTER description"),
            ("is_system_role", "TINYINT(1) DEFAULT 0 AFTER is_active"),
            ("updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at")
        ]

        for col_name, col_def in columns_to_add:
            try:
                cursor.execute(f"ALTER TABLE roles ADD COLUMN {col_name} {col_def}")
                print(f"  [OK] Added {col_name} to roles")
            except Exception as e:
                if "Duplicate column name" in str(e):
                    print(f"  [SKIP] {col_name} already exists in roles")
                else:
                    print(f"  [ERROR] Failed to add {col_name}: {e}")

        conn.commit()
        print("[SUCCESS] Migration 014 completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def downgrade():
    """Remove added columns"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        print("Rolling back migration 014...")

        columns_to_remove = ["roles.is_active", "roles.is_system_role", "roles.updated_at"]

        for col_spec in columns_to_remove:
            table, column = col_spec.split('.')
            try:
                cursor.execute(f"ALTER TABLE {table} DROP COLUMN {column}")
                print(f"  ✓ Removed {column} from {table}")
            except Exception as e:
                print(f"  ⚠ Could not remove {column} from {table}: {e}")

        conn.commit()
        print("[SUCCESS] Rollback completed")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Rollback failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("Running migration: Add Missing Role Columns")
    try:
        upgrade()
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise
