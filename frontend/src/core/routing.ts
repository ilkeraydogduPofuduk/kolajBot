/**
 * Merkezi Dinamik Route Yönetim Sistemi
 * Tüm URL'ler, route'lar ve sitemap tek yerden yönetilir
 */

import { logger } from './logger';
import { eventBus } from './eventBus';
import { configManager } from './config';

export enum RouteType {
  API = 'api',
  WEB = 'web',
  STATIC = 'static',
  ADMIN = 'admin',
  AUTH = 'auth',
  UPLOAD = 'upload',
  IMAGE = 'image',
  DOCUMENT = 'document',
}

export enum RouteMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
}

export interface Route {
  path: string;
  method: RouteMethod;
  handler: string;
  routeType: RouteType;
  description: string;
  tags: string[];
  requiresAuth?: boolean;
  requiredPermissions?: string[];
  rateLimit?: number;
  cacheTtl?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq: string;
  priority: number;
  routeType: RouteType;
}

export interface RouteStats {
  totalRoutes: number;
  activeRoutes: number;
  routesByType: Record<string, number>;
  routesByMethod: Record<string, number>;
  routesByTag: Record<string, number>;
}

class DynamicRouteManager {
  private routes: Map<string, Route> = new Map();
  private sitemapEntries: SitemapEntry[] = [];
  private routeFile = 'dynamic_routes.json';
  private sitemapFile = 'sitemap.xml';
  private robotsFile = 'robots.txt';

  constructor() {
    this.loadRoutes();
    this.generateSitemap();
    this.generateRobots();
  }

  private async loadRoutes(): Promise<void> {
    try {
      const response = await fetch(`/api/routes/dynamic`);
      if (response.ok) {
        const data = await response.json();
        
        this.routes.clear();
        Object.entries(data).forEach(([key, routeData]: [string, any]) => {
          this.routes.set(key, routeData as Route);
        });
        
        logger.info('Dynamic routes loaded', { count: this.routes.size });
        eventBus.emit('routes:loaded', { count: this.routes.size });
      } else {
        this.initializeDefaultRoutes();
      }
    } catch (error) {
      logger.error('Failed to load dynamic routes', { error });
      this.initializeDefaultRoutes();
    }
  }

  private async saveRoutes(): Promise<void> {
    try {
      const data: Record<string, Route> = {};
      this.routes.forEach((route, key) => {
        data[key] = route;
      });

      const response = await fetch('/api/routes/dynamic', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        logger.info('Dynamic routes saved');
        eventBus.emit('routes:saved');
      } else {
        throw new Error('Failed to save routes');
      }
    } catch (error) {
      logger.error('Failed to save dynamic routes', { error });
      throw error;
    }
  }

