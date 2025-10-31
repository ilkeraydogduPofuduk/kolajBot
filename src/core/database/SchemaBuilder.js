/**
 * Schema Builder - Dynamic Database Schema Management
 * Fluent API for creating and modifying database schemas
 * @module core/database/SchemaBuilder
 */

import { ISchemaBuilder } from './interfaces.js';

export class SchemaBuilder extends ISchemaBuilder {
  constructor(adapter, logger) {
    super();
    this.adapter = adapter;
    this.logger = logger;
  }

  /**
   * Create new table
   */
  async createTable(tableName, callback) {
    const table = new TableBuilder(tableName, 'create');
    callback(table);

    const sql = table.toSQL(this.adapter.getDialect());
    this.logger?.info(`Creating table: ${tableName}`);

    await this.adapter.execute(sql);
  }

  /**
   * Alter existing table
   */
  async alterTable(tableName, callback) {
    const table = new TableBuilder(tableName, 'alter');
    callback(table);

    const sqls = table.toSQLArray(this.adapter.getDialect());
    this.logger?.info(`Altering table: ${tableName}`);

    for (const sql of sqls) {
      await this.adapter.execute(sql);
    }
  }

  /**
   * Drop table
   */
  async dropTable(tableName, ifExists = true) {
    const sql = `DROP TABLE ${ifExists ? 'IF EXISTS' : ''} ${tableName}`;
    this.logger?.info(`Dropping table: ${tableName}`);

    await this.adapter.execute(sql);
  }

