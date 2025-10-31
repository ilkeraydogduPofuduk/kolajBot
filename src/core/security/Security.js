/**
 * Security Core - Cryptography & Authentication Utilities
 * Password hashing, JWT, encryption, 2FA
 * @module core/security/Security
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import ConfigManager from '../config/ConfigManager.js';

export class Security {
  /**
   * Hash password
   */
  static async hashPassword(password) {
    return await bcrypt.hash(password, 12);
  }

  /**
   * Verify password
   */
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   */
  static generateToken(payload, expiresIn = null) {
    return jwt.sign(
      payload,
      ConfigManager.get('JWT_SECRET'),
      { expiresIn: expiresIn || ConfigManager.get('JWT_EXPIRY') }
    );
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token) {
    return jwt.verify(token, ConfigManager.get('JWT_SECRET'));
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload) {
    return jwt.sign(
      payload,
      ConfigManager.get('JWT_SECRET'),
      { expiresIn: ConfigManager.get('JWT_REFRESH_EXPIRY') }
    );
  }

  /**
   * Generate random token
   */
  static generateRandomToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt data
   */
  static encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(ConfigManager.get('JWT_SECRET'), 'salt', 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt data
   */
  static decrypt(encryptedText) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(ConfigManager.get('JWT_SECRET'), 'salt', 32);

    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate 2FA secret
   */
  static generate2FASecret(userEmail) {
    const secret = authenticator.generateSecret();

    const otpauth = authenticator.keyuri(
      userEmail,
      ConfigManager.get('APP_NAME'),
      secret
    );

    return { secret, otpauth };
  }

  /**
   * Generate 2FA QR code
   */
  static async generate2FAQRCode(otpauth) {
    return await qrcode.toDataURL(otpauth);
  }

  /**
   * Verify 2FA token
   */
  static verify2FAToken(token, secret) {
    return authenticator.verify({ token, secret });
  }

  /**
   * Generate secure random password
   */
  static generatePassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }

    return password;
  }

  /**
   * Hash data (SHA256)
   */
  static hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

export default Security;
