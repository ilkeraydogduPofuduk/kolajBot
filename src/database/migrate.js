#!/usr/bin/env node
/**
 * Database Migration Runner
 * Runs migrations and seeders
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import DatabaseManager from '../core/database/DatabaseManager.js';
import { MigrationManager } from '../core/database/MigrationManager.js';
import ConfigManager from '../core/config/ConfigManager.js';
import Logger from '../core/logging/Logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const commands = {
  up: 'Run all pending migrations',
  down: 'Rollback the last migration batch',
  reset: 'Rollback all migrations',
  refresh: 'Reset and re-run all migrations',
  status: 'Show migration status',
  fresh: 'Drop all tables and re-run migrations'
};

async function main() {
  const command = process.argv[2] || 'up';

  if (!commands[command]) {
    console.log('Available commands:');
    Object.entries(commands).forEach(([cmd, desc]) => {
      console.log(`  ${cmd.padEnd(10)} - ${desc}`);
    });
    process.exit(1);
  }

  try {
    console.log(`\n🔄 Running migration: ${command}\n`);

    // Initialize
    ConfigManager.loadEnv();
    Logger.initialize({ level: 'info', logsDir: 'logs' });
    DatabaseManager.setLogger(Logger);

    // Connect to database
    await DatabaseManager.addConnection('default', ConfigManager.database());
    const db = DatabaseManager.connection('default');

    // Create migrations table if it doesn't exist
    await db.raw(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        batch INTEGER NOT NULL,
        migration_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Initialize migration manager
    const migrationsDir = join(__dirname, 'migrations');
    const migrationManager = new MigrationManager(db, migrationsDir);

    // Run command
    switch (command) {
      case 'up':
        await migrationManager.up();
        break;
      case 'down':
        await migrationManager.down();
        break;
      case 'reset':
        await migrationManager.reset();
        break;
      case 'refresh':
        await migrationManager.refresh();
        break;
      case 'status':
        await migrationManager.status();
        break;
      case 'fresh':
        // Drop all tables
        const tables = await db.raw(`
          SELECT tablename FROM pg_tables
          WHERE schemaname = 'public'
        `);
        for (const table of tables) {
          await db.raw(`DROP TABLE IF EXISTS ${table.tablename} CASCADE`);
          console.log(`   Dropped table: ${table.tablename}`);
        }
        await migrationManager.up();
        break;
    }

    console.log('\n✅ Migration completed successfully!\n');
    await DatabaseManager.closeAll();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    await DatabaseManager.closeAll();
    process.exit(1);
  }
}

main();
