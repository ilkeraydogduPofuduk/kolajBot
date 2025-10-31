/**
 * Upload Queue Service
 * Handles background processing of bulk file uploads
 * @module services/upload-queue
 */

import UploadJobModel from '../models/upload-job.model.js';
import ProductModel from '../models/product.model.js';
import CDNService from './cdn.service.js';
import ImageProcessingService from './image-processing.service.js';
import OCRService from './ocr.service.js';
import { AppError } from '../core/error-handler.js';
import Logger from '../core/logger.js';
import EventEmitter from 'events';

/**
 * Upload Queue Service Class
 */
class UploadQueueService extends EventEmitter {
  constructor() {
    super();
    this.isProcessing = false;
    this.processingInterval = null;
    this.pollInterval = 5000; // 5 seconds
    this.maxConcurrent = 3; // Maximum concurrent jobs
    this.activeJobs = new Map();
  }

  /**
   * Start the queue processor
   */
  start() {
    if (this.isProcessing) {
      Logger.warn('Upload queue processor is already running');
      return;
    }

    Logger.info('Starting upload queue processor');
    this.isProcessing = true;

    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, this.pollInterval);
  }

  /**
   * Stop the queue processor
   */
  stop() {
    if (!this.isProcessing) {
      return;
    }

    Logger.info('Stopping upload queue processor');
    this.isProcessing = false;

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Create new upload job
   * @param {Object} jobData - Job data
   * @returns {Promise<Object>} Created job
   */
  async createJob(jobData) {
    const {
      userId,
      brandId,
      files,
      metadata = {},
      options = {}
    } = jobData;

    try {
      Logger.info(`Creating upload job for user ${userId}, brand ${brandId} with ${files.length} files`);

      const job = await UploadJobModel.create({
        user_id: userId,
        brand_id: brandId,
        total_files: files.length,
        processed_files: 0,
        status: 'pending',
        metadata: {
          ...metadata,
          fileNames: files.map(f => f.originalname || f.name),
          options
        }
      });

      // Store files temporarily for processing
      this.activeJobs.set(job.id, {
        job,
        files,
        metadata,
        options
      });

      Logger.info(`Upload job created: ${job.id}`);

      // Trigger immediate processing
      if (this.isProcessing) {
        this.processQueue();
      }

      return job;
    } catch (error) {
      Logger.error('Failed to create upload job', error);
      throw new AppError('Failed to create upload job', 500);
    }
  }

  /**
   * Process the upload queue
   * @private
   */
  async processQueue() {
    try {
      // Get pending jobs
      const pendingJobs = await UploadJobModel.getPendingJobs(this.maxConcurrent);

      if (pendingJobs.length === 0) {
        return;
      }

      Logger.info(`Processing ${pendingJobs.length} pending jobs`);

      // Process each job
      for (const job of pendingJobs) {
        // Check if job data exists in active jobs
        const jobData = this.activeJobs.get(job.id);

        if (!jobData) {
          Logger.warn(`Job data not found for job ${job.id}, marking as failed`);
          await UploadJobModel.update(job.id, {
            status: 'failed',
            error_message: 'Job data not found'
          });
          continue;
        }

        // Process job in background
        this.processJob(job.id, jobData).catch(error => {
          Logger.error(`Error processing job ${job.id}`, error);
        });
      }
    } catch (error) {
      Logger.error('Error in queue processing', error);
    }
  }

  /**
   * Process individual job
   * @private
   */
  async processJob(jobId, jobData) {
    const { job, files, metadata, options } = jobData;

    try {
      Logger.info(`Processing job ${jobId} with ${files.length} files`);

      // Update job status to processing
      await UploadJobModel.update(jobId, { status: 'processing' });

      const results = {
        successful: [],
        failed: [],
        products: []
      };

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        try {
          // Process single file
          const result = await this.processSingleFile(file, {
            brandId: job.brand_id,
            userId: job.user_id,
            metadata,
            options
          });

          results.successful.push(result);

          if (result.product) {
            results.products.push(result.product);
          }

          // Update progress
          await UploadJobModel.updateProgress(
            jobId,
            i + 1,
            `Processed ${i + 1}/${files.length}: ${file.originalname || file.name}`
          );

          // Emit progress event
          this.emit('progress', {
            jobId,
            processed: i + 1,
            total: files.length,
            percentage: ((i + 1) / files.length * 100).toFixed(2)
          });
        } catch (error) {
          Logger.error(`Failed to process file ${file.originalname || file.name}`, error);

          results.failed.push({
            filename: file.originalname || file.name,
            error: error.message
          });

          // Continue with next file
        }
      }

      // Mark job as completed
      await UploadJobModel.update(jobId, {
        status: 'completed',
        processed_files: results.successful.length,
        completed_at: new Date(),
        result: results
      });

      // Clean up active jobs
      this.activeJobs.delete(jobId);

      // Emit completion event
      this.emit('completed', {
        jobId,
        results
      });

      Logger.info(`Job ${jobId} completed: ${results.successful.length} successful, ${results.failed.length} failed`);

      return results;
    } catch (error) {
      Logger.error(`Job ${jobId} failed`, error);

      // Mark job as failed
      await UploadJobModel.update(jobId, {
        status: 'failed',
        error_message: error.message
      });

      // Clean up
      this.activeJobs.delete(jobId);

      // Emit error event
      this.emit('error', {
        jobId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Process single file
   * @private
   */
  async processSingleFile(file, context) {
    const { brandId, userId, metadata, options } = context;

    // Validate image
    const validation = await ImageProcessingService.validateImage(
      file.buffer,
      file.originalname || file.name
    );

    // Optimize image
    const optimizedBuffer = await ImageProcessingService.optimizeImage(file.buffer, {
      width: 1200,
      quality: 85,
      format: 'jpeg'
    });

    // Extract information with OCR
    let ocrData = null;
    if (options.enableOCR !== false) {
      try {
        ocrData = await OCRService.analyzeProductImage(optimizedBuffer);
      } catch (error) {
        Logger.warn('OCR analysis failed, continuing without it', error);
      }
    }

    // Generate dynamic folder path
    const folderPath = CDNService.getDynamicFolderPath({
      brandName: metadata.brandName || `brand_${brandId}`,
      uploaderName: metadata.uploaderName || `user_${userId}`,
      date: new Date(),
      productName: metadata.productName || file.originalname?.replace(/\.[^/.]+$/, ''),
      color: metadata.color
    });

    // Upload to CDN
    const filename = `${Date.now()}_${file.originalname || file.name}`;
    const remotePath = `${folderPath}/${filename}`;

    const uploadResult = await CDNService.uploadFile(optimizedBuffer, remotePath, {
      contentType: validation.format === 'jpeg' ? 'image/jpeg' : `image/${validation.format}`
    });

    // Create product record if enabled
    let product = null;
    if (options.createProduct !== false) {
      try {
        const productData = {
          name: metadata.productName || file.originalname?.replace(/\.[^/.]+$/, ''),
          brand_id: brandId,
          images: [uploadResult.publicUrl],
          is_active: true,
          ...metadata.productData
        };

        // Add OCR data if available
        if (ocrData && ocrData.prices && ocrData.prices.length > 0) {
          productData.price = ocrData.prices[0].value;
          productData.currency = ocrData.prices[0].currency;
        }

        product = await ProductModel.create(productData);
        Logger.info(`Product created: ${product.id}`);
      } catch (error) {
        Logger.warn('Failed to create product record', error);
      }
    }

    return {
      filename: file.originalname || file.name,
      uploadResult,
      ocrData,
      product,
      validation
    };
  }

  /**
   * Get job status
   * @param {number} jobId - Job ID
   * @returns {Promise<Object>} Job status
   */
  async getJobStatus(jobId) {
    try {
      const job = await UploadJobModel.findById(jobId);

      if (!job) {
        throw new AppError('Job not found', 404);
      }

      // Calculate percentage
      const percentage = job.total_files > 0
        ? ((job.processed_files / job.total_files) * 100).toFixed(2)
        : 0;

      return {
        ...job,
        percentage,
        isActive: this.activeJobs.has(jobId)
      };
    } catch (error) {
      Logger.error('Failed to get job status', error);
      throw error instanceof AppError ? error : new AppError('Failed to get job status', 500);
    }
  }

  /**
   * Cancel job
   * @param {number} jobId - Job ID
   * @returns {Promise<boolean>} Success status
   */
  async cancelJob(jobId) {
    try {
      const job = await UploadJobModel.findById(jobId);

      if (!job) {
        throw new AppError('Job not found', 404);
      }

      if (job.status === 'completed' || job.status === 'failed') {
        throw new AppError('Cannot cancel completed or failed job', 400);
      }

      // Update job status
      await UploadJobModel.update(jobId, {
        status: 'cancelled',
        error_message: 'Job cancelled by user'
      });

      // Remove from active jobs
      this.activeJobs.delete(jobId);

      Logger.info(`Job ${jobId} cancelled`);

      return true;
    } catch (error) {
      Logger.error('Failed to cancel job', error);
      throw error instanceof AppError ? error : new AppError('Failed to cancel job', 500);
    }
  }

  /**
   * Retry failed job
   * @param {number} jobId - Job ID
   * @returns {Promise<Object>} Updated job
   */
  async retryJob(jobId) {
    try {
      const job = await UploadJobModel.findById(jobId);

      if (!job) {
        throw new AppError('Job not found', 404);
      }

      if (job.status !== 'failed') {
        throw new AppError('Can only retry failed jobs', 400);
      }

      // Reset job status
      await UploadJobModel.update(jobId, {
        status: 'pending',
        processed_files: 0,
        error_message: null
      });

      Logger.info(`Job ${jobId} queued for retry`);

      // Trigger immediate processing
      if (this.isProcessing) {
        this.processQueue();
      }

      return await UploadJobModel.findById(jobId);
    } catch (error) {
      Logger.error('Failed to retry job', error);
      throw error instanceof AppError ? error : new AppError('Failed to retry job', 500);
    }
  }

  /**
   * Get user's jobs
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of jobs
   */
  async getUserJobs(userId, options = {}) {
    try {
      const { status, limit = 20, offset = 0 } = options;

      const jobs = await UploadJobModel.findByUser(userId, { status, limit, offset });

      return jobs.map(job => ({
        ...job,
        percentage: job.total_files > 0
          ? ((job.processed_files / job.total_files) * 100).toFixed(2)
          : 0
      }));
    } catch (error) {
      Logger.error('Failed to get user jobs', error);
      throw new AppError('Failed to get user jobs', 500);
    }
  }

  /**
   * Clean old completed jobs
   * @param {number} daysOld - Delete jobs older than this many days
   * @returns {Promise<number>} Number of deleted jobs
   */
  async cleanOldJobs(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deleted = await UploadJobModel.deleteOldCompleted(cutoffDate);

      Logger.info(`Cleaned ${deleted} old completed jobs`);

      return deleted;
    } catch (error) {
      Logger.error('Failed to clean old jobs', error);
      return 0;
    }
  }
}

export default new UploadQueueService();