  private initializeDefaultRoutes(): void {
    const defaultRoutes: Route[] = [
      // API Routes
      {
        path: '/api/auth/login',
        method: RouteMethod.POST,
        handler: 'auth.login',
        routeType: RouteType.API,
        description: 'User login',
        tags: ['auth', 'user'],
        requiresAuth: false,
      },
      {
        path: '/api/auth/logout',
        method: RouteMethod.POST,
        handler: 'auth.logout',
        routeType: RouteType.API,
        description: 'User logout',
        tags: ['auth', 'user'],
        requiresAuth: true,
      },
      {
        path: '/api/auth/me',
        method: RouteMethod.GET,
        handler: 'auth.getCurrentUser',
        routeType: RouteType.API,
        description: 'Get current user',
        tags: ['auth', 'user'],
        requiresAuth: true,
      },
      {
        path: '/api/users',
        method: RouteMethod.GET,
        handler: 'users.getUsers',
        routeType: RouteType.API,
        description: 'Get users list',
        tags: ['users', 'admin'],
        requiresAuth: true,
        requiredPermissions: ['user.read'],
      },
      {
        path: '/api/users/{userId}',
        method: RouteMethod.GET,
        handler: 'users.getUser',
        routeType: RouteType.API,
        description: 'Get user by ID',
        tags: ['users', 'admin'],
        requiresAuth: true,
        requiredPermissions: ['user.read'],
      },
      {
        path: '/api/brands',
        method: RouteMethod.GET,
        handler: 'brands.getBrands',
        routeType: RouteType.API,
        description: 'Get brands list',
        tags: ['brands'],
        requiresAuth: true,
      },
      {
        path: '/api/brands/{brandId}',
        method: RouteMethod.GET,
        handler: 'brands.getBrand',
        routeType: RouteType.API,
        description: 'Get brand by ID',
        tags: ['brands'],
        requiresAuth: true,
      },
      {
        path: '/api/products',
        method: RouteMethod.GET,
        handler: 'products.getProducts',
        routeType: RouteType.API,
        description: 'Get products list',
        tags: ['products'],
        requiresAuth: true,
      },
      {
        path: '/api/products/upload-v2',
        method: RouteMethod.POST,
        handler: 'products.uploadProductsV2',
        routeType: RouteType.API,
        description: 'Upload products with OCR',
        tags: ['products', 'upload'],
        requiresAuth: true,
        requiredPermissions: ['product.create'],
      },
      {
        path: '/api/templates',
        method: RouteMethod.GET,
        handler: 'templates.getTemplates',
        routeType: RouteType.API,
        description: 'Get templates list',
        tags: ['templates'],
        requiresAuth: true,
      },
      {
        path: '/api/templates/{templateId}',
        method: RouteMethod.GET,
        handler: 'templates.getTemplate',
        routeType: RouteType.API,
        description: 'Get template by ID',
        tags: ['templates'],
        requiresAuth: true,
      },
      {
        path: '/api/images/optimized/{path}',
        method: RouteMethod.GET,
        handler: 'images.getOptimizedImage',
        routeType: RouteType.IMAGE,
        description: 'Get optimized image',
        tags: ['images', 'optimization'],
        requiresAuth: true,
        cacheTtl: 3600,
      },
      {
        path: '/api/images/thumbnail/{path}',
        method: RouteMethod.GET,
        handler: 'images.getThumbnail',
        routeType: RouteType.IMAGE,
        description: 'Get thumbnail image',
        tags: ['images', 'thumbnail'],
        requiresAuth: true,
        cacheTtl: 7200,
      },
      {
        path: '/api/performance',
        method: RouteMethod.GET,
        handler: 'performance.getStats',
        routeType: RouteType.API,
        description: 'Get performance statistics',
        tags: ['performance', 'monitoring'],
        requiresAuth: true,
        requiredPermissions: ['system.read'],
      },
      {
        path: '/api/config/dynamic',
        method: RouteMethod.GET,
        handler: 'config.getDynamicConfig',
        routeType: RouteType.API,
        description: 'Get dynamic configuration',
        tags: ['config', 'admin'],
        requiresAuth: true,
        requiredPermissions: ['config.read'],
      },
      {
        path: '/api/config/dynamic',
        method: RouteMethod.PUT,
        handler: 'config.updateDynamicConfig',
        routeType: RouteType.API,
        description: 'Update dynamic configuration',
        tags: ['config', 'admin'],
        requiresAuth: true,
        requiredPermissions: ['config.write'],
      },

      // Web Routes
      {
        path: '/',
        method: RouteMethod.GET,
        handler: 'web.index',
        routeType: RouteType.WEB,
        description: 'Home page',
        tags: ['web', 'public'],
        requiresAuth: false,
      },
      {
        path: '/login',
        method: RouteMethod.GET,
        handler: 'web.login',
        routeType: RouteType.WEB,
        description: 'Login page',
        tags: ['web', 'auth'],
        requiresAuth: false,
      },
      {
        path: '/admin',
        method: RouteMethod.GET,
        handler: 'web.adminDashboard',
        routeType: RouteType.ADMIN,
        description: 'Admin dashboard',
        tags: ['web', 'admin'],
        requiresAuth: true,
        requiredPermissions: ['admin.access'],
      },
      {
        path: '/admin/products',
        method: RouteMethod.GET,
        handler: 'web.adminProducts',
        routeType: RouteType.ADMIN,
        description: 'Admin products page',
        tags: ['web', 'admin', 'products'],
        requiresAuth: true,
        requiredPermissions: ['product.read'],
      },
      {
        path: '/admin/templates',
        method: RouteMethod.GET,
        handler: 'web.adminTemplates',
        routeType: RouteType.ADMIN,
        description: 'Admin templates page',
        tags: ['web', 'admin', 'templates'],
        requiresAuth: true,
        requiredPermissions: ['template.read'],
      },
    ];

    defaultRoutes.forEach(route => {
      const key = `${route.method}:${route.path}`;
      route.createdAt = new Date().toISOString();
      route.updatedAt = new Date().toISOString();
      route.isActive = true;
      this.routes.set(key, route);
    });

    this.saveRoutes();
    logger.info('Default dynamic routes initialized');
  }

  addRoute(route: Route): boolean {
    try {
      const key = `${route.method}:${route.path}`;
      route.createdAt = new Date().toISOString();
      route.updatedAt = new Date().toISOString();
      route.isActive = true;
      this.routes.set(key, route);
      this.saveRoutes();

      // Update sitemap if it's a web route
      if (route.routeType === RouteType.WEB || route.routeType === RouteType.ADMIN) {
        this.addSitemapEntry(route);
      }

      logger.info('Route added', { key });
      eventBus.emit('route:added', { key, route });
      return true;
    } catch (error) {
      logger.error('Failed to add route', { error });
      return false;
    }
  }

