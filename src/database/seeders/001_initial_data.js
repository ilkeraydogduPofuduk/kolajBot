/**
 * Initial Data Seeder
 * Seeds default roles, permissions, admin user, and settings
 */

import Security from '../../core/security/Security.js';

export async function seed(db) {
  console.log('🌱 Seeding initial data...');

  // 1. Create default roles
  console.log('   Creating roles...');
  const roles = await db.table('roles').insert([
    { name: 'super_admin', description: 'Full system access', is_active: true },
    { name: 'brand_manager', description: 'Brand and collage management', is_active: true },
    { name: 'employee', description: 'Limited employee access', is_active: true }
  ]).returning('*');

  const roleMap = {
    super_admin: roles.find(r => r.name === 'super_admin').id,
    brand_manager: roles.find(r => r.name === 'brand_manager').id,
    employee: roles.find(r => r.name === 'employee').id
  };

  // 2. Create permissions
  console.log('   Creating permissions...');
  const permissions = await db.table('permissions').insert([
    // User Management
    { name: 'users.view', description: 'View users', module: 'users' },
    { name: 'users.create', description: 'Create users', module: 'users' },
    { name: 'users.update', description: 'Update users', module: 'users' },
    { name: 'users.delete', description: 'Delete users', module: 'users' },

    // Role Management
    { name: 'roles.view', description: 'View roles', module: 'roles' },
    { name: 'roles.create', description: 'Create roles', module: 'roles' },
    { name: 'roles.update', description: 'Update roles', module: 'roles' },
    { name: 'roles.delete', description: 'Delete roles', module: 'roles' },

    // Settings
    { name: 'settings.view', description: 'View settings', module: 'settings' },
    { name: 'settings.update', description: 'Update settings', module: 'settings' },

    // Brand Management
    { name: 'brands.view', description: 'View brands', module: 'brands' },
    { name: 'brands.create', description: 'Create brands', module: 'brands' },
    { name: 'brands.update', description: 'Update brands', module: 'brands' },
    { name: 'brands.delete', description: 'Delete brands', module: 'brands' },

    // Collage Management
    { name: 'collages.view', description: 'View collages', module: 'collages' },
    { name: 'collages.create', description: 'Create collages', module: 'collages' },
    { name: 'collages.update', description: 'Update collages', module: 'collages' },
    { name: 'collages.delete', description: 'Delete collages', module: 'collages' },
    { name: 'collages.generate', description: 'Generate collages', module: 'collages' },

    // Analytics
    { name: 'analytics.view', description: 'View analytics', module: 'analytics' }
  ]).returning('*');

  // 3. Assign permissions to roles
  console.log('   Assigning permissions to roles...');

  // Super Admin gets all permissions
  const superAdminPermissions = permissions.map(p => ({
    role_id: roleMap.super_admin,
    permission_id: p.id
  }));

  // Brand Manager gets brand, collage, and analytics permissions
  const brandManagerPermissions = permissions
    .filter(p => ['brands', 'collages', 'analytics'].includes(p.module))
    .map(p => ({
      role_id: roleMap.brand_manager,
      permission_id: p.id
    }));

  // Employee gets view-only permissions for brands and collages
  const employeePermissions = permissions
    .filter(p => ['brands.view', 'collages.view'].includes(p.name))
    .map(p => ({
      role_id: roleMap.employee,
      permission_id: p.id
    }));

  await db.table('role_permissions').insert([
    ...superAdminPermissions,
    ...brandManagerPermissions,
    ...employeePermissions
  ]);

  // 4. Create default admin user
  console.log('   Creating default admin user...');
  const hashedPassword = await Security.hashPassword('Admin123!');

  await db.table('users').insert({
    email: 'admin@kolajbot.com',
    password_hash: hashedPassword,
    first_name: 'System',
    last_name: 'Administrator',
    phone_number: null,
    role_id: roleMap.super_admin,
    is_active: true,
    is_2fa_enabled: false,
    must_change_password: true,
    failed_login_attempts: 0
  });

  // 5. Create default settings
  console.log('   Creating default settings...');
  await db.table('settings').insert([
    { key: 'app_name', value: 'KolajBot', type: 'string', description: 'Application name' },
    { key: 'app_version', value: '3.0.0', type: 'string', description: 'Application version' },
    { key: 'max_file_size', value: '10485760', type: 'number', description: 'Max file upload size (bytes)' },
    { key: 'allowed_image_types', value: 'jpg,jpeg,png,gif,webp', type: 'string', description: 'Allowed image file types' },
    { key: 'collage_max_images', value: '100', type: 'number', description: 'Maximum images per collage' },
    { key: 'collage_default_grid', value: '3x3', type: 'string', description: 'Default collage grid layout' },
    { key: 'session_timeout', value: '604800', type: 'number', description: 'Session timeout in seconds (7 days)' },
    { key: 'max_login_attempts', value: '5', type: 'number', description: 'Maximum failed login attempts' },
    { key: 'account_lockout_duration', value: '900', type: 'number', description: 'Account lockout duration in seconds (15 min)' },
    { key: 'email_from_address', value: 'noreply@kolajbot.com', type: 'string', description: 'Email from address' },
    { key: 'email_from_name', value: 'KolajBot', type: 'string', description: 'Email from name' },
    { key: 'maintenance_mode', value: 'false', type: 'boolean', description: 'Maintenance mode enabled' }
  ]);

  console.log('✅ Initial data seeded successfully');
  console.log('   📧 Admin: admin@kolajbot.com');
  console.log('   🔑 Password: Admin123! (must change on first login)');
  console.log(`   👥 Roles: ${roles.length} created`);
  console.log(`   🔐 Permissions: ${permissions.length} created`);
}

export default { seed };
