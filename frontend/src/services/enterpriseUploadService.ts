/**
 * Enterprise Upload Service
 * High-performance file upload with progress tracking and optimization
 */

interface UploadOptions {
  onProgress?: (progress: number) => void;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
  timeout?: number;
  retries?: number;
}

interface UploadResult {
  success: boolean;
  data?: any;
  error?: string;
  uploadId?: string;
}

class EnterpriseUploadService {
  private uploadQueue: Map<string, XMLHttpRequest> = new Map();
  private readonly DEFAULT_TIMEOUT = 300000; // 5 minutes
  private readonly DEFAULT_RETRIES = 3;

  /**
   * Upload files with progress tracking
   */
  async uploadFiles(
    files: File[],
    endpoint: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const {
      onProgress,
      onSuccess,
      onError,
      timeout = this.DEFAULT_TIMEOUT,
      retries = this.DEFAULT_RETRIES
    } = options;

    const uploadId = this.generateUploadId();
    
    try {
      const result = await this.executeUpload(files, endpoint, {
        uploadId,
        onProgress,
        timeout,
        retries
      });

      onSuccess?.(result);
      return { success: true, data: result, uploadId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      return { success: false, error: errorMessage, uploadId };
    }
  }

  /**
   * Execute upload with retry logic
   */
  private async executeUpload(
    files: File[],
    endpoint: string,
    options: {
      uploadId: string;
      onProgress?: (progress: number) => void;
      timeout: number;
      retries: number;
    }
  ): Promise<any> {
    const { uploadId, onProgress, timeout, retries } = options;
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.performUpload(files, endpoint, {
          uploadId,
          onProgress,
          timeout
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Upload failed');
        
        if (attempt < retries) {
          // Wait before retry (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Perform actual upload
   */
  private async performUpload(
    files: File[],
    endpoint: string,
    options: {
      uploadId: string;
      onProgress?: (progress: number) => void;
      timeout: number;
    }
  ): Promise<any> {
    const { uploadId, onProgress, timeout } = options;
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Store in queue
      this.uploadQueue.set(uploadId, xhr);
      
      // Progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress?.(progress);
        }
      });
      
      // Success handler
      xhr.addEventListener('load', () => {
        this.uploadQueue.delete(uploadId);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      });
      
      // Error handler
      xhr.addEventListener('error', () => {
        this.uploadQueue.delete(uploadId);
        reject(new Error('Network error'));
      });
      
      // Timeout handler
      xhr.addEventListener('timeout', () => {
        this.uploadQueue.delete(uploadId);
        reject(new Error('Upload timeout'));
      });
      
      // Configure request
      xhr.timeout = timeout;
      xhr.open('POST', endpoint);
      
      // Set up form data
      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append(`files`, file);
      });
      
      // Send request
      xhr.send(formData);
    });
  }

  /**
   * Cancel upload
   */
  cancelUpload(uploadId: string): boolean {
    const xhr = this.uploadQueue.get(uploadId);
    
    if (xhr) {
      xhr.abort();
      this.uploadQueue.delete(uploadId);
      return true;
    }
    
    return false;
  }

  /**
   * Get upload status
   */
  getUploadStatus(uploadId: string): 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled' {
    const xhr = this.uploadQueue.get(uploadId);
    
    if (!xhr) return 'completed';
    
    switch (xhr.readyState) {
      case 0: return 'pending';
      case 1: return 'pending';
      case 2: return 'uploading';
      case 3: return 'uploading';
      case 4: return 'completed';
      default: return 'pending';
    }
  }

  /**
   * Get active uploads
   */
  getActiveUploads(): string[] {
    return Array.from(this.uploadQueue.keys());
  }

  /**
   * Cancel all uploads
   */
  cancelAllUploads(): void {
    for (const [uploadId, xhr] of Array.from(this.uploadQueue.entries())) {
      xhr.abort();
    }
    this.uploadQueue.clear();
  }

  /**
   * Generate unique upload ID
   */
  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate files before upload
   */
  validateFiles(files: File[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    files.forEach((file, index) => {
      // Check file size
      if (file.size > maxSize) {
        errors.push(`File ${index + 1} (${file.name}) is too large. Maximum size is 50MB.`);
      }
      
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        errors.push(`File ${index + 1} (${file.name}) has an unsupported format. Allowed formats: JPEG, PNG, WebP, GIF.`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get upload statistics
   */
  getUploadStats(): {
    activeUploads: number;
    queueSize: number;
  } {
    return {
      activeUploads: this.uploadQueue.size,
      queueSize: this.uploadQueue.size
    };
  }
}

// Export singleton instance
export const enterpriseUploadService = new EnterpriseUploadService();

export default enterpriseUploadService;
