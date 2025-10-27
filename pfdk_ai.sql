-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Anamakine: 127.0.0.1:3306
-- Üretim Zamanı: 26 Eki 2025, 16:33:25
-- Sunucu sürümü: 9.1.0
-- PHP Sürümü: 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Veritabanı: `pfdk_ai`
--

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `brands`
--

DROP TABLE IF EXISTS `brands`;
CREATE TABLE IF NOT EXISTS `brands` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` int DEFAULT NULL,
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `product_ids` json DEFAULT NULL COMMENT 'Bu markaya ait ürün ID''leri',
  `template_ids` json DEFAULT NULL COMMENT 'Bu markaya ait şablon ID''leri',
  PRIMARY KEY (`id`),
  KEY `ix_brands_name` (`name`(250)),
  KEY `ix_brands_id` (`id`),
  KEY `fk_brands_category` (`category_id`),
  KEY `ix_brands_is_active` (`is_active`)
) ENGINE=MyISAM AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tablo döküm verisi `brands`
--

INSERT INTO `brands` (`id`, `name`, `category_id`, `logo_url`, `created_at`, `updated_at`, `is_active`, `product_ids`, `template_ids`) VALUES
(1, 'Dizayn Brands', 1, 'https://www.dizaynbrands.com/assets/images/menu/logo/1.png', '2025-10-18 21:15:43', '2025-10-18 21:15:43', 1, NULL, NULL),
(2, 'Pofuduk Dijital', 1, 'https://pofudukdijital.com/wp-content/uploads/2023/11/logo1.svg', '2025-10-19 11:25:09', '2025-10-19 11:25:09', 1, NULL, NULL);

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `brand_requests`
--

DROP TABLE IF EXISTS `brand_requests`;
CREATE TABLE IF NOT EXISTS `brand_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `requested_by_user_id` int NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_message` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `admin_notes` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_by_user_id` int DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Marka logosu URL',
  PRIMARY KEY (`id`),
  KEY `ix_brand_requests_id` (`id`),
  KEY `fk_brand_requests_requested_by` (`requested_by_user_id`),
  KEY `fk_brand_requests_approved_by` (`approved_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `categories`
--

DROP TABLE IF EXISTS `categories`;
CREATE TABLE IF NOT EXISTS `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_categories_name` (`name`(250)),
  KEY `ix_categories_id` (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tablo döküm verisi `categories`
--

INSERT INTO `categories` (`id`, `name`) VALUES
(1, 'GİYİM'),
(2, 'Teknoloji'),
(3, 'Ev & Yaşam'),
(4, 'Spor'),
(5, 'Sağlık'),
(6, 'Kozmetik');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `employee_requests`
--

DROP TABLE IF EXISTS `employee_requests`;
CREATE TABLE IF NOT EXISTS `employee_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `requested_by_user_id` int NOT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role_id` int NOT NULL,
  `brand_ids` json DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `admin_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `approved_by_user_id` int DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `requested_by_user_id` (`requested_by_user_id`),
  KEY `role_id` (`role_id`),
  KEY `approved_by_user_id` (`approved_by_user_id`),
  KEY `ix_employee_requests_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tablo döküm verisi `employee_requests`
--

INSERT INTO `employee_requests` (`id`, `requested_by_user_id`, `email`, `first_name`, `last_name`, `phone_number`, `role_id`, `brand_ids`, `status`, `request_message`, `admin_notes`, `approved_by_user_id`, `approved_at`, `created_at`, `updated_at`) VALUES
(1, 2, 'info@kolajbot.com', 'İlker', 'Aydoğdu', '', 5, '[1]', 'APPROVED', '', '', 4, '2025-10-21 11:43:58', '2025-10-21 14:43:48', '2025-10-21 14:43:57');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `permissions`
--

DROP TABLE IF EXISTS `permissions`;
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Sistem adı: view_dashboard, create_user',
  `display_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Görünen ad: Dashboard Görüntüleme',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'İzin açıklaması',
  `module` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Modül: users, brands, branches, dashboard',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'Aktif mi?',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=138 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sistem izinleri';

--
-- Tablo döküm verisi `permissions`
--

INSERT INTO `permissions` (`id`, `name`, `display_name`, `description`, `module`, `is_active`, `created_at`) VALUES
(68, 'dashboard.view', 'Dashboard', 'Dashboard görüntüleme', 'dashboard', 1, '2025-10-17 14:12:59'),
(69, 'users.manage', 'Kullanıcı Yönetimi', 'Kullanıcı ekleme, düzenleme, silme', 'users', 1, '2025-10-17 14:12:59'),
(70, 'brands.manage', 'Marka Yönetimi', 'Marka ekleme, düzenleme, silme', 'brands', 1, '2025-10-17 14:12:59'),
(71, 'products.manage', 'Ürün Yönetimi', 'Ürün ekleme, düzenleme, silme', 'products', 1, '2025-10-17 14:12:59'),
(72, 'templates.manage', 'Şablon Yönetimi', 'Şablon ekleme, düzenleme, silme', 'templates', 1, '2025-10-17 14:12:59'),
(73, 'social.manage', 'Sosyal Medya', 'Sosyal medya yönetimi', 'social', 1, '2025-10-17 14:12:59'),
(74, 'settings.manage', 'Sistem Ayarları', 'Sistem ayarları yönetimi', 'settings', 1, '2025-10-17 14:12:59'),
(75, 'reports.view', 'Raporlar', 'Raporları görüntüleme', 'reports', 1, '2025-10-17 14:12:59'),
(76, 'employee_requests.manage', 'Çalışan Talepleri', 'Çalışan talepleri yönetimi', 'employees', 1, '2025-10-17 14:12:59'),
(77, 'roles.manage', 'Rol Yönetimi', 'Rol ekleme, düzenleme, silme', 'roles', 1, '2025-10-17 14:12:59'),
(78, 'categories.manage', 'Kategori Yönetimi', 'Kategori ekleme, düzenleme, silme', 'categories', 1, '2025-10-17 14:12:59'),
(79, 'view_users', 'KullanÄ±cÄ±larÄ± GÃ¶rÃ¼ntÃ¼leme', 'KullanÄ±cÄ±larÄ± gÃ¶rÃ¼ntÃ¼leme', 'users', 1, '2025-10-19 09:47:17'),
(80, 'view_employee_requests', 'Ã‡alÄ±ÅŸan Taleplerini GÃ¶rÃ¼ntÃ¼leme', 'Ã‡alÄ±ÅŸan taleplerini gÃ¶rÃ¼ntÃ¼leme', 'employee_requests', 1, '2025-10-19 09:47:26'),
(81, 'dashboard', 'Kontrol Paneli', 'Ana kontrol paneline erişim', 'dashboard', 1, '2025-10-19 19:20:06'),
(82, 'system_admin', 'Sistem Yönetimi', 'Tüm sistem ayarlarını yönetme', 'system', 1, '2025-10-19 19:20:06'),
(83, 'settings', 'Ayarlar', 'Sistem ayarlarını görüntüleme ve düzenleme', 'settings', 1, '2025-10-19 19:20:06'),
(84, 'users.view', 'Kullanıcıları Görüntüleme', 'Kullanıcı listesini görüntüleme', 'users', 1, '2025-10-19 19:20:06'),
(85, 'users.create', 'Kullanıcı Oluşturma', 'Yeni kullanıcı oluşturma', 'users', 1, '2025-10-19 19:20:06'),
(86, 'users.edit', 'Kullanıcı Düzenleme', 'Kullanıcı bilgilerini düzenleme', 'users', 1, '2025-10-19 19:20:06'),
(87, 'users.delete', 'Kullanıcı Silme', 'Kullanıcı silme', 'users', 1, '2025-10-19 19:20:06'),
(88, 'roles.view', 'Rolleri Görüntüleme', 'Rol listesini görüntüleme', 'roles', 1, '2025-10-19 19:20:06'),
(89, 'roles.create', 'Rol Oluşturma', 'Yeni rol oluşturma', 'roles', 1, '2025-10-19 19:20:06'),
(90, 'roles.edit', 'Rol Düzenleme', 'Rol bilgilerini düzenleme', 'roles', 1, '2025-10-19 19:20:06'),
(91, 'roles.delete', 'Rol Silme', 'Rol silme', 'roles', 1, '2025-10-19 19:20:06'),
(92, 'employee_requests', 'Çalışan Talepleri', 'Çalışan taleplerini görüntüleme ve yönetme', 'employee_requests', 1, '2025-10-19 19:20:06'),
(93, 'my_employees', 'Çalışanlarım', 'Kendi çalışanlarını yönetme', 'employees', 1, '2025-10-19 19:20:06'),
(94, 'brands.view', 'Markaları Görüntüleme', 'Marka listesini görüntüleme', 'brands', 1, '2025-10-19 19:20:06'),
(95, 'brands.create', 'Marka Oluşturma', 'Yeni marka oluşturma', 'brands', 1, '2025-10-19 19:20:06'),
(96, 'brands.edit', 'Marka Düzenleme', 'Marka bilgilerini düzenleme', 'brands', 1, '2025-10-19 19:20:06'),
(97, 'brands.delete', 'Marka Silme', 'Marka silme', 'brands', 1, '2025-10-19 19:20:06'),
(98, 'categories.view', 'Kategorileri Görüntüleme', 'Kategori listesini görüntüleme', 'categories', 1, '2025-10-19 19:20:06'),
(99, 'categories.create', 'Kategori Oluşturma', 'Yeni kategori oluşturma', 'categories', 1, '2025-10-19 19:20:06'),
(100, 'categories.edit', 'Kategori Düzenleme', 'Kategori bilgilerini düzenleme', 'categories', 1, '2025-10-19 19:20:06'),
(101, 'categories.delete', 'Kategori Silme', 'Kategori silme', 'categories', 1, '2025-10-19 19:20:06'),
(102, 'branches.view', 'Şubeleri Görüntüleme', 'Şube listesini görüntüleme', 'branches', 1, '2025-10-19 19:20:06'),
(103, 'branches.create', 'Şube Oluşturma', 'Yeni şube oluşturma', 'branches', 1, '2025-10-19 19:20:06'),
(104, 'branches.edit', 'Şube Düzenleme', 'Şube bilgilerini düzenleme', 'branches', 1, '2025-10-19 19:20:06'),
(105, 'branches.delete', 'Şube Silme', 'Şube silme', 'branches', 1, '2025-10-19 19:20:06'),
(106, 'branches.manage', 'Şube Yönetimi', 'Tüm şube işlemleri', 'branches', 1, '2025-10-19 19:20:06'),
(107, 'products.view', 'Ürünleri Görüntüleme', 'Ürün galerisini görüntüleme', 'products', 1, '2025-10-19 19:20:06'),
(108, 'products.create', 'Ürün Oluşturma', 'Yeni ürün oluşturma', 'products', 1, '2025-10-19 19:20:06'),
(109, 'products.edit', 'Ürün Düzenleme', 'Ürün bilgilerini düzenleme', 'products', 1, '2025-10-19 19:20:06'),
(110, 'products.delete', 'Ürün Silme', 'Ürün silme', 'products', 1, '2025-10-19 19:20:06'),
(111, 'products.upload', 'Ürün Yükleme', 'Toplu ürün yükleme', 'products', 1, '2025-10-19 19:20:06'),
(112, 'templates.view', 'Şablonları Görüntüleme', 'Şablon galerisini görüntüleme', 'templates', 1, '2025-10-19 19:20:06'),
(113, 'templates.create', 'Şablon Oluşturma', 'Yeni şablon oluşturma', 'templates', 1, '2025-10-19 19:20:06'),
(114, 'templates.edit', 'Şablon Düzenleme', 'Şablon düzenleme', 'templates', 1, '2025-10-19 19:20:06'),
(115, 'templates.delete', 'Şablon Silme', 'Şablon silme', 'templates', 1, '2025-10-19 19:20:06'),
(116, 'templates.use', 'Şablon Kullanma', 'Şablonları kullanma', 'templates', 1, '2025-10-19 19:20:06'),
(117, 'collages.view', 'Kolajları Görüntüleme', 'Kolaj galerisini görüntüleme', 'collages', 1, '2025-10-19 19:20:06'),
(118, 'collages.create', 'Kolaj Oluşturma', 'Yeni kolaj oluşturma', 'collages', 1, '2025-10-19 19:20:06'),
(119, 'collages.edit', 'Kolaj Düzenleme', 'Kolaj düzenleme', 'collages', 1, '2025-10-19 19:20:06'),
(120, 'collages.delete', 'Kolaj Silme', 'Kolaj silme', 'collages', 1, '2025-10-19 19:20:06'),
(121, 'collages.manage', 'Kolaj Yönetimi', 'Tüm kolaj işlemleri', 'collages', 1, '2025-10-19 19:20:06'),
(122, 'social_media', 'Sosyal Medya', 'Sosyal medya modülüne erişim', 'social_media', 1, '2025-10-19 19:20:06'),
(123, 'social.view', 'Sosyal Medya Görüntüleme', 'Sosyal medya kanallarını görüntüleme', 'social', 1, '2025-10-19 19:20:06'),
(124, 'social.create', 'Sosyal Medya Oluşturma', 'Yeni sosyal medya kanalı oluşturma', 'social', 1, '2025-10-19 19:20:06'),
(125, 'social.edit', 'Sosyal Medya Düzenleme', 'Sosyal medya kanallarını düzenleme', 'social', 1, '2025-10-19 19:20:06'),
(126, 'social.delete', 'Sosyal Medya Silme', 'Sosyal medya kanallarını silme', 'social', 1, '2025-10-19 19:20:06'),
(127, 'social.post', 'Gönderi Yayınlama', 'Sosyal medya gönderisi yayınlama', 'social', 1, '2025-10-19 19:20:06'),
(128, 'ai_templates', 'AI Şablonlar', 'AI destekli şablon üretimi', 'ai', 1, '2025-10-19 19:20:06'),
(129, 'price_extraction', 'Fiyat Çıkarma', 'Otomatik fiyat tanıma', 'ai', 1, '2025-10-19 19:20:06'),
(130, 'label_extraction', 'Etiket Çıkarma', 'Otomatik etiket tanıma', 'ai', 1, '2025-10-19 19:20:06'),
(131, 'analytics', 'Analitik', 'Detaylı sistem analitikleri', 'analytics', 1, '2025-10-19 19:20:06'),
(132, 'performance_monitor', 'Performans İzleme', 'Sistem performansını izleme', 'system', 1, '2025-10-19 19:20:06'),
(133, 'channels.view', 'Kanalları Görüntüle', 'Kanal listesini görüntüleme', 'channels', 1, '2025-10-21 11:42:09'),
(134, 'channels.manage', 'Kanal Yönetimi', 'Tüm kanal işlemleri', 'channels', 1, '2025-10-21 11:42:09'),
(135, 'employee_requests.view', 'Talepleri Görüntüle', 'Çalışan taleplerini görüntüleme', 'employee_requests', 1, '2025-10-21 11:42:09'),
(136, 'settings.view', 'Ayarları Görüntüle', 'Sistem ayarlarını görüntüleme', 'settings', 1, '2025-10-21 11:42:09');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `products`
--

DROP TABLE IF EXISTS `products`;
CREATE TABLE IF NOT EXISTS `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size_range` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `brand_id` int NOT NULL,
  `category_id` int DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USD',
  `code_2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color_2` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `product_type_2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size_range_2` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price_2` decimal(10,2) DEFAULT NULL,
  `currency_2` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `images` json DEFAULT NULL,
  `specifications` json DEFAULT NULL,
  `ai_extracted_data` json DEFAULT NULL,
  `seo_title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `seo_description` text COLLATE utf8mb4_unicode_ci,
  `seo_keywords` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `is_processed` tinyint(1) NOT NULL DEFAULT '0',
  `telegram_sent` tinyint(1) NOT NULL DEFAULT '0',
  `stock_quantity` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_products_slug` (`slug`),
  KEY `category_id` (`category_id`),
  KEY `updated_by` (`updated_by`),
  KEY `ix_products_id` (`id`),
  KEY `ix_products_brand_id` (`brand_id`),
  KEY `ix_products_name` (`name`(250)),
  KEY `ix_products_created_by` (`created_by`),
  KEY `ix_products_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `product_images`
--

DROP TABLE IF EXISTS `product_images`;
CREATE TABLE IF NOT EXISTS `product_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int DEFAULT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `angle` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `angle_number` int DEFAULT NULL,
  `is_cover_image` tinyint(1) DEFAULT NULL,
  `ai_analysis` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `ix_product_images_id` (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `roles`
--

DROP TABLE IF EXISTS `roles`;
CREATE TABLE IF NOT EXISTS `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `is_system_role` tinyint(1) DEFAULT '0',
  `permissions` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `roles_name` (`name`),
  KEY `ix_roles_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tablo döküm verisi `roles`
--

INSERT INTO `roles` (`id`, `name`, `display_name`, `description`, `is_active`, `is_system_role`, `permissions`, `created_at`, `updated_at`) VALUES
(1, 'super_admin', 'Super Admin', 'Sistem yöneticisi - tüm yetkilere sahip', 1, 1, NULL, '2025-10-15 14:18:35', '2025-10-17 17:46:03'),
(2, 'brand_manager', 'Marka Yöneticisi', 'Marka yönetimi ve ürünleri yönetme', 1, 0, NULL, '2025-10-15 14:18:35', '2025-10-21 11:54:30'),
(5, 'personel', 'Çalışan', 'Markaya atanan ürünleri yüklemek ve kolaj işlemlerinden sorummlu olan kişi', 1, 0, NULL, '2025-10-18 19:27:56', '2025-10-18 19:27:56');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_permission` (`role_id`,`permission_id`),
  KEY `idx_role_permissions_role` (`role_id`),
  KEY `idx_role_permissions_permission` (`permission_id`)
) ENGINE=InnoDB AUTO_INCREMENT=437 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Rol-İzin ilişki tablosu';

