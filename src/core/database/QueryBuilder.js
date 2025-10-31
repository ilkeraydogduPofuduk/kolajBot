/**
 * Advanced Dynamic Query Builder
 * Fluent API for building SQL queries with full type safety
 * @module core/database/QueryBuilder
 */

import { IQueryBuilder } from './interfaces.js';

export class QueryBuilder extends IQueryBuilder {
  constructor(adapter, logger) {
    super();
    this.adapter = adapter;
    this.logger = logger;
    this.reset();
  }

  reset() {
    this.state = {
      type: null,
      table: null,
      columns: ['*'],
      joins: [],
      wheres: [],
      groups: [],
      havings: [],
      orders: [],
      limitValue: null,
      offsetValue: null,
      values: null,
      returning: null
    };
    this.bindings = [];
    return this;
  }

  // SELECT operations
  select(...columns) {
    this.state.type = 'select';
    this.state.columns = columns.length > 0 ? columns : ['*'];
    return this;
  }

  from(table) {
    this.state.table = table;
    return this;
  }

  // WHERE operations with dynamic operators
  where(column, operatorOrValue, value = undefined) {
    if (typeof column === 'object') {
      // Object syntax: { name: 'John', age: 30 }
      Object.entries(column).forEach(([key, val]) => {
        this.state.wheres.push({ column: key, operator: '=', value: val, type: 'AND' });
        this.bindings.push(val);
      });
    } else if (value === undefined) {
      // Two params: where('name', 'John')
      this.state.wheres.push({ column, operator: '=', value: operatorOrValue, type: 'AND' });
      this.bindings.push(operatorOrValue);
    } else {
      // Three params: where('age', '>', 18)
      this.state.wheres.push({ column, operator: operatorOrValue, value, type: 'AND' });
      this.bindings.push(value);
    }
    return this;
  }

  orWhere(column, operatorOrValue, value = undefined) {
    if (value === undefined) {
      this.state.wheres.push({ column, operator: '=', value: operatorOrValue, type: 'OR' });
      this.bindings.push(operatorOrValue);
    } else {
      this.state.wheres.push({ column, operator: operatorOrValue, value, type: 'OR' });
      this.bindings.push(value);
    }
    return this;
  }

  whereIn(column, values) {
    this.state.wheres.push({ column, operator: 'IN', value: values, type: 'AND' });
    values.forEach(v => this.bindings.push(v));
    return this;
  }

  whereNotIn(column, values) {
    this.state.wheres.push({ column, operator: 'NOT IN', value: values, type: 'AND' });
    values.forEach(v => this.bindings.push(v));
    return this;
  }

  whereBetween(column, min, max) {
    this.state.wheres.push({ column, operator: 'BETWEEN', value: [min, max], type: 'AND' });
    this.bindings.push(min, max);
    return this;
  }

  whereNull(column) {
    this.state.wheres.push({ column, operator: 'IS NULL', value: null, type: 'AND' });
    return this;
  }

  whereNotNull(column) {
    this.state.wheres.push({ column, operator: 'IS NOT NULL', value: null, type: 'AND' });
    return this;
  }

  whereLike(column, pattern) {
    this.state.wheres.push({ column, operator: 'LIKE', value: pattern, type: 'AND' });
    this.bindings.push(pattern);
    return this;
  }

  // JOIN operations
  join(table, first, operatorOrSecond, second = undefined) {
    return this._addJoin('INNER', table, first, operatorOrSecond, second);
  }

  leftJoin(table, first, operatorOrSecond, second = undefined) {
    return this._addJoin('LEFT', table, first, operatorOrSecond, second);
  }

  rightJoin(table, first, operatorOrSecond, second = undefined) {
    return this._addJoin('RIGHT', table, first, operatorOrSecond, second);
  }

  _addJoin(type, table, first, operatorOrSecond, second) {
    const operator = second === undefined ? '=' : operatorOrSecond;
    const rightColumn = second === undefined ? operatorOrSecond : second;

    this.state.joins.push({
      type,
      table,
      first,
      operator,
      second: rightColumn
    });
    return this;
  }

  // ORDER BY
  orderBy(column, direction = 'ASC') {
    this.state.orders.push({ column, direction: direction.toUpperCase() });
    return this;
  }

  // GROUP BY
  groupBy(...columns) {
    this.state.groups.push(...columns);
    return this;
  }

  having(column, operator, value) {
    this.state.havings.push({ column, operator, value });
    this.bindings.push(value);
    return this;
  }

  // LIMIT & OFFSET
  limit(count) {
    this.state.limitValue = count;
    return this;
  }

  offset(count) {
    this.state.offsetValue = count;
    return this;
  }

  // INSERT operations
  insert(data) {
    this.state.type = 'insert';
    this.state.values = Array.isArray(data) ? data : [data];
    return this;
  }

  // UPDATE operations
  update(data) {
    this.state.type = 'update';
    this.state.values = data;
    Object.values(data).forEach(v => this.bindings.push(v));
    return this;
  }

  // DELETE operations
  delete() {
    this.state.type = 'delete';
    return this;
  }

  // RETURNING clause (PostgreSQL)
  returning(...columns) {
    this.state.returning = columns.length > 0 ? columns : ['*'];
    return this;
  }

  // Build SQL query
  toSQL() {
    const { type } = this.state;

    switch (type) {
      case 'select':
        return this._buildSelect();
      case 'insert':
        return this._buildInsert();
      case 'update':
        return this._buildUpdate();
      case 'delete':
        return this._buildDelete();
      default:
        throw new Error('Query type not specified');
    }
  }

