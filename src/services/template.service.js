/**
 * Template Service
 * Business logic for template management
 * @module services/template
 */

import TemplateModel from '../models/template.model.js';
import { AppError } from '../core/error-handler.js';
import Logger from '../core/logger.js';

/**
 * Template Service Class
 */
class TemplateService {
  /**
   * Get all templates with pagination and filters
   */
  async getAllTemplates(options = {}) {
    const { filters = {}, page = 1, limit = 20 } = options;

    try {
      const result = await TemplateModel.paginate({
        where: filters,
        page,
        limit,
        orderBy: 'created_at DESC'
      });

      return result;
    } catch (error) {
      Logger.error('Failed to get all templates', error);
      throw new AppError('Failed to retrieve templates', 500);
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id) {
    try {
      const template = await TemplateModel.findById(id);

      if (!template) {
        throw new AppError('Template not found', 404);
      }

      return template;
    } catch (error) {
      if (error instanceof AppError) throw error;
      Logger.error(`Failed to get template ${id}`, error);
      throw new AppError('Failed to retrieve template', 500);
    }
  }

  /**
   * Create new template
   */
  async createTemplate(data) {
    try {
      const template = await TemplateModel.createTemplate(data);
      Logger.info(`Template created: ${template.id}`);
      return template;
    } catch (error) {
      Logger.error('Failed to create template', error);
      throw new AppError('Failed to create template', 500);
    }
  }

  /**
   * Update template
   */
  async updateTemplate(id, data) {
    try {
      const existingTemplate = await TemplateModel.findById(id);

      if (!existingTemplate) {
        throw new AppError('Template not found', 404);
      }

      const template = await TemplateModel.update(id, {
        ...data,
        updated_at: new Date()
      });

      Logger.info(`Template updated: ${id}`);
      return template;
    } catch (error) {
      if (error instanceof AppError) throw error;
      Logger.error(`Failed to update template ${id}`, error);
      throw new AppError('Failed to update template', 500);
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(id) {
    try {
      const template = await TemplateModel.findById(id);

      if (!template) {
        throw new AppError('Template not found', 404);
      }

      await TemplateModel.delete(id);
      Logger.info(`Template deleted: ${id}`);
    } catch (error) {
      if (error instanceof AppError) throw error;
      Logger.error(`Failed to delete template ${id}`, error);
      throw new AppError('Failed to delete template', 500);
    }
  }

  /**
   * Duplicate template
   */
  async duplicateTemplate(id, newData = {}) {
    try {
      const template = await TemplateModel.duplicateTemplate(id, newData);
      Logger.info(`Template duplicated: ${template.id}`);
      return template;
    } catch (error) {
      Logger.error(`Failed to duplicate template ${id}`, error);
      throw new AppError('Failed to duplicate template', 500);
    }
  }

  /**
   * Get templates by brand
   */
  async getTemplatesByBrand(brandId, filters = {}) {
    try {
      const templates = await TemplateModel.findAll({
        where: {
          brand_id: brandId,
          ...filters
        },
        orderBy: 'created_at DESC'
      });

      return templates;
    } catch (error) {
      Logger.error(`Failed to get templates for brand ${brandId}`, error);
      throw new AppError('Failed to retrieve brand templates', 500);
    }
  }

  /**
   * Get templates by platform
   */
  async getTemplatesByPlatform(platform, filters = {}) {
    try {
      const templates = await TemplateModel.findByPlatform(platform, filters);
      return templates;
    } catch (error) {
      Logger.error(`Failed to get templates for platform ${platform}`, error);
      throw new AppError('Failed to retrieve platform templates', 500);
    }
  }

  /**
   * Increment template usage count
   */
  async incrementUsage(id) {
    try {
      const template = await TemplateModel.incrementUsage(id);
      return template;
    } catch (error) {
      Logger.error(`Failed to increment usage for template ${id}`, error);
      throw new AppError('Failed to increment usage', 500);
    }
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(options = {}) {
    try {
      const { limit = 10, platform, brand_id } = options;

      const filters = {};
      if (platform) filters.platform = platform;
      if (brand_id) filters.brand_id = brand_id;

      const templates = await TemplateModel.findAll({
        where: filters,
        orderBy: 'usage_count DESC, created_at DESC',
        limit
      });

      return templates;
    } catch (error) {
      Logger.error('Failed to get popular templates', error);
      throw new AppError('Failed to retrieve popular templates', 500);
    }
  }
}

export default new TemplateService();
