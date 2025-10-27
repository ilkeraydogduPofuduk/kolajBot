// API Configuration - DEPRECATED: Use useUrlConfig hook instead
export const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  uploadsURL: process.env.REACT_APP_UPLOADS_URL || `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/uploads`,
};

// Helper function to get full image URL - DEPRECATED: Use useUrlConfig hook instead
export const getImageURL = (filePath: string): string => {
  if (!filePath) return '';
  
  // Remove leading slashes and 'uploads/' prefix if exists
  const cleanPath = filePath.replace(/^\/+/, '').replace(/^uploads\//, '');
  
  return `${API_CONFIG.uploadsURL}/${cleanPath}`;
};

// Helper function to get full API URL
export const getAPIURL = (endpoint: string): string => {
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  return `${API_CONFIG.baseURL}/${cleanEndpoint}`;
};