--
-- Tablo döküm verisi `role_permissions`
--

INSERT INTO `role_permissions` (`id`, `role_id`, `permission_id`, `created_at`) VALUES
(280, 1, 70, '2025-10-17 14:40:48'),
(281, 1, 78, '2025-10-17 14:40:48'),
(282, 1, 68, '2025-10-17 14:40:48'),
(283, 1, 76, '2025-10-17 14:40:48'),
(284, 1, 71, '2025-10-17 14:40:48'),
(285, 1, 75, '2025-10-17 14:40:48'),
(286, 1, 77, '2025-10-17 14:40:48'),
(287, 1, 74, '2025-10-17 14:40:48'),
(288, 1, 73, '2025-10-17 14:40:48'),
(289, 1, 72, '2025-10-17 14:40:48'),
(290, 1, 69, '2025-10-17 14:40:48'),
(295, 5, 68, '2025-10-18 16:27:56'),
(296, 5, 71, '2025-10-18 16:27:56'),
(297, 5, 72, '2025-10-18 16:27:56'),
(298, 5, 73, '2025-10-18 16:27:56'),
(364, 1, 79, '2025-10-21 11:42:09'),
(365, 1, 80, '2025-10-21 11:42:09'),
(366, 1, 81, '2025-10-21 11:42:09'),
(367, 1, 82, '2025-10-21 11:42:09'),
(368, 1, 83, '2025-10-21 11:42:09'),
(369, 1, 84, '2025-10-21 11:42:09'),
(370, 1, 85, '2025-10-21 11:42:09'),
(371, 1, 86, '2025-10-21 11:42:09'),
(372, 1, 87, '2025-10-21 11:42:09'),
(373, 1, 88, '2025-10-21 11:42:09'),
(374, 1, 89, '2025-10-21 11:42:09'),
(375, 1, 90, '2025-10-21 11:42:09'),
(376, 1, 91, '2025-10-21 11:42:09'),
(377, 1, 92, '2025-10-21 11:42:09'),
(378, 1, 93, '2025-10-21 11:42:09'),
(379, 1, 94, '2025-10-21 11:42:09'),
(380, 1, 95, '2025-10-21 11:42:09'),
(381, 1, 96, '2025-10-21 11:42:09'),
(382, 1, 97, '2025-10-21 11:42:09'),
(383, 1, 98, '2025-10-21 11:42:09'),
(384, 1, 99, '2025-10-21 11:42:09'),
(385, 1, 100, '2025-10-21 11:42:09'),
(386, 1, 101, '2025-10-21 11:42:09'),
(387, 1, 102, '2025-10-21 11:42:09'),
(388, 1, 103, '2025-10-21 11:42:09'),
(389, 1, 104, '2025-10-21 11:42:09'),
(390, 1, 105, '2025-10-21 11:42:09'),
(391, 1, 106, '2025-10-21 11:42:09'),
(392, 1, 107, '2025-10-21 11:42:09'),
(393, 1, 108, '2025-10-21 11:42:09'),
(394, 1, 109, '2025-10-21 11:42:09'),
(395, 1, 110, '2025-10-21 11:42:09'),
(396, 1, 111, '2025-10-21 11:42:09'),
(397, 1, 112, '2025-10-21 11:42:09'),
(398, 1, 113, '2025-10-21 11:42:09'),
(399, 1, 114, '2025-10-21 11:42:09'),
(400, 1, 115, '2025-10-21 11:42:09'),
(401, 1, 116, '2025-10-21 11:42:09'),
(402, 1, 117, '2025-10-21 11:42:09'),
(403, 1, 118, '2025-10-21 11:42:09'),
(404, 1, 119, '2025-10-21 11:42:09'),
(405, 1, 120, '2025-10-21 11:42:09'),
(406, 1, 121, '2025-10-21 11:42:09'),
(407, 1, 122, '2025-10-21 11:42:09'),
(408, 1, 123, '2025-10-21 11:42:09'),
(409, 1, 124, '2025-10-21 11:42:09'),
(410, 1, 125, '2025-10-21 11:42:09'),
(411, 1, 126, '2025-10-21 11:42:09'),
(412, 1, 127, '2025-10-21 11:42:09'),
(413, 1, 128, '2025-10-21 11:42:09'),
(414, 1, 129, '2025-10-21 11:42:09'),
(415, 1, 130, '2025-10-21 11:42:09'),
(416, 1, 131, '2025-10-21 11:42:09'),
(417, 1, 132, '2025-10-21 11:42:09'),
(418, 1, 133, '2025-10-21 11:42:09'),
(419, 1, 134, '2025-10-21 11:42:09'),
(420, 1, 135, '2025-10-21 11:42:09'),
(421, 1, 136, '2025-10-21 11:42:09'),
(427, 2, 68, '2025-10-21 11:54:29'),
(428, 2, 70, '2025-10-21 11:54:29'),
(429, 2, 71, '2025-10-21 11:54:29'),
(430, 2, 72, '2025-10-21 11:54:29'),
(431, 2, 73, '2025-10-21 11:54:29'),
(432, 2, 75, '2025-10-21 11:54:29'),
(433, 2, 76, '2025-10-21 11:54:29'),
(434, 2, 78, '2025-10-21 11:54:29'),
(435, 2, 79, '2025-10-21 11:54:29'),
(436, 2, 80, '2025-10-21 11:54:29');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `settings`
--

