/**
 * Template Routes
 * Defines template and collage generation endpoints
 * @module routes/template
 */

import express from 'express';
import TemplateController from '../controllers/template.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { hasPermission } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const generateTemplateSchema = {
  body: Joi.object({
    brandId: Joi.number().integer().required(),
    productIds: Joi.array().items(Joi.number().integer()).min(1).required(),
    platform: Joi.string().valid('whatsapp', 'telegram', 'instagram', 'facebook').default('whatsapp'),
    layout: Joi.string().valid('auto', 'grid_2x2', 'grid_3x3', 'grid_4x4', 'horizontal_strip', 'vertical_strip', 'magazine').default('auto'),
    customSettings: Joi.object()
  })
};

const generateMultiPlatformSchema = {
  body: Joi.object({
    brandId: Joi.number().integer().required(),
    productIds: Joi.array().items(Joi.number().integer()).min(1).required(),
    platforms: Joi.array().items(Joi.string().valid('whatsapp', 'telegram', 'instagram', 'facebook')).default(['whatsapp', 'telegram', 'instagram'])
  })
};

const suggestionsSchema = {
  body: Joi.object({
    brandId: Joi.number().integer().required(),
    productIds: Joi.array().items(Joi.number().integer()).min(1).required()
  })
};

const brandingSchema = {
  body: Joi.object({
    logo: Joi.string().allow(null),
    watermark: Joi.string().allow(null),
    colorScheme: Joi.object({
      background: Joi.string(),
      text: Joi.string(),
      accent: Joi.string()
    }),
    fonts: Joi.object()
  })
};

const createTemplateSchema = {
  body: Joi.object({
    name: Joi.string().required(),
    platform: Joi.string().valid('whatsapp', 'telegram', 'instagram', 'facebook').required(),
    brand_id: Joi.number().integer().required(),
    template_type: Joi.string().default('custom'),
    dimensions: Joi.object({
      width: Joi.number().integer().required(),
      height: Joi.number().integer().required()
    }).required(),
    layout: Joi.string().required(),
    template_data: Joi.object().required(),
    settings: Joi.object(),
    is_active: Joi.boolean().default(true)
  })
};

const updateTemplateSchema = {
  body: Joi.object({
    name: Joi.string(),
    platform: Joi.string().valid('whatsapp', 'telegram', 'instagram', 'facebook'),
    template_type: Joi.string(),
    dimensions: Joi.object({
      width: Joi.number().integer(),
      height: Joi.number().integer()
    }),
    layout: Joi.string(),
    template_data: Joi.object(),
    settings: Joi.object(),
    is_active: Joi.boolean()
  })
};

const idParamSchema = {
  params: Joi.object({
    id: Joi.number().integer().required()
  })
};

// Public routes
router.get('/popular', TemplateController.getPopularTemplates);

// Protected routes - View templates
router.get(
  '/',
  authenticate,
  hasPermission('templates.view'),
  TemplateController.getAllTemplates
);

router.get(
  '/by-brand/:brandId',
  authenticate,
  hasPermission('templates.view'),
  TemplateController.getTemplatesByBrand
);

router.get(
  '/by-platform/:platform',
  authenticate,
  hasPermission('templates.view'),
  TemplateController.getTemplatesByPlatform
);

router.get(
  '/:id',
  authenticate,
  hasPermission('templates.view'),
  validate(idParamSchema),
  TemplateController.getTemplateById
);

// Protected routes - Generate templates
router.post(
  '/generate',
  authenticate,
  hasPermission('templates.create'),
  validate(generateTemplateSchema),
  TemplateController.generateTemplate
);

router.post(
  '/generate-multi',
  authenticate,
  hasPermission('templates.create'),
  validate(generateMultiPlatformSchema),
  TemplateController.generateMultiPlatform
);

router.post(
  '/suggestions',
  authenticate,
  hasPermission('templates.view'),
  validate(suggestionsSchema),
  TemplateController.getTemplateSuggestions
);

router.post(
  '/:id/regenerate',
  authenticate,
  hasPermission('templates.edit'),
  validate(idParamSchema),
  TemplateController.regenerateTemplate
);

router.post(
  '/:id/branding',
  authenticate,
  hasPermission('templates.edit'),
  validate({ ...brandingSchema, ...idParamSchema }),
  TemplateController.applyBranding
);

// Protected routes - Create/Update/Delete
router.post(
  '/',
  authenticate,
  hasPermission('templates.create'),
  validate(createTemplateSchema),
  TemplateController.createTemplate
);

router.put(
  '/:id',
  authenticate,
  hasPermission('templates.edit'),
  validate({ ...updateTemplateSchema, ...idParamSchema }),
  TemplateController.updateTemplate
);

router.delete(
  '/:id',
  authenticate,
  hasPermission('templates.delete'),
  validate(idParamSchema),
  TemplateController.deleteTemplate
);

router.post(
  '/:id/duplicate',
  authenticate,
  hasPermission('templates.create'),
  validate(idParamSchema),
  TemplateController.duplicateTemplate
);

router.post(
  '/:id/increment-usage',
  authenticate,
  hasPermission('templates.view'),
  validate(idParamSchema),
  TemplateController.incrementUsage
);

export default router;
