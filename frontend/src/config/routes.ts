/**
 * Merkezi Route Yönetim Sistemi
 * Tüm uygulama route'ları buradan yönetilir
 */

export interface RouteConfig {
  path: string;
  name: string;
  title: string;
  description?: string;
  icon?: string;
  requiresAuth?: boolean;
  roles?: readonly string[];
  inMenu?: boolean;
  category?: string;
  order?: number;
}

export const ROUTES = {
  // Public Routes
  LOGIN: {
    path: '/login',
    name: 'login',
    title: 'Giriş Yap',
    description: 'Kullanıcı girişi',
    requiresAuth: false,
    inMenu: false
  },

  // Dashboard
  DASHBOARD: {
    path: '/dashboard',
    name: 'dashboard',
    title: 'Kontrol Paneli',
    description: 'Ana sayfa ve istatistikler',
    icon: 'LayoutDashboard',
    requiresAuth: true,
    inMenu: true,
    category: 'main',
    order: 1
  },

  // Media & Products
  MEDIA_GALLERY: {
    path: '/media',
    name: 'media',
    title: 'Ürünler',
    description: 'Ürün yönetimi ve medya galerisi',
    icon: 'Image',
    requiresAuth: true,
    inMenu: true,
    category: 'content',
    order: 2
  },

  TEMPLATES: {
    path: '/templates',
    name: 'templates',
    title: 'Şablonlar',
    description: 'Şablon oluştur',
    icon: 'FileText',
    requiresAuth: true,
    inMenu: true,
    category: 'content',
    order: 3
  },

  TEMPLATE_GALLERY: {
    path: '/template-gallery',
    name: 'template-gallery',
    title: 'Şablon Galerisi',
    description: 'Tüm şablonlar',
    icon: 'Grid',
    requiresAuth: true,
    inMenu: true,
    category: 'content',
    order: 4
  },

  // Social Media
  SOCIAL_CHANNELS: {
    path: '/social-channels',
    name: 'social-channels',
    title: 'Sosyal Medya Kanalları',
    description: 'Telegram ve diğer kanallar',
    icon: 'MessageCircle',
    requiresAuth: true,
    inMenu: true,
    category: 'social',
    order: 5
  },

  CHANNEL_DETAIL: {
    path: '/social-channels/:channelId',
    name: 'channel-detail',
    title: 'Kanal Detayı',
    description: 'Kanal mesajları ve yönetimi',
    requiresAuth: true,
    inMenu: false,
    category: 'social'
  },

  // Management
  BRANDS: {
    path: '/brands',
    name: 'brands',
    title: 'Markalar',
    description: 'Marka yönetimi',
    icon: 'Award',
    requiresAuth: true,
    roles: ['Super Admin'],
    inMenu: true,
    category: 'management',
    order: 6
  },

  USERS: {
    path: '/users',
    name: 'users',
    title: 'Kullanıcılar',
    description: 'Kullanıcı yönetimi',
    icon: 'Users',
    requiresAuth: true,
    roles: ['Super Admin', 'Mağaza Yöneticisi'],
    inMenu: true,
    category: 'management',
    order: 7
  },

  MY_EMPLOYEES: {
    path: '/my-employees',
    name: 'my-employees',
    title: 'Çalışanlarım',
    description: 'Çalışan yönetimi',
    icon: 'UserCog',
    requiresAuth: true,
    roles: ['Mağaza Yöneticisi'],
    inMenu: true,
    category: 'management',
    order: 8
  },

  BRANCHES: {
    path: '/branches',
    name: 'branches',
    title: 'Şubeler',
    description: 'Şube yönetimi',
    icon: 'Building',
    requiresAuth: true,
    roles: ['Super Admin', 'Mağaza Yöneticisi'],
    inMenu: true,
    category: 'management',
    order: 9
  },

  EMPLOYEE_REQUESTS: {
    path: '/employee-requests',
    name: 'employee-requests',
    title: 'Çalışan Talepleri',
    description: 'Bekleyen istekler',
    icon: 'UserPlus',
    requiresAuth: true,
    roles: ['Mağaza Yöneticisi'],
    inMenu: true,
    category: 'management',
    order: 10
  },

  ROLES: {
    path: '/roles',
    name: 'roles',
    title: 'Roller',
    description: 'Rol ve yetki yönetimi',
    icon: 'Shield',
    requiresAuth: true,
    roles: ['Super Admin'],
    inMenu: true,
    category: 'management',
    order: 11
  },

  // Settings
  SETTINGS: {
    path: '/settings',
    name: 'settings',
    title: 'Ayarlar',
    description: 'Sistem ayarları',
    icon: 'Settings',
    requiresAuth: true,
    roles: ['Super Admin'],
    inMenu: true,
    category: 'system',
    order: 12
  },

  CATEGORIES: {
    path: '/categories',
    name: 'categories',
    title: 'Kategoriler',
    description: 'Kategori yönetimi',
    icon: 'FolderTree',
    requiresAuth: true,
    roles: ['Super Admin'],
    inMenu: true,
    category: 'system',
    order: 13
  }
} as const;

// Route utility functions
export class RouteManager {
  /**
   * Get all routes
   */
  static getAllRoutes(): RouteConfig[] {
    return Object.values(ROUTES);
  }

  /**
   * Get menu routes (filtered by user role)
   */
  static getMenuRoutes(userRole?: string): RouteConfig[] {
    return this.getAllRoutes()
      .filter(route => route.inMenu)
      .filter(route => {
        if (!route.roles || !userRole) return true;
        return route.roles.includes(userRole);
      })
      .sort((a, b) => (a.order || 999) - (b.order || 999));
  }

  /**
   * Get routes by category
   */
  static getRoutesByCategory(category: string, userRole?: string): RouteConfig[] {
    return this.getAllRoutes()
      .filter(route => route.category === category)
      .filter(route => {
        if (!route.roles || !userRole) return true;
        return route.roles.includes(userRole);
      })
      .sort((a, b) => (a.order || 999) - (b.order || 999));
  }

  /**
   * Get route by name
   */
  static getRoute(name: string): RouteConfig | undefined {
    return this.getAllRoutes().find(route => route.name === name);
  }

  /**
   * Get route by path
   */
  static getRouteByPath(path: string): RouteConfig | undefined {
    return this.getAllRoutes().find(route => route.path === path);
  }

  /**
   * Check if user has access to route
   */
  static canAccess(routeName: string, userRole?: string): boolean {
    const route = this.getRoute(routeName);
    if (!route) return false;
    if (!route.roles) return true;
    if (!userRole) return false;
    return route.roles.includes(userRole);
  }

  /**
   * Get breadcrumb for route
   */
  static getBreadcrumb(path: string): RouteConfig[] {
    const segments = path.split('/').filter(Boolean);
    const breadcrumb: RouteConfig[] = [];

    let currentPath = '';
    for (const segment of segments) {
      currentPath += `/${segment}`;
      const route = this.getRouteByPath(currentPath);
      if (route) {
        breadcrumb.push(route);
      }
    }

    return breadcrumb;
  }

  /**
   * Generate sitemap data
   */
  static generateSitemap(): Array<{
    path: string;
    title: string;
    priority: number;
    changefreq: string;
  }> {
    return this.getAllRoutes()
      .filter(route => !route.path.includes(':')) // Exclude dynamic routes
      .map(route => ({
        path: route.path,
        title: route.title,
        priority: route.order ? 1 - (route.order * 0.05) : 0.5,
        changefreq: route.category === 'main' ? 'daily' : 'weekly'
      }));
  }
}

export default ROUTES;

