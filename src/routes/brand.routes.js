/**
 * Brand Routes
 * Defines brand management endpoints
 * @module routes/brand
 */

import express from 'express';
import BrandController from '../controllers/brand.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { hasPermission } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createBrandSchema = {
  body: Joi.object({
    name: Joi.string().required(),
    category_id: Joi.number().integer().allow(null),
    logo_url: Joi.string().uri().allow('', null),
    is_active: Joi.boolean()
  })
};

const updateBrandSchema = {
  body: Joi.object({
    name: Joi.string(),
    category_id: Joi.number().integer().allow(null),
    logo_url: Joi.string().uri().allow('', null),
    is_active: Joi.boolean()
  })
};

const idParamSchema = {
  params: Joi.object({
    id: Joi.number().integer().required()
  })
};

// Public routes
router.get('/active', BrandController.getActiveBrands);

// Protected routes
router.get(
  '/',
  authenticate,
  hasPermission('brands.view'),
  BrandController.getAllBrands
);

router.get(
  '/search',
  authenticate,
  hasPermission('brands.view'),
  BrandController.searchBrands
);

router.get(
  '/by-category/:categoryId',
  authenticate,
  hasPermission('brands.view'),
  BrandController.getBrandsByCategory
);

router.get(
  '/:id/statistics',
  authenticate,
  hasPermission('brands.view'),
  validate(idParamSchema),
  BrandController.getBrandStatistics
);

router.get(
  '/:id',
  authenticate,
  hasPermission('brands.view'),
  validate(idParamSchema),
  BrandController.getBrandById
);

router.post(
  '/',
  authenticate,
  hasPermission('brands.create'),
  validate(createBrandSchema),
  BrandController.createBrand
);

router.put(
  '/:id',
  authenticate,
  hasPermission('brands.edit'),
  validate({ ...updateBrandSchema, ...idParamSchema }),
  BrandController.updateBrand
);

router.delete(
  '/:id',
  authenticate,
  hasPermission('brands.delete'),
  validate(idParamSchema),
  BrandController.deleteBrand
);

export default router;