  _buildSelect() {
    const parts = [];

    // SELECT columns
    parts.push(`SELECT ${this.state.columns.join(', ')}`);

    // FROM table
    parts.push(`FROM ${this.state.table}`);

    // JOINs
    this.state.joins.forEach(join => {
      parts.push(`${join.type} JOIN ${join.table} ON ${join.first} ${join.operator} ${join.second}`);
    });

    // WHERE
    if (this.state.wheres.length > 0) {
      parts.push('WHERE ' + this._buildWhereClause());
    }

    // GROUP BY
    if (this.state.groups.length > 0) {
      parts.push(`GROUP BY ${this.state.groups.join(', ')}`);
    }

    // HAVING
    if (this.state.havings.length > 0) {
      parts.push('HAVING ' + this.state.havings
        .map(h => `${h.column} ${h.operator} ?`)
        .join(' AND '));
    }

    // ORDER BY
    if (this.state.orders.length > 0) {
      parts.push('ORDER BY ' + this.state.orders
        .map(o => `${o.column} ${o.direction}`)
        .join(', '));
    }

    // LIMIT
    if (this.state.limitValue !== null) {
      parts.push(`LIMIT ${this.state.limitValue}`);
    }

    // OFFSET
    if (this.state.offsetValue !== null) {
      parts.push(`OFFSET ${this.state.offsetValue}`);
    }

    return parts.join(' ');
  }

  _buildInsert() {
    const data = this.state.values;
    const columns = Object.keys(data[0]);
    const placeholders = data.map(() =>
      `(${columns.map(() => '?').join(', ')})`
    ).join(', ');

    // Reset bindings for insert
    this.bindings = [];
    data.forEach(row => {
      columns.forEach(col => this.bindings.push(row[col]));
    });

    let sql = `INSERT INTO ${this.state.table} (${columns.join(', ')}) VALUES ${placeholders}`;

    if (this.state.returning) {
      sql += ` RETURNING ${this.state.returning.join(', ')}`;
    }

    return sql;
  }

  _buildUpdate() {
    const data = this.state.values;
    const sets = Object.keys(data).map(key => `${key} = ?`).join(', ');

    let sql = `UPDATE ${this.state.table} SET ${sets}`;

    if (this.state.wheres.length > 0) {
      sql += ' WHERE ' + this._buildWhereClause();
    }

    if (this.state.returning) {
      sql += ` RETURNING ${this.state.returning.join(', ')}`;
    }

    return sql;
  }

  _buildDelete() {
    let sql = `DELETE FROM ${this.state.table}`;

    if (this.state.wheres.length > 0) {
      sql += ' WHERE ' + this._buildWhereClause();
    }

    if (this.state.returning) {
      sql += ` RETURNING ${this.state.returning.join(', ')}`;
    }

    return sql;
  }

  _buildWhereClause() {
    return this.state.wheres.map((where, index) => {
      const prefix = index === 0 ? '' : ` ${where.type} `;

      if (where.operator === 'IN' || where.operator === 'NOT IN') {
        const placeholders = where.value.map(() => '?').join(', ');
        return `${prefix}${where.column} ${where.operator} (${placeholders})`;
      } else if (where.operator === 'BETWEEN') {
        return `${prefix}${where.column} BETWEEN ? AND ?`;
      } else if (where.operator === 'IS NULL' || where.operator === 'IS NOT NULL') {
        return `${prefix}${where.column} ${where.operator}`;
      } else {
        return `${prefix}${where.column} ${where.operator} ?`;
      }
    }).join('');
  }

  // Execute query
  async execute() {
    const sql = this.toSQL();
    const startTime = Date.now();

    try {
      this.logger?.debug('Executing query', { sql, bindings: this.bindings });

      const result = await this.adapter.query(sql, this.bindings);

      const duration = Date.now() - startTime;
      this.logger?.debug('Query executed', { duration, rows: result.rowCount || result.length });

      this.reset(); // Reset for reuse
      return result;
    } catch (error) {
      this.logger?.error('Query execution failed', { sql, bindings: this.bindings, error });
      this.reset();
      throw error;
    }
  }

  // Shortcuts
  async first() {
    this.limit(1);
    const results = await this.execute();
    return results[0] || null;
  }

  async count(column = '*') {
    this.state.columns = [`COUNT(${column}) as count`];
    const result = await this.first();
    return parseInt(result?.count || 0);
  }

  async exists() {
    const count = await this.count();
    return count > 0;
  }

  async pluck(column) {
    this.select(column);
    const results = await this.execute();
    return results.map(row => row[column]);
  }

  // Pagination helper
  async paginate(page = 1, perPage = 20) {
    const offset = (page - 1) * perPage;

    // Clone query for count
    const countBuilder = new QueryBuilder(this.adapter, this.logger);
    countBuilder.state = { ...this.state };
    countBuilder.bindings = [...this.bindings];

    const total = await countBuilder.count();

    this.limit(perPage).offset(offset);
    const data = await this.execute();

    return {
      data,
      pagination: {
        total,
        perPage,
        currentPage: page,
        lastPage: Math.ceil(total / perPage),
        from: offset + 1,
        to: Math.min(offset + perPage, total)
      }
    };
  }

  // Raw query
  async raw(sql, bindings = []) {
    this.logger?.debug('Executing raw query', { sql, bindings });
    return await this.adapter.query(sql, bindings);
  }
}
