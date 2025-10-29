/**
 * Upload Job Model
 * Handles upload job tracking
 * @module models/upload-job
 */

import BaseModel from './base.model.js';

/**
 * Upload Job Model Class
 */
class UploadJobModel extends BaseModel {
  constructor() {
    super('upload_jobs', [
      'id', 'brand_id', 'uploader_id', 'brand_manager_id', 'upload_date',
      'total_files', 'processed_files', 'status', 'base_path', 'file_list',
      'processing_log', 'error_message', 'products_created', 'templates_created',
      'ocr_processed', 'created_at', 'started_at', 'completed_at'
    ]);
  }

  /**
   * Create upload job
   * @param {object} data - Job data
   * @returns {Promise<object>} Created job
   */
  async createJob(data) {
    const jobData = {
      ...data,
      status: data.status || 'PENDING',
      upload_date: data.upload_date || new Date(),
      processed_files: 0,
      products_created: 0,
      templates_created: 0,
      ocr_processed: 0,
      file_list: data.file_list ? JSON.stringify(data.file_list) : '[]',
      processing_log: data.processing_log ? JSON.stringify(data.processing_log) : '{}'
    };

    return await this.create(jobData);
  }

  /**
   * Update job status
   * @param {number} jobId - Job ID
   * @param {string} status - New status
   * @param {object} extraData - Additional data
   * @returns {Promise<object>} Updated job
   */
  async updateStatus(jobId, status, extraData = {}) {
    const updateData = { status, ...extraData };

    if (status === 'PROCESSING' && !extraData.started_at) {
      updateData.started_at = new Date();
    } else if (status === 'COMPLETED' && !extraData.completed_at) {
      updateData.completed_at = new Date();
    }

    return await this.update(jobId, updateData);
  }

  /**
   * Update progress
   * @param {number} jobId - Job ID
   * @param {number} processedFiles - Number of processed files
   * @param {object} log - Processing log
   * @returns {Promise<object>} Updated job
   */
  async updateProgress(jobId, processedFiles, log = {}) {
    const job = await this.findById(jobId);
    const currentLog = job.processing_log ? JSON.parse(job.processing_log) : {};
    const updatedLog = { ...currentLog, ...log };

    return await this.update(jobId, {
      processed_files: processedFiles,
      processing_log: JSON.stringify(updatedLog)
    });
  }

  /**
   * Find jobs by brand
   * @param {number} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {Promise<object>} Jobs with pagination
   */
  async findByBrand(brandId, options = {}) {
    const { page = 1, limit = 20, status } = options;
    const where = { brand_id: brandId };
    if (status) where.status = status;

    return await this.paginate({
      where,
      page,
      limit,
      orderBy: 'created_at',
      order: 'DESC'
    });
  }

  /**
   * Find jobs by uploader
   * @param {number} uploaderId - Uploader ID
   * @param {object} options - Query options
   * @returns {Promise<object>} Jobs with pagination
   */
  async findByUploader(uploaderId, options = {}) {
    const { page = 1, limit = 20 } = options;
    return await this.paginate({
      where: { uploader_id: uploaderId },
      page,
      limit,
      orderBy: 'created_at',
      order: 'DESC'
    });
  }

  /**
   * Get job statistics
   * @param {number} jobId - Job ID
   * @returns {Promise<object>} Job statistics
   */
  async getJobStatistics(jobId) {
    const job = await this.findById(jobId);
    if (!job) return null;

    const completionPercentage = job.total_files > 0
      ? Math.round((job.processed_files / job.total_files) * 100)
      : 0;

    const duration = job.started_at && job.completed_at
      ? new Date(job.completed_at) - new Date(job.started_at)
      : null;

    return {
      ...job,
      completion_percentage: completionPercentage,
      duration_ms: duration,
      duration_seconds: duration ? Math.round(duration / 1000) : null
    };
  }

  /**
   * Get pending jobs
   * @param {number} limit - Limit
   * @returns {Promise<Array>} Pending jobs
   */
  async getPendingJobs(limit = 10) {
    return await this.findAll({
      where: { status: 'PENDING' },
      limit,
      orderBy: 'created_at',
      order: 'ASC'
    });
  }

  /**
   * Get processing jobs
   * @returns {Promise<Array>} Processing jobs
   */
  async getProcessingJobs() {
    return await this.findAll({
      where: { status: 'PROCESSING' },
      orderBy: 'started_at',
      order: 'ASC'
    });
  }
}

export default new UploadJobModel();
