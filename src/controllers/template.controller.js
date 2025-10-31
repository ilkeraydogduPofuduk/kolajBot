/**
 * Template Controller
 * Handles template and collage generation HTTP requests
 * @module controllers/template
 */

import TemplateService from '../services/template.service.js';
import AITemplateGeneratorService from '../services/ai-template-generator.service.js';
import Response from '../core/response.js';
import { ErrorHandler } from '../core/error-handler.js';

/**
 * Template Controller Class
 */
class TemplateController {
  /**
   * Get all templates
   * GET /api/templates
   */
  getAllTemplates = ErrorHandler.asyncHandler(async (req, res) => {
    const { brand_id, platform, is_active, page = 1, limit = 20 } = req.query;

    const filters = {};
    if (brand_id) filters.brand_id = parseInt(brand_id);
    if (platform) filters.platform = platform;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const templates = await TemplateService.getAllTemplates({
      filters,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    Response.success(res, templates, 'Templates retrieved successfully');
  });

  /**
   * Get template by ID
   * GET /api/templates/:id
   */
  getTemplateById = ErrorHandler.asyncHandler(async (req, res) => {
    const template = await TemplateService.getTemplateById(parseInt(req.params.id));
    Response.success(res, template, 'Template retrieved successfully');
  });

  /**
   * Generate template automatically
   * POST /api/templates/generate
   */
  generateTemplate = ErrorHandler.asyncHandler(async (req, res) => {
    const {
      brandId,
      productIds,
      platform = 'whatsapp',
      layout = 'auto',
      customSettings = {}
    } = req.body;

    const result = await AITemplateGeneratorService.generateTemplate({
      brandId,
      productIds,
      platform,
      layout,
      customSettings
    });

    Response.created(res, result, 'Template generated successfully');
  });

  /**
   * Generate multi-platform templates
   * POST /api/templates/generate-multi
   */
  generateMultiPlatform = ErrorHandler.asyncHandler(async (req, res) => {
    const { brandId, productIds, platforms = ['whatsapp', 'telegram', 'instagram'] } = req.body;

    const results = await AITemplateGeneratorService.generateMultiPlatformTemplates({
      brandId,
      productIds,
      platforms
    });

    Response.created(res, results, 'Multi-platform templates generated successfully');
  });

  /**
   * Get template suggestions
   * POST /api/templates/suggestions
   */
  getTemplateSuggestions = ErrorHandler.asyncHandler(async (req, res) => {
    const { brandId, productIds } = req.body;

    const suggestions = await AITemplateGeneratorService.getTemplateSuggestions(
      brandId,
      productIds
    );

    Response.success(res, suggestions, 'Template suggestions retrieved successfully');
  });

  /**
   * Regenerate template
   * POST /api/templates/:id/regenerate
   */
  regenerateTemplate = ErrorHandler.asyncHandler(async (req, res) => {
    const templateId = parseInt(req.params.id);
    const newSettings = req.body;

    const result = await AITemplateGeneratorService.regenerateTemplate(
      templateId,
      newSettings
    );

    Response.success(res, result, 'Template regenerated successfully');
  });

  /**
   * Apply branding to template
   * POST /api/templates/:id/branding
   */
  applyBranding = ErrorHandler.asyncHandler(async (req, res) => {
    const templateId = parseInt(req.params.id);
    const branding = req.body;

    const template = await AITemplateGeneratorService.applyBranding(
      templateId,
      branding
    );

    Response.success(res, template, 'Branding applied successfully');
  });

  /**
   * Create custom template
   * POST /api/templates
   */
  createTemplate = ErrorHandler.asyncHandler(async (req, res) => {
    const template = await TemplateService.createTemplate(req.body);
    Response.created(res, template, 'Template created successfully');
  });

  /**
   * Update template
   * PUT /api/templates/:id
   */
  updateTemplate = ErrorHandler.asyncHandler(async (req, res) => {
    const template = await TemplateService.updateTemplate(
      parseInt(req.params.id),
      req.body
    );
    Response.success(res, template, 'Template updated successfully');
  });

  /**
   * Delete template
   * DELETE /api/templates/:id
   */
  deleteTemplate = ErrorHandler.asyncHandler(async (req, res) => {
    await TemplateService.deleteTemplate(parseInt(req.params.id));
    Response.success(res, null, 'Template deleted successfully');
  });

  /**
   * Duplicate template
   * POST /api/templates/:id/duplicate
   */
  duplicateTemplate = ErrorHandler.asyncHandler(async (req, res) => {
    const templateId = parseInt(req.params.id);
    const newData = req.body;

    const template = await TemplateService.duplicateTemplate(templateId, newData);
    Response.created(res, template, 'Template duplicated successfully');
  });

  /**
   * Get templates by brand
   * GET /api/templates/by-brand/:brandId
   */
  getTemplatesByBrand = ErrorHandler.asyncHandler(async (req, res) => {
    const brandId = parseInt(req.params.brandId);
    const { platform, is_active } = req.query;

    const templates = await TemplateService.getTemplatesByBrand(brandId, {
      platform,
      is_active: is_active === 'true'
    });

    Response.success(res, templates, 'Brand templates retrieved successfully');
  });

  /**
   * Get templates by platform
   * GET /api/templates/by-platform/:platform
   */
  getTemplatesByPlatform = ErrorHandler.asyncHandler(async (req, res) => {
    const platform = req.params.platform;
    const { brand_id, is_active } = req.query;

    const templates = await TemplateService.getTemplatesByPlatform(platform, {
      brand_id: brand_id ? parseInt(brand_id) : undefined,
      is_active: is_active === 'true'
    });

    Response.success(res, templates, 'Platform templates retrieved successfully');
  });

  /**
   * Increment template usage count
   * POST /api/templates/:id/increment-usage
   */
  incrementUsage = ErrorHandler.asyncHandler(async (req, res) => {
    const templateId = parseInt(req.params.id);
    const template = await TemplateService.incrementUsage(templateId);
    Response.success(res, template, 'Template usage incremented');
  });

  /**
   * Get popular templates
   * GET /api/templates/popular
   */
  getPopularTemplates = ErrorHandler.asyncHandler(async (req, res) => {
    const { limit = 10, platform, brand_id } = req.query;

    const templates = await TemplateService.getPopularTemplates({
      limit: parseInt(limit),
      platform,
      brand_id: brand_id ? parseInt(brand_id) : undefined
    });

    Response.success(res, templates, 'Popular templates retrieved successfully');
  });
}

export default new TemplateController();