  /**
   * Check if table exists
   */
  async hasTable(tableName) {
    const sql = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = ?
      )
    `;

    const result = await this.adapter.query(sql, [tableName]);
    return result[0].exists;
  }

  /**
   * Check if column exists in table
   */
  async hasColumn(tableName, columnName) {
    const sql = `
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = ?
        AND column_name = ?
      )
    `;

    const result = await this.adapter.query(sql, [tableName, columnName]);
    return result[0].exists;
  }

  /**
   * Rename table
   */
  async renameTable(oldName, newName) {
    const sql = `ALTER TABLE ${oldName} RENAME TO ${newName}`;
    await this.adapter.execute(sql);
  }
}

/**
 * Table Builder - Defines table structure
 */
export class TableBuilder {
  constructor(tableName, operation = 'create') {
    this.tableName = tableName;
    this.operation = operation;
    this.columns = [];
    this.indexes = [];
    this.foreignKeys = [];
    this.primaryKey = null;
    this.timestamps = false;
    this.softDeletes = false;
  }

  // Column types
  increments(name = 'id') {
    this.columns.push({
      name,
      type: 'SERIAL',
      primary: true
    });
    this.primaryKey = name;
    return this;
  }

  bigIncrements(name = 'id') {
    this.columns.push({
      name,
      type: 'BIGSERIAL',
      primary: true
    });
    this.primaryKey = name;
    return this;
  }

  string(name, length = 255) {
    this.columns.push({
      name,
      type: `VARCHAR(${length})`,
      nullable: true
    });
    return this._chainable(name);
  }

  text(name) {
    this.columns.push({
      name,
      type: 'TEXT',
      nullable: true
    });
    return this._chainable(name);
  }

  integer(name) {
    this.columns.push({
      name,
      type: 'INTEGER',
      nullable: true
    });
    return this._chainable(name);
  }

  bigInteger(name) {
    this.columns.push({
      name,
      type: 'BIGINT',
      nullable: true
    });
    return this._chainable(name);
  }

  decimal(name, precision = 10, scale = 2) {
    this.columns.push({
      name,
      type: `DECIMAL(${precision}, ${scale})`,
      nullable: true
    });
    return this._chainable(name);
  }

  float(name, precision = 8, scale = 2) {
    this.columns.push({
      name,
      type: `FLOAT(${precision})`,
      nullable: true
    });
    return this._chainable(name);
  }

  boolean(name) {
    this.columns.push({
      name,
      type: 'BOOLEAN',
      nullable: true,
      default: false
    });
    return this._chainable(name);
  }

  date(name) {
    this.columns.push({
      name,
      type: 'DATE',
      nullable: true
    });
    return this._chainable(name);
  }

  timestamp(name) {
    this.columns.push({
      name,
      type: 'TIMESTAMP',
      nullable: true
    });
    return this._chainable(name);
  }

  json(name) {
    this.columns.push({
      name,
      type: 'JSON',
      nullable: true
    });
    return this._chainable(name);
  }

  jsonb(name) {
    this.columns.push({
      name,
      type: 'JSONB',
      nullable: true
    });
    return this._chainable(name);
  }

  uuid(name) {
    this.columns.push({
      name,
      type: 'UUID',
      nullable: true
    });
    return this._chainable(name);
  }

  enum(name, values) {
    this.columns.push({
      name,
      type: `VARCHAR(50)`,
      nullable: true,
      check: `${name} IN (${values.map(v => `'${v}'`).join(', ')})`
    });
    return this._chainable(name);
  }

  // Column modifiers
  _chainable(columnName) {
    const self = this;

    return {
      notNullable() {
        self._getColumn(columnName).nullable = false;
        return this;
      },
      nullable() {
        self._getColumn(columnName).nullable = true;
        return this;
      },
      default(value) {
        self._getColumn(columnName).default = value;
        return this;
      },
      unique() {
        self._getColumn(columnName).unique = true;
        return this;
      },
      unsigned() {
        self._getColumn(columnName).unsigned = true;
        return this;
      },
      index(indexName = null) {
        self.indexes.push({
          columns: [columnName],
          name: indexName || `${self.tableName}_${columnName}_index`
        });
        return this;
      },
      references(column) {
        const fk = { column: columnName, references: column };
        return {
          on(table) {
            fk.table = table;
            return {
              onDelete(action) {
                fk.onDelete = action;
                return {
                  onUpdate(updateAction) {
                    fk.onUpdate = updateAction;
                    self.foreignKeys.push(fk);
                    return self;
                  }
                };
              }
            };
          }
        };
      }
    };
  }

  _getColumn(name) {
    return this.columns.find(c => c.name === name);
  }

  // Add timestamps (created_at, updated_at)
  addTimestamps() {
    this.timestamp('created_at').notNullable().default('CURRENT_TIMESTAMP');
    this.timestamp('updated_at').notNullable().default('CURRENT_TIMESTAMP');
    this.timestamps = true;
    return this;
  }

  // Add soft deletes (deleted_at)
  addSoftDeletes() {
    this.timestamp('deleted_at').nullable();
    this.softDeletes = true;
    return this;
  }

  // Add index
  addIndex(columns, indexName = null) {
    this.indexes.push({
      columns: Array.isArray(columns) ? columns : [columns],
      name: indexName || `${this.tableName}_${columns.join('_')}_index`
    });
    return this;
  }

  // Add unique index
  addUnique(columns, indexName = null) {
    this.indexes.push({
      columns: Array.isArray(columns) ? columns : [columns],
      name: indexName || `${this.tableName}_${columns.join('_')}_unique`,
      unique: true
    });
    return this;
  }

  // Build SQL
  toSQL(dialect) {
    if (this.operation === 'create') {
      return this._buildCreate(dialect);
    } else {
      throw new Error('Use toSQLArray for alter operations');
    }
  }

  toSQLArray(dialect) {
    if (this.operation === 'alter') {
      return this._buildAlter(dialect);
    }
    return [this.toSQL(dialect)];
  }

  _buildCreate(dialect) {
    const parts = [];

    // Column definitions
    const columnDefs = this.columns.map(col => {
      let def = `${col.name} ${col.type}`;

      if (col.nullable === false) {
        def += ' NOT NULL';
      }

      if (col.default !== undefined) {
        if (col.default === 'CURRENT_TIMESTAMP') {
          def += ` DEFAULT ${col.default}`;
        } else if (typeof col.default === 'string') {
          def += ` DEFAULT '${col.default}'`;
        } else {
          def += ` DEFAULT ${col.default}`;
        }
      }

      if (col.unique) {
        def += ' UNIQUE';
      }

      if (col.check) {
        def += ` CHECK (${col.check})`;
      }

      return def;
    });

    parts.push(...columnDefs);

    // Primary key
    if (this.primaryKey) {
      parts.push(`PRIMARY KEY (${this.primaryKey})`);
    }

    // Foreign keys
    this.foreignKeys.forEach(fk => {
      let fkDef = `FOREIGN KEY (${fk.column}) REFERENCES ${fk.table}(${fk.references})`;

      if (fk.onDelete) {
        fkDef += ` ON DELETE ${fk.onDelete}`;
      }

      if (fk.onUpdate) {
        fkDef += ` ON UPDATE ${fk.onUpdate}`;
      }

      parts.push(fkDef);
    });

    let sql = `CREATE TABLE ${this.tableName} (\n  ${parts.join(',\n  ')}\n)`;

    return sql;
  }

  _buildAlter(dialect) {
    const sqls = [];

    // Add columns
    this.columns.forEach(col => {
      let sql = `ALTER TABLE ${this.tableName} ADD COLUMN ${col.name} ${col.type}`;

      if (col.nullable === false) {
        sql += ' NOT NULL';
      }

      if (col.default !== undefined) {
        sql += ` DEFAULT ${col.default}`;
      }

      sqls.push(sql);
    });

    return sqls;
  }
}
