/**
 * OptimizedImage Component
 * High-performance image component with lazy loading and optimization
 */

import React, { useState, useRef, useEffect } from 'react';
import { enterpriseImageService } from '../../services/enterpriseImageService';

interface OptimizedImageProps {
  src: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  quality?: 'thumbnail' | 'web' | 'print';
  className?: string;
  style?: React.CSSProperties;
  lazy?: boolean;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  fallback?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  size = 'md',
  quality = 'web',
  className = '',
  style = {},
  lazy = true,
  placeholder,
  onLoad,
  onError,
  fallback = '/placeholder-image.jpg'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px' // Load 50px before image comes into view
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazy]);

  // Generate optimized image URL
  const getImageUrl = () => {
    if (!src) return fallback;
    
    try {
      return enterpriseImageService.getOptimizedImageURL(src, size, quality);
    } catch (error) {
      console.error('Failed to generate optimized image URL:', error);
      return fallback;
    }
  };

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Get placeholder URL
  const getPlaceholderUrl = () => {
    if (placeholder) return placeholder;
    
    // Generate a low-quality placeholder
    try {
      return enterpriseImageService.getOptimizedImageURL(src, 'xs', 'thumbnail');
    } catch {
      return fallback;
    }
  };

  return (
    <div
      ref={imgRef}
      className={`optimized-image-container ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      {/* Placeholder/Loading state */}
      {!isLoaded && !hasError && (
        <div
          className="image-placeholder"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1
          }}
        >
          {isInView && (
            <img
              src={getPlaceholderUrl()}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: 'blur(5px)',
                opacity: 0.5
              }}
            />
          )}
        </div>
      )}

      {/* Main image */}
      {isInView && (
        <img
          src={getImageUrl()}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            ...style
          }}
          loading={lazy ? 'lazy' : 'eager'}
        />
      )}

      {/* Error state */}
      {hasError && (
        <div
          className="image-error"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: '14px'
          }}
        >
          Image not available
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
