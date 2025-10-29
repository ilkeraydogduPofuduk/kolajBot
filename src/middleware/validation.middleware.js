/**
 * Validation Middleware
 * Request validation using Joi schemas
 * @module middleware/validation
 */

import { ValidationError } from '../core/error-handler.js';
import Logger from '../core/logger.js';

/**
 * Validate request against Joi schema
 * @param {object} schema - Joi schema object with body, params, query
 * @returns {Function} Middleware function
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const validationOptions = {
      abortEarly: false, // Return all errors
      allowUnknown: true, // Allow unknown fields
      stripUnknown: true  // Remove unknown fields
    };

    const errors = [];

    // Validate body
    if (schema.body) {
      const { error, value } = schema.body.validate(req.body, validationOptions);
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: 'body'
        })));
      } else {
        req.body = value;
      }
    }

    // Validate params
    if (schema.params) {
      const { error, value } = schema.params.validate(req.params, validationOptions);
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: 'params'
        })));
      } else {
        req.params = value;
      }
    }

    // Validate query
    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, validationOptions);
      if (error) {
        errors.push(...error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: 'query'
        })));
      } else {
        req.query = value;
      }
    }

    if (errors.length > 0) {
      Logger.warn('Validation failed', {
        path: req.path,
        errors
      });
      return next(new ValidationError('Validation failed', errors));
    }

    next();
  };
};

export default { validate };
