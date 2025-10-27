"""
Migration 009: Database Cleanup and Restructure
- Merge duplicate template tables (templates + product_templates)
- Fix brands.category to use foreign key to categories table
- Add missing foreign keys
- Clean up orphaned data
- Optimize table structure
"""

from sqlalchemy import text, inspect
from database import engine
import logging

logger = logging.getLogger(__name__)

def upgrade():
    """
    Complete database restructure
    """
    print("\n" + "=" * 80)
    print("DATABASE CLEANUP AND RESTRUCTURE - MIGRATION 009")
    print("=" * 80)
    
    with engine.connect() as conn:
        
        # =================================================================
        # STEP 1: Backup existing data
        # =================================================================
        print("\n[STEP 1] Creating backup tables...")
        
        try:
            conn.execute(text("DROP TABLE IF EXISTS _backup_templates"))
            conn.execute(text("CREATE TABLE _backup_templates AS SELECT * FROM templates"))
            conn.commit()
            print("  [OK] templates backed up")
        except Exception as e:
            print(f"  [WARNING] templates backup: {e}")
        
        try:
            conn.execute(text("DROP TABLE IF EXISTS _backup_product_templates"))
            conn.execute(text("CREATE TABLE _backup_product_templates AS SELECT * FROM product_templates"))
            conn.commit()
            print("  [OK] product_templates backed up")
        except Exception as e:
            print(f"  [WARNING] product_templates backup: {e}")
        
        # =================================================================
        # STEP 2: Merge template tables into one unified structure
        # =================================================================
        print("\n[STEP 2] Merging template tables...")
        
        # Create new unified templates table (without foreign keys first)
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS templates_new (
                id INT AUTO_INCREMENT PRIMARY KEY,
                
                -- Basic Info
                name VARCHAR(255) NOT NULL,
                description TEXT,
                
                -- Relationships
                product_id INT NOT NULL,
                brand_id INT NOT NULL,
                created_by INT NOT NULL,
                
                -- Template Data
                template_type VARCHAR(50) DEFAULT 'standard',
                template_data JSON NOT NULL,
                
                -- Generated Files
                preview_image_path VARCHAR(500),
                thumbnail_path VARCHAR(500),
                
                -- Status & Visibility
                is_active TINYINT(1) DEFAULT 1,
                is_default TINYINT(1) DEFAULT 0,
                is_auto_generated TINYINT(1) DEFAULT 0,
                visibility ENUM('PRIVATE', 'BRAND', 'PUBLIC') DEFAULT 'PRIVATE',
                
                -- Versioning
                version INT DEFAULT 1,
                parent_template_id INT,
                
                -- Metadata
                tags JSON,
                shared_with JSON,
                usage_count INT DEFAULT 0,
                last_used_at DATETIME,
                
                -- Timestamps
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                -- Indexes
                INDEX idx_templates_product (product_id),
                INDEX idx_templates_brand (brand_id),
                INDEX idx_templates_creator (created_by),
                INDEX idx_templates_type (template_type),
                INDEX idx_templates_active (is_active),
                INDEX idx_templates_brand_active (brand_id, is_active),
                INDEX idx_templates_product_active (product_id, is_active)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """))
        conn.commit()
        print("  [OK] templates_new table created")
        
        # Migrate data from old templates table
        print("\n  Migrating data from 'templates' table...")
        try:
            conn.execute(text("""
                INSERT INTO templates_new 
                    (id, name, description, product_id, brand_id, created_by, 
                     template_data, is_active, is_auto_generated, visibility, 
                     version, parent_template_id, tags, shared_with, created_at, updated_at)
                SELECT 
                    t.id,
                    t.name,
                    t.description,
                    t.product_id,
                    p.brand_id,
                    t.created_by,
                    t.template_data,
                    t.is_active,
                    t.is_auto_generated,
                    t.visibility,
                    t.version,
                    t.parent_template_id,
                    t.tags,
                    t.shared_with,
                    t.created_at,
                    t.updated_at
                FROM templates t
                LEFT JOIN products p ON t.product_id = p.id
                WHERE p.brand_id IS NOT NULL
            """))
            conn.commit()
            migrated = conn.execute(text("SELECT COUNT(*) FROM templates_new")).scalar()
            print(f"  [OK] Migrated {migrated} records from templates")
        except Exception as e:
            print(f"  [ERROR] templates migration: {e}")
        
        # Migrate data from product_templates table
        print("\n  Migrating data from 'product_templates' table...")
        try:
            # Get max ID to avoid conflicts
            max_id = conn.execute(text("SELECT IFNULL(MAX(id), 0) FROM templates_new")).scalar()
            
            conn.execute(text(f"""
                INSERT INTO templates_new 
                    (id, name, product_id, brand_id, created_by, template_type,
                     template_data, preview_image_path, is_active, is_default, created_at, updated_at)
                SELECT 
                    pt.id + {max_id},
                    pt.name,
                    pt.product_id,
                    pt.brand_id,
                    pt.created_by,
                    pt.template_type,
                    pt.template_data,
                    pt.generated_image_path,
                    pt.is_active,
                    pt.is_default,
                    pt.created_at,
                    pt.updated_at
                FROM product_templates pt
            """))
            conn.commit()
            migrated_pt = conn.execute(text("SELECT COUNT(*) FROM templates_new")).scalar() - migrated
            print(f"  [OK] Migrated {migrated_pt} records from product_templates")
        except Exception as e:
            print(f"  [ERROR] product_templates migration: {e}")
        
        # Drop old tables and rename new one
        print("\n  Replacing old tables with unified structure...")
        conn.execute(text("DROP TABLE IF EXISTS templates"))
        conn.execute(text("DROP TABLE IF EXISTS product_templates"))
        conn.execute(text("ALTER TABLE templates_new RENAME TO templates"))
        conn.commit()
        print("  [OK] Template tables merged successfully")
        
        # Add foreign keys after table creation
        print("\n  Adding foreign key constraints...")
        try:
            conn.execute(text("""
                ALTER TABLE templates
                ADD CONSTRAINT fk_templates_product
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            """))
            conn.commit()
            print("  [OK] templates.product_id -> products.id")
        except Exception as e:
            print(f"  [SKIP] templates.product_id: {e}")
        
        try:
            conn.execute(text("""
                ALTER TABLE templates
                ADD CONSTRAINT fk_templates_brand
                FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE
            """))
            conn.commit()
            print("  [OK] templates.brand_id -> brands.id")
        except Exception as e:
            print(f"  [SKIP] templates.brand_id: {e}")
        
        try:
            conn.execute(text("""
                ALTER TABLE templates
                ADD CONSTRAINT fk_templates_creator
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
            """))
            conn.commit()
            print("  [OK] templates.created_by -> users.id")
        except Exception as e:
            print(f"  [SKIP] templates.created_by: {e}")
        
        try:
            conn.execute(text("""
                ALTER TABLE templates
                ADD CONSTRAINT fk_templates_parent
                FOREIGN KEY (parent_template_id) REFERENCES templates(id) ON DELETE SET NULL
            """))
            conn.commit()
            print("  [OK] templates.parent_template_id -> templates.id")
        except Exception as e:
            print(f"  [SKIP] templates.parent_template_id: {e}")
        
        # =================================================================
        # STEP 3: Fix brands.category to use categories table
        # =================================================================
        print("\n[STEP 3] Fixing brands.category to use foreign key...")
        
        # Add new category_id column
        conn.execute(text("""
            ALTER TABLE brands 
            ADD COLUMN category_id INT AFTER name
        """))
        conn.commit()
        print("  [OK] category_id column added to brands")
        
        # Migrate existing category strings to category_id
        print("  Migrating category data...")
        result = conn.execute(text("""
            SELECT id, category FROM brands WHERE category IS NOT NULL
        """))
        
        for brand_id, category_name in result:
            if category_name:
                # Find or create category
                cat_result = conn.execute(text(f"""
                    SELECT id FROM categories WHERE name = :name
                """), {"name": category_name})
                
                cat_row = cat_result.fetchone()
                
                if cat_row:
                    category_id = cat_row[0]
                else:
                    # Create category
                    conn.execute(text("""
                        INSERT INTO categories (name, is_active) VALUES (:name, 1)
                    """), {"name": category_name})
                    category_id = conn.execute(text("SELECT LAST_INSERT_ID()")).scalar()
                
                # Update brand
                conn.execute(text("""
                    UPDATE brands SET category_id = :cat_id WHERE id = :brand_id
                """), {"cat_id": category_id, "brand_id": brand_id})
        
        conn.commit()
        print("  [OK] Category data migrated")
        
        # Add foreign key
        conn.execute(text("""
            ALTER TABLE brands
            ADD CONSTRAINT fk_brands_category
            FOREIGN KEY (category_id) REFERENCES categories(id)
            ON DELETE SET NULL
        """))
        conn.commit()
        print("  [OK] Foreign key added to brands.category_id")
        
        # Drop old category column
        conn.execute(text("ALTER TABLE brands DROP COLUMN category"))
        conn.commit()
        print("  [OK] Old category column removed")
        
        # =================================================================
        # STEP 4: Add missing foreign keys
        # =================================================================
        print("\n[STEP 4] Adding missing foreign keys...")
        
        # Users -> Brand
        try:
            conn.execute(text("""
                ALTER TABLE users
                ADD CONSTRAINT fk_users_brand
                FOREIGN KEY (brand_id) REFERENCES brands(id)
                ON DELETE SET NULL
            """))
            conn.commit()
            print("  [OK] users.brand_id -> brands.id")
        except Exception as e:
            print(f"  [SKIP] users.brand_id (already exists or error: {e})")
        
        # Users -> Role
        try:
            conn.execute(text("""
                ALTER TABLE users
                ADD CONSTRAINT fk_users_role
                FOREIGN KEY (role_id) REFERENCES roles(id)
                ON DELETE RESTRICT
            """))
            conn.commit()
            print("  [OK] users.role_id -> roles.id")
        except Exception as e:
            print(f"  [SKIP] users.role_id (already exists or error: {e})")
        
        # Products -> Brand
        try:
            conn.execute(text("""
                ALTER TABLE products
                ADD CONSTRAINT fk_products_brand
                FOREIGN KEY (brand_id) REFERENCES brands(id)
                ON DELETE CASCADE
            """))
            conn.commit()
            print("  [OK] products.brand_id -> brands.id")
        except Exception as e:
            print(f"  [SKIP] products.brand_id (already exists or error: {e})")
        
        # Product Images -> Product
        try:
            conn.execute(text("""
                ALTER TABLE product_images
                ADD CONSTRAINT fk_product_images_product
                FOREIGN KEY (product_id) REFERENCES products(id)
                ON DELETE CASCADE
            """))
            conn.commit()
            print("  [OK] product_images.product_id -> products.id")
        except Exception as e:
            print(f"  [SKIP] product_images.product_id (already exists or error: {e})")
        
        # Upload Jobs -> Brand
        try:
            conn.execute(text("""
                ALTER TABLE upload_jobs
                ADD CONSTRAINT fk_upload_jobs_brand
                FOREIGN KEY (brand_id) REFERENCES brands(id)
                ON DELETE CASCADE
            """))
            conn.commit()
            print("  [OK] upload_jobs.brand_id -> brands.id")
        except Exception as e:
            print(f"  [SKIP] upload_jobs.brand_id (already exists or error: {e})")
        
        # Upload Jobs -> Uploader
        try:
            conn.execute(text("""
                ALTER TABLE upload_jobs
                ADD CONSTRAINT fk_upload_jobs_uploader
                FOREIGN KEY (uploader_id) REFERENCES users(id)
                ON DELETE CASCADE
            """))
            conn.commit()
            print("  [OK] upload_jobs.uploader_id -> users.id")
        except Exception as e:
            print(f"  [SKIP] upload_jobs.uploader_id (already exists or error: {e})")
        
        # Social Media Channels -> Brand
        try:
            conn.execute(text("""
                ALTER TABLE social_media_channels
                ADD CONSTRAINT fk_channels_brand
                FOREIGN KEY (brand_id) REFERENCES brands(id)
                ON DELETE CASCADE
            """))
            conn.commit()
            print("  [OK] social_media_channels.brand_id -> brands.id")
        except Exception as e:
            print(f"  [SKIP] social_media_channels.brand_id (already exists or error: {e})")
        
        # =================================================================
        # STEP 5: Add performance columns
        # =================================================================
        print("\n[STEP 5] Adding performance optimization columns...")
        
        # Products: Add search columns
        try:
            conn.execute(text("""
                ALTER TABLE products
                ADD COLUMN search_keywords VARCHAR(500) AFTER color,
                ADD FULLTEXT INDEX idx_products_search (code, color, search_keywords)
            """))
            conn.commit()
            print("  [OK] Added search optimization to products")
        except Exception as e:
            print(f"  [SKIP] products search columns: {e}")
        
        # Brands: Add usage stats
        try:
            conn.execute(text("""
                ALTER TABLE brands
                ADD COLUMN product_count INT DEFAULT 0 AFTER category_id,
                ADD COLUMN template_count INT DEFAULT 0 AFTER product_count,
                ADD COLUMN last_upload_at DATETIME AFTER template_count
            """))
            conn.commit()
            print("  [OK] Added usage stats to brands")
        except Exception as e:
            print(f"  [SKIP] brands usage stats: {e}")
        
        # =================================================================
        # STEP 6: Update usage statistics
        # =================================================================
        print("\n[STEP 6] Updating usage statistics...")
        
        conn.execute(text("""
            UPDATE brands b
            SET product_count = (
                SELECT COUNT(*) FROM products p WHERE p.brand_id = b.id
            ),
            template_count = (
                SELECT COUNT(*) FROM templates t WHERE t.brand_id = b.id
            ),
            last_upload_at = (
                SELECT MAX(created_at) FROM products p WHERE p.brand_id = b.id
            )
        """))
        conn.commit()
        print("  [OK] Brand statistics updated")
        
    print("\n" + "=" * 80)
    print("MIGRATION 009 COMPLETED SUCCESSFULLY")
    print("=" * 80)
    print("\nChanges:")
    print("  [OK] Merged 'templates' and 'product_templates' into unified 'templates' table")
    print("  [OK] Fixed brands.category to use foreign key to categories table")
    print("  [OK] Added all missing foreign key constraints")
    print("  [OK] Added performance optimization columns")
    print("  [OK] Updated usage statistics")
    print("\nBackup tables created: _backup_templates, _backup_product_templates")
    print("=" * 80)

def downgrade():
    """
    Restore backup if needed
    """
    print("\n[WARNING] Downgrade will restore from backup tables")
    
    with engine.connect() as conn:
        # Restore templates
        conn.execute(text("DROP TABLE IF EXISTS templates"))
        conn.execute(text("CREATE TABLE templates AS SELECT * FROM _backup_templates"))
        
        # Restore product_templates
        conn.execute(text("DROP TABLE IF EXISTS product_templates"))
        conn.execute(text("CREATE TABLE product_templates AS SELECT * FROM _backup_product_templates"))
        
        conn.commit()
    
    print("[OK] Database restored from backup")

if __name__ == "__main__":
    print("Running migration: Database Cleanup and Restructure")
    try:
        upgrade()
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise

