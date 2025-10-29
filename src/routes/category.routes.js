/**
 * Category Routes
 * Defines category management endpoints
 * @module routes/category
 */

import express from 'express';
import CategoryController from '../controllers/category.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { hasPermission } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createCategorySchema = {
  body: Joi.object({
    name: Joi.string().required()
  })
};

const updateCategorySchema = {
  body: Joi.object({
    name: Joi.string().required()
  })
};

const idParamSchema = {
  params: Joi.object({
    id: Joi.number().integer().required()
  })
};

// Public routes
router.get('/', CategoryController.getAllCategories);
router.get('/:id', validate(idParamSchema), CategoryController.getCategoryById);

// Protected routes
router.post(
  '/',
  authenticate,
  hasPermission('categories.create'),
  validate(createCategorySchema),
  CategoryController.createCategory
);

router.put(
  '/:id',
  authenticate,
  hasPermission('categories.edit'),
  validate({ ...updateCategorySchema, ...idParamSchema }),
  CategoryController.updateCategory
);

router.delete(
  '/:id',
  authenticate,
  hasPermission('categories.delete'),
  validate(idParamSchema),
  CategoryController.deleteCategory
);

export default router;
