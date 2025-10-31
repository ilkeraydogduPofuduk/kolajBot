#!/usr/bin/env node
/**
 * Database Seeder Runner
 * Runs all seeders in order
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import DatabaseManager from '../core/database/DatabaseManager.js';
import ConfigManager from '../core/config/ConfigManager.js';
import Logger from '../core/logging/Logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runSeeders() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Initialize
    ConfigManager.loadEnv();
    Logger.initialize({ level: 'info', logsDir: 'logs' });
    DatabaseManager.setLogger(Logger);

    // Connect to database
    await DatabaseManager.addConnection('default', ConfigManager.database());
    const db = DatabaseManager.connection('default');

    // Get all seeder files
    const seedersDir = join(__dirname, 'seeders');
    const seederFiles = readdirSync(seedersDir)
      .filter(file => file.endsWith('.js'))
      .sort();

    if (seederFiles.length === 0) {
      console.log('⚠️  No seeders found');
      process.exit(0);
    }

    // Run each seeder
    for (const file of seederFiles) {
      console.log(`📦 Running seeder: ${file}`);
      const seederPath = join(seedersDir, file);
      const seeder = await import(seederPath);
      await seeder.seed(db);
      console.log();
    }

    console.log('✅ All seeders completed successfully!\n');
    await DatabaseManager.closeAll();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await DatabaseManager.closeAll();
    process.exit(1);
  }
}

runSeeders();
