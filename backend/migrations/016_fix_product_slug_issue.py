"""
Fix Product Slug Issue
Add slug field to model or make it nullable in database
"""

from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers
revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None

def upgrade():
    """Add slug field with default value or make it nullable"""
    try:
        # Option 1: Make slug nullable (quick fix)
        op.alter_column('products', 'slug',
                       existing_type=sa.String(255),
                       nullable=True)
        print("✅ Made products.slug nullable")
        
    except Exception as e:
        print(f"⚠️ Slug column might not exist: {e}")
        
        # Option 2: Add slug column if it doesn't exist
        try:
            op.add_column('products', sa.Column('slug', sa.String(255), nullable=True))
            print("✅ Added products.slug column")
        except Exception as e2:
            print(f"⚠️ Could not add slug column: {e2}")

def downgrade():
    """Revert slug changes"""
    try:
        op.alter_column('products', 'slug',
                       existing_type=sa.String(255),
                       nullable=False)
        print("✅ Made products.slug NOT NULL again")
    except Exception as e:
        print(f"⚠️ Could not revert slug changes: {e}")
