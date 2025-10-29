/**
 * Product Routes
 * Defines product management endpoints
 * @module routes/product
 */

import express from 'express';
import ProductController from '../controllers/product.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { hasPermission } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createProductSchema = {
  body: Joi.object({
    name: Joi.string().required(),
    code: Joi.string().allow('', null),
    color: Joi.string().allow('', null),
    product_type: Joi.string().allow('', null),
    size_range: Joi.string().allow('', null),
    slug: Joi.string().allow('', null),
    brand_id: Joi.number().integer().required(),
    category_id: Joi.number().integer().allow(null),
    price: Joi.number().allow(null),
    currency: Joi.string().default('USD'),
    images: Joi.array().items(Joi.string()),
    specifications: Joi.object(),
    is_active: Joi.boolean()
  })
};

const updateProductSchema = {
  body: Joi.object({
    name: Joi.string(),
    code: Joi.string().allow('', null),
    color: Joi.string().allow('', null),
    product_type: Joi.string().allow('', null),
    size_range: Joi.string().allow('', null),
    slug: Joi.string().allow('', null),
    brand_id: Joi.number().integer(),
    category_id: Joi.number().integer().allow(null),
    price: Joi.number().allow(null),
    currency: Joi.string(),
    images: Joi.array().items(Joi.string()),
    specifications: Joi.object(),
    is_active: Joi.boolean()
  })
};

const bulkCreateSchema = {
  body: Joi.object({
    products: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      brand_id: Joi.number().integer().required(),
      category_id: Joi.number().integer().allow(null),
      price: Joi.number().allow(null),
      images: Joi.array().items(Joi.string())
    })).required()
  })
};

const idParamSchema = {
  params: Joi.object({
    id: Joi.number().integer().required()
  })
};

// Public routes
router.get('/recent', ProductController.getRecentProducts);
router.get('/slug/:slug', ProductController.getProductBySlug);

// Protected routes
router.get(
  '/',
  authenticate,
  hasPermission('products.view'),
  ProductController.getAllProducts
);

router.get(
  '/search',
  authenticate,
  hasPermission('products.view'),
  ProductController.searchProducts
);

router.get(
  '/by-brand/:brandId',
  authenticate,
  hasPermission('products.view'),
  ProductController.getProductsByBrand
);

router.get(
  '/by-category/:categoryId',
  authenticate,
  hasPermission('products.view'),
  ProductController.getProductsByCategory
);

router.get(
  '/statistics/brand/:brandId',
  authenticate,
  hasPermission('products.view'),
  ProductController.getStatisticsByBrand
);

router.get(
  '/:id',
  authenticate,
  hasPermission('products.view'),
  validate(idParamSchema),
  ProductController.getProductById
);

router.post(
  '/',
  authenticate,
  hasPermission('products.create'),
  validate(createProductSchema),
  ProductController.createProduct
);

router.post(
  '/bulk',
  authenticate,
  hasPermission('products.create'),
  validate(bulkCreateSchema),
  ProductController.bulkCreateProducts
);

router.put(
  '/:id',
  authenticate,
  hasPermission('products.edit'),
  validate({ ...updateProductSchema, ...idParamSchema }),
  ProductController.updateProduct
);

router.put(
  '/:id/mark-processed',
  authenticate,
  hasPermission('products.edit'),
  validate(idParamSchema),
  ProductController.markAsProcessed
);

router.delete(
  '/:id',
  authenticate,
  hasPermission('products.delete'),
  validate(idParamSchema),
  ProductController.deleteProduct
);

export default router;
