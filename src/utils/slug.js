/**
 * Slug Utility
 * Helper functions for slug generation
 * @module utils/slug
 */

/**
 * Generate slug from text
 * @param {string} text - Text to slugify
 * @param {object} options - Options
 * @returns {string} Slug
 */
export function slugify(text, options = {}) {
  const { lowercase = true, separator = '-', timestamp = false } = options;

  let slug = text
    .toString()
    .normalize('NFD') // Normalize unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .trim()
    .replace(/[\s_]+/g, separator) // Replace spaces and underscores
    .replace(new RegExp(`${separator}+`, 'g'), separator); // Replace multiple separators

  if (lowercase) {
    slug = slug.toLowerCase();
  }

  if (timestamp) {
    slug += `${separator}${Date.now()}`;
  }

  return slug;
}

/**
 * Generate unique slug
 * @param {string} text - Text to slugify
 * @param {Function} checkExists - Function to check if slug exists
 * @returns {Promise<string>} Unique slug
 */
export async function generateUniqueSlug(text, checkExists) {
  let slug = slugify(text);
  let counter = 1;
  let exists = await checkExists(slug);

  while (exists) {
    slug = `${slugify(text)}-${counter}`;
    exists = await checkExists(slug);
    counter++;
  }

  return slug;
}

/**
 * Validate slug format
 * @param {string} slug - Slug to validate
 * @returns {boolean} Is valid
 */
export function isValidSlug(slug) {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

export default {
  slugify,
  generateUniqueSlug,
  isValidSlug
};