DROP TABLE IF EXISTS `settings`;
CREATE TABLE IF NOT EXISTS `settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci,
  `value_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_public` tinyint(1) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_sensitive` tinyint(1) DEFAULT '0',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_settings_category` (`category`),
  KEY `ix_settings_id` (`id`),
  KEY `ix_settings_key` (`key`(250))
) ENGINE=MyISAM AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tablo döküm verisi `settings`
--

INSERT INTO `settings` (`id`, `category`, `key`, `value`, `value_type`, `description`, `is_public`, `is_active`, `is_sensitive`, `updated_at`, `created_at`) VALUES
(1, 'system', 'app_name', 'Pofuduk Digital AI', NULL, 'Uygulama adı', NULL, 1, 0, '2025-10-15 14:20:03', '2025-10-15 14:20:03'),
(2, 'system', 'version', '2.0', NULL, 'Uygulama versiyonu', NULL, 1, 0, '2025-10-15 14:20:03', '2025-10-15 14:20:03'),
(3, 'upload', 'max_file_size', '10', NULL, 'Maksimum dosya boyutu (MB)', NULL, 1, 0, '2025-10-15 14:20:03', '2025-10-15 14:20:03'),
(4, 'upload', 'allowed_extensions', 'jpg,jpeg,png,webp', NULL, 'İzin verilen uzantılar', NULL, 1, 0, '2025-10-15 14:20:03', '2025-10-15 14:20:03'),
(5, 'email', 'smtp_server', 'kolajbot.com', NULL, 'SMTP Sunucu', NULL, 1, 0, '2025-10-18 19:00:16', '2025-10-15 14:20:03'),
(6, 'email', 'smtp_port', '465', NULL, 'SMTP Port', NULL, 1, 0, '2025-10-18 18:20:01', '2025-10-15 14:20:03'),
(7, 'email', 'from_email', 'info@kolajbot.com', NULL, 'Gönderen e-posta', NULL, 1, 0, '2025-10-18 19:00:10', '2025-10-15 14:20:03'),
(8, 'ocr', 'google_ai_api_key', 'AIzaSyDeDZ4OruZkvQn3kpmUa0LT8YP3dpFRcDY', NULL, 'Google AI Vision API Anahtarı', NULL, 1, 0, '2025-10-17 12:25:02', '2025-10-15 14:28:42'),
(9, 'ocr', 'parallel_workers', '10', NULL, 'Paralel OCR İşçi Sayısı', NULL, 1, 0, '2025-10-15 14:28:53', '2025-10-15 14:28:53'),
(10, 'ocr', 'ocr_timeout', '30', NULL, 'OCR Zaman Aşımı (saniye)', NULL, 1, 0, '2025-10-15 14:28:53', '2025-10-15 14:28:53'),
(11, 'ocr', 'ocr_retry_count', '3', NULL, 'OCR Yeniden Deneme Sayısı', NULL, 1, 0, '2025-10-15 14:28:53', '2025-10-15 14:28:53'),
(12, 'upload', 'max_file_count', '500', NULL, 'Maksimum Dosya Sayısı', NULL, 1, 0, '2025-10-15 14:28:53', '2025-10-15 14:28:53'),
(13, 'upload', 'max_file_size_mb', '10', NULL, 'Maksimum Dosya Boyutu (MB)', NULL, 1, 0, '2025-10-15 14:28:53', '2025-10-15 14:28:53'),
(14, 'upload', 'total_upload_size_mb', '1000', NULL, 'Toplam Yükleme Boyutu (MB)', NULL, 1, 0, '2025-10-15 14:28:53', '2025-10-15 14:28:53'),
(15, 'upload', 'storage_path', 'uploads', NULL, 'Dosya Depolama Yolu', NULL, 1, 0, '2025-10-15 14:28:53', '2025-10-15 14:28:53'),
(16, 'email', 'smtp_username', 'info@kolajbot.com', NULL, 'SMTP Kullanıcı Adı', NULL, 1, 0, '2025-10-18 19:00:12', '2025-10-15 14:28:53'),
(17, 'email', 'smtp_password', 'ilkN.2801', NULL, 'SMTP Şifre', NULL, 1, 0, '2025-10-18 18:16:46', '2025-10-15 14:28:53'),
(18, 'email', 'smtp_use_ssl', 'true', NULL, 'SMTP SSL Kullan', NULL, 1, 0, '2025-10-18 18:20:01', '2025-10-15 14:28:53'),
(19, 'email', 'smtp_use_tls', 'false', NULL, 'SMTP TLS Kullan', NULL, 1, 0, '2025-10-18 18:20:01', '2025-10-15 14:28:53'),
(20, 'email', 'from_name', 'Kolaj Bot | Pofuduk Dijital', NULL, 'Gönderen Adı', NULL, 1, 0, '2025-10-18 17:54:06', '2025-10-15 14:28:53'),
(21, 'general', 'index_title', 'KolajBot - Otomatik Kolaj Sistemi | Panel', NULL, 'Ana Sayfa Başlığı', NULL, 1, 0, '2025-10-19 23:59:14', '2025-10-15 14:28:53'),
(22, 'general', 'logo_url', 'https://kolajbot.com/wp-content/uploads/2025/10/kolajbot-logo-1.png', NULL, 'Logo URL', NULL, 1, 0, '2025-10-19 23:58:06', '2025-10-15 14:28:53'),
(23, 'general', 'meta_description', 'AI destekli dijital marka yönetim platformu', NULL, 'Meta Açıklama', NULL, 1, 0, '2025-10-15 14:28:53', '2025-10-15 14:28:53'),
(24, 'general', 'meta_keywords', 'dijital marka, AI, yapay zeka, marka yönetimi', NULL, 'Meta Anahtar Kelimeleri', NULL, 1, 0, '2025-10-15 14:28:53', '2025-10-15 14:28:53'),
(25, 'system', 'maintenance_mode', 'false', NULL, 'Bakım modu', NULL, 1, 0, '2025-10-19 22:37:58', '2025-10-19 22:37:58'),
(26, 'upload', 'max_files_per_upload', '100', NULL, 'Yükleme başına maksimum dosya', NULL, 1, 0, '2025-10-19 22:37:58', '2025-10-19 22:37:58'),
(27, 'ocr', 'google_vision_api_key', '', NULL, 'Google Vision API Anahtarı', NULL, 1, 1, '2025-10-19 22:37:58', '2025-10-19 22:37:58');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `social_media_channels`
--

DROP TABLE IF EXISTS `social_media_channels`;
CREATE TABLE IF NOT EXISTS `social_media_channels` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `platform` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `member_count` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `last_activity` datetime DEFAULT NULL,
  `telegram_bot_id` int DEFAULT NULL COMMENT 'Related Telegram bot',
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `access_token` text COLLATE utf8mb4_unicode_ci,
  `chat_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `channel_username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Channel username',
  `webhook_url` text COLLATE utf8mb4_unicode_ci,
  `api_key` text COLLATE utf8mb4_unicode_ci,
  `api_secret` text COLLATE utf8mb4_unicode_ci,
  `brand_id` int NOT NULL,
  `created_by` int NOT NULL,
  `updated_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `phone_number_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business_account_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_user_ids` json DEFAULT NULL COMMENT 'List of user IDs who can manage this channel',
  PRIMARY KEY (`id`),
  KEY `ix_social_media_channels_id` (`id`),
  KEY `fk_channels_brand` (`brand_id`),
  KEY `fk_social_channels_created_by` (`created_by`),
  KEY `fk_social_channels_updated_by` (`updated_by`),
  KEY `fk_telegram_bot` (`telegram_bot_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `social_media_messages`
--

DROP TABLE IF EXISTS `social_media_messages`;
CREATE TABLE IF NOT EXISTS `social_media_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `channel_id` int NOT NULL,
  `message_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message_text` text COLLATE utf8mb4_unicode_ci,
  `sender_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sender_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recipient_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `media_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timestamp` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_sent` tinyint(1) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_social_media_messages_id` (`id`),
  KEY `fk_social_messages_channel` (`channel_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `telegram_bots`
--

DROP TABLE IF EXISTS `telegram_bots`;
CREATE TABLE IF NOT EXISTS `telegram_bots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bot_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Bot display name',
  `bot_username` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Bot Telegram username',
  `bot_token` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Telegram bot token',
  `bot_user_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Telegram bot user ID',
  `is_active` tinyint(1) DEFAULT '1',
  `is_verified` tinyint(1) DEFAULT '0' COMMENT 'Bot token verified',
  `last_verified_at` datetime DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bot_username` (`bot_username`),
  KEY `created_by` (`created_by`),
  KEY `idx_bot_username` (`bot_username`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_bot_token` (`bot_token`(255))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Telegram bots - centralized management';

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `templates`
--

DROP TABLE IF EXISTS `templates`;
CREATE TABLE IF NOT EXISTS `templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` int NOT NULL,
  `brand_id` int NOT NULL,
  `template_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `preview_image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `template_data` json NOT NULL,
  `thumbnail` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `settings` json DEFAULT NULL,
  `is_premium` tinyint(1) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `is_auto_generated` tinyint(1) DEFAULT '0',
  `is_master_template` tinyint(1) DEFAULT '0',
  `visibility` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'PRIVATE',
  `placeholders` json DEFAULT NULL,
  `assigned_brands` json DEFAULT NULL,
  `permissions` json DEFAULT NULL,
  `usage_count` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_templates_slug` (`slug`),
  KEY `ix_templates_is_active` (`is_active`),
  KEY `ix_templates_name` (`name`(250)),
  KEY `ix_templates_id` (`id`),
  KEY `ix_templates_created_by` (`created_by`),
  KEY `fk_templates_product` (`product_id`),
  KEY `fk_templates_brand` (`brand_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `template_permissions`
--

DROP TABLE IF EXISTS `template_permissions`;
CREATE TABLE IF NOT EXISTS `template_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `brand_id` int NOT NULL,
  `can_view` tinyint(1) DEFAULT '1',
  `can_use` tinyint(1) DEFAULT '1',
  `can_edit` tinyint(1) DEFAULT '0',
  `can_duplicate` tinyint(1) DEFAULT '1',
  `granted_by` int DEFAULT NULL,
  `granted_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_template_brand` (`template_id`,`brand_id`),
  KEY `granted_by` (`granted_by`),
  KEY `idx_template_permissions_template` (`template_id`),
  KEY `idx_template_permissions_brand` (`brand_id`),
  KEY `idx_template_permissions_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `upload_jobs`
--

DROP TABLE IF EXISTS `upload_jobs`;
CREATE TABLE IF NOT EXISTS `upload_jobs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `brand_id` int NOT NULL,
  `uploader_id` int NOT NULL,
  `brand_manager_id` int DEFAULT NULL,
  `upload_date` datetime NOT NULL,
  `total_files` int DEFAULT NULL,
  `processed_files` int DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `base_path` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_list` json DEFAULT NULL,
  `processing_log` json DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `products_created` int DEFAULT NULL,
  `templates_created` int DEFAULT NULL,
  `ocr_processed` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `brand_id` (`brand_id`),
  KEY `uploader_id` (`uploader_id`),
  KEY `brand_manager_id` (`brand_manager_id`),
  KEY `ix_upload_jobs_id` (`id`),
  KEY `ix_upload_jobs_created_at` (`created_at`),
  KEY `ix_upload_jobs_status` (`status`)
) ENGINE=MyISAM AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tablo döküm verisi `upload_jobs`
--

