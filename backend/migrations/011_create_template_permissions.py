"""
Migration: Create template_permissions table
Şablon izinleri tablosunu oluştur
"""
import pymysql
from config.settings import settings

def get_connection():
    """MySQL bağlantısı"""
    # Parse DATABASE_URL
    # Format: mysql+pymysql://user:pass@host:port/dbname
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
    """Create template_permissions table"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Check if table exists
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
            AND table_name = 'template_permissions'
        """)
        result = cursor.fetchone()
        
        if result['count'] > 0:
            print("✓ template_permissions table already exists")
            return
        
        # Create template_permissions table
        cursor.execute("""
            CREATE TABLE template_permissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                template_id INT NOT NULL,
                brand_id INT NOT NULL,
                
                can_view BOOLEAN DEFAULT TRUE,
                can_use BOOLEAN DEFAULT TRUE,
                can_edit BOOLEAN DEFAULT FALSE,
                can_duplicate BOOLEAN DEFAULT TRUE,
                
                granted_by INT NULL,
                granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                
                FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
                FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
                FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
                
                INDEX idx_template_permissions_template (template_id),
                INDEX idx_template_permissions_brand (brand_id),
                INDEX idx_template_permissions_active (is_active),
                
                UNIQUE KEY unique_template_brand (template_id, brand_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """)
        
        conn.commit()
        print("✓ template_permissions table created successfully")
        
    except Exception as e:
        conn.rollback()
        print(f"✗ Error creating template_permissions table: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def downgrade():
    """Drop template_permissions table"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("DROP TABLE IF EXISTS template_permissions")
        conn.commit()
        print("✓ template_permissions table dropped successfully")
    except Exception as e:
        conn.rollback()
        print(f"✗ Error dropping template_permissions table: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("Running migration: Create template_permissions table")
    upgrade()
    print("Migration completed!")

