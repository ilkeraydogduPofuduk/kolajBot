/**
 * User Routes
 * Defines user management endpoints
 * @module routes/user
 */

import express from 'express';
import UserController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { hasPermission } from '../middleware/permission.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createUserSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    phone_number: Joi.string().allow('', null),
    role_id: Joi.number().integer().required(),
    brand_ids: Joi.array().items(Joi.number().integer()),
    is_active: Joi.boolean()
  })
};

const updateUserSchema = {
  body: Joi.object({
    email: Joi.string().email(),
    first_name: Joi.string(),
    last_name: Joi.string(),
    phone_number: Joi.string().allow('', null),
    role_id: Joi.number().integer(),
    brand_ids: Joi.array().items(Joi.number().integer()),
    is_active: Joi.boolean()
  })
};

const assignBrandsSchema = {
  body: Joi.object({
    brandIds: Joi.array().items(Joi.number().integer()).required()
  })
};

const idParamSchema = {
  params: Joi.object({
    id: Joi.number().integer().required()
  })
};

// Routes - All require authentication and permissions
router.get(
  '/',
  authenticate,
  hasPermission('users.view'),
  UserController.getAllUsers
);

router.get(
  '/search',
  authenticate,
  hasPermission('users.view'),
  UserController.searchUsers
);

router.get(
  '/by-role/:roleId',
  authenticate,
  hasPermission('users.view'),
  UserController.getUsersByRole
);

router.get(
  '/by-brand/:brandId',
  authenticate,
  hasPermission('users.view'),
  UserController.getUsersByBrand
);

router.get(
  '/:id',
  authenticate,
  hasPermission('users.view'),
  validate(idParamSchema),
  UserController.getUserById
);

router.post(
  '/',
  authenticate,
  hasPermission('users.create'),
  validate(createUserSchema),
  UserController.createUser
);

router.put(
  '/:id',
  authenticate,
  hasPermission('users.edit'),
  validate({ ...updateUserSchema, ...idParamSchema }),
  UserController.updateUser
);

router.delete(
  '/:id',
  authenticate,
  hasPermission('users.delete'),
  validate(idParamSchema),
  UserController.deleteUser
);

router.put(
  '/:id/activate',
  authenticate,
  hasPermission('users.edit'),
  validate(idParamSchema),
  UserController.activateUser
);

router.put(
  '/:id/deactivate',
  authenticate,
  hasPermission('users.edit'),
  validate(idParamSchema),
  UserController.deactivateUser
);

router.put(
  '/:id/brands',
  authenticate,
  hasPermission('users.edit'),
  validate({ ...assignBrandsSchema, ...idParamSchema }),
  UserController.assignBrands
);

export default router;
