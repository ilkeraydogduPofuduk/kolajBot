"""
Quick fix for slug issue
"""

import pymysql
import os

def fix_slug_issue():
    """Make slug column nullable"""
    try:
        # Database connection - use environment variables
        connection = pymysql.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'pfdk_ai'),
            charset='utf8mb4'
        )
        
        with connection.cursor() as cursor:
            # Check if slug column exists
            cursor.execute("""
                SELECT COLUMN_NAME, IS_NULLABLE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'products' AND COLUMN_NAME = 'slug'
            """, (os.getenv('DB_NAME', 'pfdk_ai'),))
            
            result = cursor.fetchone()
            
            if result:
                column_name, is_nullable = result
                print(f"Found slug column: nullable = {is_nullable}")
                
                if is_nullable == 'NO':
                    # Make it nullable
                    cursor.execute("ALTER TABLE products MODIFY COLUMN slug VARCHAR(255) NULL")
                    print("Made slug column nullable")
                else:
                    print("Slug column is already nullable")
            else:
                # Add slug column
                cursor.execute("ALTER TABLE products ADD COLUMN slug VARCHAR(255) NULL")
                print("Added slug column")
        
        connection.commit()
        connection.close()
        print("Database fix completed successfully")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_slug_issue()
