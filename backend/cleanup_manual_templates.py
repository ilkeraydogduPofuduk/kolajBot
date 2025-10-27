"""
MySQL Veritabanı Temizlik Script'i
Manuel template kayıtlarını siler, otomatik kolaj template'lerini KORUR!
"""

import pymysql
from config.settings import settings

def get_connection():
    """MySQL bağlantısı"""
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

def cleanup_manual_templates():
    """Manuel template'leri sil, otomatik kolaj template'lerini koru"""
    
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        print("=" * 60)
        print("MYSQL VERİTABANI TEMİZLİK SCRIPTI")
        print("=" * 60)
        
        # 1. Mevcut template'leri analiz et
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_auto_generated = 1 THEN 1 ELSE 0 END) as auto_generated,
                SUM(CASE WHEN is_auto_generated = 0 OR is_auto_generated IS NULL THEN 1 ELSE 0 END) as manual_count,
                SUM(CASE WHEN template_type = 'collage' THEN 1 ELSE 0 END) as collage_type
            FROM templates
        """)
        stats = cursor.fetchone()
        
        print("\nMEVCUT DURUM:")
        print(f"   - Toplam Template: {stats['total']}")
        print(f"   - Otomatik Olusturulmus (KORUNACAK): {stats['auto_generated']}")
        print(f"   - Manuel Olusturulmus (SILINECEK): {stats['manual_count']}")
        print(f"   - Kolaj Tipi: {stats['collage_type']}")
        
        # 2. Silinecek template'leri göster
        cursor.execute("""
            SELECT id, name, template_type, created_at, is_auto_generated
            FROM templates
            WHERE is_auto_generated = 0 OR is_auto_generated IS NULL
            LIMIT 10
        """)
        manual_templates = cursor.fetchall()
        
        if manual_templates:
            print("\nSILINECEK MANUEL TEMPLATE'LER (Ilk 10):")
            for t in manual_templates:
                print(f"   - ID: {t['id']}, Name: {t['name']}, Type: {t['template_type']}")
        
        # 3. Onay iste
        print("\nUYARI: Bu islem geri alinamaz!")
        print("KORUNACAK: Otomatik olusturulan kolaj template'leri")
        print("SILINECEK: Manuel olusturulan template'ler")
        
        response = input("\nDevam etmek istiyor musunuz? (yes/no): ").strip().lower()
        
        if response != 'yes':
            print("\nIslem iptal edildi!")
            return
        
        # 4. Template permissions tablosundan ilgili kayıtları sil
        print("\nTemplate permissions temizleniyor...")
        cursor.execute("""
            DELETE tp FROM template_permissions tp
            LEFT JOIN templates t ON tp.template_id = t.id
            WHERE t.is_auto_generated = 0 OR t.is_auto_generated IS NULL OR t.id IS NULL
        """)
        deleted_perms = cursor.rowcount
        print(f"   > {deleted_perms} template permission silindi")
        
        # 5. Manuel template'leri sil
        print("\nManuel template'ler siliniyor...")
        cursor.execute("""
            DELETE FROM templates
            WHERE is_auto_generated = 0 OR is_auto_generated IS NULL
        """)
        deleted_templates = cursor.rowcount
        print(f"   > {deleted_templates} manuel template silindi")
        
        # 6. Commit
        conn.commit()
        
        # 7. Final durum
        cursor.execute("SELECT COUNT(*) as total FROM templates")
        final_count = cursor.fetchone()['total']
        
        print("\n" + "=" * 60)
        print("TEMIZLIK TAMAMLANDI!")
        print("=" * 60)
        print(f"Kalan Template Sayisi: {final_count}")
        print(f"Silinen Template: {deleted_templates}")
        print(f"Silinen Permission: {deleted_perms}")
        print("Otomatik kolaj template'leri korundu!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\nHATA: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    cleanup_manual_templates()

