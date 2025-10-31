/**
 * Migration Manager - Database Version Control
 * Manages database schema migrations with rollback support
 * @module core/database/MigrationManager
 */

import fs from 'fs/promises';
import path from 'path';
import { SchemaBuilder } from './SchemaBuilder.js';

export class MigrationManager {
  constructor(adapter, logger, migrationsPath) {
    this.adapter = adapter;
    this.logger = logger;
    this.migrationsPath = migrationsPath;
    this.tableName = 'migrations';
  }

  /**
   * Initialize migrations table
   */
  async initialize() {
    const schema = new SchemaBuilder(this.adapter, this.logger);

    const hasTable = await schema.hasTable(this.tableName);

    if (!hasTable) {
      await schema.createTable(this.tableName, (table) => {
        table.increments('id');
        table.string('name', 255).notNullable().unique();
        table.integer('batch').notNullable();
        table.timestamp('migrated_at').notNullable().default('CURRENT_TIMESTAMP');
      });

      this.logger?.info('Migrations table created');
    }
  }

  /**
   * Run pending migrations
   */
  async up() {
    await this.initialize();

    const pending = await this.getPending();

    if (pending.length === 0) {
      this.logger?.info('No pending migrations');
      return { migrated: [], batch: null };
    }

    const batch = await this.getNextBatch();
    const migrated = [];

    for (const migration of pending) {
      try {
        this.logger?.info(`Migrating: ${migration.name}`);

        await migration.module.up(new SchemaBuilder(this.adapter, this.logger));

        await this._recordMigration(migration.name, batch);
        migrated.push(migration.name);

        this.logger?.info(`Migrated: ${migration.name}`);
      } catch (error) {
        this.logger?.error(`Migration failed: ${migration.name}`, { error });
        throw error;
      }
    }

    return { migrated, batch };
  }

  /**
   * Rollback last batch of migrations
   */
  async down(steps = 1) {
    await this.initialize();

    for (let i = 0; i < steps; i++) {
      const lastBatch = await this.getLastBatch();

      if (!lastBatch || lastBatch.length === 0) {
        this.logger?.info('Nothing to rollback');
        break;
      }

      for (const record of lastBatch.reverse()) {
        try {
          this.logger?.info(`Rolling back: ${record.name}`);

          const migration = await this._loadMigration(record.name);
          await migration.down(new SchemaBuilder(this.adapter, this.logger));

          await this._removeMigration(record.name);

          this.logger?.info(`Rolled back: ${record.name}`);
        } catch (error) {
          this.logger?.error(`Rollback failed: ${record.name}`, { error });
          throw error;
        }
      }
    }
  }

  /**
   * Reset all migrations
   */
  async reset() {
    await this.initialize();

    const all = await this.getRan();
    const batches = Math.max(...all.map(m => m.batch));

    await this.down(batches);
  }

  /**
   * Refresh migrations (reset + migrate)
   */
  async refresh() {
    await this.reset();
    return await this.up();
  }

  /**
   * Get all migrations that have been run
   */
  async getRan() {
    const sql = `SELECT * FROM ${this.tableName} ORDER BY migrated_at ASC`;
    return await this.adapter.query(sql);
  }

  /**
   * Get pending migrations
   */
  async getPending() {
    const ran = await this.getRan();
    const ranNames = ran.map(m => m.name);

    const allMigrations = await this._getAllMigrations();

    return allMigrations.filter(m => !ranNames.includes(m.name));
  }

  /**
   * Get last batch of migrations
   */
  async getLastBatch() {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE batch = (SELECT MAX(batch) FROM ${this.tableName})
      ORDER BY migrated_at DESC
    `;

    return await this.adapter.query(sql);
  }

  /**
   * Get next batch number
   */
  async getNextBatch() {
    const sql = `SELECT COALESCE(MAX(batch), 0) + 1 as next_batch FROM ${this.tableName}`;
    const result = await this.adapter.query(sql);
    return result[0].next_batch;
  }

  /**
   * Get migration status
   */
  async status() {
    await this.initialize();

    const ran = await this.getRan();
    const ranNames = ran.map(m => m.name);

    const allMigrations = await this._getAllMigrations();

    return allMigrations.map(m => ({
      name: m.name,
      ran: ranNames.includes(m.name),
      batch: ran.find(r => r.name === m.name)?.batch || null
    }));
  }

  /**
   * Load all migration files
   * @private
   */
  async _getAllMigrations() {
    try {
      const files = await fs.readdir(this.migrationsPath);

      const migrations = await Promise.all(
        files
          .filter(file => file.endsWith('.js'))
          .sort()
          .map(async (file) => {
            const name = file.replace('.js', '');
            const module = await this._loadMigration(name);

            return { name, file, module };
          })
      );

      return migrations;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger?.warn(`Migrations directory not found: ${this.migrationsPath}`);
        return [];
      }
      throw error;
    }
  }

  /**
   * Load specific migration module
   * @private
   */
  async _loadMigration(name) {
    const filePath = path.join(this.migrationsPath, `${name}.js`);
    const module = await import(filePath);
    return module.default || module;
  }

  /**
   * Record migration
   * @private
   */
  async _recordMigration(name, batch) {
    const sql = `INSERT INTO ${this.tableName} (name, batch) VALUES (?, ?)`;
    await this.adapter.execute(sql, [name, batch]);
  }

  /**
   * Remove migration record
   * @private
   */
  async _removeMigration(name) {
    const sql = `DELETE FROM ${this.tableName} WHERE name = ?`;
    await this.adapter.execute(sql, [name]);
  }
}
