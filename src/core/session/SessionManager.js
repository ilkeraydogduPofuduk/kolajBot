/**
 * Session Manager - Redis-based Session Management
 * Multi-device support, secure, with automatic cleanup
 * @module core/session/SessionManager
 */

import { createClient } from 'redis';
import crypto from 'crypto';
import DatabaseManager from '../database/DatabaseManager.js';

class SessionManager {
  constructor() {
    if (SessionManager.instance) {
      return SessionManager.instance;
    }

    this.client = null;
    this.connected = false;
    this.logger = null;
    this.config = {
      ttl: 7 * 24 * 60 * 60, // 7 days
      prefix: 'session:',
      userPrefix: 'user_sessions:',
      cleanupInterval: 60 * 60 * 1000 // 1 hour
    };

    SessionManager.instance = this;
  }

  /**
   * Initialize session manager
   */
  async initialize(redisConfig, logger = null) {
    this.logger = logger;

    try {
      // Create Redis client
      this.client = createClient({
        socket: {
          host: redisConfig.host || 'localhost',
          port: redisConfig.port || 6379
        },
        password: redisConfig.password || undefined,
        database: redisConfig.database || 0
      });

      // Event handlers
      this.client.on('error', (err) => {
        this.logger?.error('Redis client error', { error: err });
      });

      this.client.on('connect', () => {
        this.logger?.info('Redis client connected');
      });

      // Connect
      await this.client.connect();
      this.connected = true;

      this.logger?.info('Session manager initialized');

      // Start cleanup process
      this.startCleanup();
    } catch (error) {
      this.logger?.error('Failed to initialize session manager', { error });
      throw error;
    }
  }

  /**
   * Create new session
   */
  async create(userId, data = {}) {
    const sessionId = this._generateSessionId();

    const sessionData = {
      id: sessionId,
      userId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      deviceInfo: data.deviceInfo || null,
      ...data
    };

    // Store session
    await this.client.setEx(
      this._getSessionKey(sessionId),
      this.config.ttl,
      JSON.stringify(sessionData)
    );

    // Add to user's session set
    await this.client.sAdd(
      this._getUserSessionsKey(userId),
      sessionId
    );

    // Set TTL on user sessions set
    await this.client.expire(
      this._getUserSessionsKey(userId),
      this.config.ttl
    );

    // Log to database
    await this._logSession(sessionData, 'created');

    this.logger?.info('Session created', { sessionId, userId });

    return { sessionId, data: sessionData };
  }

  /**
   * Get session by ID
   */
  async get(sessionId) {
    const key = this._getSessionKey(sessionId);
    const data = await this.client.get(key);

    if (!data) {
      return null;
    }

    const sessionData = JSON.parse(data);

    // Update last activity
    sessionData.lastActivity = new Date().toISOString();
    await this.client.setEx(key, this.config.ttl, JSON.stringify(sessionData));

    return sessionData;
  }

  /**
   * Update session data
   */
  async update(sessionId, updates) {
    const session = await this.get(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    const updatedSession = {
      ...session,
      ...updates,
      lastActivity: new Date().toISOString()
    };

    await this.client.setEx(
      this._getSessionKey(sessionId),
      this.config.ttl,
      JSON.stringify(updatedSession)
    );

    return updatedSession;
  }

  /**
   * Delete session
   */
  async delete(sessionId) {
    const session = await this.get(sessionId);

    if (!session) {
      return false;
    }

    // Remove from Redis
    await this.client.del(this._getSessionKey(sessionId));

    // Remove from user's session set
    await this.client.sRem(
      this._getUserSessionsKey(session.userId),
      sessionId
    );

    // Log deletion
    await this._logSession(session, 'deleted');

    this.logger?.info('Session deleted', { sessionId, userId: session.userId });

    return true;
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId) {
    const sessionIds = await this.client.sMembers(
      this._getUserSessionsKey(userId)
    );

    for (const sessionId of sessionIds) {
      await this.delete(sessionId);
    }

    // Remove user sessions set
    await this.client.del(this._getUserSessionsKey(userId));

    this.logger?.info('All user sessions deleted', { userId, count: sessionIds.length });

    return sessionIds.length;
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId) {
    const sessionIds = await this.client.sMembers(
      this._getUserSessionsKey(userId)
    );

    const sessions = [];

    for (const sessionId of sessionIds) {
      const session = await this.get(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Validate session
   */
  async validate(sessionId) {
    const session = await this.get(sessionId);
    return session !== null;
  }

  /**
   * Extend session TTL
   */
  async extend(sessionId, additionalSeconds = null) {
    const ttl = additionalSeconds || this.config.ttl;

    const session = await this.get(sessionId);

    if (!session) {
      return false;
    }

    await this.client.expire(
      this._getSessionKey(sessionId),
      ttl
    );

    return true;
  }

  /**
   * Get session statistics
   */
  async getStatistics() {
    const keys = await this.client.keys(`${this.config.prefix}*`);

    const stats = {
      total: keys.length,
      active: 0,
      byUser: {}
    };

    for (const key of keys) {
      const data = await this.client.get(key);
      if (data) {
        const session = JSON.parse(data);
        stats.active++;

        if (!stats.byUser[session.userId]) {
          stats.byUser[session.userId] = 0;
        }
        stats.byUser[session.userId]++;
      }
    }

    return stats;
  }

  /**
   * Start cleanup process
   */
  startCleanup() {
    setInterval(async () => {
      try {
        // Clean up expired sessions from database
        await DatabaseManager.raw(`
          DELETE FROM session_logs
          WHERE created_at < NOW() - INTERVAL '30 days'
        `);

        this.logger?.debug('Session cleanup completed');
      } catch (error) {
        this.logger?.error('Session cleanup failed', { error });
      }
    }, this.config.cleanupInterval);
  }

  /**
   * Generate secure session ID
   * @private
   */
  _generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get session Redis key
   * @private
   */
  _getSessionKey(sessionId) {
    return `${this.config.prefix}${sessionId}`;
  }

  /**
   * Get user sessions Redis key
   * @private
   */
  _getUserSessionsKey(userId) {
    return `${this.config.userPrefix}${userId}`;
  }

  /**
   * Log session activity to database
   * @private
   */
  async _logSession(sessionData, action) {
    try {
      await DatabaseManager.table('session_logs')
        .insert({
          session_id: sessionData.id,
          user_id: sessionData.userId,
          action,
          ip_address: sessionData.ipAddress,
          user_agent: sessionData.userAgent,
          device_info: JSON.stringify(sessionData.deviceInfo || {}),
          created_at: new Date()
        })
        .execute();
    } catch (error) {
      this.logger?.error('Failed to log session', { error });
    }
  }

  /**
   * Close session manager
   */
  async close() {
    if (this.client && this.connected) {
      await this.client.quit();
      this.connected = false;
      this.logger?.info('Session manager closed');
    }
  }
}

export default new SessionManager();
