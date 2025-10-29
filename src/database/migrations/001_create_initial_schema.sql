-- Migration: Create Initial Database Schema
-- Version: 001
-- Description: Creates all tables for KolajBot application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_name ON categories(name);

-- Brands Table
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  logo_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  product_ids JSONB DEFAULT '[]'::jsonb,
  template_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_brands_name ON brands(name);
CREATE INDEX idx_brands_category_id ON brands(category_id);
CREATE INDEX idx_brands_is_active ON brands(is_active);

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_system_role BOOLEAN DEFAULT FALSE,
  permissions JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_roles_name ON roles(name);

-- Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  module VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permissions_name ON permissions(name);
CREATE INDEX idx_permissions_module ON permissions(module);

-- Role Permissions Junction Table
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  brand_ids JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  is_2fa_enabled BOOLEAN DEFAULT FALSE,
  two_fa_secret VARCHAR(32),
  must_change_password BOOLEAN DEFAULT FALSE,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  is_verified BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100),
  color VARCHAR(50),
  product_type VARCHAR(100),
  size_range VARCHAR(50),
  slug VARCHAR(255) UNIQUE,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  price DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'USD',
  code_2 VARCHAR(100),
  color_2 VARCHAR(50),
  product_type_2 VARCHAR(100),
  size_range_2 VARCHAR(50),
  price_2 DECIMAL(10,2),
  currency_2 VARCHAR(10),
  images JSONB DEFAULT '[]'::jsonb,
  specifications JSONB DEFAULT '{}'::jsonb,
  ai_extracted_data JSONB DEFAULT '{}'::jsonb,
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  is_processed BOOLEAN DEFAULT FALSE,
  telegram_sent BOOLEAN DEFAULT FALSE,
  stock_quantity INTEGER,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_brand_id ON products(brand_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_created_at ON products(created_at);

-- Product Images Table
CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  image_type VARCHAR(50) NOT NULL,
  angle VARCHAR(20),
  angle_number INTEGER,
  is_cover_image BOOLEAN DEFAULT FALSE,
  ai_analysis JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);

-- Templates Table
CREATE TABLE IF NOT EXISTS templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(191) NOT NULL UNIQUE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  template_type VARCHAR(50) NOT NULL,
  preview_image VARCHAR(500),
  template_data JSONB NOT NULL,
  thumbnail VARCHAR(500),
  settings JSONB,
  is_premium BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_auto_generated BOOLEAN DEFAULT FALSE,
  is_master_template BOOLEAN DEFAULT FALSE,
  visibility VARCHAR(20) DEFAULT 'PRIVATE',
  placeholders JSONB,
  assigned_brands JSONB,
  permissions JSONB,
  usage_count INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_brand_id ON templates(brand_id);
CREATE INDEX idx_templates_product_id ON templates(product_id);
CREATE INDEX idx_templates_slug ON templates(slug);
CREATE INDEX idx_templates_is_active ON templates(is_active);

-- Telegram Bots Table
CREATE TABLE IF NOT EXISTS telegram_bots (
  id SERIAL PRIMARY KEY,
  bot_name VARCHAR(255) NOT NULL,
  bot_username VARCHAR(255) NOT NULL UNIQUE,
  bot_token TEXT NOT NULL,
  bot_user_id VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  last_verified_at TIMESTAMP,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_telegram_bots_username ON telegram_bots(bot_username);

-- Social Media Channels Table
CREATE TABLE IF NOT EXISTS social_media_channels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  channel_id VARCHAR(255) NOT NULL,
  member_count INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMP,
  telegram_bot_id INTEGER REFERENCES telegram_bots(id) ON DELETE SET NULL,
  phone_number VARCHAR(20),
  access_token TEXT,
  chat_id VARCHAR(255),
  channel_username VARCHAR(255),
  webhook_url TEXT,
  api_key TEXT,
  api_secret TEXT,
  phone_number_id VARCHAR(50),
  business_account_id VARCHAR(50),
  assigned_user_ids JSONB,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_social_channels_brand_id ON social_media_channels(brand_id);
CREATE INDEX idx_social_channels_platform ON social_media_channels(platform);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  key VARCHAR(255) NOT NULL UNIQUE,
  value TEXT,
  value_type VARCHAR(20),
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_sensitive BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_settings_category ON settings(category);
CREATE INDEX idx_settings_key ON settings(key);

-- Upload Jobs Table
CREATE TABLE IF NOT EXISTS upload_jobs (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  uploader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  upload_date TIMESTAMP NOT NULL,
  total_files INTEGER,
  processed_files INTEGER,
  status VARCHAR(20),
  base_path TEXT NOT NULL,
  file_list JSONB,
  processing_log JSONB,
  error_message TEXT,
  products_created INTEGER,
  templates_created INTEGER,
  ocr_processed INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_upload_jobs_brand_id ON upload_jobs(brand_id);
CREATE INDEX idx_upload_jobs_status ON upload_jobs(status);
CREATE INDEX idx_upload_jobs_created_at ON upload_jobs(created_at);
