"""
Enterprise-Level Database Optimization
Yüksek trafikli sistemler için optimize edilmiş database konfigürasyonu
"""

from sqlalchemy import event, pool
from sqlalchemy.engine import Engine
import logging
import time

logger = logging.getLogger(__name__)

class DatabaseOptimizer:
    """
    Database performans optimizasyonu
    - Connection pooling
    - Query optimization
    - Index management
    - Slow query detection
    """
    
    @staticmethod
    def configure_engine_for_high_traffic(engine: Engine):
        """
        Yüksek trafikli sistemler için engine konfigürasyonu
        """
        
        # Connection pool settings for high traffic
        engine.pool._max_overflow = 200  # Peak zamanlar için
        engine.pool._pool_size = 100      # Sürekli bağlantılar
        engine.pool._timeout = 30          # Connection timeout
        engine.pool._recycle = 3600        # 1 saatte bir recycle
        
        # Enable query logging for slow queries
        @event.listens_for(Engine, "before_cursor_execute")
        def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            conn.info.setdefault('query_start_time', []).append(time.time())
            logger.debug(f"Start Query: {statement[:100]}")
        
        @event.listens_for(Engine, "after_cursor_execute")
        def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            total_time = time.time() - conn.info['query_start_time'].pop()
            
            # Log slow queries (> 1 second)
            if total_time > 1.0:
                logger.warning(
                    f"SLOW QUERY ({total_time:.2f}s): {statement[:200]}"
                )
            
            # Log very slow queries (> 3 seconds)
            if total_time > 3.0:
                logger.error(
                    f"VERY SLOW QUERY ({total_time:.2f}s): {statement}\n"
                    f"Parameters: {parameters}"
                )
    
    @staticmethod
    def create_performance_indexes():
        """
        Performans için kritik indexler
        """
        return [
            # Products table indexes
            "CREATE INDEX IF NOT EXISTS idx_products_brand_code ON products(brand_id, code)",
            "CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_products_code_color ON products(code, color)",
            "CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active)",
            
            # Product Images indexes
            "CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id)",
            "CREATE INDEX IF NOT EXISTS idx_product_images_type ON product_images(image_type)",
            
            # Templates indexes
            "CREATE INDEX IF NOT EXISTS idx_templates_product ON templates(product_id)",
            "CREATE INDEX IF NOT EXISTS idx_templates_created ON templates(created_by, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_templates_active ON templates(is_active)",
            
            # Users indexes
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
            "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id)",
            "CREATE INDEX IF NOT EXISTS idx_users_brand ON users(brand_id)",
            "CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)",
            
            # Upload jobs indexes
            "CREATE INDEX IF NOT EXISTS idx_upload_jobs_status ON upload_jobs(status)",
            "CREATE INDEX IF NOT EXISTS idx_upload_jobs_uploader ON upload_jobs(uploader_id, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_upload_jobs_brand ON upload_jobs(brand_id, created_at DESC)",
            
            # Social media channels indexes
            "CREATE INDEX IF NOT EXISTS idx_channels_platform ON social_media_channels(platform)",
            "CREATE INDEX IF NOT EXISTS idx_channels_brand ON social_media_channels(brand_id)",
            "CREATE INDEX IF NOT EXISTS idx_channels_active ON social_media_channels(is_active)",
            
            # Composite indexes for common queries
            "CREATE INDEX IF NOT EXISTS idx_products_brand_active_created ON products(brand_id, is_active, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_templates_product_active ON templates(product_id, is_active)",
        ]

    @staticmethod
    def optimize_mysql_settings():
        """
        MySQL server optimization settings
        Bu ayarlar my.cnf/my.ini dosyasına eklenmeli
        """
        return """
# MySQL Optimization for High Traffic (my.cnf)

[mysqld]
# Connection Settings
max_connections = 1000
max_connect_errors = 10000
connect_timeout = 10
wait_timeout = 600
interactive_timeout = 600

# Buffer Pool (InnoDB)
innodb_buffer_pool_size = 4G          # RAM'in %70-80'i
innodb_buffer_pool_instances = 8      # CPU core sayısı
innodb_log_file_size = 512M
innodb_log_buffer_size = 16M
innodb_flush_log_at_trx_commit = 2   # Performance için

# Query Cache (MySQL 5.7 ve öncesi)
query_cache_type = 1
query_cache_size = 256M
query_cache_limit = 2M

# Thread Settings
thread_cache_size = 100
thread_stack = 256K

# Table Settings
table_open_cache = 4000
table_definition_cache = 2000

# Temporary Tables
tmp_table_size = 256M
max_heap_table_size = 256M

# Sort & Join Buffers
sort_buffer_size = 2M
read_buffer_size = 2M
read_rnd_buffer_size = 4M
join_buffer_size = 2M

# MyISAM Settings
key_buffer_size = 256M

# Binary Log (Replication)
log_bin = mysql-bin
binlog_format = ROW
expire_logs_days = 7
max_binlog_size = 100M

# Slow Query Log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow-query.log
long_query_time = 2

# Character Set
character_set_server = utf8mb4
collation_server = utf8mb4_unicode_ci

# InnoDB Performance
innodb_flush_method = O_DIRECT
innodb_file_per_table = 1
innodb_io_capacity = 2000
innodb_io_capacity_max = 4000
innodb_read_io_threads = 8
innodb_write_io_threads = 8
innodb_autoinc_lock_mode = 2

# Network
max_allowed_packet = 64M
"""

