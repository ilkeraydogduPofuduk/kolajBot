/**
 * Database Core - Central Export
 * @module core/database
 */

export { IDatabaseAdapter, IQueryBuilder, ITransactionManager, IConnectionPool, IMigration, ISchemaBuilder } from './interfaces.js';
export { QueryBuilder } from './QueryBuilder.js';
export { PostgreSQLAdapter } from './PostgreSQLAdapter.js';
export { SchemaBuilder, TableBuilder } from './SchemaBuilder.js';
export { MigrationManager } from './MigrationManager.js';
export { default as DatabaseManager } from './DatabaseManager.js';

// Default export
import DatabaseManager from './DatabaseManager.js';
export default DatabaseManager;
