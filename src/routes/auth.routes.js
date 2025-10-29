/**
 * Authentication Routes
 * Defines authentication endpoints
 * @module routes/auth
 */

import express from 'express';
import AuthController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const registerSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    phone_number: Joi.string().allow('', null),
    role_id: Joi.number().integer().required()
  })
};

const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  })
};

const refreshTokenSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required()
  })
};

const changePasswordSchema = {
  body: Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
  })
};

// Routes
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/refresh', validate(refreshTokenSchema), AuthController.refreshToken);
router.get('/me', authenticate, AuthController.getCurrentUser);
router.post('/change-password', authenticate, validate(changePasswordSchema), AuthController.changePassword);
router.post('/logout', authenticate, AuthController.logout);

export default router;
