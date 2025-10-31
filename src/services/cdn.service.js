/**
 * CDN Service
 * Handles file uploads to Bunny CDN with dynamic folder structure
 * @module services/cdn
 */

import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';
import { AppError } from '../core/error-handler.js';
import Logger from '../core/logger.js';
import crypto from 'crypto';

/**
 * CDN Service Class for Bunny CDN Integration
 */
class CDNService {
  constructor() {
    this.storageZone = process.env.BUNNY_STORAGE_ZONE || 'kolajbot';
    this.storagePassword = process.env.BUNNY_STORAGE_PASSWORD;
    this.storageEndpoint = process.env.BUNNY_STORAGE_ENDPOINT || 'storage.bunnycdn.com';
    this.pullZoneUrl = process.env.BUNNY_PULL_ZONE_URL || 'https://kolajbot.b-cdn.net';
    this.apiKey = process.env.BUNNY_API_KEY;

    // Validate configuration
    if (!this.storagePassword) {
      Logger.error('Bunny CDN storage password not configured');
    }
  }

  /**
   * Get dynamic folder structure: /brand/uploader/date/product/colors/
   * @param {Object} metadata - File metadata
   * @returns {string} Folder path
   */
  getDynamicFolderPath(metadata) {
    const {
      brandName,
      uploaderName,
      date = new Date(),
      productName,
      color
    } = metadata;

    // Sanitize names for URL safety
    const sanitize = (str) => {
      return str
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .trim();
    };

    const dateStr = date instanceof Date
      ? date.toISOString().split('T')[0]
      : new Date(date).toISOString().split('T')[0];

    const pathParts = [
      sanitize(brandName),
      sanitize(uploaderName),
      dateStr,
      sanitize(productName)
    ];

    if (color) {
      pathParts.push(sanitize(color));
    }

    return pathParts.join('/');
  }

  /**
   * Upload file to Bunny CDN
   * @param {Buffer|string} file - File buffer or path
   * @param {string} remotePath - Remote file path
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(file, remotePath, options = {}) {
    try {
      const { contentType = 'application/octet-stream' } = options;

      // Read file if path provided
      let fileBuffer;
      if (typeof file === 'string') {
        fileBuffer = await fs.readFile(file);
      } else {
        fileBuffer = file;
      }

      // Construct upload URL
      const uploadUrl = `https://${this.storageEndpoint}/${this.storageZone}/${remotePath}`;

      Logger.info(`Uploading file to Bunny CDN: ${remotePath}`);

      // Upload to Bunny Storage
      const response = await axios.put(uploadUrl, fileBuffer, {
        headers: {
          'AccessKey': this.storagePassword,
          'Content-Type': contentType
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });

      if (response.status !== 201 && response.status !== 200) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      const publicUrl = `${this.pullZoneUrl}/${remotePath}`;

      Logger.info(`File uploaded successfully: ${publicUrl}`);

      return {
        success: true,
        remotePath,
        publicUrl,
        size: fileBuffer.length,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      Logger.error('CDN upload failed', error);
      throw new AppError(`Failed to upload file to CDN: ${error.message}`, 500);
    }
  }

  /**
   * Upload multiple files in bulk
   * @param {Array<Object>} files - Array of {buffer, metadata}
   * @returns {Promise<Object>} Upload results
   */
  async bulkUpload(files) {
    const results = {
      successful: [],
      failed: [],
      totalSize: 0
    };

    Logger.info(`Starting bulk upload of ${files.length} files`);

    for (let i = 0; i < files.length; i++) {
      const { buffer, metadata, filename } = files[i];

      try {
        const folderPath = this.getDynamicFolderPath(metadata);
        const remotePath = `${folderPath}/${filename}`;

        const result = await this.uploadFile(buffer, remotePath, {
          contentType: this.getContentType(filename)
        });

        results.successful.push({
          filename,
          ...result
        });

        results.totalSize += result.size;
      } catch (error) {
        Logger.error(`Failed to upload file ${filename}`, error);
        results.failed.push({
          filename,
          error: error.message
        });
      }
    }

    Logger.info(`Bulk upload completed: ${results.successful.length} successful, ${results.failed.length} failed`);

    return results;
  }

