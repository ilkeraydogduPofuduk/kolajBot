/**
 * Email Core - Central Export
 * @module core/email
 */

export { default as EmailService } from './EmailService.js';
export { renderTemplate, clearCache, preloadTemplates } from './TemplateEngine.js';

import EmailService from './EmailService.js';
export default EmailService;
