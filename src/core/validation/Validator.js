/**
 * Validation Core
 * Joi-based validation with middleware
 * @module core/validation/Validator
 */

import Joi from 'joi';
import { ValidationError } from '../errors/AppError.js';

export class Validator {
  /**
   * Validate data against schema
   */
  static validate(data, schema) {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }));

      throw new ValidationError('Validation failed', details);
    }

    return value;
  }

  /**
   * Express middleware for validation
   */
  static middleware(schema, property = 'body') {
    return (req, res, next) => {
      try {
        req[property] = this.validate(req[property], schema);
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Common schemas
   */
  static schemas = {
    id: Joi.number().integer().positive().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    uuid: Joi.string().uuid().required(),
    pagination: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20)
    })
  };
}

export default Validator;
