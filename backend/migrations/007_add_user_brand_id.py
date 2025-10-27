"""
Migration: Add brand_id to users table
Tarih: 2025-10-07
Açıklama: Kullanıcılara tek bir marka atanabilmesi için brand_id alanı eklenir
"""

from sqlalchemy import text
from database import engine

def upgrade():
    """Add brand_id column to users table"""
    
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT COUNT(*) as count
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'brand_id'
        """))
        
        exists = result.fetchone()[0] > 0
        
        if not exists:
            print("Adding brand_id column to users table...")
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN brand_id INT NULL AFTER role_id,
                ADD CONSTRAINT fk_users_brand_id 
                FOREIGN KEY (brand_id) REFERENCES brands(id) 
                ON DELETE SET NULL
            """))
            conn.commit()
            print("[OK] brand_id column added successfully")
        else:
            print("[WARNING] brand_id column already exists, skipping")

def downgrade():
    """Remove brand_id column from users table"""
    
    with engine.connect() as conn:
        # Check if column exists
        result = conn.execute(text("""
            SELECT COUNT(*) as count
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'brand_id'
        """))
        
        exists = result.fetchone()[0] > 0
        
        if exists:
            print("Removing brand_id column from users table...")
            # First drop the foreign key
            conn.execute(text("""
                ALTER TABLE users 
                DROP FOREIGN KEY fk_users_brand_id
            """))
            # Then drop the column
            conn.execute(text("""
                ALTER TABLE users 
                DROP COLUMN brand_id
            """))
            conn.commit()
            print("[OK] brand_id column removed successfully")
        else:
            print("[WARNING] brand_id column does not exist, skipping")

if __name__ == "__main__":
    print("Running migration: Add brand_id to users table")
    try:
        upgrade()
        print("\n[OK] Migration completed successfully!")
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        raise