INSERT INTO `upload_jobs` (`id`, `brand_id`, `uploader_id`, `brand_manager_id`, `upload_date`, `total_files`, `processed_files`, `status`, `base_path`, `file_list`, `processing_log`, `error_message`, `products_created`, `templates_created`, `ocr_processed`, `created_at`, `started_at`, `completed_at`) VALUES
(5, 1, 4, NULL, '2025-10-25 23:10:08', 28, 28, 'completed', 'C:\\Users\\ilker\\Desktop\\aibrands\\uploads\\Dizayn Brands\\4\\25102025', NULL, '{\"stats\": {\"cdn_uploads\": 28, \"ocr_cache_hits\": 0, \"files_processed\": 0, \"database_batches\": 1, \"ocr_cache_misses\": 7}, \"images_created\": 0, \"products_created\": 0}', NULL, 0, 0, 0, '2025-10-25 20:10:08', NULL, '2025-10-25 20:10:12');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role_id` int NOT NULL,
  `brand_id` int DEFAULT NULL,
  `brand_ids` json DEFAULT NULL,
  `branch_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `is_2fa_enabled` tinyint(1) DEFAULT '0',
  `two_fa_secret` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `must_change_password` tinyint(1) DEFAULT '0',
  `failed_login_attempts` int NOT NULL DEFAULT '0',
  `locked_until` datetime DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `role_id` (`role_id`),
  KEY `ix_users_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Tablo döküm verisi `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `first_name`, `last_name`, `phone_number`, `phone`, `role_id`, `brand_id`, `brand_ids`, `branch_id`, `is_active`, `is_2fa_enabled`, `two_fa_secret`, `must_change_password`, `failed_login_attempts`, `locked_until`, `is_verified`, `created_at`, `updated_at`, `last_login`) VALUES
