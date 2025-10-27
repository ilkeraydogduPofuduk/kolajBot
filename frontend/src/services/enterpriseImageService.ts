/**
 * Enterprise Image Service
 * High-performance image handling with optimization and caching
 */

import { getImageURL, getThumbnailURL, getProgressiveImageURL } from '../utils/template';

export interface ImageSize {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ImageQuality {
  thumbnail: string;
  web: string;
  print: string;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  mode: string;
  file_size: number;
  file_size_mb: number;
  aspect_ratio: number;
}

class EnterpriseImageService {
  private imageCache = new Map<string, string>();
  private metadataCache = new Map<string, ImageMetadata>();
  
  // Image sizes
  readonly sizes: ImageSize = {
    xs: 'xs',
    sm: 'sm', 
    md: 'md',
    lg: 'lg',
    xl: 'xl'
  };
  
  // Image qualities
  readonly qualities: ImageQuality = {
    thumbnail: 'thumbnail',
    web: 'web',
    print: 'print'
  };
  
  /**
   * Get optimized image URL
   */
  getOptimizedImageURL(
    filePath: string, 
    size: keyof ImageSize = 'md', 
    quality: keyof ImageQuality = 'web'
  ): string {
    if (!filePath) return '';
    
    const cacheKey = `${filePath}:${size}:${quality}`;
    
    // Check cache first
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }
    
    // Generate URL
    const url = getImageURL(filePath, this.sizes[size], this.qualities[quality]);
    
    // Cache URL
    this.imageCache.set(cacheKey, url);
    
    return url;
  }
  
  /**
   * Get thumbnail URL
   */
  getThumbnailURL(filePath: string, size: keyof ImageSize = 'sm'): string {
    if (!filePath) return '';
    
    const cacheKey = `thumb:${filePath}:${size}`;
    
    // Check cache first
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }
    
    // Generate URL
    const url = getThumbnailURL(filePath, this.sizes[size]);
    
    // Cache URL
    this.imageCache.set(cacheKey, url);
    
    return url;
  }
  
  /**
   * Get progressive image URL
   */
  getProgressiveImageURL(filePath: string): string {
    if (!filePath) return '';
    
    const cacheKey = `progressive:${filePath}`;
    
    // Check cache first
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }
    
    // Generate URL
    const url = getProgressiveImageURL(filePath);
    
    // Cache URL
    this.imageCache.set(cacheKey, url);
    
    return url;
  }
  
  /**
   * Get image metadata
   */
  async getImageMetadata(filePath: string): Promise<ImageMetadata | null> {
    if (!filePath) return null;
    
    // Check cache first
    if (this.metadataCache.has(filePath)) {
      return this.metadataCache.get(filePath)!;
    }
    
    try {
      const cleanPath = filePath.replace(/\\/g, '/').replace(/^uploads\//, '');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8005';
      const response = await fetch(`${apiUrl}/api/images/metadata/${cleanPath}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const metadata: ImageMetadata = await response.json();
      
      // Cache metadata
      this.metadataCache.set(filePath, metadata);
      
      return metadata;
    } catch (error) {
      console.error('Failed to get image metadata:', error);
      return null;
    }
  }
  
  /**
   * Preload images for better performance
   */
  preloadImages(imagePaths: string[], size: keyof ImageSize = 'md'): Promise<void[]> {
    const preloadPromises = imagePaths.map(path => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to preload: ${path}`));
        img.src = this.getOptimizedImageURL(path, size);
      });
    });
    
    return Promise.all(preloadPromises);
  }
  
  /**
   * Get responsive image URLs for different screen sizes
   */
  getResponsiveImageURLs(filePath: string): {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  } {
    return {
      xs: this.getOptimizedImageURL(filePath, 'xs'),
      sm: this.getOptimizedImageURL(filePath, 'sm'),
      md: this.getOptimizedImageURL(filePath, 'md'),
      lg: this.getOptimizedImageURL(filePath, 'lg'),
      xl: this.getOptimizedImageURL(filePath, 'xl')
    };
  }
  
  /**
   * Generate srcSet for responsive images
   */
  generateSrcSet(filePath: string): string {
    const urls = this.getResponsiveImageURLs(filePath);
    
    return Object.entries(urls)
      .map(([size, url]) => {
        const width = this.getSizeWidth(size as keyof ImageSize);
        return `${url} ${width}w`;
      })
      .join(', ');
  }
  
  /**
   * Get width for size
   */
  private getSizeWidth(size: keyof ImageSize): number {
    const widths = {
      xs: 50,
      sm: 150,
      md: 300,
      lg: 600,
      xl: 1200
    };
    
    return widths[size];
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.imageCache.clear();
    this.metadataCache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): {
    imageCacheSize: number;
    metadataCacheSize: number;
  } {
    return {
      imageCacheSize: this.imageCache.size,
      metadataCacheSize: this.metadataCache.size
    };
  }
  
  /**
   * Invalidate cache for specific image
   */
  invalidateImageCache(filePath: string): void {
    // Remove all cached URLs for this image
    for (const [key] of Array.from(this.imageCache.entries())) {
      if (key.includes(filePath)) {
        this.imageCache.delete(key);
      }
    }
    
    // Remove metadata cache
    this.metadataCache.delete(filePath);
  }
}

// Export singleton instance
export const enterpriseImageService = new EnterpriseImageService();

// Types are already exported above
