/**
 * Email Template Engine
 * Renders email templates with variable substitution
 * @module core/email/TemplateEngine
 */

import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';

const templateCache = new Map();
const TEMPLATES_DIR = path.join(process.cwd(), 'src', 'templates', 'email');

/**
 * Register Handlebars helpers
 */
Handlebars.registerHelper('formatDate', (date) => {
  return new Date(date).toLocaleDateString('tr-TR');
});

Handlebars.registerHelper('formatCurrency', (amount, currency = 'TRY') => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency
  }).format(amount);
});

Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('ne', (a, b) => a !== b);
Handlebars.registerHelper('gt', (a, b) => a > b);
Handlebars.registerHelper('lt', (a, b) => a < b);

/**
 * Load template from file
 */
async function loadTemplate(templateName) {
  // Check cache
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName);
  }

  try {
    const templatePath = path.join(TEMPLATES_DIR, `${templateName}.hbs`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    // Compile template
    const compiled = Handlebars.compile(templateContent);

    // Cache it
    templateCache.set(templateName, compiled);

    return compiled;
  } catch (error) {
    throw new Error(`Template not found: ${templateName}`);
  }
}

/**
 * Render template with data
 */
export async function renderTemplate(templateName, data = {}) {
  const template = await loadTemplate(templateName);

  const defaultData = {
    app_name: 'KolajBot',
    app_url: process.env.APP_URL || 'http://localhost:3000',
    support_email: 'support@kolajbot.com',
    current_year: new Date().getFullYear(),
    ...data
  };

  return template(defaultData);
}

/**
 * Clear template cache
 */
export function clearCache(templateName = null) {
  if (templateName) {
    templateCache.delete(templateName);
  } else {
    templateCache.clear();
  }
}

/**
 * Preload templates
 */
export async function preloadTemplates() {
  try {
    const files = await fs.readdir(TEMPLATES_DIR);

    for (const file of files) {
      if (file.endsWith('.hbs')) {
        const templateName = file.replace('.hbs', '');
        await loadTemplate(templateName);
      }
    }
  } catch (error) {
    // Templates directory doesn't exist yet
  }
}