  updateRoute(key: string, updates: Partial<Route>): boolean {
    try {
      const route = this.routes.get(key);
      if (!route) {
        return false;
      }

      const updatedRoute = { ...route, ...updates };
      updatedRoute.updatedAt = new Date().toISOString();
      this.routes.set(key, updatedRoute);
      this.saveRoutes();

      logger.info('Route updated', { key });
      eventBus.emit('route:updated', { key, route: updatedRoute });
      return true;
    } catch (error) {
      logger.error('Failed to update route', { error });
      return false;
    }
  }

  removeRoute(key: string): boolean {
    try {
      if (this.routes.has(key)) {
        this.routes.delete(key);
        this.saveRoutes();
        logger.info('Route removed', { key });
        eventBus.emit('route:removed', { key });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to remove route', { error });
      return false;
    }
  }

  getRoute(key: string): Route | undefined {
    return this.routes.get(key);
  }

  getRoutesByType(routeType: RouteType): Route[] {
    return Array.from(this.routes.values()).filter(route => route.routeType === routeType);
  }

  getRoutesByTag(tag: string): Route[] {
    return Array.from(this.routes.values()).filter(route => route.tags.includes(tag));
  }

  getActiveRoutes(): Route[] {
    return Array.from(this.routes.values()).filter(route => route.isActive);
  }

  getAllRoutes(): Route[] {
    return Array.from(this.routes.values());
  }

  getRouteKeys(): string[] {
    return Array.from(this.routes.keys());
  }

  private addSitemapEntry(route: Route): void {
    if (route.routeType === RouteType.WEB || route.routeType === RouteType.ADMIN) {
            const config = configManager.getConfig();
            const entry: SitemapEntry = {
              url: `${config.app.frontendUrl}${route.path}`,
        lastmod: new Date().toISOString(),
        changefreq: 'weekly',
        priority: route.routeType === RouteType.WEB ? 0.8 : 0.6,
        routeType: route.routeType,
      };
      this.sitemapEntries.push(entry);
    }
  }

  private generateSitemap(): void {
    try {
      let sitemapContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
      sitemapContent += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      this.sitemapEntries.forEach(entry => {
        sitemapContent += '  <url>\n';
        sitemapContent += `    <loc>${entry.url}</loc>\n`;
        sitemapContent += `    <lastmod>${entry.lastmod}</lastmod>\n`;
        sitemapContent += `    <changefreq>${entry.changefreq}</changefreq>\n`;
        sitemapContent += `    <priority>${entry.priority}</priority>\n`;
        sitemapContent += '  </url>\n';
      });

      sitemapContent += '</urlset>\n';

      // In a real application, this would be sent to the backend
      logger.info('Sitemap generated', { entries: this.sitemapEntries.length });
    } catch (error) {
      logger.error('Failed to generate sitemap', { error });
    }
  }

  private generateRobots(): void {
    try {
      const config = configManager.getConfig();
      let robotsContent = 'User-agent: *\n';
      robotsContent += 'Allow: /\n';
      robotsContent += 'Disallow: /admin/\n';
      robotsContent += 'Disallow: /api/\n';
      robotsContent += 'Disallow: /uploads/\n';
      robotsContent += '\n';
      robotsContent += `Sitemap: ${config.app.frontendUrl}/sitemap.xml\n`;

      // In a real application, this would be sent to the backend
      logger.info('Robots.txt generated');
    } catch (error) {
      logger.error('Failed to generate robots.txt', { error });
    }
  }

  getRouteStats(): RouteStats {
    const stats: RouteStats = {
      totalRoutes: this.routes.size,
      activeRoutes: this.getActiveRoutes().length,
      routesByType: {},
      routesByMethod: {},
      routesByTag: {},
    };

    // Count by type
    Object.values(RouteType).forEach(routeType => {
      const count = this.getRoutesByType(routeType).length;
      if (count > 0) {
        stats.routesByType[routeType] = count;
      }
    });

    // Count by method
    Object.values(RouteMethod).forEach(method => {
      const count = Array.from(this.routes.values()).filter(route => route.method === method).length;
      if (count > 0) {
        stats.routesByMethod[method] = count;
      }
    });

    // Count by tag
    const allTags = new Set<string>();
    this.routes.forEach(route => {
      route.tags.forEach(tag => allTags.add(tag));
    });

    allTags.forEach(tag => {
      const count = this.getRoutesByTag(tag).length;
      stats.routesByTag[tag] = count;
    });

    return stats;
  }

  async refreshRoutes(): Promise<void> {
    await this.loadRoutes();
  }

  clearRoutes(): void {
    this.routes.clear();
    this.sitemapEntries = [];
  }
}

// Singleton instance
export const routeManager = new DynamicRouteManager();

// Export commonly used methods
export const {
  addRoute,
  updateRoute,
  removeRoute,
  getRoute,
  getRoutesByType,
  getActiveRoutes,
  getAllRoutes,
  getRouteKeys,
  getRouteStats,
  refreshRoutes,
  clearRoutes,
} = routeManager;

export default routeManager;

// Additional utility functions
export function validateRoutePath(path: string): boolean {
  try {
    // Basic validation
    if (!path || !path.startsWith('/')) {
      return false;
    }

    // Check for invalid characters
    const invalidChars = ['<', '>', '"', "'", '&', ';', '(', ')', '|', '*', '?', '\\', '^', '`', '{', '}'];
    if (invalidChars.some(char => path.includes(char))) {
      return false;
    }

    // Check for duplicate slashes
    if (path.includes('//')) {
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Route path validation failed', { error });
    return false;
  }
}

export function generateRouteDocumentation(): string {
  try {
    const docLines = [
      '# API Routes Documentation',
      `Generated on: ${new Date().toLocaleString()}`,
      '',
      '## Overview',
      `- Total Routes: ${routeManager.getAllRoutes().length}`,
      `- Active Routes: ${routeManager.getActiveRoutes().length}`,
      '',
      '## Routes by Type',
      ''
    ];

    // Group by type
    Object.values(RouteType).forEach(routeType => {
      const typeRoutes = routeManager.getRoutesByType(routeType);
      if (typeRoutes.length > 0) {
        docLines.push(
          `### ${routeType.toUpperCase()} Routes`,
          ''
        );

        typeRoutes.forEach(route => {
          docLines.push(
            `#### ${route.method} ${route.path}`,
            `- **Description**: ${route.description}`,
            `- **Tags**: ${route.tags.join(', ')}`,
            `- **Auth Required**: ${route.requiresAuth ? 'Yes' : 'No'}`,
            `- **Active**: ${route.isActive ? 'Yes' : 'No'}`,
            ''
          );
        });
      }
    });

    return docLines.join('\n');
  } catch (error) {
    logger.error('Failed to generate route documentation', { error });
    return '';
  }
}

export function generateSitemapXml(): string {
  try {
    let sitemapContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemapContent += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    const webRoutes = routeManager.getRoutesByType(RouteType.WEB);
    const adminRoutes = routeManager.getRoutesByType(RouteType.ADMIN);
    const allWebRoutes = [...webRoutes, ...adminRoutes];

    allWebRoutes.forEach(route => {
          const config = configManager.getConfig();
          sitemapContent += '  <url>\n';
          sitemapContent += `    <loc>${config.app.frontendUrl}${route.path}</loc>\n`;
      sitemapContent += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
      sitemapContent += `    <changefreq>weekly</changefreq>\n`;
      sitemapContent += `    <priority>${route.routeType === RouteType.WEB ? 0.8 : 0.6}</priority>\n`;
      sitemapContent += '  </url>\n';
    });

    sitemapContent += '</urlset>\n';
    return sitemapContent;
  } catch (error) {
    logger.error('Failed to generate sitemap XML', { error });
    return '';
  }
}

export function generateRobotsTxt(): string {
  try {
    const config = configManager.getConfig();
    let robotsContent = 'User-agent: *\n';
    robotsContent += 'Allow: /\n';
    robotsContent += 'Disallow: /admin/\n';
    robotsContent += 'Disallow: /api/\n';
    robotsContent += 'Disallow: /uploads/\n';
    robotsContent += '\n';
    robotsContent += `Sitemap: ${config.app.frontendUrl}/sitemap.xml\n`;
    return robotsContent;
  } catch (error) {
    logger.error('Failed to generate robots.txt', { error });
    return '';
  }
}

export function getPublicRoutes(): Route[] {
  return routeManager.getAllRoutes().filter(route => !route.requiresAuth);
}

export function getDynamicRoutes(): Route[] {
  return routeManager.getAllRoutes().filter(route => route.path.includes('{'));
}

export function exportRoutes(): string {
  try {
    const data: Record<string, Route> = {};
    routeManager.getAllRoutes().forEach(route => {
      const key = `${route.method}:${route.path}`;
      data[key] = route;
    });
    return JSON.stringify(data, null, 2);
  } catch (error) {
    logger.error('Failed to export routes', { error });
    return '{}';
  }
}

export function importRoutes(routesJson: string): boolean {
  try {
    const data = JSON.parse(routesJson);
    routeManager.clearRoutes();
    
    Object.entries(data).forEach(([key, routeData]) => {
      const route = routeData as Route;
      route.createdAt = route.createdAt || new Date().toISOString();
      route.updatedAt = route.updatedAt || new Date().toISOString();
      route.isActive = route.isActive !== false;
      routeManager.addRoute(route);
    });
    
    logger.info('Routes imported successfully');
    return true;
  } catch (error) {
    logger.error('Failed to import routes', { error });
    return false;
  }
}