  /**
   * Delete file from Bunny CDN
   * @param {string} remotePath - Remote file path
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(remotePath) {
    try {
      const deleteUrl = `https://${this.storageEndpoint}/${this.storageZone}/${remotePath}`;

      const response = await axios.delete(deleteUrl, {
        headers: {
          'AccessKey': this.storagePassword
        }
      });

      if (response.status === 200 || response.status === 404) {
        Logger.info(`File deleted from CDN: ${remotePath}`);
        return true;
      }

      throw new Error(`Delete failed with status ${response.status}`);
    } catch (error) {
      Logger.error('CDN delete failed', error);
      throw new AppError(`Failed to delete file from CDN: ${error.message}`, 500);
    }
  }

  /**
   * List files in a directory
   * @param {string} directoryPath - Directory path
   * @returns {Promise<Array>} List of files
   */
  async listFiles(directoryPath) {
    try {
      const listUrl = `https://${this.storageEndpoint}/${this.storageZone}/${directoryPath}/`;

      const response = await axios.get(listUrl, {
        headers: {
          'AccessKey': this.storagePassword
        }
      });

      if (response.status !== 200) {
        throw new Error(`List failed with status ${response.status}`);
      }

      return response.data;
    } catch (error) {
      Logger.error('CDN list failed', error);
      throw new AppError(`Failed to list files from CDN: ${error.message}`, 500);
    }
  }

  /**
   * Get file content from CDN
   * @param {string} remotePath - Remote file path
   * @returns {Promise<Buffer>} File content
   */
  async getFile(remotePath) {
    try {
      const fileUrl = `${this.pullZoneUrl}/${remotePath}`;

      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer'
      });

      if (response.status !== 200) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      return Buffer.from(response.data);
    } catch (error) {
      Logger.error('CDN download failed', error);
      throw new AppError(`Failed to download file from CDN: ${error.message}`, 500);
    }
  }

  /**
   * Purge file from CDN cache
   * @param {string} publicUrl - Public URL of file
   * @returns {Promise<boolean>} Success status
   */
  async purgeCache(publicUrl) {
    try {
      if (!this.apiKey) {
        Logger.warn('Bunny API key not configured, skipping cache purge');
        return false;
      }

      const purgeUrl = 'https://api.bunny.net/purge';

      const response = await axios.post(
        purgeUrl,
        { url: publicUrl },
        {
          headers: {
            'AccessKey': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        Logger.info(`Cache purged for: ${publicUrl}`);
        return true;
      }

      return false;
    } catch (error) {
      Logger.error('Cache purge failed', error);
      return false;
    }
  }

  /**
   * Get content type from filename
   * @private
   */
  getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg'
    };

    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Generate signed URL for private content
   * @param {string} filePath - File path
   * @param {number} expiresIn - Expiration time in seconds
   * @returns {string} Signed URL
   */
  generateSignedUrl(filePath, expiresIn = 3600) {
    if (!this.apiKey) {
      throw new AppError('API key required for signed URLs', 500);
    }

    const expires = Math.floor(Date.now() / 1000) + expiresIn;
    const hashableBase = `${this.apiKey}${filePath}${expires}`;
    const token = crypto.createHash('sha256').update(hashableBase).digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return `${this.pullZoneUrl}/${filePath}?token=${token}&expires=${expires}`;
  }

  /**
   * Get storage statistics
   * @returns {Promise<Object>} Storage statistics
   */
  async getStorageStats() {
    try {
      if (!this.apiKey) {
        throw new AppError('API key required for storage stats', 500);
      }

      const statsUrl = `https://api.bunny.net/storagezone/${this.storageZone}/statistics`;

      const response = await axios.get(statsUrl, {
        headers: {
          'AccessKey': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      Logger.error('Failed to get storage stats', error);
      throw new AppError('Failed to get storage statistics', 500);
    }
  }

  /**
   * Create directory structure
   * @param {string} directoryPath - Directory path to create
   * @returns {Promise<boolean>} Success status
   */
  async createDirectory(directoryPath) {
    try {
      // Bunny CDN creates directories automatically when uploading files
      // Create a .placeholder file to ensure directory exists
      const placeholderPath = `${directoryPath}/.placeholder`;
      const placeholderContent = Buffer.from('');

      await this.uploadFile(placeholderContent, placeholderPath);

      Logger.info(`Directory created: ${directoryPath}`);
      return true;
    } catch (error) {
      Logger.error('Directory creation failed', error);
      return false;
    }
  }
}

export default new CDNService();
