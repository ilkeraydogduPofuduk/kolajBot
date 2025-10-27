/**
 * useEnterpriseImage Hook
 * Custom hook for enterprise image handling with optimization and caching
 */

import { useState, useEffect, useCallback } from 'react';
import { enterpriseImageService, ImageMetadata } from '../services/enterpriseImageService';

interface UseEnterpriseImageOptions {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  quality?: 'thumbnail' | 'web' | 'print';
  preload?: boolean;
  lazy?: boolean;
}

interface UseEnterpriseImageReturn {
  imageUrl: string;
  thumbnailUrl: string;
  progressiveUrl: string;
  metadata: ImageMetadata | null;
  isLoading: boolean;
  hasError: boolean;
  preloadImages: (paths: string[]) => Promise<void[]>;
  invalidateCache: () => void;
  responsiveUrls: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  srcSet: string;
}

export const useEnterpriseImage = (
  filePath: string,
  options: UseEnterpriseImageOptions = {}
): UseEnterpriseImageReturn => {
  const {
    size = 'md',
    quality = 'web',
    preload = false,
    lazy = true
  } = options;

  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Generate URLs
  const imageUrl = enterpriseImageService.getOptimizedImageURL(filePath, size, quality);
  const thumbnailUrl = enterpriseImageService.getThumbnailURL(filePath, 'sm');
  const progressiveUrl = enterpriseImageService.getProgressiveImageURL(filePath);
  const responsiveUrls = enterpriseImageService.getResponsiveImageURLs(filePath);
  const srcSet = enterpriseImageService.generateSrcSet(filePath);

  // Load metadata
  useEffect(() => {
    if (!filePath) return;

    const loadMetadata = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const imageMetadata = await enterpriseImageService.getImageMetadata(filePath);
        setMetadata(imageMetadata);
      } catch (error) {
        console.error('Failed to load image metadata:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadMetadata();
  }, [filePath]);

  // Preload image if requested
  useEffect(() => {
    if (!preload || !filePath) return;

    const preloadImage = async () => {
      try {
        await enterpriseImageService.preloadImages([filePath], size);
      } catch (error) {
        console.error('Failed to preload image:', error);
      }
    };

    preloadImage();
  }, [filePath, preload, size]);

  // Preload multiple images
  const preloadImages = useCallback(async (paths: string[]): Promise<void[]> => {
    try {
      return await enterpriseImageService.preloadImages(paths, size);
    } catch (error) {
      console.error('Failed to preload images:', error);
      return [];
    }
  }, [size]);

  // Invalidate cache
  const invalidateCache = useCallback(() => {
    enterpriseImageService.invalidateImageCache(filePath);
  }, [filePath]);

  return {
    imageUrl,
    thumbnailUrl,
    progressiveUrl,
    metadata,
    isLoading,
    hasError,
    preloadImages,
    invalidateCache,
    responsiveUrls,
    srcSet
  };
};

export default useEnterpriseImage;
