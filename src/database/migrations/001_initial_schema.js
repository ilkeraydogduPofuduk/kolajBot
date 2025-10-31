/**
 * Initial Database Schema Migration
 * Creates all core tables
 */

export async function up(schema) {
  // Users table
  await schema.createTable('users', (table) => {
    table.bigIncrements('id');
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('phone_number', 20).nullable();
    table.integer('role_id').notNullable();
    table.boolean('is_active').notNullable().default(true);
    table.boolean('is_2fa_enabled').notNullable().default(false);
    table.string('two_fa_secret', 255).nullable();
    table.boolean('must_change_password').notNullable().default(false);
    table.timestamp('last_login').nullable();
    table.integer('failed_login_attempts').notNullable().default(0);
    table.timestamp('locked_until').nullable();
    table.addTimestamps();
  });

  // Roles table
  await schema.createTable('roles', (table) => {
    table.increments('id');
    table.string('name', 100).notNullable().unique();
    table.string('description', 255).nullable();
    table.boolean('is_active').notNullable().default(true);
    table.addTimestamps();
  });

  // Permissions table
  await schema.createTable('permissions', (table) => {
    table.increments('id');
    table.string('name', 100).notNullable().unique();
    table.string('description', 255).nullable();
    table.string('module', 50).notNullable();
    table.addTimestamps();
  });

  // Role-Permissions junction
  await schema.createTable('role_permissions', (table) => {
    table.increments('id');
    table.integer('role_id').notNullable();
    table.integer('permission_id').notNullable();
    table.addTimestamps();
    table.addUnique(['role_id', 'permission_id']);
  });

  // Settings table
  await schema.createTable('settings', (table) => {
    table.increments('id');
    table.string('key', 100).notNullable().unique();
    table.text('value').nullable();
    table.string('type', 20).notNullable().default('string');
    table.string('description', 255).nullable();
    table.addTimestamps();
  });

  // Session logs
  await schema.createTable('session_logs', (table) => {
    table.bigIncrements('id');
    table.string('session_id', 255).notNullable();
    table.bigInteger('user_id').notNullable();
    table.string('action', 50).notNullable();
    table.string('ip_address', 45).nullable();
    table.text('user_agent').nullable();
    table.jsonb('device_info').nullable();
    table.timestamp('created_at').notNullable();
    table.addIndex('user_id');
    table.addIndex('session_id');
  });

  // Email logs
  await schema.createTable('email_logs', (table) => {
    table.bigIncrements('id');
    table.string('to', 255).notNullable();
    table.string('subject', 255).notNullable();
    table.string('status', 20).notNullable();
    table.string('message_id', 255).nullable();
    table.string('template', 100).nullable();
    table.text('error').nullable();
    table.timestamp('sent_at').notNullable();
  });

  // Email queue
  await schema.createTable('email_queue', (table) => {
    table.bigIncrements('id');
    table.string('recipient', 255).notNullable();
    table.string('subject', 255).notNullable();
    table.string('template', 100).nullable();
    table.jsonb('template_data').nullable();
    table.text('html').nullable();
    table.timestamp('scheduled_for').notNullable();
    table.string('status', 20).notNullable().default('pending');
    table.integer('attempts').notNullable().default(0);
    table.text('last_error').nullable();
    table.timestamp('sent_at').nullable();
    table.addTimestamps();
  });

  // Notifications
  await schema.createTable('notifications', (table) => {
    table.bigIncrements('id');
    table.bigInteger('user_id').notNullable();
    table.string('type', 50).notNullable();
    table.string('title', 255).notNullable();
    table.text('message').notNullable();
    table.jsonb('data').nullable();
    table.string('priority', 20).notNullable().default('normal');
    table.boolean('is_read').notNullable().default(false);
    table.timestamp('read_at').nullable();
    table.addTimestamps();
    table.addIndex('user_id');
  });

  console.log('✅ Initial schema created');
}

export async function down(schema) {
  await schema.dropTable('notifications');
  await schema.dropTable('email_queue');
  await schema.dropTable('email_logs');
  await schema.dropTable('session_logs');
  await schema.dropTable('settings');
  await schema.dropTable('role_permissions');
  await schema.dropTable('permissions');
  await schema.dropTable('roles');
  await schema.dropTable('users');

  console.log('✅ Initial schema dropped');
}

export default { up, down };
