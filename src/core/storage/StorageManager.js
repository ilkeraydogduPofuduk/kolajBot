/**
 * Storage Manager - File management abstraction
 * Local + CDN storage
 * @module core/storage/StorageManager
 */

import fs from 'fs/promises';
import path from 'path';
import { AppError } from '../errors/AppError.js';

export class StorageManager {
  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;
    this.allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  }

  async initialize() {
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  async save(file, subDir = '') {
    const dir = path.join(this.uploadDir, subDir);
    await fs.mkdir(dir, { recursive: true });

    const filename = `${Date.now()}_${file.originalname}`;
    const filepath = path.join(dir, filename);

    await fs.writeFile(filepath, file.buffer);

    return {
      filename,
      path: filepath,
      size: file.size,
      mimetype: file.mimetype
    };
  }

  async delete(filepath) {
    await fs.unlink(filepath);
  }

  async exists(filepath) {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  validateFile(file) {
    if (file.size > this.maxFileSize) {
      throw new AppError('File size exceeds limit', 400);
    }

    if (!this.allowedTypes.includes(file.mimetype)) {
      throw new AppError('File type not allowed', 400);
    }
  }
}

export default new StorageManager();