(2, 'ilker@bomontimezat.com', '$2b$12$qjNEaZniJm11IRG7pjH39uLso8DeA3YPLl.Ri353ibroB7PDO7cDO', 'İlker', 'Aydoğdu', NULL, NULL, 2, NULL, '[1]', NULL, 1, 0, NULL, 0, 0, NULL, NULL, '2025-10-17 12:35:41', '2025-10-21 16:22:39', '2025-10-21 13:22:40'),
(4, 'admin@pfdk.me', '$2b$12$K.hXrpGxSlyEBFnvJTF4IOToA5226.YafKF7pxkXJTkTN.OMkTXYi', 'Pofuduk', 'Dijital', NULL, NULL, 1, NULL, '[]', NULL, 1, 0, NULL, 0, 0, NULL, NULL, '2025-10-17 18:10:03', '2025-10-23 19:49:40', '2025-10-23 16:49:40'),
(8, 'info@kolajbot.com', '$2b$12$jXup2HR5xhEshppxN6U1MuiRrXbZyh39quy7sXdSuTwevNxc6gG9a', 'İlker', 'Aydoğdu', NULL, NULL, 5, NULL, '[1]', NULL, 1, 0, NULL, 0, 0, NULL, NULL, '2025-10-21 14:43:57', '2025-10-21 14:48:48', '2025-10-21 11:48:48');