class QueryOptimizationMixin:
    """
    Query optimization için mixin class
    Tüm query'lerde kullanılabilir
    """
    
    @staticmethod
    def paginate_query(query, page: int = 1, per_page: int = 20):
        """
        Efficient pagination with total count
        """
        # Count query (optimized)
        total = query.count()
        
        # Data query
        items = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return {
            'items': items,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page
        }
    
    @staticmethod
    def batch_insert(session, model_class, data_list: list, batch_size: int = 1000):
        """
        Toplu insert için optimize edilmiş fonksiyon
        """
        if not data_list:
            return 0
        
        inserted = 0
        for i in range(0, len(data_list), batch_size):
            batch = data_list[i:i + batch_size]
            session.bulk_insert_mappings(model_class, batch)
            session.flush()
            inserted += len(batch)
        
        session.commit()
        return inserted
    
    @staticmethod
    def batch_update(session, model_class, data_list: list, batch_size: int = 1000):
        """
        Toplu update için optimize edilmiş fonksiyon
        """
        if not data_list:
            return 0
        
        updated = 0
        for i in range(0, len(data_list), batch_size):
            batch = data_list[i:i + batch_size]
            session.bulk_update_mappings(model_class, batch)
            session.flush()
            updated += len(batch)
        
        session.commit()
        return updated

# Database Health Check
class DatabaseHealthCheck:
    """
    Database sağlık kontrolü
    """
    
    @staticmethod
    def check_connection_pool(engine):
        """Connection pool durumunu kontrol et"""
        pool = engine.pool
        return {
            'size': pool.size(),
            'checked_in': pool.checkedin(),
            'checked_out': pool.checkedout(),
            'overflow': pool.overflow(),
            'max_overflow': pool._max_overflow,
            'health': 'healthy' if pool.checkedin() > 0 else 'warning'
        }
    
    @staticmethod
    def get_slow_queries(session):
        """Slow query'leri getir (MySQL specific)"""
        result = session.execute("""
            SELECT 
                query_time,
                lock_time,
                rows_sent,
                rows_examined,
                sql_text
            FROM mysql.slow_log
            ORDER BY query_time DESC
            LIMIT 10
        """)
        return result.fetchall()
    
    @staticmethod
    def get_table_sizes(session):
        """Tablo boyutlarını getir"""
        result = session.execute("""
            SELECT 
                TABLE_NAME,
                ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS SIZE_MB,
                TABLE_ROWS
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
        """)
        return result.fetchall()

