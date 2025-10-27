"""
Migration: Create Performance Indexes
Tarih: 2025-10-07
Açıklama: Yüksek trafikli sistemler için performans indexleri
"""

from sqlalchemy import text
from database import engine
import logging

logger = logging.getLogger(__name__)

def upgrade():
    """Create performance indexes"""
    
    from config.database_optimization import DatabaseOptimizer
    
    indexes = DatabaseOptimizer.create_performance_indexes()
    
    with engine.connect() as conn:
        print(f"\n{'='*60}")
        print("CREATING PERFORMANCE INDEXES")
        print(f"{'='*60}\n")
        
        successful = 0
        failed = 0
        
        for index_sql in indexes:
            try:
                # Extract index name for logging
                index_name = index_sql.split("INDEX IF NOT EXISTS ")[1].split(" ")[0]
                print(f"Creating index: {index_name}...", end=" ")
                
                conn.execute(text(index_sql))
                conn.commit()
                
                print("[OK]")
                successful += 1
                
            except Exception as e:
                print(f"[ERROR] {e}")
                failed += 1
                logger.error(f"Index creation failed: {e}")
        
        print(f"\n{'='*60}")
        print(f"RESULTS: {successful} successful, {failed} failed")
        print(f"{'='*60}\n")

def downgrade():
    """Remove performance indexes"""
    
    index_names = [
        "idx_products_brand_code",
        "idx_products_created_at",
        "idx_products_code_color",
        "idx_products_is_active",
        "idx_product_images_product",
        "idx_product_images_type",
        "idx_templates_product",
        "idx_templates_created",
        "idx_templates_active",
        "idx_users_email",
        "idx_users_role",
        "idx_users_brand",
        "idx_users_active",
        "idx_upload_jobs_status",
        "idx_upload_jobs_uploader",
        "idx_upload_jobs_brand",
        "idx_channels_platform",
        "idx_channels_brand",
        "idx_channels_active",
        "idx_products_brand_active_created",
        "idx_templates_product_active"
    ]
    
    with engine.connect() as conn:
        print("\nRemoving performance indexes...")
        
        for index_name in index_names:
            try:
                conn.execute(text(f"DROP INDEX IF EXISTS {index_name}"))
                conn.commit()
                print(f"Dropped index: {index_name}")
            except Exception as e:
                print(f"Error dropping {index_name}: {e}")

if __name__ == "__main__":
    print("Running migration: Create Performance Indexes")
    try:
        upgrade()
        print("\n[OK] Migration completed successfully!")
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        raise

