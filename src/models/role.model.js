/**
 * Role Model
 * Handles role and permission management
 * @module models/role
 */

import BaseModel from './base.model.js';

/**
 * Role Model Class
 */
class RoleModel extends BaseModel {
  constructor() {
    super('roles', [
      'id', 'name', 'display_name', 'description', 'is_active',
      'is_system_role', 'permissions', 'created_at', 'updated_at'
    ]);
  }

  /**
   * Find role by name
   * @param {string} name - Role name
   * @returns {Promise<object|null>} Role or null
   */
  async findByName(name) {
    return await this.findOne({ name });
  }

  /**
   * Get role with permissions
   * @param {number} roleId - Role ID
   * @returns {Promise<object|null>} Role with permissions
   */
  async findWithPermissions(roleId) {
    const query = `
      SELECT r.*,
             json_agg(
               json_build_object(
                 'id', p.id,
                 'name', p.name,
                 'display_name', p.display_name,
                 'module', p.module
               )
             ) FILTER (WHERE p.id IS NOT NULL) as permission_details
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE r.id = $1
      GROUP BY r.id
    `;
    const result = await this.query(query, [roleId]);
    return result[0] || null;
  }

  /**
   * Get all active roles
   * @returns {Promise<Array>} Active roles
   */
  async getActiveRoles() {
    return await this.findAll({
      where: { is_active: true },
      orderBy: 'display_name',
      order: 'ASC'
    });
  }

  /**
   * Assign permission to role
   * @param {number} roleId - Role ID
   * @param {number} permissionId - Permission ID
   * @returns {Promise<object>} Result
   */
  async assignPermission(roleId, permissionId) {
    const query = `
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES ($1, $2)
      ON CONFLICT (role_id, permission_id) DO NOTHING
      RETURNING *
    `;
    return await this.query(query, [roleId, permissionId]);
  }

  /**
   * Remove permission from role
   * @param {number} roleId - Role ID
   * @param {number} permissionId - Permission ID
   * @returns {Promise<boolean>} Success status
   */
  async removePermission(roleId, permissionId) {
    const query = `
      DELETE FROM role_permissions
      WHERE role_id = $1 AND permission_id = $2
    `;
    const result = await database.query(query, [roleId, permissionId]);
    return result.rowCount > 0;
  }

  /**
   * Sync permissions for role
   * @param {number} roleId - Role ID
   * @param {Array} permissionIds - Array of permission IDs
   * @returns {Promise<void>}
   */
  async syncPermissions(roleId, permissionIds) {
    const client = await this.beginTransaction();

    try {
      // Delete existing permissions
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);

      // Insert new permissions
      if (permissionIds && permissionIds.length > 0) {
        const values = permissionIds.map((permId, idx) =>
          `($1, $${idx + 2})`
        ).join(', ');

        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`,
          [roleId, ...permissionIds]
        );
      }

      await this.commitTransaction(client);
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }

  /**
   * Check if role has permission
   * @param {number} roleId - Role ID
   * @param {string} permissionName - Permission name
   * @returns {Promise<boolean>} Has permission
   */
  async hasPermission(roleId, permissionName) {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = $1 AND p.name = $2
      ) as has_permission
    `;
    const result = await this.query(query, [roleId, permissionName]);
    return result[0]?.has_permission || false;
  }
}

export default new RoleModel();
