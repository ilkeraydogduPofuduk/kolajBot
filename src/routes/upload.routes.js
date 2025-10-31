/**
 * Upload Routes
 * Defines file upload and queue management endpoints
 * @module routes/upload
 */

import express from 'express';
import multer from 'multer';
import UploadController from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { hasPermission } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import Joi from 'joi';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 50 // Max 50 files per request
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Validation schemas
const uploadSingleSchema = {
  body: Joi.object({
    brandName: Joi.string().required(),
    uploaderName: Joi.string().required(),
    productName: Joi.string().allow('', null),
    color: Joi.string().allow('', null)
  })
};

const uploadBulkSchema = {
  body: Joi.object({
    brandId: Joi.number().integer().required(),
    brandName: Joi.string().required(),
    uploaderName: Joi.string().required(),
    productName: Joi.string().allow('', null),
    enableOCR: Joi.string().valid('true', 'false').default('true'),
    createProduct: Joi.string().valid('true', 'false').default('true')
  })
};

const uploadCDNSchema = {
  body: Joi.object({
    remotePath: Joi.string().required()
  })
};

const deleteCDNSchema = {
  body: Joi.object({
    remotePath: Joi.string().required()
  })
};

const listCDNSchema = {
  query: Joi.object({
    directoryPath: Joi.string().required()
  })
};

const purgeCacheSchema = {
  body: Joi.object({
    publicUrl: Joi.string().uri().required()
  })
};

const jobIdParamSchema = {
  params: Joi.object({
    id: Joi.number().integer().required()
  })
};

// Protected routes - File uploads
router.post(
  '/single',
  authenticate,
  hasPermission('products.create'),
  upload.single('file'),
  validate(uploadSingleSchema),
  UploadController.uploadSingle
);

router.post(
  '/bulk',
  authenticate,
  hasPermission('products.create'),
  upload.array('files', 50),
  validate(uploadBulkSchema),
  UploadController.uploadBulk
);

// Protected routes - Job management
router.get(
  '/jobs',
  authenticate,
  UploadController.getUserJobs
);

router.get(
  '/jobs/:id',
  authenticate,
  validate(jobIdParamSchema),
  UploadController.getJobStatus
);

router.post(
  '/jobs/:id/cancel',
  authenticate,
  validate(jobIdParamSchema),
  UploadController.cancelJob
);

router.post(
  '/jobs/:id/retry',
  authenticate,
  validate(jobIdParamSchema),
  UploadController.retryJob
);

// Protected routes - CDN operations
router.post(
  '/cdn',
  authenticate,
  hasPermission('products.create'),
  upload.single('file'),
  validate(uploadCDNSchema),
  UploadController.uploadToCDN
);

router.get(
  '/cdn/*',
  authenticate,
  UploadController.getCDNFile
);

router.delete(
  '/cdn',
  authenticate,
  hasPermission('products.delete'),
  validate(deleteCDNSchema),
  UploadController.deleteCDNFile
);

router.get(
  '/cdn-list',
  authenticate,
  validate(listCDNSchema),
  UploadController.listCDNFiles
);

router.post(
  '/cdn/purge',
  authenticate,
  hasPermission('products.edit'),
  validate(purgeCacheSchema),
  UploadController.purgeCDNCache
);

// Protected routes - Statistics
router.get(
  '/stats',
  authenticate,
  hasPermission('products.view'),
  UploadController.getStorageStats
);

export default router;
