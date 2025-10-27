"""
Migration 015: Telegram Bot Separation
Telegram bot'larını ayrı bir tabloya taşıyoruz
"""

import pymysql
import os
from datetime import datetime

def get_connection():
    """MySQL bağlantısı"""
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD", "")
    host = os.getenv("DB_HOST", "localhost")
    port = int(os.getenv("DB_PORT", 3306))
    database = os.getenv("DB_NAME", "pfdk_ai")
    
    return pymysql.connect(
        host=host,
        user=user,
        password=password,
        database=database,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

def run_migration():
    """
    Migration adımları:
    1. telegram_bots tablosunu oluştur
    2. social_media_channels'dan bot_token verilerini telegram_bots'a taşı
    3. social_media_channels'a telegram_bot_id ve channel_username kolonlarını ekle
    4. social_media_channels.bot_token kolonunu kaldır
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        print("=" * 60)
        print("TELEGRAM BOT SEPARATION MIGRATION - BAŞLIYOR")
        print("=" * 60)
        
        # 1. telegram_bots tablosunu oluştur
        print("\n[1/5] telegram_bots tablosu oluşturuluyor...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS telegram_bots (
                id INT AUTO_INCREMENT PRIMARY KEY,
                bot_name VARCHAR(255) NOT NULL COMMENT 'Bot display name',
                bot_username VARCHAR(255) NOT NULL UNIQUE COMMENT 'Bot Telegram username',
                bot_token TEXT NOT NULL COMMENT 'Telegram bot token',
                bot_user_id VARCHAR(100) NULL COMMENT 'Telegram bot user ID',
                is_active BOOLEAN DEFAULT TRUE,
                is_verified BOOLEAN DEFAULT FALSE COMMENT 'Bot token verified',
                last_verified_at DATETIME NULL,
                created_by INT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_bot_username (bot_username),
                INDEX idx_is_active (is_active),
                INDEX idx_bot_token (bot_token(255))
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            COMMENT='Telegram bots - centralized management';
        """)
        print("   OK telegram_bots tablosu olusturuldu")
        
        # 2. Mevcut bot_token'ları analiz et ve telegram_bots'a taşı
        print("\n[2/5] Mevcut bot_token'lar analiz ediliyor...")
        cursor.execute("""
            SELECT DISTINCT 
                bot_token, 
                created_by,
                MIN(id) as first_channel_id,
                COUNT(*) as channel_count
            FROM social_media_channels
            WHERE platform = 'telegram' 
              AND bot_token IS NOT NULL 
              AND bot_token != ''
            GROUP BY bot_token, created_by
        """)
        
        bot_tokens = cursor.fetchall()
        print(f"   OK {len(bot_tokens)} benzersiz bot token bulundu")
        
        # Her bir bot token için telegram_bots'a kayıt ekle
        bot_mapping = {}  # old_token -> new_bot_id
        
        if bot_tokens:
            print("\n[3/5] Bot token'lar telegram_bots tablosuna taşınıyor...")
            from utils.telegram_bot_manager import TelegramBotManager
            import asyncio
            
            for idx, token_data in enumerate(bot_tokens, 1):
                bot_token = token_data['bot_token']
                created_by = token_data['created_by']
                channel_count = token_data['channel_count']
                
                try:
                    # Bot bilgilerini al
                    manager = TelegramBotManager(bot_token)
                    bot_valid, bot_info = asyncio.run(manager.verify_bot_token())
                    
                    if bot_valid and bot_info:
                        bot_name = bot_info.get('first_name', f'Bot #{idx}')
                        bot_username = bot_info.get('username', f'bot{idx}')
                        bot_user_id = str(bot_info.get('id', ''))
                        is_verified = True
                        last_verified_at = datetime.utcnow()
                    else:
                        # Token geçersiz ama yine de ekleyelim
                        bot_name = f'Telegram Bot #{idx}'
                        bot_username = f'bot{idx}'
                        bot_user_id = None
                        is_verified = False
                        last_verified_at = None
                    
                    # telegram_bots'a ekle
                    cursor.execute("""
                        INSERT INTO telegram_bots 
                        (bot_name, bot_username, bot_token, bot_user_id, is_verified, last_verified_at, created_by)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (bot_name, bot_username, bot_token, bot_user_id, is_verified, last_verified_at, created_by))
                    
                    new_bot_id = cursor.lastrowid
                    bot_mapping[bot_token] = new_bot_id
                    
                    print(f"   OK Bot #{idx}: @{bot_username} -> ID:{new_bot_id} ({channel_count} kanal)")
                    
                except Exception as e:
                    print(f"   WARNING Bot #{idx} eklenirken hata: {e}")
                    # Hata olsa bile devam et - generic bot ekle
                    bot_name = f'Telegram Bot #{idx}'
                    bot_username = f'bot{idx}_{int(datetime.utcnow().timestamp())}'
                    
                    cursor.execute("""
                        INSERT INTO telegram_bots 
                        (bot_name, bot_username, bot_token, is_verified, created_by)
                        VALUES (%s, %s, %s, FALSE, %s)
                    """, (bot_name, bot_username, bot_token, created_by))
                    
                    new_bot_id = cursor.lastrowid
                    bot_mapping[bot_token] = new_bot_id
                    print(f"   OK Bot #{idx} (fallback): {bot_username} -> ID:{new_bot_id}")
            
            conn.commit()
            print(f"\n   OK Toplam {len(bot_mapping)} bot basariyla eklendi")
        else:
            print("   INFO Tasinacak bot token bulunamadi")
        
        # 4. social_media_channels tablosuna yeni kolonlar ekle
        print("\n[4/5] social_media_channels tablosu güncelleniyor...")
        
        # telegram_bot_id kolonu ekle
        try:
            cursor.execute("""
                ALTER TABLE social_media_channels 
                ADD COLUMN telegram_bot_id INT NULL COMMENT 'Related Telegram bot' AFTER last_activity
            """)
            print("   OK telegram_bot_id kolonu eklendi")
        except pymysql.err.OperationalError as e:
            if '1060' in str(e):  # Duplicate column
                print("   INFO telegram_bot_id kolonu zaten mevcut")
            else:
                raise
        
        # channel_username kolonu ekle
        try:
            cursor.execute("""
                ALTER TABLE social_media_channels 
                ADD COLUMN channel_username VARCHAR(255) NULL COMMENT 'Channel username' AFTER chat_id
            """)
            print("   OK channel_username kolonu eklendi")
        except pymysql.err.OperationalError as e:
            if '1060' in str(e):
                print("   INFO channel_username kolonu zaten mevcut")
            else:
                raise
        
        # Foreign key ekle
        try:
            cursor.execute("""
                ALTER TABLE social_media_channels
                ADD CONSTRAINT fk_telegram_bot
                FOREIGN KEY (telegram_bot_id) REFERENCES telegram_bots(id) ON DELETE SET NULL
            """)
            print("   OK Foreign key constraint eklendi")
        except pymysql.err.OperationalError as e:
            if '1826' in str(e) or '1061' in str(e):  # Duplicate foreign key
                print("   INFO Foreign key zaten mevcut")
            else:
                raise
        
        # 5. telegram_bot_id değerlerini güncelle
        if bot_mapping:
            print("\n[5/5] Kanallar bot'lara bağlanıyor...")
            for bot_token, bot_id in bot_mapping.items():
                cursor.execute("""
                    UPDATE social_media_channels
                    SET telegram_bot_id = %s
                    WHERE bot_token = %s AND platform = 'telegram'
                """, (bot_id, bot_token))
                
                updated = cursor.rowcount
                print(f"   OK Bot ID:{bot_id} -> {updated} kanala atandi")
            
            conn.commit()
        
        # 6. bot_token kolonunu kaldır (opsiyonel - veri kaybını önlemek için şimdilik bırakıyoruz)
        print("\n[6/5] bot_token kolonu kaldırılıyor (opsiyonel)...")
        try:
            # Önce tüm bot_token'lar taşındığından emin ol
            cursor.execute("""
                SELECT COUNT(*) as count 
                FROM social_media_channels 
                WHERE platform = 'telegram' 
                  AND bot_token IS NOT NULL 
                  AND bot_token != ''
                  AND telegram_bot_id IS NULL
            """)
            orphan_count = cursor.fetchone()['count']
            
            if orphan_count > 0:
                print(f"   WARNING: {orphan_count} kanal hala bot_token'a sahip ama telegram_bot_id yok!")
                print("   WARNING bot_token kolonu kaldirilmadi (veri kaybini onlemek icin)")
            else:
                # Güvenli - bot_token kolonunu kaldır
                cursor.execute("""
                    ALTER TABLE social_media_channels DROP COLUMN bot_token
                """)
                print("   OK bot_token kolonu basariyla kaldirildi")
        except pymysql.err.OperationalError as e:
            if '1091' in str(e):  # Can't drop - doesn't exist
                print("   INFO bot_token kolonu zaten kaldirilmis")
            else:
                print(f"   WARNING bot_token kolonu kaldirilamadi: {e}")
        
        conn.commit()
        
        # Final durum
        cursor.execute("SELECT COUNT(*) as total FROM telegram_bots")
        bot_count = cursor.fetchone()['total']
        
        cursor.execute("""
            SELECT COUNT(*) as total 
            FROM social_media_channels 
            WHERE platform = 'telegram' AND telegram_bot_id IS NOT NULL
        """)
        linked_channels = cursor.fetchone()['total']
        
        print("\n" + "=" * 60)
        print("MIGRATION TAMAMLANDI!")
        print("=" * 60)
        print(f"Toplam Bot: {bot_count}")
        print(f"Bağlı Kanal: {linked_channels}")
        print("=" * 60)
        
    except Exception as e:
        print(f"\nHATA: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            cursor.close()
            conn.close()


if __name__ == "__main__":
    run_migration()

