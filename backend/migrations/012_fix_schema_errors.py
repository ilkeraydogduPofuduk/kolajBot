"""
Migration 012: Fix Schema Errors
- Add missing is_active column to settings table
- Rename phone to phone_number in users table or add phone_number column
"""
import pymysql
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from config.settings import settings

def get_connection():
    """MySQL bağlantısı"""
    # Parse DATABASE_URL
    url = settings.DATABASE_URL.replace('mysql+pymysql://', '')

    if '@' in url:
        auth, rest = url.split('@')
        if ':' in auth:
            user, password = auth.split(':')
        else:
            user, password = auth, ''

        if '/' in rest:
            host_port, database = rest.split('/')
            if ':' in host_port:
                host, port = host_port.split(':')
                port = int(port)
            else:
                host, port = host_port, 3306
        else:
            host, port, database = 'localhost', 3306, rest
    else:
        user, password, host, port, database = 'root', '', 'localhost', 3306, url.split('/')[-1]

    return pymysql.connect(
        host=host,
        user=user,
        password=password,
        database=database,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

def upgrade():
    """Add missing columns"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        print("Migration 012: Fixing schema errors...")

        # 1. Add is_active column to settings table (if not exists)
        print("  Checking/adding is_active column to settings table...")
        try:
            cursor.execute("""
                ALTER TABLE settings
                ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER is_public
            """)
            print("  [OK] Added is_active column to settings")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("  [SKIP] is_active column already exists in settings")
            else:
                raise

        # 2. Add phone_number column to users table (keep phone column for backward compatibility)
        print("  Adding phone_number column to users table...")
        cursor.execute("""
            ALTER TABLE users
            ADD COLUMN phone_number VARCHAR(20) NULL AFTER last_name
        """)
        print("  [OK] Added phone_number column to users")

        # 3. Copy data from phone to phone_number if phone exists
        print("  Migrating phone data to phone_number...")
        cursor.execute("""
            UPDATE users
            SET phone_number = phone
            WHERE phone IS NOT NULL AND phone != ''
        """)
        print("  [OK] Migrated phone data")

        # 4. Add other missing columns to users table
        print("  Adding other missing columns to users table...")

        # Add missing columns that are in the model
        missing_user_columns = [
            ("brand_id", "INT NULL AFTER role_id"),
            ("brand_ids", "JSON NULL AFTER brand_id"),
            ("branch_id", "INT NULL AFTER brand_ids"),
            ("is_2fa_enabled", "BOOLEAN DEFAULT FALSE AFTER is_active"),
            ("two_fa_secret", "VARCHAR(32) NULL AFTER is_2fa_enabled"),
            ("failed_login_attempts", "INT DEFAULT 0 AFTER two_fa_secret"),
            ("locked_until", "DATETIME NULL AFTER failed_login_attempts"),
        ]

        for col_name, col_def in missing_user_columns:
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")
                print(f"  [OK] Added {col_name} column to users")
            except Exception as e:
                print(f"  [WARNING] Column {col_name} might already exist: {e}")

        # 5. Add missing columns to settings table
        print("  Adding other missing columns to settings table...")
        missing_settings_columns = [
            ("is_sensitive", "BOOLEAN DEFAULT FALSE AFTER is_active"),
            ("created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP AFTER updated_at"),
        ]

        for col_name, col_def in missing_settings_columns:
            try:
                cursor.execute(f"ALTER TABLE settings ADD COLUMN {col_name} {col_def}")
                print(f"  [OK] Added {col_name} column to settings")
            except Exception as e:
                print(f"  [WARNING] Column {col_name} might already exist: {e}")

        conn.commit()
        print("[SUCCESS] Migration 012 completed successfully")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Error in migration 012: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def downgrade():
    """Remove added columns (rollback)"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        print("Rolling back migration 012...")

        # Remove added columns
        columns_to_remove = [
            "settings.is_active",
            "settings.is_sensitive",
            "settings.created_at",
            "users.phone_number",
            "users.brand_id",
            "users.brand_ids",
            "users.branch_id",
            "users.is_2fa_enabled",
            "users.two_fa_secret",
            "users.failed_login_attempts",
            "users.locked_until"
        ]

        for col in columns_to_remove:
            table, column = col.split('.')
            try:
                cursor.execute(f"ALTER TABLE {table} DROP COLUMN {column}")
                print(f"  ✓ Removed {column} from {table}")
            except Exception as e:
                print(f"  ⚠ Could not remove {column} from {table}: {e}")

        conn.commit()
        print("✓ Rollback completed")

    except Exception as e:
        conn.rollback()
        print(f"✗ Error during rollback: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("Running migration: Fix Schema Errors")
    try:
        upgrade()
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise
