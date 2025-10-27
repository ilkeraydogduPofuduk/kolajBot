/**
 * Tip Güvenliği ve Doğrulama Sistemi
 * Tüm doğrulamalar tek yerden yönetilir
 */

import { logger } from './logger';
// Local constants for validation
const VALIDATION_CONSTANTS = {
  REGEX_PATTERNS: {
    PHONE: /^[\+]?[1-9][\d]{0,15}$/,
    URL: /^https?:\/\/.+/,
    PRODUCT_CODE: /^[A-Z0-9-]+$/,
    COLOR_CODE: /^[A-Z0-9]+$/
  },
  VALIDATION_RULES: {
    PASSWORD: {
      MIN_LENGTH: 8,
      MAX_LENGTH: 128
    },
    USERNAME: {
      MIN_LENGTH: 3,
      MAX_LENGTH: 50
    },
    BRAND_NAME: {
      MIN_LENGTH: 2,
      MAX_LENGTH: 100
    },
    PRODUCT_CODE: {
      MIN_LENGTH: 3,
      MAX_LENGTH: 20
    },
    TEMPLATE_NAME: {
      MIN_LENGTH: 3,
      MAX_LENGTH: 100
    },
    FILE: {
      MAX_SIZE_MB: 10
    }
  }
};

export enum ValidationType {
  REQUIRED = 'required',
  EMAIL = 'email',
  PHONE = 'phone',
  URL = 'url',
  PASSWORD = 'password',
  USERNAME = 'username',
  PRODUCT_CODE = 'product_code',
  COLOR_CODE = 'color_code',
  DATE = 'date',
  NUMBER = 'number',
  STRING = 'string',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
  FILE = 'file',
  CUSTOM = 'custom',
}

export interface ValidationRule {
  field: string;
  validationType: ValidationType;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: RegExp;
  allowedValues?: any[];
  customValidator?: (value: any) => boolean;
  errorMessage?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fieldErrors: Record<string, string[]>;
}

class Validator {
  private rules: Map<string, ValidationRule[]> = new Map();
  private errors: string[] = [];
  private fieldErrors: Map<string, string[]> = new Map();

  addRule(rule: ValidationRule): void {
    if (!this.rules.has(rule.field)) {
      this.rules.set(rule.field, []);
    }
    this.rules.get(rule.field)!.push(rule);
  }

  validate(data: Record<string, any>): ValidationResult {
    this.errors = [];
    this.fieldErrors.clear();

    for (const [field, rules] of Array.from(this.rules.entries())) {
      const value = data[field];
      const fieldErrors: string[] = [];

      for (const rule of rules) {
        if (!this.validateField(field, value, rule)) {
          const errorMessage = rule.errorMessage || this.getDefaultErrorMessage(field, rule);
          fieldErrors.push(errorMessage);
          this.errors.push(errorMessage);
        }
      }

      if (fieldErrors.length > 0) {
        this.fieldErrors.set(field, fieldErrors);
      }
    }

    return {
      isValid: this.errors.length === 0,
      errors: [...this.errors],
      fieldErrors: Object.fromEntries(this.fieldErrors),
    };
  }

  private validateField(field: string, value: any, rule: ValidationRule): boolean {
    // Required check
    if (rule.required && (value === null || value === undefined || value === '')) {
      return false;
    }

    // Skip validation if value is null/undefined and not required
    if ((value === null || value === undefined) && !rule.required) {
      return true;
    }

    // Type-specific validation
    switch (rule.validationType) {
      case ValidationType.EMAIL:
        return this.validateEmail(field, value, rule);
      case ValidationType.PHONE:
        return this.validatePhone(field, value, rule);
      case ValidationType.URL:
        return this.validateUrl(field, value, rule);
      case ValidationType.PASSWORD:
        return this.validatePassword(field, value, rule);
      case ValidationType.USERNAME:
        return this.validateUsername(field, value, rule);
      case ValidationType.PRODUCT_CODE:
        return this.validateProductCode(field, value, rule);
      case ValidationType.COLOR_CODE:
        return this.validateColorCode(field, value, rule);
      case ValidationType.DATE:
        return this.validateDate(field, value, rule);
      case ValidationType.NUMBER:
        return this.validateNumber(field, value, rule);
      case ValidationType.STRING:
        return this.validateString(field, value, rule);
      case ValidationType.BOOLEAN:
        return this.validateBoolean(field, value, rule);
      case ValidationType.ARRAY:
        return this.validateArray(field, value, rule);
      case ValidationType.OBJECT:
        return this.validateObject(field, value, rule);
      case ValidationType.FILE:
        return this.validateFile(field, value, rule);
      case ValidationType.CUSTOM:
        return this.validateCustom(field, value, rule);
      default:
        return true;
    }
  }

  private validateEmail(field: string, value: any, rule: ValidationRule): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(String(value));
  }

  private validatePhone(field: string, value: any, rule: ValidationRule): boolean {
    return VALIDATION_CONSTANTS.REGEX_PATTERNS.PHONE.test(String(value));
  }

  private validateUrl(field: string, value: any, rule: ValidationRule): boolean {
    return VALIDATION_CONSTANTS.REGEX_PATTERNS.URL.test(String(value));
  }

  private validatePassword(field: string, value: any, rule: ValidationRule): boolean {
    const password = String(value);

    if (password.length < VALIDATION_CONSTANTS.VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
      return false;
    }

    if (password.length > VALIDATION_CONSTANTS.VALIDATION_RULES.PASSWORD.MAX_LENGTH) {
      return false;
    }

    // Check for at least one uppercase, lowercase, digit, and special character
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/\d/.test(password)) return false;
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;

    return true;
  }

  private validateUsername(field: string, value: any, rule: ValidationRule): boolean {
    const username = String(value);

    if (username.length < VALIDATION_CONSTANTS.VALIDATION_RULES.USERNAME.MIN_LENGTH) {
      return false;
    }

    if (username.length > VALIDATION_CONSTANTS.VALIDATION_RULES.USERNAME.MAX_LENGTH) {
      return false;
    }

    // Check for valid characters (alphanumeric and underscore only)
    return /^[a-zA-Z0-9_]+$/.test(username);
  }

  private validateProductCode(field: string, value: any, rule: ValidationRule): boolean {
    return VALIDATION_CONSTANTS.REGEX_PATTERNS.PRODUCT_CODE.test(String(value));
  }

  private validateColorCode(field: string, value: any, rule: ValidationRule): boolean {
    return VALIDATION_CONSTANTS.REGEX_PATTERNS.COLOR_CODE.test(String(value));
  }

  private validateDate(field: string, value: any, rule: ValidationRule): boolean {
    try {
      const date = new Date(value);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  }

  private validateNumber(field: string, value: any, rule: ValidationRule): boolean {
    const numValue = Number(value);

    if (isNaN(numValue)) {
      return false;
    }

    if (rule.minValue !== undefined && numValue < rule.minValue) {
      return false;
    }

    if (rule.maxValue !== undefined && numValue > rule.maxValue) {
      return false;
    }

    return true;
  }

  private validateString(field: string, value: any, rule: ValidationRule): boolean {
    const strValue = String(value);

    if (rule.minLength !== undefined && strValue.length < rule.minLength) {
      return false;
    }

    if (rule.maxLength !== undefined && strValue.length > rule.maxLength) {
      return false;
    }

    if (rule.pattern && !rule.pattern.test(strValue)) {
      return false;
    }

    if (rule.allowedValues && !rule.allowedValues.includes(strValue)) {
      return false;
    }

    return true;
  }

  private validateBoolean(field: string, value: any, rule: ValidationRule): boolean {
    return typeof value === 'boolean';
  }

  private validateArray(field: string, value: any, rule: ValidationRule): boolean {
    if (!Array.isArray(value)) {
      return false;
    }

    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return false;
    }

    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      return false;
    }

    return true;
  }

  private validateObject(field: string, value: any, rule: ValidationRule): boolean {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private validateFile(field: string, value: any, rule: ValidationRule): boolean {
    return value instanceof File;
  }

  private validateCustom(field: string, value: any, rule: ValidationRule): boolean {
    if (rule.customValidator) {
      try {
        return rule.customValidator(value);
      } catch (error) {
        logger.error('Custom validation error', { field, error });
        return false;
      }
    }
    return true;
  }

  private getDefaultErrorMessage(field: string, rule: ValidationRule): string {
    switch (rule.validationType) {
      case ValidationType.REQUIRED:
        return `${field} is required`;
      case ValidationType.EMAIL:
        return `${field} must be a valid email address`;
      case ValidationType.PHONE:
        return `${field} must be a valid phone number`;
      case ValidationType.URL:
        return `${field} must be a valid URL`;
      case ValidationType.PASSWORD:
        return `${field} must meet password requirements`;
      case ValidationType.USERNAME:
        return `${field} must be a valid username`;
      case ValidationType.PRODUCT_CODE:
        return `${field} must be a valid product code`;
      case ValidationType.COLOR_CODE:
        return `${field} must be a valid color code`;
      case ValidationType.DATE:
        return `${field} must be a valid date`;
      case ValidationType.NUMBER:
        return `${field} must be a valid number`;
      case ValidationType.STRING:
        return `${field} must be a valid string`;
      case ValidationType.BOOLEAN:
        return `${field} must be a boolean value`;
      case ValidationType.ARRAY:
        return `${field} must be an array`;
      case ValidationType.OBJECT:
        return `${field} must be an object`;
      case ValidationType.FILE:
        return `${field} must be a file`;
      default:
        return `${field} is invalid`;
    }
  }

  getErrors(): string[] {
    return [...this.errors];
  }

  getFieldErrors(): Record<string, string[]> {
    return Object.fromEntries(this.fieldErrors);
  }

  clearErrors(): void {
    this.errors = [];
    this.fieldErrors.clear();
  }
}

// Specific validators
class UserValidator extends Validator {
  constructor() {
    super();

    this.addRule({
      field: 'username',
      validationType: ValidationType.USERNAME,
      required: true,
      minLength: VALIDATION_CONSTANTS.VALIDATION_RULES.USERNAME.MIN_LENGTH,
      maxLength: VALIDATION_CONSTANTS.VALIDATION_RULES.USERNAME.MAX_LENGTH,
    });

    this.addRule({
      field: 'email',
      validationType: ValidationType.EMAIL,
      required: true,
    });

    this.addRule({
      field: 'password',
      validationType: ValidationType.PASSWORD,
      required: true,
      minLength: VALIDATION_CONSTANTS.VALIDATION_RULES.PASSWORD.MIN_LENGTH,
      maxLength: VALIDATION_CONSTANTS.VALIDATION_RULES.PASSWORD.MAX_LENGTH,
    });

    this.addRule({
      field: 'role',
      validationType: ValidationType.STRING,
      required: true,
      allowedValues: ['super_admin', 'brand_manager', 'employee', 'viewer'],
    });

    this.addRule({
      field: 'status',
      validationType: ValidationType.STRING,
      required: true,
      allowedValues: ['active', 'inactive', 'pending', 'suspended'],
    });
  }
}

class BrandValidator extends Validator {
  constructor() {
    super();

    this.addRule({
      field: 'name',
      validationType: ValidationType.STRING,
      required: true,
      minLength: VALIDATION_CONSTANTS.VALIDATION_RULES.BRAND_NAME.MIN_LENGTH,
      maxLength: VALIDATION_CONSTANTS.VALIDATION_RULES.BRAND_NAME.MAX_LENGTH,
    });

    this.addRule({
      field: 'description',
      validationType: ValidationType.STRING,
      required: false,
      maxLength: 500,
    });

    this.addRule({
      field: 'status',
      validationType: ValidationType.STRING,
      required: true,
      allowedValues: ['active', 'inactive', 'pending'],
    });
  }
}

class ProductValidator extends Validator {
  constructor() {
    super();

    this.addRule({
      field: 'name',
      validationType: ValidationType.STRING,
      required: true,
      minLength: 3,
      maxLength: 100,
    });

    this.addRule({
      field: 'code',
      validationType: ValidationType.PRODUCT_CODE,
      required: true,
      minLength: VALIDATION_CONSTANTS.VALIDATION_RULES.PRODUCT_CODE.MIN_LENGTH,
      maxLength: VALIDATION_CONSTANTS.VALIDATION_RULES.PRODUCT_CODE.MAX_LENGTH,
    });

    this.addRule({
      field: 'color',
      validationType: ValidationType.STRING,
      required: false,
      maxLength: 50,
    });

    this.addRule({
      field: 'brand_id',
      validationType: ValidationType.NUMBER,
      required: true,
      minValue: 1,
    });
  }
}

