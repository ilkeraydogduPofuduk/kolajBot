/**
 * File Utility
 * Helper functions for file operations
 * @module utils/file
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
export async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Get file extension
 * @param {string} filename - Filename
 * @returns {string} Extension
 */
export function getFileExtension(filename) {
  return path.extname(filename).toLowerCase().slice(1);
}

/**
 * Get filename without extension
 * @param {string} filename - Filename
 * @returns {string} Filename without extension
 */
export function getFilenameWithoutExtension(filename) {
  return path.basename(filename, path.extname(filename));
}

/**
 * Generate unique filename
 * @param {string} originalFilename - Original filename
 * @param {string} prefix - Prefix (optional)
 * @returns {string} Unique filename
 */
export function generateUniqueFilename(originalFilename, prefix = '') {
  const ext = getFileExtension(originalFilename);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const prefixPart = prefix ? `${prefix}-` : '';

  return `${prefixPart}${timestamp}-${random}.${ext}`;
}

/**
 * Get file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Human-readable size
 */
export function formatFileSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if file is image
 * @param {string} filename - Filename or mimetype
 * @returns {boolean} Is image
 */
export function isImage(filename) {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];

  if (filename.includes('/')) {
    // It's a mimetype
    return imageMimeTypes.includes(filename);
  } else {
    // It's a filename
    const ext = getFileExtension(filename);
    return imageExtensions.includes(ext);
  }
}

/**
 * Delete file
 * @param {string} filePath - File path
 */
export async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Read file
 * @param {string} filePath - File path
 * @returns {Promise<Buffer>} File content
 */
export async function readFile(filePath) {
  return await fs.readFile(filePath);
}

/**
 * Write file
 * @param {string} filePath - File path
 * @param {Buffer|string} content - Content
 */
export async function writeFile(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content);
}

/**
 * Check if file exists
 * @param {string} filePath - File path
 * @returns {Promise<boolean>} Exists
 */
export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file stats
 * @param {string} filePath - File path
 * @returns {Promise<object>} File stats
 */
export async function getFileStats(filePath) {
  return await fs.stat(filePath);
}

export default {
  ensureDir,
  getFileExtension,
  getFilenameWithoutExtension,
  generateUniqueFilename,
  formatFileSize,
  isImage,
  deleteFile,
  readFile,
  writeFile,
  fileExists,
  getFileStats
};
