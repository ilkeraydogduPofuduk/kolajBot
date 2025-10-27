/**
 * useEnterpriseUpload Hook
 * Custom hook for enterprise file upload with progress tracking
 */

import { useState, useCallback } from 'react';
import { enterpriseUploadService } from '../services/enterpriseUploadService';
import { UploadOptions } from '../types/enterprise';

interface UseEnterpriseUploadOptions extends UploadOptions {
  autoStart?: boolean;
}

interface UseEnterpriseUploadReturn {
  uploadFiles: (files: File[], endpoint: string) => Promise<void>;
  cancelUpload: (uploadId: string) => boolean;
  cancelAllUploads: () => void;
  progress: number;
  isUploading: boolean;
  hasError: boolean;
  error: string | null;
  uploadId: string | null;
  activeUploads: string[];
  uploadStats: {
    activeUploads: number;
    queueSize: number;
  };
}

export const useEnterpriseUpload = (
  options: UseEnterpriseUploadOptions = {}
): UseEnterpriseUploadReturn => {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);

  // Upload files
  const uploadFiles = useCallback(async (files: File[], endpoint: string) => {
    // Validate files first
    const validation = enterpriseUploadService.validateFiles(files);
    if (!validation.valid) {
      setError(validation.errors.join(' '));
      setHasError(true);
      return;
    }

    setIsUploading(true);
    setHasError(false);
    setError(null);
    setProgress(0);

    const uploadOptions: UploadOptions = {
      ...options,
      onProgress: (progressValue: number) => {
        setProgress(progressValue);
        options.onProgress?.(progressValue);
      },
      onSuccess: (result: any) => {
        setIsUploading(false);
        setProgress(100);
        options.onSuccess?.(result);
      },
      onError: (error: any) => {
        setIsUploading(false);
        setHasError(true);
        setError(error.message);
        options.onError?.(error);
      }
    };

    try {
      const result = await enterpriseUploadService.uploadFiles(files, endpoint, uploadOptions);
      setUploadId(result.uploadId || null);
    } catch (error) {
      setIsUploading(false);
      setHasError(true);
      setError(error instanceof Error ? error.message : 'Upload failed');
    }
  }, [options]);

  // Cancel upload
  const cancelUpload = useCallback((uploadId: string): boolean => {
    return enterpriseUploadService.cancelUpload(uploadId);
  }, []);

  // Cancel all uploads
  const cancelAllUploads = useCallback(() => {
    enterpriseUploadService.cancelAllUploads();
    setIsUploading(false);
    setProgress(0);
    setHasError(false);
    setError(null);
    setUploadId(null);
  }, []);

  // Get active uploads
  const activeUploads = enterpriseUploadService.getActiveUploads();

  // Get upload stats
  const uploadStats = enterpriseUploadService.getUploadStats();

  return {
    uploadFiles,
    cancelUpload,
    cancelAllUploads,
    progress,
    isUploading,
    hasError,
    error,
    uploadId,
    activeUploads,
    uploadStats
  };
};

export default useEnterpriseUpload;
