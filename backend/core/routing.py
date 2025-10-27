"""
Merkezi Dinamik Route Yönetim Sistemi
Tüm URL'ler, route'lar ve sitemap tek yerden yönetilir
"""

import os
import json
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path
from core.config import settings
from core.logging import get_logger
from core.exceptions import ConfigurationError

logger = get_logger('routing')

class RouteType(str, Enum):
    """Route türleri"""
    API = "api"
    WEB = "web"
    STATIC = "static"
    ADMIN = "admin"
    AUTH = "auth"
    UPLOAD = "upload"
    IMAGE = "image"
    DOCUMENT = "document"

class RouteMethod(str, Enum):
    """HTTP metodları"""
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    DELETE = "DELETE"
    PATCH = "PATCH"
    OPTIONS = "OPTIONS"
    HEAD = "HEAD"

@dataclass
class Route:
    """Route tanımı"""
    path: str
    method: RouteMethod
    handler: str
    route_type: RouteType
    description: str
    tags: List[str]
    requires_auth: bool = False
    required_permissions: List[str] = None
    rate_limit: Optional[int] = None
    cache_ttl: Optional[int] = None
    is_active: bool = True
    created_at: datetime = None
    updated_at: datetime = None

@dataclass
class SitemapEntry:
    """Sitemap girişi"""
    url: str
    lastmod: datetime
    changefreq: str
    priority: float
    route_type: RouteType

