"""
Migration: Add assigned_user_ids to social_media_channels table
Date: 2025-10-01
"""

from sqlalchemy import text
from database import engine

def upgrade():
    """Add assigned_user_ids column to social_media_channels table"""
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT COUNT(*) as count
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'social_media_channels'
            AND COLUMN_NAME = 'assigned_user_ids'
        """))
        
        exists = result.fetchone()[0] > 0
        
        if not exists:
            conn.execute(text("""
                ALTER TABLE social_media_channels
                ADD COLUMN assigned_user_ids JSON NULL
                COMMENT 'List of user IDs who can manage this channel'
            """))
            conn.commit()

def downgrade():
    """Remove assigned_user_ids column from social_media_channels table"""
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE social_media_channels
            DROP COLUMN IF EXISTS assigned_user_ids
        """))
        conn.commit()

if __name__ == "__main__":
    upgrade()

