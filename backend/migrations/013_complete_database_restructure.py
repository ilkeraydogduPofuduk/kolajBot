"""
Migration 013: Complete Database Restructure
- Fix templates table to match model (remove group_id, add product_id, brand_id, etc.)
- Add missing columns to brands table (category_id, product_count, template_count, last_upload_at)
- Remove unnecessary tables (template_groups, indexing_logs, seo_data, seo_metadata, sitemap_entries)
- Clean up and optimize database structure
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
    """Complete database restructure"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        print("Migration 013: Complete Database Restructure")
        print("=" * 60)

        # =================================================================
        # STEP 1: Add missing columns to brands table
        # =================================================================
        print("\n[STEP 1] Adding missing columns to brands table...")

        missing_brand_columns = [
            ("category_id", "INT NULL AFTER name"),
            ("product_count", "INT DEFAULT 0 AFTER category_id"),
            ("template_count", "INT DEFAULT 0 AFTER product_count"),
            ("last_upload_at", "DATETIME NULL AFTER template_count"),
        ]

        for col_name, col_def in missing_brand_columns:
            try:
                cursor.execute(f"ALTER TABLE brands ADD COLUMN {col_name} {col_def}")
                print(f"  [OK] Added {col_name} to brands")
            except Exception as e:
                print(f"  [SKIP] {col_name} already exists: {e}")

        # =================================================================
        # STEP 2: Fix templates table structure
        # =================================================================
        print("\n[STEP 2] Fixing templates table structure...")

        # Remove group_id column
        try:
            cursor.execute("ALTER TABLE templates DROP COLUMN group_id")
            print("  [OK] Removed group_id from templates")
        except Exception as e:
            print(f"  [SKIP] group_id already removed: {e}")

        # Add missing columns to templates
        template_columns_to_add = [
            ("product_id", "INT NOT NULL AFTER description"),
            ("brand_id", "INT NOT NULL AFTER product_id"),
            ("thumbnail", "VARCHAR(500) NULL AFTER template_data"),
            ("is_auto_generated", "TINYINT(1) DEFAULT 0 AFTER is_active"),
            ("is_master_template", "TINYINT(1) DEFAULT 0 AFTER is_auto_generated"),
            ("visibility", "VARCHAR(20) DEFAULT 'PRIVATE' AFTER is_master_template"),
            ("placeholders", "JSON NULL AFTER visibility"),
            ("assigned_brands", "JSON NULL AFTER placeholders"),
        ]

        for col_name, col_def in template_columns_to_add:
            try:
                cursor.execute(f"ALTER TABLE templates ADD COLUMN {col_name} {col_def}")
                print(f"  [OK] Added {col_name} to templates")
            except Exception as e:
                print(f"  [SKIP] {col_name} already exists: {e}")

        # Update existing template data to have default values
        cursor.execute("""
            UPDATE templates
            SET product_id = 1, brand_id = 1
            WHERE product_id IS NULL OR brand_id IS NULL
        """)
        print("  [OK] Set default product_id and brand_id for existing templates")

        # =================================================================
        # STEP 3: Add foreign keys for templates
        # =================================================================
        print("\n[STEP 3] Adding foreign keys to templates...")

        fk_constraints = [
            ("fk_templates_product", "templates", "product_id", "products", "id", "CASCADE"),
            ("fk_templates_brand", "templates", "brand_id", "brands", "id", "CASCADE"),
            ("fk_templates_creator", "templates", "created_by", "users", "id", "RESTRICT"),
        ]

        for constraint_name, table, column, ref_table, ref_column, on_delete in fk_constraints:
            try:
                cursor.execute(f"""
                    ALTER TABLE {table}
                    ADD CONSTRAINT {constraint_name}
                    FOREIGN KEY ({column}) REFERENCES {ref_table}({ref_column})
                    ON DELETE {on_delete}
                """)
                print(f"  [OK] Added FK {constraint_name}")
            except Exception as e:
                print(f"  [SKIP] FK {constraint_name} already exists: {e}")

        # =================================================================
        # STEP 4: Add foreign key for brands.category_id
        # =================================================================
        print("\n[STEP 4] Adding foreign key to brands.category_id...")

        try:
            cursor.execute("""
                ALTER TABLE brands
                ADD CONSTRAINT fk_brands_category
                FOREIGN KEY (category_id) REFERENCES categories(id)
                ON DELETE SET NULL
            """)
            print("  [OK] Added FK fk_brands_category")
        except Exception as e:
            print(f"  [SKIP] FK already exists: {e}")

        # =================================================================
        # STEP 5: Remove unnecessary tables
        # =================================================================
        print("\n[STEP 5] Removing unnecessary tables...")

        tables_to_remove = [
            "template_groups",
            "indexing_logs",
            "seo_data",
            "seo_metadata",
            "sitemap_entries"
        ]

        for table in tables_to_remove:
            try:
                cursor.execute(f"DROP TABLE IF EXISTS {table}")
                print(f"  [OK] Dropped table {table}")
            except Exception as e:
                print(f"  [SKIP] Could not drop {table}: {e}")

        # =================================================================
        # STEP 6: Update template permissions structure
        # =================================================================
        print("\n[STEP 6] Updating template permissions...")

        # Ensure template_permissions table has correct structure
        try:
            cursor.execute("DESCRIBE template_permissions")
            columns = cursor.fetchall()
            col_names = [col['Field'] for col in columns]

            if 'template_id' not in col_names:
                cursor.execute("""
                    ALTER TABLE template_permissions
                    ADD COLUMN template_id INT NOT NULL AFTER id,
                    ADD COLUMN brand_id INT NOT NULL AFTER template_id
                """)
                print("  [OK] Added missing columns to template_permissions")
        except Exception as e:
            print(f"  [SKIP] template_permissions structure issue: {e}")

        # =================================================================
        # STEP 7: Clean up and optimize
        # =================================================================
        print("\n[STEP 7] Final cleanup and optimization...")

        # Update brand statistics
        try:
            cursor.execute("""
                UPDATE brands b
                SET product_count = COALESCE((
                    SELECT COUNT(*) FROM products p WHERE p.brand_id = b.id
                ), 0),
                template_count = COALESCE((
                    SELECT COUNT(*) FROM templates t WHERE t.brand_id = b.id
                ), 0),
                last_upload_at = (
                    SELECT MAX(created_at) FROM products p WHERE p.brand_id = b.id
                )
            """)
            print("  [OK] Updated brand statistics")
        except Exception as e:
            print(f"  [WARNING] Could not update brand statistics: {e}")

        conn.commit()
        print("\n[SUCCESS] Migration 013 completed successfully!")
        print("=" * 60)
        print("Changes made:")
        print("  ✓ Added missing columns to brands table")
        print("  ✓ Fixed templates table structure")
        print("  ✓ Added foreign key constraints")
        print("  ✓ Removed unnecessary tables")
        print("  ✓ Updated brand statistics")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def downgrade():
    """Rollback - restore removed tables and columns"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        print("Rolling back migration 013...")

        # Recreate removed tables (empty)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS template_groups (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(191) UNIQUE NOT NULL,
                description TEXT,
                category VARCHAR(50),
                is_active TINYINT(1),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS indexing_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                url VARCHAR(500) NOT NULL,
                submission_type VARCHAR(50) NOT NULL,
                submission_method VARCHAR(50) NOT NULL,
                status VARCHAR(50) NOT NULL,
                google_response_code VARCHAR(10),
                google_response_message TEXT,
                response_data JSON,
                entity_type VARCHAR(50),
                entity_id INT,
                submission_date DATETIME,
                indexed_date DATETIME,
                last_checked DATETIME,
                retry_count INT,
                max_retries INT,
                INDEX idx_entity (entity_type, entity_id)
            )
        """)

        # Note: Not recreating seo_data, seo_metadata, sitemap_entries as they were not critical

        # Remove added columns
        columns_to_remove = [
            "brands.category_id",
            "brands.product_count",
            "brands.template_count",
            "brands.last_upload_at",
            "templates.product_id",
            "templates.brand_id",
            "templates.thumbnail",
            "templates.is_auto_generated",
            "templates.is_master_template",
            "templates.visibility",
            "templates.placeholders",
            "templates.assigned_brands"
        ]

        for col_spec in columns_to_remove:
            table, column = col_spec.split('.')
            try:
                cursor.execute(f"ALTER TABLE {table} DROP COLUMN {column}")
                print(f"  ✓ Removed {column} from {table}")
            except Exception as e:
                print(f"  ⚠ Could not remove {column} from {table}: {e}")

        # Add back group_id to templates
        try:
            cursor.execute("ALTER TABLE templates ADD COLUMN group_id INT NOT NULL AFTER description")
            print("  ✓ Restored group_id to templates")
        except Exception as e:
            print(f"  ⚠ Could not restore group_id: {e}")

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
    print("Running migration: Complete Database Restructure")
    try:
        upgrade()
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise
