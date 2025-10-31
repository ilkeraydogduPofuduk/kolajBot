/**
 * Telegram Bot Service
 * Handles Telegram bot integration for posting collages to channels
 * @module services/telegram-bot
 */

import { Telegraf } from 'telegraf';
import SocialMediaChannelModel from '../models/social-media-channel.model.js';
import { AppError } from '../core/error-handler.js';
import Logger from '../core/logger.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Telegram Bot Service Class
 */
class TelegramBotService {
  constructor() {
    this.bot = null;
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
    this.isInitialized = false;
    this.scheduledPosts = new Map();
  }

  /**
   * Initialize Telegram bot
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    if (!this.botToken) {
      Logger.warn('Telegram bot token not configured - Telegram features will be disabled');
      return;
    }

    try {
      this.bot = new Telegraf(this.botToken);

      // Setup bot commands
      this.setupCommands();

      // Setup webhook or polling
      if (this.webhookUrl) {
        await this.bot.telegram.setWebhook(this.webhookUrl);
        Logger.info(`Telegram bot webhook set to: ${this.webhookUrl}`);
      } else {
        this.bot.launch();
        Logger.info('Telegram bot started with polling');
      }

      this.isInitialized = true;
      Logger.info('Telegram bot initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize Telegram bot', error);
      this.isInitialized = false;
    }
  }

  /**
   * Setup bot commands
   * @private
   */
  setupCommands() {
    // Start command
    this.bot.command('start', async (ctx) => {
      await ctx.reply(
        'Welcome to KolajBot! 🤖\n\n' +
        'I can help you post automatic product collages to your Telegram channels.\n\n' +
        'Commands:\n' +
        '/connect - Connect your channel\n' +
        '/channels - List your channels\n' +
        '/help - Show help'
      );
    });

    // Help command
    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        'KolajBot Commands:\n\n' +
        '/connect - Connect a new channel\n' +
        '/channels - List your connected channels\n' +
        '/post <channel_id> - Test post to channel\n' +
        '/schedule - Schedule automatic posts\n' +
        '/status - Check bot status'
      );
    });

    // Connect channel command
    this.bot.command('connect', async (ctx) => {
      await ctx.reply(
        'To connect a channel:\n' +
        '1. Add me as an administrator to your channel\n' +
        '2. Make sure I have permission to post messages\n' +
        '3. Send me the channel username (e.g., @mychannel) or ID'
      );
    });

    // List channels command
    this.bot.command('channels', async (ctx) => {
      try {
        const userId = ctx.from.id;
        const channels = await SocialMediaChannelModel.findByUser(userId);

        if (channels.length === 0) {
          await ctx.reply('You have no connected channels. Use /connect to add one.');
          return;
        }

        const channelList = channels
          .map((ch, i) => `${i + 1}. ${ch.channel_name} (${ch.platform})`)
          .join('\n');

        await ctx.reply(`Your channels:\n\n${channelList}`);
      } catch (error) {
        Logger.error('Failed to list channels', error);
        await ctx.reply('Failed to retrieve your channels. Please try again.');
      }
    });

    // Handle text messages (channel connection)
    this.bot.on('text', async (ctx) => {
      const text = ctx.message.text;

      // Check if it's a channel username or ID
      if (text.startsWith('@') || text.startsWith('-100')) {
        await this.handleChannelConnection(ctx, text);
      }
    });

    Logger.info('Telegram bot commands configured');
  }

  /**
   * Handle channel connection
   * @private
   */
  async handleChannelConnection(ctx, channelId) {
    try {
      const userId = ctx.from.id;

      // Try to get chat info
      const chat = await this.bot.telegram.getChat(channelId);

      if (chat.type !== 'channel') {
        await ctx.reply('This is not a channel. Please provide a channel username or ID.');
        return;
      }

      // Check if bot is admin
      const botMember = await this.bot.telegram.getChatMember(channelId, this.bot.botInfo.id);

      if (botMember.status !== 'administrator') {
        await ctx.reply('I need to be an administrator in the channel to post messages.');
        return;
      }

      // Save channel to database
      const channel = await SocialMediaChannelModel.create({
        platform: 'telegram',
        channel_id: chat.id.toString(),
        channel_name: chat.title,
        access_token: null, // Not needed for bot
        user_id: userId,
        is_active: true,
        settings: {
          username: chat.username || null,
          type: chat.type
        }
      });

      await ctx.reply(
        `✅ Channel connected successfully!\n\n` +
        `Name: ${chat.title}\n` +
        `ID: ${chat.id}\n\n` +
        `You can now post collages to this channel.`
      );

      Logger.info(`Telegram channel connected: ${chat.title} (${chat.id})`);
    } catch (error) {
      Logger.error('Failed to connect channel', error);
      await ctx.reply(
        'Failed to connect channel. Please make sure:\n' +
        '1. I am added as an administrator\n' +
        '2. I have permission to post messages\n' +
        '3. The channel ID/username is correct'
      );
    }
  }

  /**
   * Ensure bot is initialized
   * @private
   */
  ensureInitialized() {
    if (!this.isInitialized || !this.bot) {
      throw new AppError('Telegram bot not initialized - check bot token configuration', 500);
    }
  }

  /**
   * Post collage to Telegram channel
   * @param {string} channelId - Telegram channel ID
   * @param {Object} options - Post options
   * @returns {Promise<Object>} Post result
   */
  async postToChannel(channelId, options) {
    this.ensureInitialized();

    const {
      image,
      caption = '',
      parseMode = 'Markdown',
      disableNotification = false
    } = options;

    try {
      Logger.info(`Posting collage to Telegram channel: ${channelId}`);

      let imageBuffer;

      // Handle different image input types
      if (typeof image === 'string') {
        // If it's a URL
        if (image.startsWith('http://') || image.startsWith('https://')) {
          imageBuffer = { url: image };
        } else {
          // If it's a file path
          imageBuffer = { source: await fs.readFile(image) };
        }
      } else if (Buffer.isBuffer(image)) {
        imageBuffer = { source: image };
      } else {
        throw new Error('Invalid image format');
      }

      // Send photo to channel
      const result = await this.bot.telegram.sendPhoto(
        channelId,
        imageBuffer,
        {
          caption,
          parse_mode: parseMode,
          disable_notification: disableNotification
        }
      );

      // Update channel last activity
      await SocialMediaChannelModel.updateLastActivity(channelId);

      Logger.info(`Successfully posted to Telegram channel: ${channelId}`);

      return {
        success: true,
        messageId: result.message_id,
        channelId,
        postedAt: new Date().toISOString()
      };
    } catch (error) {
      Logger.error(`Failed to post to Telegram channel ${channelId}`, error);
      throw new AppError(`Failed to post to Telegram: ${error.message}`, 500);
    }
  }

  /**
   * Post multiple collages as media group
   * @param {string} channelId - Telegram channel ID
   * @param {Array} images - Array of images
   * @param {Object} options - Post options
   * @returns {Promise<Object>} Post result
   */
  async postMediaGroup(channelId, images, options = {}) {
    this.ensureInitialized();

    const { caption = '', disableNotification = false } = options;

    try {
      Logger.info(`Posting media group to Telegram channel: ${channelId}`);

      const media = await Promise.all(
        images.map(async (image, index) => {
          let mediaInput;

          if (typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://'))) {
            mediaInput = { url: image };
          } else if (typeof image === 'string') {
            mediaInput = { source: await fs.readFile(image) };
          } else if (Buffer.isBuffer(image)) {
            mediaInput = { source: image };
          } else {
            throw new Error('Invalid image format');
          }

          return {
            type: 'photo',
            media: mediaInput,
            caption: index === 0 ? caption : undefined
          };
        })
      );

      const result = await this.bot.telegram.sendMediaGroup(channelId, media, {
        disable_notification: disableNotification
      });

      await SocialMediaChannelModel.updateLastActivity(channelId);

      Logger.info(`Successfully posted media group to Telegram channel: ${channelId}`);

      return {
        success: true,
        messageIds: result.map(m => m.message_id),
        channelId,
        postedAt: new Date().toISOString()
      };
    } catch (error) {
      Logger.error(`Failed to post media group to Telegram channel ${channelId}`, error);
      throw new AppError(`Failed to post media group: ${error.message}`, 500);
    }
  }

  /**
   * Schedule post to channel
   * @param {string} channelId - Telegram channel ID
   * @param {Date} scheduledTime - When to post
   * @param {Object} postData - Post data
   * @returns {Promise<string>} Schedule ID
   */
  async schedulePost(channelId, scheduledTime, postData) {
    const scheduleId = `telegram_${channelId}_${Date.now()}`;

    const delay = scheduledTime.getTime() - Date.now();

    if (delay <= 0) {
      throw new AppError('Scheduled time must be in the future', 400);
    }

    const timeoutId = setTimeout(async () => {
      try {
        await this.postToChannel(channelId, postData);
        this.scheduledPosts.delete(scheduleId);
        Logger.info(`Scheduled post executed: ${scheduleId}`);
      } catch (error) {
        Logger.error(`Scheduled post failed: ${scheduleId}`, error);
        this.scheduledPosts.delete(scheduleId);
      }
    }, delay);

    this.scheduledPosts.set(scheduleId, {
      channelId,
      scheduledTime,
      postData,
      timeoutId
    });

    Logger.info(`Post scheduled: ${scheduleId} for ${scheduledTime.toISOString()}`);

    return scheduleId;
  }

  /**
   * Cancel scheduled post
   * @param {string} scheduleId - Schedule ID
   * @returns {boolean} Success status
   */
  cancelScheduledPost(scheduleId) {
    const scheduled = this.scheduledPosts.get(scheduleId);

    if (!scheduled) {
      return false;
    }

    clearTimeout(scheduled.timeoutId);
    this.scheduledPosts.delete(scheduleId);

    Logger.info(`Scheduled post cancelled: ${scheduleId}`);

    return true;
  }

  /**
   * Get bot information
   * @returns {Promise<Object>} Bot info
   */
  async getBotInfo() {
    this.ensureInitialized();

    try {
      const info = await this.bot.telegram.getMe();

      return {
        id: info.id,
        username: info.username,
        firstName: info.first_name,
        canJoinGroups: info.can_join_groups,
        canReadAllGroupMessages: info.can_read_all_group_messages,
        supportsInlineQueries: info.supports_inline_queries
      };
    } catch (error) {
      Logger.error('Failed to get bot info', error);
      throw new AppError('Failed to get bot information', 500);
    }
  }

  /**
   * Get channel info
   * @param {string} channelId - Channel ID
   * @returns {Promise<Object>} Channel info
   */
  async getChannelInfo(channelId) {
    this.ensureInitialized();

    try {
      const chat = await this.bot.telegram.getChat(channelId);
      const memberCount = await this.bot.telegram.getChatMemberCount(channelId);

      return {
        id: chat.id,
        title: chat.title,
        username: chat.username,
        type: chat.type,
        description: chat.description,
        memberCount
      };
    } catch (error) {
      Logger.error(`Failed to get channel info for ${channelId}`, error);
      throw new AppError('Failed to get channel information', 500);
    }
  }

  /**
   * Test channel permissions
   * @param {string} channelId - Channel ID
   * @returns {Promise<Object>} Permission test results
   */
  async testChannelPermissions(channelId) {
    this.ensureInitialized();

    try {
      const botMember = await this.bot.telegram.getChatMember(channelId, this.bot.botInfo.id);

      return {
        isAdmin: botMember.status === 'administrator',
        canPostMessages: botMember.can_post_messages || false,
        canEditMessages: botMember.can_edit_messages || false,
        canDeleteMessages: botMember.can_delete_messages || false,
        status: botMember.status
      };
    } catch (error) {
      Logger.error(`Failed to test permissions for channel ${channelId}`, error);
      throw new AppError('Failed to test channel permissions', 500);
    }
  }

  /**
   * Stop bot
   */
  async stop() {
    if (this.bot && this.isInitialized) {
      await this.bot.stop();
      Logger.info('Telegram bot stopped');
    }
  }
}

export default new TelegramBotService();
