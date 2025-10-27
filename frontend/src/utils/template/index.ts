const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8005';

// Get optimized image URL helper
export const getImageURL = (filePath: string, size: string = 'md', quality: string = 'web'): string => {
  if (!filePath) return '';
  const cleanPath = filePath.replace(/\\/g, '/').replace(/^uploads\//, '');
  return `${API_BASE_URL}/api/images/optimized/${cleanPath}?size=${size}&quality=${quality}`;
};

// Get thumbnail URL helper
export const getThumbnailURL = (filePath: string, size: string = 'sm'): string => {
  if (!filePath) return '';
  const cleanPath = filePath.replace(/\\/g, '/').replace(/^uploads\//, '');
  return `${API_BASE_URL}/api/images/thumbnail/${cleanPath}?size=${size}`;
};

// Get progressive image URL helper
export const getProgressiveImageURL = (filePath: string): string => {
  if (!filePath) return '';
  const cleanPath = filePath.replace(/\\/g, '/').replace(/^uploads\//, '');
  return `${API_BASE_URL}/api/images/progressive/${cleanPath}`;
};

// Generate related product code
export const generateRelatedProductCode = (code: string, increment: number = 100): string => {
  return code.replace(/\d+$/, (match) => String(parseInt(match) + increment));
};

// Calculate optimal canvas dimensions
export const calculateCanvasDimensions = (
  containerWidth: number, 
  containerHeight: number, 
  aspectRatio: number = 3/4
): { width: number; height: number } => {
  let canvasWidth, canvasHeight;
  
  if (containerWidth / containerHeight > aspectRatio) {
    canvasHeight = Math.min(containerHeight, 800);
    canvasWidth = canvasHeight * aspectRatio;
  } else {
    canvasWidth = Math.min(containerWidth, 600);
    canvasHeight = canvasWidth / aspectRatio;
  }
  
  return { width: canvasWidth, height: canvasHeight };
};

// Scale image to fit within bounds
export const calculateImageScale = (
  imageWidth: number,
  imageHeight: number,
  maxWidth: number,
  maxHeight: number
): number => {
  const imageRatio = imageWidth / imageHeight;
  const maxRatio = maxWidth / maxHeight;
  
  if (imageRatio > maxRatio) {
    return maxWidth / imageWidth;
  } else {
    return maxHeight / imageHeight;
  }
};

// Generate random color palette
export const generateRandomColorPalette = (): string[] => {
  const palettes = [
    ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
    ['#6C5CE7', '#A29BFE', '#FD79A8', '#FDCB6E', '#E17055'],
    ['#00B894', '#00CEC9', '#0984E3', '#6C5CE7', '#A29BFE'],
    ['#E84393', '#FD79A8', '#FDCB6E', '#E17055', '#D63031'],
  ];
  
  return palettes[Math.floor(Math.random() * palettes.length)];
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Validate image file
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Desteklenmeyen dosya formatı. Lütfen JPEG, PNG, GIF veya WebP formatında bir dosya seçin.'
    };
  }
  
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'Dosya boyutu çok büyük. Maksimum 10MB boyutunda dosya yükleyebilirsiniz.'
    };
  }
  
  return { isValid: true };
};

// Create download link
export const createDownloadLink = (dataUrl: string, filename: string): void => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Debounce function for performance
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
