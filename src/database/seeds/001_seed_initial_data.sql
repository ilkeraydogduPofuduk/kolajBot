-- Seed: Initial Data
-- Description: Seeds initial data for KolajBot application

-- Insert Categories
INSERT INTO categories (name) VALUES
('Giyim'),
('Teknoloji'),
('Ev & Yaşam'),
('Spor'),
('Sağlık'),
('Kozmetik')
ON CONFLICT (name) DO NOTHING;

-- Insert Roles
INSERT INTO roles (name, display_name, description, is_system_role) VALUES
('super_admin', 'Super Admin', 'Sistem yöneticisi - tüm yetkilere sahip', TRUE),
('brand_manager', 'Marka Yöneticisi', 'Marka yönetimi ve ürünleri yönetme', FALSE),
('employee', 'Çalışan', 'Markaya atanan ürünleri yüklemek ve kolaj işlemlerinden sorumlu', FALSE)
ON CONFLICT (name) DO NOTHING;

-- Insert Permissions
INSERT INTO permissions (name, display_name, description, module) VALUES
-- Dashboard
('dashboard.view', 'Dashboard', 'Dashboard görüntüleme', 'dashboard'),

-- Users
('users.view', 'Kullanıcıları Görüntüleme', 'Kullanıcı listesini görüntüleme', 'users'),
('users.create', 'Kullanıcı Oluşturma', 'Yeni kullanıcı oluşturma', 'users'),
('users.edit', 'Kullanıcı Düzenleme', 'Kullanıcı bilgilerini düzenleme', 'users'),
('users.delete', 'Kullanıcı Silme', 'Kullanıcı silme', 'users'),

-- Roles
('roles.view', 'Rolleri Görüntüleme', 'Rol listesini görüntüleme', 'roles'),
('roles.create', 'Rol Oluşturma', 'Yeni rol oluşturma', 'roles'),
('roles.edit', 'Rol Düzenleme', 'Rol bilgilerini düzenleme', 'roles'),
('roles.delete', 'Rol Silme', 'Rol silme', 'roles'),

-- Brands
('brands.view', 'Markaları Görüntüleme', 'Marka listesini görüntüleme', 'brands'),
('brands.create', 'Marka Oluşturma', 'Yeni marka oluşturma', 'brands'),
('brands.edit', 'Marka Düzenleme', 'Marka bilgilerini düzenleme', 'brands'),
('brands.delete', 'Marka Silme', 'Marka silme', 'brands'),

-- Categories
('categories.view', 'Kategorileri Görüntüleme', 'Kategori listesini görüntüleme', 'categories'),
('categories.create', 'Kategori Oluşturma', 'Yeni kategori oluşturma', 'categories'),
('categories.edit', 'Kategori Düzenleme', 'Kategori bilgilerini düzenleme', 'categories'),
('categories.delete', 'Kategori Silme', 'Kategori silme', 'categories'),

-- Products
('products.view', 'Ürünleri Görüntüleme', 'Ürün galerisini görüntüleme', 'products'),
('products.create', 'Ürün Oluşturma', 'Yeni ürün oluşturma', 'products'),
('products.edit', 'Ürün Düzenleme', 'Ürün bilgilerini düzenleme', 'products'),
('products.delete', 'Ürün Silme', 'Ürün silme', 'products'),
('products.upload', 'Ürün Yükleme', 'Toplu ürün yükleme', 'products'),

-- Templates
('templates.view', 'Şablonları Görüntüleme', 'Şablon galerisini görüntüleme', 'templates'),
('templates.create', 'Şablon Oluşturma', 'Yeni şablon oluşturma', 'templates'),
('templates.edit', 'Şablon Düzenleme', 'Şablon düzenleme', 'templates'),
('templates.delete', 'Şablon Silme', 'Şablon silme', 'templates'),

-- Social Media
('social.view', 'Sosyal Medya Görüntüleme', 'Sosyal medya kanallarını görüntüleme', 'social'),
('social.create', 'Sosyal Medya Oluşturma', 'Yeni sosyal medya kanalı oluşturma', 'social'),
('social.edit', 'Sosyal Medya Düzenleme', 'Sosyal medya kanallarını düzenleme', 'social'),
('social.delete', 'Sosyal Medya Silme', 'Sosyal medya kanallarını silme', 'social'),

-- Settings
('settings.view', 'Ayarları Görüntüle', 'Sistem ayarlarını görüntüleme', 'settings'),
('settings.manage', 'Sistem Ayarları', 'Sistem ayarları yönetimi', 'settings')
ON CONFLICT (name) DO NOTHING;

-- Assign all permissions to super_admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'super_admin'),
  id
FROM permissions
ON CONFLICT DO NOTHING;

-- Assign limited permissions to brand_manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'brand_manager'),
  id
FROM permissions
WHERE module IN ('dashboard', 'brands', 'products', 'templates', 'social')
ON CONFLICT DO NOTHING;

-- Assign basic permissions to employee role
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'employee'),
  id
FROM permissions
WHERE module IN ('dashboard', 'products', 'templates')
  AND name NOT LIKE '%.delete'
ON CONFLICT DO NOTHING;

-- Create default super admin user
-- Password: Admin@123 (hashed with bcrypt)
INSERT INTO users (
  email,
  password_hash,
  first_name,
  last_name,
  role_id,
  is_active,
  is_verified
) VALUES (
  'admin@kolajbot.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7BvLJqN2Z6',
  'Super',
  'Admin',
  (SELECT id FROM roles WHERE name = 'super_admin'),
  TRUE,
  TRUE
) ON CONFLICT (email) DO NOTHING;

-- Insert default system settings
INSERT INTO settings (category, key, value, value_type, description, is_public) VALUES
('system', 'app_name', 'KolajBot', 'string', 'Uygulama adı', TRUE),
('system', 'version', '3.0.0', 'string', 'Uygulama versiyonu', TRUE),
('upload', 'max_file_size', '10485760', 'number', 'Maksimum dosya boyutu (bytes)', FALSE),
('upload', 'max_files_per_upload', '100', 'number', 'Maksimum dosya sayısı', FALSE),
('upload', 'allowed_extensions', 'jpg,jpeg,png,webp', 'string', 'İzin verilen uzantılar', FALSE),
('ocr', 'parallel_workers', '10', 'number', 'Paralel OCR İşçi Sayısı', FALSE),
('ocr', 'ocr_timeout', '30000', 'number', 'OCR Zaman Aşımı (ms)', FALSE),
('ocr', 'ocr_retry_count', '3', 'number', 'OCR Yeniden Deneme Sayısı', FALSE)
ON CONFLICT (key) DO NOTHING;
