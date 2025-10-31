/**
 * Upload Controller
 * Handles file upload and queue management HTTP requests
 * @module controllers/upload
 */

import UploadQueueService from '../services/upload-queue.service.js';
import CDNService from '../services/cdn.service.js';
import ImageProcessingService from '../services/image-processing.service.js';
import Response from '../core/response.js';
import { ErrorHandler } from '../core/error-handler.js';
import { AppError } from '../core/error-handler.js';

/**
 * Upload Controller Class
 */
class UploadController {
  /**
   * Upload single file
   * POST /api/uploads/single
   */
  uploadSingle = ErrorHandler.asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('No file provided', 400);
    }

    const { brandName, uploaderName, productName, color } = req.body;
    const userId = req.user.id;

    // Validate image
    await ImageProcessingService.validateImage(req.file.buffer, req.file.originalname);

    // Optimize image
    const optimizedBuffer = await ImageProcessingService.optimizeImage(req.file.buffer, {
      width: 1200,
      quality: 85,
      format: 'jpeg'
    });

    // Generate dynamic folder path
    const folderPath = CDNService.getDynamicFolderPath({
      brandName,
      uploaderName,
      date: new Date(),
      productName,
      color
    });

    // Upload to CDN
    const filename = `${Date.now()}_${req.file.originalname}`;
    const remotePath = `${folderPath}/${filename}`;

    const result = await CDNService.uploadFile(optimizedBuffer, remotePath, {
      contentType: 'image/jpeg'
    });

    Response.created(res, result, 'File uploaded successfully');
  });

  /**
   * Upload multiple files (bulk)
   * POST /api/uploads/bulk
   */
  uploadBulk = ErrorHandler.asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      throw new AppError('No files provided', 400);
    }

    const { brandId, brandName, uploaderName, productName, enableOCR, createProduct } = req.body;
    const userId = req.user.id;

    // Create upload job
    const job = await UploadQueueService.createJob({
      userId,
      brandId: parseInt(brandId),
      files: req.files.map(file => ({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      })),
      metadata: {
        brandName,
        uploaderName,
        productName
      },
      options: {
        enableOCR: enableOCR === 'true',
        createProduct: createProduct !== 'false'
      }
    });

    Response.created(res, job, 'Upload job created successfully');
  });

  /**
   * Get job status
   * GET /api/uploads/jobs/:id
   */
  getJobStatus = ErrorHandler.asyncHandler(async (req, res) => {
    const jobId = parseInt(req.params.id);
    const status = await UploadQueueService.getJobStatus(jobId);

    Response.success(res, status, 'Job status retrieved successfully');
  });

  /**
   * Get user's jobs
   * GET /api/uploads/jobs
   */
  getUserJobs = ErrorHandler.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { status, limit, offset } = req.query;

    const jobs = await UploadQueueService.getUserJobs(userId, {
      status,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    });

    Response.success(res, jobs, 'Jobs retrieved successfully');
  });

  /**
   * Cancel job
   * POST /api/uploads/jobs/:id/cancel
   */
  cancelJob = ErrorHandler.asyncHandler(async (req, res) => {
    const jobId = parseInt(req.params.id);
    await UploadQueueService.cancelJob(jobId);

    Response.success(res, null, 'Job cancelled successfully');
  });

  /**
   * Retry failed job
   * POST /api/uploads/jobs/:id/retry
   */
  retryJob = ErrorHandler.asyncHandler(async (req, res) => {
    const jobId = parseInt(req.params.id);
    const job = await UploadQueueService.retryJob(jobId);

    Response.success(res, job, 'Job queued for retry');
  });

  /**
   * Upload to CDN directly
   * POST /api/uploads/cdn
   */
  uploadToCDN = ErrorHandler.asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('No file provided', 400);
    }

    const { remotePath } = req.body;

    if (!remotePath) {
      throw new AppError('Remote path is required', 400);
    }

    const result = await CDNService.uploadFile(
      req.file.buffer,
      remotePath,
      {
        contentType: req.file.mimetype
      }
    );

    Response.created(res, result, 'File uploaded to CDN successfully');
  });

  /**
   * Get CDN file
   * GET /api/uploads/cdn/:remotePath
   */
  getCDNFile = ErrorHandler.asyncHandler(async (req, res) => {
    const remotePath = req.params[0]; // Capture full path with wildcards

    const buffer = await CDNService.getFile(remotePath);

    res.set('Content-Type', 'image/jpeg');
    res.send(buffer);
  });

  /**
   * Delete CDN file
   * DELETE /api/uploads/cdn
   */
  deleteCDNFile = ErrorHandler.asyncHandler(async (req, res) => {
    const { remotePath } = req.body;

    if (!remotePath) {
      throw new AppError('Remote path is required', 400);
    }

    await CDNService.deleteFile(remotePath);

    Response.success(res, null, 'File deleted from CDN successfully');
  });

  /**
   * List CDN files
   * GET /api/uploads/cdn/list
   */
  listCDNFiles = ErrorHandler.asyncHandler(async (req, res) => {
    const { directoryPath } = req.query;

    if (!directoryPath) {
      throw new AppError('Directory path is required', 400);
    }

    const files = await CDNService.listFiles(directoryPath);

    Response.success(res, files, 'Files retrieved successfully');
  });

  /**
   * Purge CDN cache
   * POST /api/uploads/cdn/purge
   */
  purgeCDNCache = ErrorHandler.asyncHandler(async (req, res) => {
    const { publicUrl } = req.body;

    if (!publicUrl) {
      throw new AppError('Public URL is required', 400);
    }

    const result = await CDNService.purgeCache(publicUrl);

    Response.success(res, { purged: result }, 'Cache purge requested');
  });

  /**
   * Get storage statistics
   * GET /api/uploads/stats
   */
  getStorageStats = ErrorHandler.asyncHandler(async (req, res) => {
    const stats = await CDNService.getStorageStats();

    Response.success(res, stats, 'Storage statistics retrieved successfully');
  });
}

export default new UploadController();
