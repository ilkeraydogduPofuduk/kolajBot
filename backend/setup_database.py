"""
Database Setup Script
Add default roles, permissions, and basic data to make the system functional
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

from sqlalchemy.orm import Session
from database import SessionLocal, engine, create_tables
from models.role import Role
from models.user import User
from models.settings import Settings
from models.category import Category
from models.brand import Brand
from models.permissions import Permission
from models.role_permissions import RolePermission
from models.user_brand import UserBrand
from utils.security import get_password_hash
from datetime import datetime

def setup_database():
    """Setup database with default data"""
    print("Setting up database with default data...")
    print("=" * 50)

    # Create tables
    print("Creating tables...")
    create_tables()

    db = SessionLocal()
    try:
        # =================================================================
        # STEP 1: Create default permissions
        # =================================================================
        print("\n[STEP 1] Creating default permissions...")

        default_permissions = [
            # Dashboard
            {"name": "dashboard", "display_name": "Kontrol Paneli", "module": "dashboard", "description": "Ana kontrol paneline erişim"},
            
            # System & Settings  
            {"name": "system_admin", "display_name": "Sistem Yönetimi", "module": "system", "description": "Tüm sistem ayarlarını yönetme"},
            {"name": "settings", "display_name": "Ayarlar", "module": "settings", "description": "Sistem ayarlarını görüntüleme ve düzenleme"},

            # User Management
            {"name": "users.view", "display_name": "Kullanıcıları Görüntüleme", "module": "users", "description": "Kullanıcı listesini görüntüleme"},
            {"name": "users.create", "display_name": "Kullanıcı Oluşturma", "module": "users", "description": "Yeni kullanıcı oluşturma"},
            {"name": "users.edit", "display_name": "Kullanıcı Düzenleme", "module": "users", "description": "Kullanıcı bilgilerini düzenleme"},
            {"name": "users.delete", "display_name": "Kullanıcı Silme", "module": "users", "description": "Kullanıcı silme"},
            {"name": "users.manage", "display_name": "Kullanıcı Yönetimi", "module": "users", "description": "Tüm kullanıcı işlemleri"},

            # Role Management
            {"name": "roles.view", "display_name": "Rolleri Görüntüleme", "module": "roles", "description": "Rol listesini görüntüleme"},
            {"name": "roles.create", "display_name": "Rol Oluşturma", "module": "roles", "description": "Yeni rol oluşturma"},
            {"name": "roles.edit", "display_name": "Rol Düzenleme", "module": "roles", "description": "Rol bilgilerini düzenleme"},
            {"name": "roles.delete", "display_name": "Rol Silme", "module": "roles", "description": "Rol silme"},
            {"name": "roles.manage", "display_name": "Rol Yönetimi", "module": "roles", "description": "Tüm rol işlemleri"},

            # Employee Requests
            {"name": "employee_requests", "display_name": "Çalışan Talepleri", "module": "employee_requests", "description": "Çalışan taleplerini görüntüleme ve yönetme"},
            {"name": "my_employees", "display_name": "Çalışanlarım", "module": "employees", "description": "Kendi çalışanlarını yönetme"},

            # Brand Management
            {"name": "brands.view", "display_name": "Markaları Görüntüleme", "module": "brands", "description": "Marka listesini görüntüleme"},
            {"name": "brands.create", "display_name": "Marka Oluşturma", "module": "brands", "description": "Yeni marka oluşturma"},
            {"name": "brands.edit", "display_name": "Marka Düzenleme", "module": "brands", "description": "Marka bilgilerini düzenleme"},
            {"name": "brands.delete", "display_name": "Marka Silme", "module": "brands", "description": "Marka silme"},
            {"name": "brands.manage", "display_name": "Marka Yönetimi", "module": "brands", "description": "Tüm marka işlemleri"},

            # Category Management
            {"name": "categories.view", "display_name": "Kategorileri Görüntüleme", "module": "categories", "description": "Kategori listesini görüntüleme"},
            {"name": "categories.create", "display_name": "Kategori Oluşturma", "module": "categories", "description": "Yeni kategori oluşturma"},
            {"name": "categories.edit", "display_name": "Kategori Düzenleme", "module": "categories", "description": "Kategori bilgilerini düzenleme"},
            {"name": "categories.delete", "display_name": "Kategori Silme", "module": "categories", "description": "Kategori silme"},
            {"name": "categories.manage", "display_name": "Kategori Yönetimi", "module": "categories", "description": "Tüm kategori işlemleri"},

            # Branch Management
            {"name": "branches.view", "display_name": "Şubeleri Görüntüleme", "module": "branches", "description": "Şube listesini görüntüleme"},
            {"name": "branches.create", "display_name": "Şube Oluşturma", "module": "branches", "description": "Yeni şube oluşturma"},
            {"name": "branches.edit", "display_name": "Şube Düzenleme", "module": "branches", "description": "Şube bilgilerini düzenleme"},
            {"name": "branches.delete", "display_name": "Şube Silme", "module": "branches", "description": "Şube silme"},
            {"name": "branches.manage", "display_name": "Şube Yönetimi", "module": "branches", "description": "Tüm şube işlemleri"},

            # Product Management
            {"name": "products.view", "display_name": "Ürünleri Görüntüleme", "module": "products", "description": "Ürün galerisini görüntüleme"},
            {"name": "products.create", "display_name": "Ürün Oluşturma", "module": "products", "description": "Yeni ürün oluşturma"},
            {"name": "products.edit", "display_name": "Ürün Düzenleme", "module": "products", "description": "Ürün bilgilerini düzenleme"},
            {"name": "products.delete", "display_name": "Ürün Silme", "module": "products", "description": "Ürün silme"},
            {"name": "products.upload", "display_name": "Ürün Yükleme", "module": "products", "description": "Toplu ürün yükleme"},
            {"name": "products.manage", "display_name": "Ürün Yönetimi", "module": "products", "description": "Tüm ürün işlemleri"},

            # Template Management
            {"name": "templates.view", "display_name": "Şablonları Görüntüleme", "module": "templates", "description": "Şablon galerisini görüntüleme"},
            {"name": "templates.create", "display_name": "Şablon Oluşturma", "module": "templates", "description": "Yeni şablon oluşturma"},
            {"name": "templates.edit", "display_name": "Şablon Düzenleme", "module": "templates", "description": "Şablon düzenleme"},
            {"name": "templates.delete", "display_name": "Şablon Silme", "module": "templates", "description": "Şablon silme"},
            {"name": "templates.use", "display_name": "Şablon Kullanma", "module": "templates", "description": "Şablonları kullanma"},
            {"name": "templates.manage", "display_name": "Şablon Yönetimi", "module": "templates", "description": "Tüm şablon işlemleri"},

            # Collage Management
            {"name": "collages.view", "display_name": "Kolajları Görüntüleme", "module": "collages", "description": "Kolaj galerisini görüntüleme"},
            {"name": "collages.create", "display_name": "Kolaj Oluşturma", "module": "collages", "description": "Yeni kolaj oluşturma"},
            {"name": "collages.edit", "display_name": "Kolaj Düzenleme", "module": "collages", "description": "Kolaj düzenleme"},
            {"name": "collages.delete", "display_name": "Kolaj Silme", "module": "collages", "description": "Kolaj silme"},
            {"name": "collages.manage", "display_name": "Kolaj Yönetimi", "module": "collages", "description": "Tüm kolaj işlemleri"},

            # Social Media Management
            {"name": "social_media", "display_name": "Sosyal Medya", "module": "social_media", "description": "Sosyal medya modülüne erişim"},
            {"name": "social.view", "display_name": "Sosyal Medya Görüntüleme", "module": "social", "description": "Sosyal medya kanallarını görüntüleme"},
            {"name": "social.create", "display_name": "Sosyal Medya Oluşturma", "module": "social", "description": "Yeni sosyal medya kanalı oluşturma"},
            {"name": "social.edit", "display_name": "Sosyal Medya Düzenleme", "module": "social", "description": "Sosyal medya kanallarını düzenleme"},
            {"name": "social.delete", "display_name": "Sosyal Medya Silme", "module": "social", "description": "Sosyal medya kanallarını silme"},
            {"name": "social.post", "display_name": "Gönderi Yayınlama", "module": "social", "description": "Sosyal medya gönderisi yayınlama"},
            {"name": "social.manage", "display_name": "Sosyal Medya Yönetimi", "module": "social", "description": "Tüm sosyal medya işlemleri"},

            # AI Features
            {"name": "ai_templates", "display_name": "AI Şablonlar", "module": "ai", "description": "AI destekli şablon üretimi"},
            {"name": "price_extraction", "display_name": "Fiyat Çıkarma", "module": "ai", "description": "Otomatik fiyat tanıma"},
            {"name": "label_extraction", "display_name": "Etiket Çıkarma", "module": "ai", "description": "Otomatik etiket tanıma"},

            # Reports & Analytics
            {"name": "reports.view", "display_name": "Raporları Görüntüleme", "module": "reports", "description": "Sistem raporlarını görüntüleme"},
            {"name": "analytics", "display_name": "Analitik", "module": "analytics", "description": "Detaylı sistem analitikleri"},
            {"name": "performance_monitor", "display_name": "Performans İzleme", "module": "system", "description": "Sistem performansını izleme"},
        ]

        permissions_created = 0
        for perm_data in default_permissions:
            existing = db.query(Permission).filter(Permission.name == perm_data["name"]).first()
            if not existing:
                permission = Permission(**perm_data)
                db.add(permission)
                permissions_created += 1

        db.commit()
        print(f"  [OK] Created {permissions_created} permissions")

        # Get all permissions for role assignment
        all_permissions = db.query(Permission).all()
        print(f"  [INFO] Total permissions in database: {len(all_permissions)}")

        # =================================================================
        # STEP 2: Create default roles
        # =================================================================
        print("\n[STEP 2] Creating default roles...")

        default_roles = [
            {
                "name": "super_admin",
                "display_name": "Super Admin",
                "description": "Sistem yöneticisi - tüm yetkilere sahip",
                "is_system_role": True,
                "permissions": ["*"]  # All permissions
            },
            {
                "name": "market_manager", 
                "display_name": "Mağaza Yöneticisi",
                "description": "Mağaza ve marka yöneticisi, çalışan yönetimi ve tüm işletme işlemleri",
                "is_system_role": False,
                "permissions": [
                    "dashboard.view",
                    "my_employees", "employee_requests.manage", "view_employee_requests",
                    "brands.view", "brands.create", "brands.edit", "brands.manage",
                    "categories.view", "categories.create", "categories.edit",
                    "branches.view", "branches.create", "branches.edit", "branches.manage",
                    "products.view", "products.create", "products.edit", "products.upload", "products.manage",
                    "templates.view", "templates.create", "templates.edit", "templates.use", "templates.manage",
                    "collages.view", "collages.create", "collages.edit", "collages.manage",
                    "social_media", "social.view", "social.create", "social.edit", "social.post", "social.manage",
                    "ai_templates", "price_extraction", "label_extraction",
                    "reports.view", "analytics"
                ]
            },
            {
                "name": "store_employee",
                "display_name": "Mağaza Çalışanı", 
                "description": "Mağaza çalışanı - ürün ve şablon işlemleri",
                "is_system_role": False,
                "permissions": [
                    "dashboard",
                    "products.view", "products.create", "products.edit", "products.upload",
                    "templates.view", "templates.create", "templates.edit", "templates.use",
                    "collages.view", "collages.create", "collages.edit",
                    "social.view", "social.post",
                    "ai_templates", "price_extraction", "label_extraction"
                ]
            },
            {
                "name": "content_creator",
                "display_name": "İçerik Üreticisi",
                "description": "Sadece içerik ve şablon oluşturma",
                "is_system_role": False,
                "permissions": [
                    "dashboard",
                    "templates.view", "templates.create", "templates.edit", "templates.use",
                    "collages.view", "collages.create", "collages.edit",
                    "products.view",
                    "social.view", "social.post",
                    "ai_templates"
                ]
            },
            {
                "name": "viewer",
                "display_name": "Görüntüleyici",
                "description": "Sadece görüntüleme yetkisi",
                "is_system_role": False,
                "permissions": [
                    "dashboard",
                    "brands.view", "products.view", "templates.view", "collages.view", "social.view"
                ]
            }
        ]

        roles_created = 0
        for role_data in default_roles:
            existing = db.query(Role).filter(Role.name == role_data["name"]).first()
            if not existing:
                permissions_list = role_data.pop("permissions")
                role = Role(**role_data)
                db.add(role)
                db.flush()  # Get role ID

                # Add permissions to role
                if permissions_list == ["*"]:
                    # Super admin gets all permissions
                    for perm in all_permissions:
                        # Check if permission already exists for this role
                        existing_rp = db.query(RolePermission).filter(
                            RolePermission.role_id == role.id,
                            RolePermission.permission_id == perm.id
                        ).first()
                        if not existing_rp:
                            role_permission = RolePermission(role_id=role.id, permission_id=perm.id)
                            db.add(role_permission)
                else:
                    for perm_name in permissions_list:
                        perm = db.query(Permission).filter(Permission.name == perm_name).first()
                        if perm:
                            # Check if permission already exists for this role
                            existing_rp = db.query(RolePermission).filter(
                                RolePermission.role_id == role.id,
                                RolePermission.permission_id == perm.id
                            ).first()
                            if not existing_rp:
                                role_permission = RolePermission(role_id=role.id, permission_id=perm.id)
                                db.add(role_permission)

                roles_created += 1

        db.commit()
        print(f"  [OK] Created {roles_created} roles")

        # =================================================================
        # STEP 3: Create default categories
        # =================================================================
        print("\n[STEP 3] Creating default categories...")

        default_categories = [
            {"name": "Teknoloji"},
            {"name": "Giyim"},
            {"name": "Ev & Yaşam"},
            {"name": "Spor"},
            {"name": "Sağlık"},
            {"name": "Kozmetik"}
        ]

        categories_created = 0
        for cat_data in default_categories:
            existing = db.query(Category).filter(Category.name == cat_data["name"]).first()
            if not existing:
                category = Category(**cat_data)
                db.add(category)
                categories_created += 1

        db.commit()
        print(f"  [OK] Created {categories_created} categories")

        # =================================================================
        # STEP 4: Create default brand
        # =================================================================
        print("\n[STEP 4] Creating default brand...")

        default_brand = db.query(Brand).filter(Brand.name == "Demo Brand").first()
        if not default_brand:
            # Get first category for demo brand
            first_category = db.query(Category).first()
            brand = Brand(
                name="Demo Brand",
                category_id=first_category.id if first_category else None,
                logo_url="/uploads/brands/default-logo.png"
            )
            db.add(brand)
            db.commit()
            print("  [OK] Created default brand")
        else:
            print("  [SKIP] Default brand already exists")

        # =================================================================
        # STEP 5: Create admin user
        # =================================================================
        print("\n[STEP 5] Creating admin user...")

        admin_user = db.query(User).filter(User.email == "admin@pfdk.me").first()
        if not admin_user:
            super_admin_role = db.query(Role).filter(Role.name == "super_admin").first()
            if super_admin_role:
                user = User(
                    email="admin@pfdk.me",
                    password_hash=get_password_hash("admin123"),
                    first_name="Super",
                    last_name="Admin",
                    role_id=super_admin_role.id,
                    is_active=True
                )
                db.add(user)
                db.commit()
                print("  [OK] Created admin user: admin@pfdk.me / admin123")
            else:
                print("  [ERROR] Super admin role not found!")
        else:
            print("  [SKIP] Admin user already exists")

        # =================================================================
        # STEP 6: Create default settings
        # =================================================================
        print("\n[STEP 6] Creating default settings...")

        default_settings = [
            # System settings
            ("system", "app_name", "Pofuduk Digital AI", "Uygulama adı", False),
            ("system", "version", "2.0", "Uygulama versiyonu", False),
            ("system", "maintenance_mode", "false", "Bakım modu", False),

            # Upload settings
            ("upload", "max_file_size", "10", "Maksimum dosya boyutu (MB)", False),
            ("upload", "allowed_extensions", "jpg,jpeg,png,webp", "İzin verilen uzantılar", False),
            ("upload", "max_files_per_upload", "100", "Yükleme başına maksimum dosya", False),

            # OCR settings
            ("ocr", "google_vision_api_key", "", "Google Vision API Anahtarı", True),
            ("ocr", "ocr_timeout", "30", "OCR zaman aşımı (saniye)", False),

            # Email settings
            ("email", "smtp_server", "smtp.gmail.com", "SMTP Sunucu", False),
            ("email", "smtp_port", "587", "SMTP Port", False),
            ("email", "smtp_use_tls", "true", "TLS kullan", False),
            ("email", "from_email", "noreply@pfdk.me", "Gönderen e-posta", False),
            ("email", "from_name", "Pofuduk Digital", "Gönderen adı", False),
        ]

        settings_created = 0
        for category, key, value, description, is_sensitive in default_settings:
            existing = db.query(Settings).filter(
                Settings.category == category,
                Settings.key == key
            ).first()
            if not existing:
                setting = Settings(
                    category=category,
                    key=key,
                    value=value,
                    description=description,
                    is_sensitive=is_sensitive
                )
                db.add(setting)
                settings_created += 1

        db.commit()
        print(f"  [OK] Created {settings_created} default settings")

        print("\n[SUCCESS] Database setup completed!")
        print("=" * 50)
        print("Default login credentials:")
        print("  Email: admin@pfdk.me")
        print("  Password: admin123")
        print("=" * 50)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Database setup failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    setup_database()