-- --------------------------------------------------------

--
-- Tablo için tablo yapısı `user_brands`
--

DROP TABLE IF EXISTS `user_brands`;
CREATE TABLE IF NOT EXISTS `user_brands` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `brand_id` int NOT NULL,
  `access_level` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_brand` (`user_id`,`brand_id`),
  KEY `ix_user_brands_brand_id` (`brand_id`),
  KEY `ix_user_brands_id` (`id`),
  KEY `ix_user_brands_user_id` (`user_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dökümü yapılmış tablolar için kısıtlamalar
--

--
-- Tablo kısıtlamaları `brand_requests`
--
ALTER TABLE `brand_requests`
  ADD CONSTRAINT `fk_brand_requests_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_brand_requests_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT;

--
-- Tablo kısıtlamaları `employee_requests`
--
ALTER TABLE `employee_requests`
  ADD CONSTRAINT `fk_employee_requests_approved_by` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_employee_requests_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_employee_requests_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Tablo kısıtlamaları `social_media_channels`
--
ALTER TABLE `social_media_channels`
  ADD CONSTRAINT `fk_social_channels_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_social_channels_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_telegram_bot` FOREIGN KEY (`telegram_bot_id`) REFERENCES `telegram_bots` (`id`) ON DELETE SET NULL;

--
-- Tablo kısıtlamaları `social_media_messages`
--
ALTER TABLE `social_media_messages`
  ADD CONSTRAINT `fk_social_messages_channel` FOREIGN KEY (`channel_id`) REFERENCES `social_media_channels` (`id`) ON DELETE CASCADE;

--
-- Tablo kısıtlamaları `telegram_bots`
--
ALTER TABLE `telegram_bots`
  ADD CONSTRAINT `telegram_bots_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Tablo kısıtlamaları `template_permissions`
--
ALTER TABLE `template_permissions`
  ADD CONSTRAINT `template_permissions_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `template_permissions_ibfk_2` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `template_permissions_ibfk_3` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
