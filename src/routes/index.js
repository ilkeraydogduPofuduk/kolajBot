/**
 * Route Index
 * Aggregates and exports all route modules
 * @module routes
 */

import express from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import brandRoutes from './brand.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '3.0.0'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/brands', brandRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'KolajBot API',
    version: '3.0.0',
    description: 'AI-Powered Automatic Collage & Brand Management Platform',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      brands: '/api/brands',
      products: '/api/products',
      categories: '/api/categories',
      templates: '/api/templates'
    },
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

export default router;
