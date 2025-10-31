/**
 * WhatsApp Service
 * Handles WhatsApp Business API integration for posting collages
 * @module services/whatsapp
 */

import axios from 'axios';
import FormData from 'form-data';
import SocialMediaChannelModel from '../models/social-media-channel.model.js';
import { AppError } from '../core/error-handler.js';
import Logger from '../core/logger.js';
import fs from 'fs/promises';

/**
 * WhatsApp Service Class
 */
class WhatsAppService {
  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';
    this.apiBaseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.isInitialized = false;

    this.initialize();
  }

  /**
   * Initialize WhatsApp service
   */
  initialize() {
    if (!this.accessToken || !this.phoneNumberId) {
      Logger.warn('WhatsApp credentials not configured - WhatsApp features will be disabled');
      return;
    }

    this.isInitialized = true;
    Logger.info('WhatsApp service initialized successfully');
  }

  /**
   * Ensure service is initialized
   * @private
   */
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new AppError('WhatsApp service not initialized - check credentials', 500);
    }
  }

  /**
   * Upload media to WhatsApp
   * @param {Buffer|string} media - Media buffer or file path
   * @param {string} mimeType - MIME type
   * @returns {Promise<string>} Media ID
   */
  async uploadMedia(media, mimeType = 'image/jpeg') {
    this.ensureInitialized();

    try {
      Logger.info('Uploading media to WhatsApp');

      let mediaBuffer;
      if (typeof media === 'string') {
        mediaBuffer = await fs.readFile(media);
      } else {
        mediaBuffer = media;
      }

      const formData = new FormData();
      formData.append('file', mediaBuffer, {
        filename: 'collage.jpg',
        contentType: mimeType
      });
      formData.append('messaging_product', 'whatsapp');

      const response = await axios.post(
        `${this.apiBaseUrl}/${this.phoneNumberId}/media`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            ...formData.getHeaders()
          }
        }
      );

      if (!response.data || !response.data.id) {
        throw new Error('Media upload failed - no media ID returned');
      }

      Logger.info(`Media uploaded successfully: ${response.data.id}`);

      return response.data.id;
    } catch (error) {
      Logger.error('WhatsApp media upload failed', error);
      throw new AppError(`Failed to upload media to WhatsApp: ${error.message}`, 500);
    }
  }

  /**
   * Send message to WhatsApp contact
   * @param {string} to - Recipient phone number (with country code)
   * @param {Object} options - Message options
   * @returns {Promise<Object>} Send result
   */
  async sendMessage(to, options) {
    this.ensureInitialized();

    const {
      type = 'text',
      text = '',
      mediaId = null,
      caption = '',
      templateName = null,
      templateLanguage = 'en',
      templateParameters = []
    } = options;

    try {
      Logger.info(`Sending ${type} message to ${to}`);

      let messageBody = {
        messaging_product: 'whatsapp',
        to: to,
        type: type
      };

      // Build message based on type
      if (type === 'text') {
        messageBody.text = { body: text };
      } else if (type === 'image') {
        if (!mediaId) {
          throw new Error('Media ID required for image messages');
        }
        messageBody.image = {
          id: mediaId,
          caption: caption || undefined
        };
      } else if (type === 'template') {
        if (!templateName) {
          throw new Error('Template name required for template messages');
        }
        messageBody.template = {
          name: templateName,
          language: { code: templateLanguage },
          components: templateParameters.length > 0 ? [{
            type: 'body',
            parameters: templateParameters
          }] : []
        };
      }

      const response = await axios.post(
        `${this.apiBaseUrl}/${this.phoneNumberId}/messages`,
        messageBody,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data || !response.data.messages) {
        throw new Error('Message send failed');
      }

      Logger.info(`Message sent successfully to ${to}`);

      return {
        success: true,
        messageId: response.data.messages[0].id,
        to,
        sentAt: new Date().toISOString()
      };
    } catch (error) {
      Logger.error(`Failed to send WhatsApp message to ${to}`, error);
      throw new AppError(`Failed to send WhatsApp message: ${error.message}`, 500);
    }
  }

  /**
   * Send collage image to contact
   * @param {string} to - Recipient phone number
   * @param {Buffer|string} image - Image buffer or path
   * @param {string} caption - Image caption
   * @returns {Promise<Object>} Send result
   */
  async sendCollage(to, image, caption = '') {
    try {
      // Upload image first
      const mediaId = await this.uploadMedia(image, 'image/jpeg');

      // Send image with caption
      return await this.sendMessage(to, {
        type: 'image',
        mediaId,
        caption
      });
    } catch (error) {
      Logger.error('Failed to send collage', error);
      throw error instanceof AppError ? error : new AppError('Failed to send collage', 500);
    }
  }

  /**
   * Send collage to multiple contacts (broadcast)
   * @param {Array<string>} recipients - Array of phone numbers
   * @param {Buffer|string} image - Image buffer or path
   * @param {string} caption - Image caption
   * @returns {Promise<Object>} Broadcast results
   */
  async broadcastCollage(recipients, image, caption = '') {
    try {
      Logger.info(`Broadcasting collage to ${recipients.length} recipients`);

      // Upload image once
      const mediaId = await this.uploadMedia(image, 'image/jpeg');

      // Send to all recipients
      const results = await Promise.allSettled(
        recipients.map(to =>
          this.sendMessage(to, {
            type: 'image',
            mediaId,
            caption
          })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      Logger.info(`Broadcast completed: ${successful} successful, ${failed} failed`);

      return {
        total: recipients.length,
        successful,
        failed,
        results: results.map((result, index) => ({
          to: recipients[index],
          success: result.status === 'fulfilled',
          messageId: result.status === 'fulfilled' ? result.value.messageId : null,
          error: result.status === 'rejected' ? result.reason.message : null
        }))
      };
    } catch (error) {
      Logger.error('Broadcast failed', error);
      throw new AppError('Failed to broadcast collage', 500);
    }
  }

  /**
   * Get media URL by media ID
   * @param {string} mediaId - Media ID
   * @returns {Promise<string>} Media URL
   */
  async getMediaUrl(mediaId) {
    this.ensureInitialized();

    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (!response.data || !response.data.url) {
        throw new Error('Failed to get media URL');
      }

      return response.data.url;
    } catch (error) {
      Logger.error(`Failed to get media URL for ${mediaId}`, error);
      throw new AppError('Failed to get media URL', 500);
    }
  }

  /**
   * Delete media from WhatsApp
   * @param {string} mediaId - Media ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteMedia(mediaId) {
    this.ensureInitialized();

    try {
      await axios.delete(
        `${this.apiBaseUrl}/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      Logger.info(`Media deleted: ${mediaId}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to delete media ${mediaId}`, error);
      return false;
    }
  }

  /**
   * Get business profile
   * @returns {Promise<Object>} Business profile
   */
  async getBusinessProfile() {
    this.ensureInitialized();

    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          params: {
            fields: 'about,address,description,email,profile_picture_url,websites,vertical'
          }
        }
      );

      return response.data.data[0];
    } catch (error) {
      Logger.error('Failed to get business profile', error);
      throw new AppError('Failed to get business profile', 500);
    }
  }

  /**
   * Update business profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<boolean>} Success status
   */
  async updateBusinessProfile(profileData) {
    this.ensureInitialized();

    try {
      await axios.post(
        `${this.apiBaseUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        {
          messaging_product: 'whatsapp',
          ...profileData
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      Logger.info('Business profile updated');
      return true;
    } catch (error) {
      Logger.error('Failed to update business profile', error);
      throw new AppError('Failed to update business profile', 500);
    }
  }

  /**
   * Verify webhook signature
   * @param {string} signature - X-Hub-Signature-256 header
   * @param {string} body - Request body
   * @returns {boolean} Is valid signature
   */
  verifyWebhookSignature(signature, body) {
    const crypto = require('crypto');
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    if (!appSecret) {
      Logger.warn('WhatsApp app secret not configured - webhook verification disabled');
      return true;
    }

    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', appSecret)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Handle webhook verification
   * @param {Object} query - Query parameters
   * @returns {string|null} Challenge or null
   */
  handleWebhookVerification(query) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
      Logger.info('WhatsApp webhook verified');
      return challenge;
    }

    Logger.warn('WhatsApp webhook verification failed');
    return null;
  }

  /**
   * Process incoming webhook message
   * @param {Object} webhookData - Webhook payload
   * @returns {Promise<void>}
   */
  async processWebhook(webhookData) {
    try {
      if (!webhookData.entry || webhookData.entry.length === 0) {
        return;
      }

      for (const entry of webhookData.entry) {
        const changes = entry.changes || [];

        for (const change of changes) {
          if (change.field === 'messages') {
            const value = change.value;

            // Process incoming messages
            if (value.messages) {
              for (const message of value.messages) {
                await this.handleIncomingMessage(message, value.metadata);
              }
            }

            // Process message status updates
            if (value.statuses) {
              for (const status of value.statuses) {
                await this.handleStatusUpdate(status);
              }
            }
          }
        }
      }
    } catch (error) {
      Logger.error('Failed to process webhook', error);
    }
  }

  /**
   * Handle incoming message
   * @private
   */
  async handleIncomingMessage(message, metadata) {
    Logger.info(`Received message: ${message.id} from ${message.from}`);

    // Implement your message handling logic here
    // For example: auto-reply, command processing, etc.
  }

  /**
   * Handle status update
   * @private
   */
  async handleStatusUpdate(status) {
    Logger.info(`Message ${status.id} status: ${status.status}`);

    // Update message delivery status in database if needed
  }

  /**
   * Get phone number info
   * @returns {Promise<Object>} Phone number info
   */
  async getPhoneNumberInfo() {
    this.ensureInitialized();

    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/${this.phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          params: {
            fields: 'display_phone_number,verified_name,quality_rating'
          }
        }
      );

      return response.data;
    } catch (error) {
      Logger.error('Failed to get phone number info', error);
      throw new AppError('Failed to get phone number info', 500);
    }
  }
}

export default new WhatsAppService();
