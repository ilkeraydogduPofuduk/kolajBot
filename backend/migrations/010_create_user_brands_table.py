"""
Migration: Create user_brands table for proper many-to-many relationship
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

def upgrade():
    # Create user_brands junction table
    op.create_table('user_brands',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('brand_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['brand_id'], ['brands.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'brand_id', name='uq_user_brand')
    )
    
    # Create indexes
    op.create_index('ix_user_brands_user_id', 'user_brands', ['user_id'])
    op.create_index('ix_user_brands_brand_id', 'user_brands', ['brand_id'])
    
    # Migrate existing brand_ids JSON data to junction table
    connection = op.get_bind()
    
    # Get all users with brand_ids
    result = connection.execute(
        sa.text("SELECT id, brand_ids FROM users WHERE brand_ids IS NOT NULL AND brand_ids != 'null'")
    )
    
    for row in result:
        user_id = row[0]
        brand_ids_json = row[1]
        
        if brand_ids_json:
            try:
                import json
                brand_ids = json.loads(brand_ids_json)
                if isinstance(brand_ids, list):
                    for brand_id in brand_ids:
                        if brand_id:
                            connection.execute(
                                sa.text("INSERT INTO user_brands (user_id, brand_id) VALUES (:user_id, :brand_id)"),
                                {"user_id": user_id, "brand_id": brand_id}
                            )
            except (json.JSONDecodeError, TypeError):
                continue

def downgrade():
    # Drop indexes
    op.drop_index('ix_user_brands_brand_id', table_name='user_brands')
    op.drop_index('ix_user_brands_user_id', table_name='user_brands')
    
    # Drop table
    op.drop_table('user_brands')
