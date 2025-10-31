#!/usr/bin/env node
/**
 * Database Creation Script
 * Creates the database if it doesn't exist
 */

import pkg from 'pg';
const { Client } = pkg;
import ConfigManager from '../core/config/ConfigManager.js';

async function createDatabase() {
  ConfigManager.loadEnv();
  const config = ConfigManager.database();

  // Connect to postgres database first to create our database
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: 'postgres' // Connect to default postgres database
  });

  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Check if database exists
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [config.database]
    );

    if (result.rows.length === 0) {
      console.log(`📦 Creating database: ${config.database}`);
      await client.query(`CREATE DATABASE ${config.database}`);
      console.log(`✅ Database created: ${config.database}`);
    } else {
      console.log(`✅ Database already exists: ${config.database}`);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ PostgreSQL is not running or not accessible');
      console.error(`   Host: ${config.host}:${config.port}`);
      console.error('\n💡 To fix this:');
      console.error('   1. Make sure PostgreSQL is installed and running');
      console.error('   2. Check your .env database configuration');
      console.error('   3. On macOS: brew services start postgresql');
      console.error('   4. On Ubuntu: sudo service postgresql start');
      console.error('   5. Or use Docker: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDatabase();