class TemplateValidator extends Validator {
  constructor() {
    super();

    this.addRule({
      field: 'name',
      validationType: ValidationType.STRING,
      required: true,
      minLength: VALIDATION_CONSTANTS.VALIDATION_RULES.TEMPLATE_NAME.MIN_LENGTH,
      maxLength: VALIDATION_CONSTANTS.VALIDATION_RULES.TEMPLATE_NAME.MAX_LENGTH,
    });

    this.addRule({
      field: 'description',
      validationType: ValidationType.STRING,
      required: false,
      maxLength: 500,
    });

    this.addRule({
      field: 'template_type',
      validationType: ValidationType.STRING,
      required: true,
      allowedValues: ['standard', 'modern', 'classic', 'custom'],
    });

    this.addRule({
      field: 'product_id',
      validationType: ValidationType.NUMBER,
      required: true,
      minValue: 1,
    });

    this.addRule({
      field: 'brand_id',
      validationType: ValidationType.NUMBER,
      required: true,
      minValue: 1,
    });
  }
}

class FileValidator extends Validator {
  constructor() {
    super();

    this.addRule({
      field: 'file',
      validationType: ValidationType.FILE,
      required: true,
    });

    this.addRule({
      field: 'maxSize',
      validationType: ValidationType.NUMBER,
      required: false,
      maxValue: VALIDATION_CONSTANTS.VALIDATION_RULES.FILE.MAX_SIZE_MB * 1024 * 1024, // Convert to bytes
    });

    this.addRule({
      field: 'allowedTypes',
      validationType: ValidationType.ARRAY,
      required: false,
    });
  }
}

// Global validators
export const userValidator = new UserValidator();
export const brandValidator = new BrandValidator();
export const productValidator = new ProductValidator();
export const templateValidator = new TemplateValidator();
export const fileValidator = new FileValidator();

// Validation functions
export function validateUser(data: Record<string, any>): ValidationResult {
  return userValidator.validate(data);
}

export function validateBrand(data: Record<string, any>): ValidationResult {
  return brandValidator.validate(data);
}

export function validateProduct(data: Record<string, any>): ValidationResult {
  return productValidator.validate(data);
}

export function validateTemplate(data: Record<string, any>): ValidationResult {
  return templateValidator.validate(data);
}

export function validateFile(data: Record<string, any>): ValidationResult {
  return fileValidator.validate(data);
}

// Utility functions
export function createValidator(rules: ValidationRule[]): Validator {
  const validator = new Validator();
  rules.forEach(rule => validator.addRule(rule));
  return validator;
}

export function validateFormData(formData: FormData, validator: Validator): ValidationResult {
  const data: Record<string, any> = {};
  
  for (const [key, value] of Array.from(formData.entries())) {
    data[key] = value;
  }
  
  return validator.validate(data);
}

export function validateObjectData(data: Record<string, any>, validator: Validator): ValidationResult {
  return validator.validate(data);
}

export function getValidationErrors(result: ValidationResult): string[] {
  return result.errors;
}

export function getFieldValidationErrors(result: ValidationResult, field: string): string[] {
  return result.fieldErrors[field] || [];
}

export function hasValidationErrors(result: ValidationResult): boolean {
  return !result.isValid;
}

export function hasFieldValidationErrors(result: ValidationResult, field: string): boolean {
  return result.fieldErrors[field] && result.fieldErrors[field].length > 0;
}

export default {
  Validator,
  UserValidator,
  BrandValidator,
  ProductValidator,
  TemplateValidator,
  FileValidator,
  validateUser,
  validateBrand,
  validateProduct,
  validateTemplate,
  validateFile,
  createValidator,
  validateFormData,
  validateObjectData,
  getValidationErrors,
  getFieldValidationErrors,
  hasValidationErrors,
  hasFieldValidationErrors,
};
