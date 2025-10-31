/**
 * Notification Service - Multi-channel Notifications
 * Email, In-app, Push notifications
 * @module core/notification/NotificationService
 */

import DatabaseManager from '../database/DatabaseManager.js';
import EmailService from '../email/EmailService.js';

class NotificationService {
  constructor() {
    if (NotificationService.instance) {
      return NotificationService.instance;
    }

    this.logger = null;
    this.channels = ['email', 'in_app', 'push'];

    NotificationService.instance = this;
  }

  setLogger(logger) {
    this.logger = logger;
  }

  async send(options) {
    const {
      userId,
      type,
      title,
      message,
      data = {},
      channels = ['in_app'],
      priority = 'normal'
    } = options;

    const results = {};

    for (const channel of channels) {
      try {
        if (channel === 'email') {
          results.email = await this._sendEmail(userId, title, message, data);
        } else if (channel === 'in_app') {
          results.in_app = await this._saveInApp(userId, type, title, message, data, priority);
        } else if (channel === 'push') {
          results.push = await this._sendPush(userId, title, message, data);
        }
      } catch (error) {
        this.logger?.error(`Failed to send ${channel} notification`, { error, userId });
        results[channel] = { success: false, error: error.message };
      }
    }

    return results;
  }

  async _sendEmail(userId, title, message, data) {
    const user = await DatabaseManager.table('users').where('id', userId).first();

    if (!user || !user.email) {
      return { success: false, error: 'User email not found' };
    }

    await EmailService.send({
      to: user.email,
      subject: title,
      html: message
    });

    return { success: true };
  }

  async _saveInApp(userId, type, title, message, data, priority) {
    await DatabaseManager.table('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      data: JSON.stringify(data),
      priority,
      is_read: false,
      created_at: new Date()
    }).execute();

    return { success: true };
  }

  async _sendPush(userId, title, message, data) {
    // Push notification implementation
    return { success: false, error: 'Push notifications not implemented' };
  }

  async getUnreadCount(userId) {
    const result = await DatabaseManager.table('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .count();

    return result;
  }

  async markAsRead(notificationId) {
    await DatabaseManager.table('notifications')
      .where('id', notificationId)
      .update({ is_read: true, read_at: new Date() })
      .execute();
  }
}

export default new NotificationService();