class DynamicRouteManager:
    """Dinamik route yöneticisi"""
    
    def __init__(self):
        self.routes: Dict[str, Route] = {}
        self.sitemap_entries: List[SitemapEntry] = []
        self.route_file = "dynamic_routes.json"
        self.sitemap_file = "sitemap.xml"
        self.robots_file = "robots.txt"
        self.load_routes()
        self.generate_sitemap()
        self.generate_robots()
    
    def load_routes(self) -> None:
        """Route'ları dosyadan yükle"""
        try:
            if os.path.exists(self.route_file):
                with open(self.route_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                for key, route_data in data.items():
                    # Convert datetime strings back to datetime objects
                    if route_data.get('created_at'):
                        route_data['created_at'] = datetime.fromisoformat(route_data['created_at'])
                    if route_data.get('updated_at'):
                        route_data['updated_at'] = datetime.fromisoformat(route_data['updated_at'])
                    
                    self.routes[key] = Route(**route_data)
                
                logger.info(f"Dynamic routes loaded: {len(self.routes)} routes")
            else:
                self.initialize_default_routes()
                
        except Exception as e:
            logger.error(f"Failed to load dynamic routes: {e}")
            self.initialize_default_routes()
    
    def save_routes(self) -> None:
        """Route'ları dosyaya kaydet"""
        try:
            data = {}
            for key, route in self.routes.items():
                route_dict = asdict(route)
                # Convert datetime to string for JSON serialization
                if route_dict.get('created_at'):
                    route_dict['created_at'] = route_dict['created_at'].isoformat()
                if route_dict.get('updated_at'):
                    route_dict['updated_at'] = route_dict['updated_at'].isoformat()
                data[key] = route_dict
            
            with open(self.route_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                
            logger.info("Dynamic routes saved")
            
        except Exception as e:
            logger.error(f"Failed to save dynamic routes: {e}")
            raise ConfigurationError(f"Failed to save dynamic routes: {str(e)}")
    
    def initialize_default_routes(self) -> None:
        """Varsayılan route'ları oluştur"""
        default_routes = [
            # API Routes
            Route(
                path="/api/auth/login",
                method=RouteMethod.POST,
                handler="auth.login",
                route_type=RouteType.API,
                description="User login",
                tags=["auth", "user"],
                requires_auth=False
            ),
            Route(
                path="/api/auth/logout",
                method=RouteMethod.POST,
                handler="auth.logout",
                route_type=RouteType.API,
                description="User logout",
                tags=["auth", "user"],
                requires_auth=True
            ),
            Route(
                path="/api/auth/me",
                method=RouteMethod.GET,
                handler="auth.get_current_user",
                route_type=RouteType.API,
                description="Get current user",
                tags=["auth", "user"],
                requires_auth=True
            ),
            Route(
                path="/api/users",
                method=RouteMethod.GET,
                handler="users.get_users",
                route_type=RouteType.API,
                description="Get users list",
                tags=["users", "admin"],
                requires_auth=True,
                required_permissions=["user.read"]
            ),
            Route(
                path="/api/users/{user_id}",
                method=RouteMethod.GET,
                handler="users.get_user",
                route_type=RouteType.API,
                description="Get user by ID",
                tags=["users", "admin"],
                requires_auth=True,
                required_permissions=["user.read"]
            ),
            Route(
                path="/api/brands",
                method=RouteMethod.GET,
                handler="brands.get_brands",
                route_type=RouteType.API,
                description="Get brands list",
                tags=["brands"],
                requires_auth=True
            ),
            Route(
                path="/api/brands/{brand_id}",
                method=RouteMethod.GET,
                handler="brands.get_brand",
                route_type=RouteType.API,
                description="Get brand by ID",
                tags=["brands"],
                requires_auth=True
            ),
            Route(
                path="/api/products",
                method=RouteMethod.GET,
                handler="products.get_products",
                route_type=RouteType.API,
                description="Get products list",
                tags=["products"],
                requires_auth=True
            ),
            Route(
                path="/api/products/upload-v2",
                method=RouteMethod.POST,
                handler="products.upload_products_v2",
                route_type=RouteType.API,
                description="Upload products with OCR",
                tags=["products", "upload"],
                requires_auth=True,
                required_permissions=["product.create"]
            ),
            Route(
                path="/api/templates",
                method=RouteMethod.GET,
                handler="templates.get_templates",
                route_type=RouteType.API,
                description="Get templates list",
                tags=["templates"],
                requires_auth=True
            ),
            Route(
                path="/api/templates/{template_id}",
                method=RouteMethod.GET,
                handler="templates.get_template",
                route_type=RouteType.API,
                description="Get template by ID",
                tags=["templates"],
                requires_auth=True
            ),
            Route(
                path="/api/images/optimized/{path:path}",
                method=RouteMethod.GET,
                handler="images.get_optimized_image",
                route_type=RouteType.IMAGE,
                description="Get optimized image",
                tags=["images", "optimization"],
                requires_auth=True,
                cache_ttl=3600
            ),
            Route(
                path="/api/images/thumbnail/{path:path}",
                method=RouteMethod.GET,
                handler="images.get_thumbnail",
                route_type=RouteType.IMAGE,
                description="Get thumbnail image",
                tags=["images", "thumbnail"],
                requires_auth=True,
                cache_ttl=7200
            ),
            Route(
                path="/api/performance",
                method=RouteMethod.GET,
                handler="performance.get_stats",
                route_type=RouteType.API,
                description="Get performance statistics",
                tags=["performance", "monitoring"],
                requires_auth=True,
                required_permissions=["system.read"]
            ),
            Route(
                path="/api/config/dynamic",
                method=RouteMethod.GET,
                handler="config.get_dynamic_config",
                route_type=RouteType.API,
                description="Get dynamic configuration",
                tags=["config", "admin"],
                requires_auth=True,
                required_permissions=["config.read"]
            ),
            Route(
                path="/api/config/dynamic",
                method=RouteMethod.PUT,
                handler="config.update_dynamic_config",
                route_type=RouteType.API,
                description="Update dynamic configuration",
                tags=["config", "admin"],
                requires_auth=True,
                required_permissions=["config.write"]
            ),
            
            # Web Routes
            Route(
                path="/",
                method=RouteMethod.GET,
                handler="web.index",
                route_type=RouteType.WEB,
                description="Home page",
                tags=["web", "public"],
                requires_auth=False
            ),
            Route(
                path="/login",
                method=RouteMethod.GET,
                handler="web.login",
                route_type=RouteType.WEB,
                description="Login page",
                tags=["web", "auth"],
                requires_auth=False
            ),
            Route(
                path="/admin",
                method=RouteMethod.GET,
                handler="web.admin_dashboard",
                route_type=RouteType.ADMIN,
                description="Admin dashboard",
                tags=["web", "admin"],
                requires_auth=True,
                required_permissions=["admin.access"]
            ),
            Route(
                path="/admin/products",
                method=RouteMethod.GET,
                handler="web.admin_products",
                route_type=RouteType.ADMIN,
                description="Admin products page",
                tags=["web", "admin", "products"],
                requires_auth=True,
                required_permissions=["product.read"]
            ),
            Route(
                path="/admin/templates",
                method=RouteMethod.GET,
                handler="web.admin_templates",
                route_type=RouteType.ADMIN,
                description="Admin templates page",
                tags=["web", "admin", "templates"],
                requires_auth=True,
                required_permissions=["template.read"]
            ),
            
            # Static Routes
            Route(
                path="/static/{path:path}",
                method=RouteMethod.GET,
                handler="static.serve_static",
                route_type=RouteType.STATIC,
                description="Serve static files",
                tags=["static", "files"],
                requires_auth=False,
                cache_ttl=86400
            ),
            Route(
                path="/uploads/{path:path}",
                method=RouteMethod.GET,
                handler="static.serve_uploads",
                route_type=RouteType.UPLOAD,
                description="Serve uploaded files",
                tags=["uploads", "files"],
                requires_auth=True,
                cache_ttl=3600
            ),
        ]
        
        for route in default_routes:
            route.created_at = datetime.now()
            route.updated_at = datetime.now()
            key = f"{route.method.value}:{route.path}"
            self.routes[key] = route
        
        self.save_routes()
        logger.info("Default dynamic routes initialized")
    
    def add_route(self, route: Route) -> bool:
        """Yeni route ekle"""
        try:
            key = f"{route.method.value}:{route.path}"
            route.created_at = datetime.now()
            route.updated_at = datetime.now()
            self.routes[key] = route
            self.save_routes()
            
            # Update sitemap if it's a web route
            if route.route_type == RouteType.WEB:
                self.add_sitemap_entry(route)
            
            logger.info(f"Route added: {key}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add route: {e}")
            return False
    
    def update_route(self, key: str, updates: Dict[str, Any]) -> bool:
        """Route güncelle"""
        try:
            if key not in self.routes:
                return False
            
            route = self.routes[key]
            for field, value in updates.items():
                if hasattr(route, field):
                    setattr(route, field, value)
            
            route.updated_at = datetime.now()
            self.save_routes()
            
            logger.info(f"Route updated: {key}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update route: {e}")
            return False
    
    def remove_route(self, key: str) -> bool:
        """Route kaldır"""
        try:
            if key in self.routes:
                del self.routes[key]
                self.save_routes()
                logger.info(f"Route removed: {key}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to remove route: {e}")
            return False
    
    def get_route(self, key: str) -> Optional[Route]:
        """Route al"""
        return self.routes.get(key)
    
    def get_routes_by_type(self, route_type: RouteType) -> List[Route]:
        """Türe göre route'ları al"""
        return [route for route in self.routes.values() if route.route_type == route_type]
    
    def get_routes_by_tag(self, tag: str) -> List[Route]:
        """Etikete göre route'ları al"""
        return [route for route in self.routes.values() if tag in route.tags]
    
    def get_active_routes(self) -> List[Route]:
        """Aktif route'ları al"""
        return [route for route in self.routes.values() if route.is_active]
    
    def add_sitemap_entry(self, route: Route) -> None:
        """Sitemap girişi ekle"""
        if route.route_type in [RouteType.WEB, RouteType.ADMIN]:
            entry = SitemapEntry(
                url=f"{settings.app.backend_url}{route.path}",
                lastmod=datetime.now(),
                changefreq="weekly",
                priority=0.8 if route.route_type == RouteType.WEB else 0.6,
                route_type=route.route_type
            )
            self.sitemap_entries.append(entry)
    
    def generate_sitemap(self) -> None:
        """Sitemap XML oluştur"""
        try:
            sitemap_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
            sitemap_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            
            for entry in self.sitemap_entries:
                sitemap_content += '  <url>\n'
                sitemap_content += f'    <loc>{entry.url}</loc>\n'
                sitemap_content += f'    <lastmod>{entry.lastmod.isoformat()}</lastmod>\n'
                sitemap_content += f'    <changefreq>{entry.changefreq}</changefreq>\n'
                sitemap_content += f'    <priority>{entry.priority}</priority>\n'
                sitemap_content += '  </url>\n'
            
            sitemap_content += '</urlset>\n'
            
            with open(self.sitemap_file, 'w', encoding='utf-8') as f:
                f.write(sitemap_content)
            
            logger.info("Sitemap generated")
            
        except Exception as e:
            logger.error(f"Failed to generate sitemap: {e}")
    
    def generate_robots(self) -> None:
        """Robots.txt oluştur"""
        try:
            robots_content = f"User-agent: *\n"
            robots_content += f"Allow: /\n"
            robots_content += f"Disallow: /admin/\n"
            robots_content += f"Disallow: /api/\n"
            robots_content += f"Disallow: /uploads/\n"
            robots_content += f"\n"
            robots_content += f"Sitemap: {settings.app.backend_url}/sitemap.xml\n"
            
            with open(self.robots_file, 'w', encoding='utf-8') as f:
                f.write(robots_content)
            
            logger.info("Robots.txt generated")
            
        except Exception as e:
            logger.error(f"Failed to generate robots.txt: {e}")
    
    def get_route_stats(self) -> Dict[str, Any]:
        """Route istatistiklerini al"""
        stats = {
            'total_routes': len(self.routes),
            'active_routes': len(self.get_active_routes()),
            'routes_by_type': {},
            'routes_by_method': {},
            'routes_by_tag': {},
        }
        
        # Count by type
        for route_type in RouteType:
            count = len(self.get_routes_by_type(route_type))
            if count > 0:
                stats['routes_by_type'][route_type.value] = count
        
        # Count by method
        for method in RouteMethod:
            count = len([r for r in self.routes.values() if r.method == method])
            if count > 0:
                stats['routes_by_method'][method.value] = count
        
        # Count by tag
        all_tags = set()
        for route in self.routes.values():
            all_tags.update(route.tags)
        
        for tag in all_tags:
            count = len(self.get_routes_by_tag(tag))
            stats['routes_by_tag'][tag] = count
        
        return stats

# Global route manager
route_manager = DynamicRouteManager()

def get_route_manager() -> DynamicRouteManager:
    """Route manager al"""
    return route_manager

def add_route(route: Route) -> bool:
    """Route ekle"""
    return route_manager.add_route(route)

def get_route(key: str) -> Optional[Route]:
    """Route al"""
    return route_manager.get_route(key)

def get_routes_by_type(route_type: RouteType) -> List[Route]:
    """Türe göre route'ları al"""
    return route_manager.get_routes_by_type(route_type)

def get_active_routes() -> List[Route]:
    """Aktif route'ları al"""
    return route_manager.get_active_routes()

def get_route_statistics() -> Dict[str, Any]:
    """Route istatistiklerini al"""
    return route_manager.get_route_stats()

def generate_sitemap_xml() -> str:
    """Sitemap XML oluştur"""
    try:
        sitemap_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
        sitemap_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        
        for entry in route_manager.sitemap_entries:
            sitemap_content += '  <url>\n'
            sitemap_content += f'    <loc>{entry.url}</loc>\n'
            sitemap_content += f'    <lastmod>{entry.lastmod.isoformat()}</lastmod>\n'
            sitemap_content += f'    <changefreq>{entry.changefreq}</changefreq>\n'
            sitemap_content += f'    <priority>{entry.priority}</priority>\n'
            sitemap_content += '  </url>\n'
        
        sitemap_content += '</urlset>\n'
        return sitemap_content
        
    except Exception as e:
        logger.error(f"Failed to generate sitemap XML: {e}")
        return ""

def generate_robots_txt() -> str:
    """Robots.txt oluştur"""
    try:
        robots_content = f"User-agent: *\n"
        robots_content += f"Allow: /\n"
        robots_content += f"Disallow: /admin/\n"
        robots_content += f"Disallow: /api/\n"
        robots_content += f"Disallow: /uploads/\n"
        robots_content += f"\n"
        robots_content += f"Sitemap: {settings.app.backend_url}/sitemap.xml\n"
        return robots_content
        
    except Exception as e:
        logger.error(f"Failed to generate robots.txt: {e}")
        return ""

def validate_route_path(path: str) -> bool:
    """Route path'ini doğrula"""
    try:
        # Basic validation
        if not path or not path.startswith('/'):
            return False
        
        # Check for invalid characters
        invalid_chars = ['<', '>', '"', "'", '&', ';', '(', ')', '|', '*', '?', '\\', '^', '`', '{', '}']
        if any(char in path for char in invalid_chars):
            return False
        
        # Check for duplicate slashes
        if '//' in path:
            return False
        
        return True
        
    except Exception as e:
        logger.error(f"Route path validation failed: {e}")
        return False

def generate_route_documentation() -> str:
    """Route dokümantasyonu oluştur"""
    try:
        doc_lines = [
            "# API Routes Documentation",
            f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "## Overview",
            f"- Total Routes: {len(route_manager.routes)}",
            f"- Active Routes: {len(route_manager.get_active_routes())}",
            f"- Sitemap Entries: {len(route_manager.sitemap_entries)}",
            "",
            "## Routes by Type",
            ""
        ]
        
        # Group by type
        for route_type in RouteType:
            type_routes = route_manager.get_routes_by_type(route_type)
            if type_routes:
                doc_lines.extend([
                    f"### {route_type.value.upper()} Routes",
                    ""
                ])
                
                for route in type_routes:
                    doc_lines.extend([
                        f"#### {route.method.value} {route.path}",
                        f"- **Description**: {route.description}",
                        f"- **Tags**: {', '.join(route.tags)}",
                        f"- **Auth Required**: {'Yes' if route.requires_auth else 'No'}",
                        f"- **Active**: {'Yes' if route.is_active else 'No'}",
                        ""
                    ])
        
        return '\n'.join(doc_lines)
        
    except Exception as e:
        logger.error(f"Failed to generate route documentation: {e}")
        return ""
