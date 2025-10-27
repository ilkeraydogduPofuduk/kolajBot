import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Users, Building2, Home, UserPlus, Shield, Settings, ChevronDown, ChevronRight, MessageCircle, LucideIcon, Grid, Package } from 'lucide-react';
import clsx from 'clsx';
import { settingsAPI } from '../../api/settings';

interface MenuItem {
  name: string;
  href: string;
  icon: LucideIcon;
  show: boolean;
}

interface ReportSectionChild {
  name: string;
  href: string;
  icon: LucideIcon;
  show: boolean;
}

interface ReportSection {
  id: string;
  name: string;
  icon: LucideIcon;
  show: boolean;
  children: ReportSectionChild[];
}

const Sidebar: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<string[]>(['telegram']);
  const [logoUrl, setLogoUrl] = useState<string>('');

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await settingsAPI.getSettings();
        const logoSetting = response.settings.find((s: any) => s.key === 'logo_url');
        if (logoSetting && logoSetting.value) {
          setLogoUrl(logoSetting.value);
        }
      } catch (error) {
        console.error('Logo yüklenirken hata:', error);
      }
    };

    loadLogo();
  }, []);

  // Don't render sidebar while loading user data
  if (loading || !user) return null;

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionName) 
        ? prev.filter(s => s !== sectionName)
        : [...prev, sectionName]
    );
  };

  // Dinamik menü öğeleri - sadece mevcut sayfalar
  const menuItems: MenuItem[] = [
    {
      name: 'Kontrol Paneli',
      href: '/admin/dashboard',
      icon: Home,
      show: true, // Hep göster
    },
    {
      name: 'Kullanıcılar',
      href: '/admin/users',
      icon: Users,
      show: user?.permissions?.includes('users.manage'),
    },
    {
      name: 'Çalışanlarım',
      href: '/admin/my-employees', 
      icon: Users,
      show: user?.brand_ids && user.brand_ids.length > 0,
    },
    {
      name: 'Çalışan Talepleri',
      href: '/admin/employee-requests',
      icon: UserPlus,
      show: user?.permissions?.includes('employee_requests.manage') || user?.permissions?.includes('view_employee_requests'),
    },
    {
      name: user?.permissions?.includes('brands.manage') ? 'Markalar' : 'Markalarım',
      href: '/admin/brands',
      icon: Building2,
      show: user?.permissions?.includes('brands.manage') || (user?.brand_ids && user.brand_ids.length > 0),
    },
    {
      name: 'Roller',
      href: '/admin/roles',
      icon: Shield,
      show: user?.permissions?.includes('roles.manage'),
    },
    {
      name: 'Ürün Galerisi',
      href: '/admin/media-gallery',
      icon: Package,
      show: user?.permissions?.includes('products.manage'),
    },
    {
      name: 'Kolajlar',
      href: '/admin/collages',
      icon: Grid,
      show: user?.permissions?.includes('products.manage'),
    },
  ];

  // Tüm menü öğelerini filtrele (olmayan sayfalar kaldırıldı)
  const allMenuItems = menuItems.filter(item => item.show);

  // Ayarlar menüsünü ayrı olarak en alta ekle
  const settingsMenuItem: MenuItem = {
    name: 'Ayarlar',
    href: '/admin/settings',
    icon: Settings,
    show: user?.permissions?.includes('settings.manage'),
  };

  const reportSections: ReportSection[] = [
    {
      id: 'telegram',
      name: 'Telegram',
      icon: MessageCircle,
      show: user?.permissions?.includes('social.manage'),
      children: [
        {
          name: 'Botlar',
          href: '/admin/telegram/bots',
          icon: MessageCircle,
          show: true,
        },
        {
          name: 'Kanallar',
          href: '/admin/telegram/channels',
          icon: MessageCircle,
          show: true,
        }
      ]
    }
    // Template section removed - only auto-collage remains in main menu
  ].filter(section => section.show);

  // Artık izin kontrolü ile filtrelenmiş öğeler kullanılıyor
  const filteredMenuItems = allMenuItems;
  const filteredReportSections = reportSections;

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0 z-20">
      {/* Logo - En Üstte (Veritabanından) */}
      {logoUrl && (
        <div className="p-3 border-b border-gray-200 bg-white flex-shrink-0">
          <img 
            src={logoUrl} 
            alt="KolajBot Logo" 
            className="h-8 w-auto mx-auto"
            onError={(e) => {
              // Logo yüklenemezse gizle
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <nav className="p-4 flex-1 overflow-y-auto">
        <ul className="space-y-2">
          {/* Regular Menu Items */}
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={clsx(
                    'flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} />
                    {item.name}
                  </div>
                </Link>
              </li>
            );
          })}

          {/* Report Sections (Accordion) */}
          {filteredReportSections.map((section) => {
            const SectionIcon = section.icon;
            const isExpanded = expandedSections.includes(section.id);
            const hasActiveChild = section.children.some(child => 
              child.show && location.pathname === child.href
            );
            
            return (
              <li key={section.id} className="space-y-1">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className={clsx(
                    'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    hasActiveChild
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <SectionIcon size={18} />
                    {section.name}
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                </button>

                {/* Section Children */}
                {isExpanded && (
                  <ul className="ml-6 space-y-1">
                    {section.children
                      .filter(child => child.show)
                      .map((child) => {
                        const ChildIcon = child.icon;
                        const isActive = location.pathname === child.href;
                        
                        return (
                          <li key={child.name}>
                            <Link
                              to={child.href}
                              className={clsx(
                                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                isActive
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                              )}
                            >
                              <ChildIcon size={16} />
                              {child.name}
                            </Link>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </li>
            );
          })}

          {/* Ayarlar menüsü sosyal medyanın altında */}
          {settingsMenuItem.show && (
            <li>
              <Link
                to={settingsMenuItem.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  location.pathname === settingsMenuItem.href
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                <Settings size={18} />
                {settingsMenuItem.name}
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {/* Footer - Logo, Version ve Copyright */}
      <div className="border-t border-gray-200 p-3 bg-gray-50 flex-shrink-0">
        <div className="flex flex-col items-center space-y-2">
          {/* Logo */}
          <img 
            src="https://pofudukdijital.com/wp-content/uploads/2023/11/logo1.svg" 
            alt="Pofuduk Dijital Logo" 
            className="h-8 w-auto"
          />
          
          {/* Version */}
          <p className="text-xs font-semibold text-gray-700">KolajBot v1.0 Beta</p>
          
          {/* Copyright */}
          <div className="text-center">
            <p className="text-[10px] text-gray-500">
              © {new Date().getFullYear()} Tüm hakları Pofuduk Dijital'e aittir
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
