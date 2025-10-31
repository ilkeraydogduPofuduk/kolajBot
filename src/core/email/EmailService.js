/**
 * Email Service - Enterprise Email Management
 * Database-driven SMTP with templates, queue, and retry logic
 * @module core/email/EmailService
 */

import nodemailer from 'nodemailer';
import { renderTemplate } from './TemplateEngine.js';
import DatabaseManager from '../database/DatabaseManager.js';

class EmailService {
  constructor() {
    if (EmailService.instance) {
      return EmailService.instance;
    }

    this.transporter = null;
    this.config = null;
    this.logger = null;
    this.queue = [];
    this.processing = false;
    this.retryAttempts = 3;
    this.retryDelay = 5000; // 5 seconds

    EmailService.instance = this;
  }

  /**
   * Initialize email service with database config
   */
  async initialize(logger = null) {
    this.logger = logger;

    try {
      // Load config from database
      await this.loadConfig();

      // Create transporter
      this.transporter = nodemailer.createTransporter({
        host: this.config.smtp_server,
        port: this.config.smtp_port,
        secure: this.config.use_ssl,
        auth: {
          user: this.config.smtp_username,
          pass: this.config.smtp_password
        },
        pool: true, // Use pooled connections
        maxConnections: 5,
        maxMessages: 100
      });

      // Verify connection
      await this.transporter.verify();

      this.logger?.info('Email service initialized', {
        server: this.config.smtp_server,
        port: this.config.smtp_port
      });

      // Start queue processor
      this.startQueueProcessor();
    } catch (error) {
      this.logger?.error('Failed to initialize email service', { error });
      throw error;
    }
  }

  /**
   * Load email configuration from database
   */
  async loadConfig() {
    const settings = await DatabaseManager.table('settings')
      .whereIn('key', [
        'email.smtp_server',
        'email.smtp_port',
        'email.smtp_username',
        'email.smtp_password',
        'email.from_email',
        'email.from_name',
        'email.use_ssl'
      ])
      .execute();

    this.config = {
      smtp_server: settings.find(s => s.key === 'email.smtp_server')?.value || 'localhost',
      smtp_port: parseInt(settings.find(s => s.key === 'email.smtp_port')?.value || '587'),
      smtp_username: settings.find(s => s.key === 'email.smtp_username')?.value || '',
      smtp_password: settings.find(s => s.key === 'email.smtp_password')?.value || '',
      from_email: settings.find(s => s.key === 'email.from_email')?.value || 'noreply@kolajbot.com',
      from_name: settings.find(s => s.key === 'email.from_name')?.value || 'KolajBot',
      use_ssl: settings.find(s => s.key === 'email.use_ssl')?.value === 'true'
    };
  }

  /**
   * Send email
   */
  async send(options) {
    const {
      to,
      subject,
      template = null,
      templateData = {},
      html = null,
      text = null,
      from = null,
      cc = null,
      bcc = null,
      attachments = [],
      priority = 'normal',
      replyTo = null
    } = options;

    try {
      // Render template if provided
      let htmlContent = html;
      let textContent = text;

      if (template) {
        htmlContent = await renderTemplate(template, templateData);
        if (!textContent) {
          textContent = this._stripHtml(htmlContent);
        }
      }

      // Create email object
      const mailOptions = {
        from: from || `"${this.config.from_name}" <${this.config.from_email}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html: htmlContent,
        text: textContent,
        cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
        replyTo: replyTo || undefined,
        attachments,
        priority: priority === 'high' ? 'high' : priority === 'low' ? 'low' : 'normal'
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      // Log to database
      await this._logEmail({
        to: mailOptions.to,
        subject,
        status: 'sent',
        message_id: info.messageId,
        template,
        sent_at: new Date()
      });

      this.logger?.info('Email sent successfully', {
        to: mailOptions.to,
        subject,
        messageId: info.messageId
      });

      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      this.logger?.error('Failed to send email', {
        to,
        subject,
        error: error.message
      });

      // Log failure
      await this._logEmail({
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        status: 'failed',
        error: error.message,
        template,
        sent_at: new Date()
      });

      throw error;
    }
  }

  /**
   * Queue email for later delivery
   */
  async queue(options, scheduledFor = null) {
    const queueItem = {
      id: Date.now() + Math.random(),
      options,
      scheduledFor: scheduledFor || new Date(),
      attempts: 0,
      status: 'pending'
    };

    // Save to database
    await DatabaseManager.table('email_queue')
      .insert({
        recipient: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        template: options.template || null,
        template_data: JSON.stringify(options.templateData || {}),
        html: options.html || null,
        scheduled_for: scheduledFor || new Date(),
        status: 'pending',
        attempts: 0,
        created_at: new Date()
      })
      .returning('id')
      .execute();

    this.queue.push(queueItem);

    this.logger?.info('Email queued', {
      to: options.to,
      subject: options.subject,
      scheduledFor
    });

    return queueItem.id;
  }

  /**
   * Start queue processor
   */
  startQueueProcessor() {
    if (this.processing) {
      return;
    }

    this.processing = true;

    const processQueue = async () => {
      if (!this.processing) {
        return;
      }

      try {
        // Load pending emails from database
        const pending = await DatabaseManager.table('email_queue')
          .where('status', 'pending')
          .where('scheduled_for', '<=', new Date())
          .where('attempts', '<', this.retryAttempts)
          .limit(10)
          .execute();

        for (const item of pending) {
          try {
            // Send email
            await this.send({
              to: item.recipient,
              subject: item.subject,
              template: item.template,
              templateData: JSON.parse(item.template_data || '{}'),
              html: item.html
            });

            // Mark as sent
            await DatabaseManager.table('email_queue')
              .where('id', item.id)
              .update({
                status: 'sent',
                sent_at: new Date()
              })
              .execute();
          } catch (error) {
            // Increment attempts
            await DatabaseManager.table('email_queue')
              .where('id', item.id)
              .update({
                attempts: item.attempts + 1,
                last_error: error.message,
                status: item.attempts + 1 >= this.retryAttempts ? 'failed' : 'pending'
              })
              .execute();
          }
        }
      } catch (error) {
        this.logger?.error('Queue processing error', { error });
      }

      // Continue processing
      setTimeout(processQueue, 10000); // Process every 10 seconds
    };

    processQueue();
  }

  /**
   * Stop queue processor
   */
  stopQueueProcessor() {
    this.processing = false;
  }

  /**
   * Send bulk emails
   */
  async sendBulk(recipients, options) {
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.send({
          ...options,
          to: recipient
        });

        results.push({
          recipient,
          success: true,
          messageId: result.messageId
        });
      } catch (error) {
        results.push({
          recipient,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get email statistics
   */
  async getStatistics(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const stats = await DatabaseManager.raw(`
      SELECT
        status,
        COUNT(*) as count,
        DATE(sent_at) as date
      FROM email_logs
      WHERE sent_at >= ?
      GROUP BY status, DATE(sent_at)
      ORDER BY date DESC
    `, [since]);

    return stats;
  }

  /**
   * Log email to database
   * @private
   */
  async _logEmail(data) {
    try {
      await DatabaseManager.table('email_logs')
        .insert(data)
        .execute();
    } catch (error) {
      this.logger?.error('Failed to log email', { error });
    }
  }

  /**
   * Strip HTML tags from string
   * @private
   */
  _stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Close email service
   */
  async close() {
    this.stopQueueProcessor();

    if (this.transporter) {
      this.transporter.close();
    }

    this.logger?.info('Email service closed');
  }
}

export default new EmailService();
