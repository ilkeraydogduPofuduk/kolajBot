/**
 * Social Media Channel Model
 * Handles social media channel data management
 * @module models/social-media-channel
 */

import BaseModel from './base.model.js';

/**
 * Social Media Channel Model Class
 */
class SocialMediaChannelModel extends BaseModel {
  constructor() {
    super('social_media_channels', [
      'id', 'name', 'platform', 'type', 'channel_id', 'member_count',
      'is_active', 'last_activity', 'telegram_bot_id', 'phone_number',
      'access_token', 'chat_id', 'channel_username', 'webhook_url',
      'api_key', 'api_secret', 'phone_number_id', 'business_account_id',
      'assigned_user_ids', 'brand_id', 'created_by', 'updated_by',
      'created_at', 'updated_at'
    ]);
  }

  /**
   * Create channel
   * @param {object} data - Channel data
   * @returns {Promise<object>} Created channel
   */
  async createChannel(data) {
    const channelData = {
      ...data,
      is_active: data.is_active !== undefined ? data.is_active : true,
      assigned_user_ids: data.assigned_user_ids ? JSON.stringify(data.assigned_user_ids) : '[]'
    };

    return await this.create(channelData);
  }

  /**
   * Find channels by brand
   * @param {number} brandId - Brand ID
   * @param {string} platform - Platform filter (optional)
   * @returns {Promise<Array>} Channels
   */
  async findByBrand(brandId, platform = null) {
    const where = { brand_id: brandId, is_active: true };
    if (platform) where.platform = platform;

    return await this.findAll({ where, orderBy: 'name', order: 'ASC' });
  }

  /**
   * Find channels by platform
   * @param {string} platform - Platform name
   * @returns {Promise<Array>} Channels
   */
  async findByPlatform(platform) {
    return await this.findAll({
      where: { platform, is_active: true },
      orderBy: 'name',
      order: 'ASC'
    });
  }

  /**
   * Find channel with relations
   * @param {number} channelId - Channel ID
   * @returns {Promise<object|null>} Channel with relations
   */
  async findWithRelations(channelId) {
    const query = `
      SELECT smc.*,
             b.name as brand_name,
             tb.bot_name as telegram_bot_name,
             u.first_name || ' ' || u.last_name as created_by_name
      FROM social_media_channels smc
      LEFT JOIN brands b ON smc.brand_id = b.id
      LEFT JOIN telegram_bots tb ON smc.telegram_bot_id = tb.id
      LEFT JOIN users u ON smc.created_by = u.id
      WHERE smc.id = $1
    `;
    const result = await this.query(query, [channelId]);
    return result[0] || null;
  }

  /**
   * Update last activity
   * @param {number} channelId - Channel ID
   * @returns {Promise<object>} Updated channel
   */
  async updateLastActivity(channelId) {
    return await this.update(channelId, { last_activity: new Date() });
  }

  /**
   * Get channel statistics
   * @param {number} channelId - Channel ID
   * @returns {Promise<object>} Channel statistics
   */
  async getStatistics(channelId) {
    const query = `
      SELECT
        smc.id,
        smc.name,
        smc.platform,
        smc.member_count,
        COUNT(DISTINCT smm.id) as total_messages,
        COUNT(DISTINCT smm.id) FILTER (WHERE smm.is_sent = true) as sent_messages,
        MAX(smm.timestamp) as last_message_at
      FROM social_media_channels smc
      LEFT JOIN social_media_messages smm ON smc.id = smm.channel_id
      WHERE smc.id = $1
      GROUP BY smc.id, smc.name, smc.platform, smc.member_count
    `;
    const result = await this.query(query, [channelId]);
    return result[0] || null;
  }

  /**
   * Assign users to channel
   * @param {number} channelId - Channel ID
   * @param {Array} userIds - Array of user IDs
   * @returns {Promise<object>} Updated channel
   */
  async assignUsers(channelId, userIds) {
    return await this.update(channelId, {
      assigned_user_ids: JSON.stringify(userIds)
    });
  }

  /**
   * Check if user has access to channel
   * @param {number} channelId - Channel ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Has access
   */
  async userHasAccess(channelId, userId) {
    const channel = await this.findById(channelId);
    if (!channel) return false;

    const assignedUserIds = channel.assigned_user_ids
      ? JSON.parse(channel.assigned_user_ids)
      : [];

    return assignedUserIds.includes(userId);
  }
}

export default new SocialMediaChannelModel();
