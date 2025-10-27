import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  Users, Building2, TrendingUp, Activity, Clock, Shield, UserCheck, 
  Cpu, HardDrive, Monitor, MessageCircle, Package, CheckCircle, 
  AlertCircle, BarChart3
} from 'lucide-react';
import { socialMediaChannelsAPI } from '../../api/socialMediaChannels';
import { brandsAPI } from '../../api/brands';
import { usersAPI } from '../../api/users';
import { employeeRequestsAPI } from '../../api/employeeRequests';
import { rolesAPI } from '../../api/roles';
import { systemAPI } from '../../api/system';
import BrandManagerDashboard from './BrandManagerDashboard';
import toast from 'react-hot-toast';
import '../../animations.css';

interface DashboardStats {
  totalChannels: number;
  activeChannels: number;
  totalMessages: number;
  totalUsers: number;
  totalBrands: number;
  totalAdmins: number;
  totalManagers: number;
  totalEmployees: number;
  pendingEmployeeRequests: number;
  totalRoles: number;
  totalProducts?: number;
  totalFiles?: number;
  totalStorageGB?: number;
  myChannels?: number;
  assignedChannels?: number;
}

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalChannels: 0,
    activeChannels: 0,
    totalMessages: 0,
    totalUsers: 0,
    totalBrands: 0,
    totalAdmins: 0,
    totalManagers: 0,
    totalEmployees: 0,
    pendingEmployeeRequests: 0,
    totalRoles: 0
  });
  const [loading, setLoading] = useState(false); // BAŞLANGIÇTA FALSE
  const [recentChannels, setRecentChannels] = useState<any[]>([]);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [managerData, setManagerData] = useState<any>({ brands: [], employees: [] });

  // Load dashboard data based on role
  useEffect(() => {
    let isMounted = true; // Race condition kontrolü
    
    const loadDashboardData = async () => {
      if (!user || authLoading) return;
      
      // Permissions kontrolü
      if (!user.permissions) {
        return; // Permissions yüklenene kadar bekle
      }

      setLoading(true);
      try {
        // Load channels (filtered by role on backend)
        const channelsResponse = await socialMediaChannelsAPI.getChannels(1, 100);
        const channels = channelsResponse.channels;

        // Calculate stats
        const activeChannels = channels.filter((c: any) => c.is_active).length;
        const totalMessages = channels.reduce((sum: number, c: any) => sum + (c.message_count || 0), 0);

        const newStats: DashboardStats = {
          totalChannels: channels.length,
          activeChannels,
          totalMessages,
          totalUsers: 0,
          totalBrands: 0,
          totalAdmins: 0,
          totalManagers: 0,
          totalEmployees: 0,
          pendingEmployeeRequests: 0,
          totalRoles: 0
        };

        // DİNAMİK: Permission-specific data
        if (user?.permissions?.includes('users.manage')) {
          // Super Admin sees everything - YENİ: Tek endpoint'ten tüm veriler
          try {
            const dashboardStats = await systemAPI.getDashboardStats();
            
            // Dashboard stats'tan verileri al
            newStats.totalUsers = dashboardStats.users.total;
            newStats.totalAdmins = dashboardStats.users.super_admins;
            newStats.totalManagers = dashboardStats.users.brand_managers;
            newStats.totalEmployees = dashboardStats.users.employees;
            newStats.totalBrands = dashboardStats.brands.total;
            newStats.pendingEmployeeRequests = dashboardStats.employee_requests.pending;
            newStats.totalRoles = dashboardStats.roles.total;
            
            // Kanal istatistikleri
            newStats.totalChannels = dashboardStats.channels.total;
            newStats.activeChannels = dashboardStats.channels.active;
            newStats.totalMessages = dashboardStats.channels.total_messages;
            
            // Ürün ve depolama istatistikleri
            newStats.totalProducts = dashboardStats.products.total;
            newStats.totalFiles = dashboardStats.products.total_files;
            newStats.totalStorageGB = dashboardStats.products.total_storage_gb;
            
            // System stats'ı da yükle (opsiyonel)
            try {
              const sysStats = await systemAPI.getStats();
              setSystemStats(sysStats);
            } catch (err) {
              console.warn('System stats yüklenemedi:', err);
            }
            
          } catch (error) {
            console.error('Dashboard stats yüklenemedi:', error);
            toast.error('İstatistikler yüklenirken hata oluştu');
          }

        } else if (user?.brand_ids && user.brand_ids.length > 0) {
          // DİNAMİK: Brand manager sees their brands only
          newStats.totalBrands = user.brand_ids?.length || 0;
          newStats.totalUsers = 0;

          // Load manager-specific data
          try {
            const brandsResponse = await brandsAPI.getBrands(1, 1000);
            const filteredBrands = brandsResponse.brands.filter((b: any) =>
              user.brand_ids && user.brand_ids.includes(b.id)
            );
            setManagerData({
              brands: filteredBrands,
              employees: []
            });
          } catch (error) {
            console.error('Error loading manager data:', error);
          }

          // Count channels they manage
          newStats.myChannels = channels.filter((c: any) => c.created_by === user.id).length;

        } else {
          // DİNAMİK: Employee sees only assigned channels
          newStats.assignedChannels = channels.length;
          newStats.myChannels = channels.filter((c: any) => c.created_by === user.id).length;
        }

        setStats(newStats);
        
        // Set recent channels (max 5)
        setRecentChannels(channels.slice(0, 5));

      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast.error('Veriler yüklenirken bir hata oluştu');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (user) {
      loadDashboardData();
    }

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.permissions?.length, authLoading]); // sadece ID ve permission count değişince çalışsın

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  // Welcome message based on role
  const welcomeMessage = useMemo(() => {
    if (!user) return '';

    const timeOfDay = new Date().getHours();
    const greeting = timeOfDay < 12 ? 'Günaydın' : timeOfDay < 18 ? 'İyi günler' : 'İyi akşamlar';

    // DİNAMİK: Permission bazlı karşılama mesajı
    if (user?.permissions?.includes('users.manage')) {
      return `${greeting}, ${user.first_name}! Sisteme hoş geldiniz.`;
    } else if (user?.brand_ids && user.brand_ids.length > 0) {
      return `${greeting}, ${user.first_name}! Mağaza yönetimi panelinize hoş geldiniz.`;
    } else {
      return `${greeting}, ${user.first_name}! Çalışma panelinize hoş geldiniz.`;
    }
  }, [user]);

  // Stat Card Component
  const StatCard: React.FC<{
    title: string;
    value: number | string;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    trend?: 'up' | 'down' | 'stable';
    onClick?: () => void;
  }> = ({ title, value, subtitle, icon, color, trend, onClick }) => (
    <div 
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:scale-105 transition-all duration-300 ${onClick ? 'cursor-pointer' : ''} group`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 group-hover:text-gray-700 transition-colors">
            {title}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-3xl font-bold text-gray-900">
              {typeof value === 'number' ? value.toLocaleString('tr-TR') : value}
            </p>
            {trend && (
              <div className={`flex items-center text-xs px-2 py-1 rounded-full ${
                trend === 'up' ? 'bg-green-100 text-green-700' :
                trend === 'down' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {trend === 'up' && <TrendingUp size={12} />}
                {trend === 'down' && <TrendingUp size={12} className="rotate-180" />}
                {trend === 'stable' && '—'}
              </div>
            )}
          </div>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Giriş kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  // DİNAMİK: brand_ids varsa özel dashboard göster
  if (user?.brand_ids && user.brand_ids.length > 0 && !user?.permissions?.includes('users.manage')) {
    return <BrandManagerDashboard />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Welcome Section - Kompakt */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-sm p-4 animate-fade-in">
        <div className="flex items-center gap-4">
          {/* İkon - Küçültülmüş */}
          <div className="hidden md:flex flex-shrink-0">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <BarChart3 size={24} className="text-white" />
            </div>
          </div>
          
          {/* Metin - Kompakt */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white mb-1">{welcomeMessage}</h1>
            <p className="text-sm text-blue-100">
              {user?.permissions?.includes('users.manage') && 'Sistem yönetimi'}
              {user?.permissions?.includes('brands.manage') && 'Marka yönetimi'}
              {!user?.permissions?.includes('users.manage') && !user?.permissions?.includes('brands.manage') && 'Kanal yönetimi'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {user?.permissions?.includes('users.manage') && (
          <>
            <div className="animate-slide-up stagger-1">
              <StatCard
                title="Toplam Admin"
                value={stats.totalAdmins}
                subtitle="sistem yöneticileri"
                icon={<Shield className="h-6 w-6 text-red-600" />}
                color="bg-red-100"
                trend="stable"
                onClick={() => navigate('/admin/users')}
              />
            </div>

            <div className="animate-slide-up stagger-2">
              <StatCard
                title="Mağaza Yöneticileri"
                value={stats.totalManagers}
                subtitle="mağaza yöneticisi sayısı"
                icon={<UserCheck className="h-6 w-6 text-blue-600" />}
                color="bg-blue-100"
                trend="up"
                onClick={() => navigate('/admin/users')}
              />
            </div>

            <div className="animate-slide-up stagger-3">
              <StatCard
                title="Toplam Çalışan"
                value={stats.totalEmployees}
                subtitle="sistem çalışanları"
                icon={<Users className="h-6 w-6 text-purple-600" />}
                color="bg-purple-100"
                trend="up"
                onClick={() => navigate('/admin/users')}
              />
            </div>

            <div className="animate-slide-up stagger-4">
              <StatCard
                title="Toplam Marka"
                value={stats.totalBrands}
                subtitle="kayıtlı markalar"
                icon={<Building2 className="h-6 w-6 text-green-600" />}
                color="bg-green-100"
                trend="stable"
                onClick={() => navigate('/admin/brands')}
              />
            </div>

            <div className="animate-slide-up stagger-6">
              <StatCard
                title="Toplam Kanal"
                value={stats.totalChannels}
                subtitle="Telegram kanalları"
                icon={<MessageCircle className="h-6 w-6 text-cyan-600" />}
                color="bg-cyan-100"
                trend="up"
                onClick={() => navigate('/admin/social-media/channels')}
              />
            </div>

            <div className="animate-slide-up stagger-7">
              <StatCard
                title="Aktif Kanallar"
                value={stats.activeChannels}
                subtitle="mesaj göndermeye hazır"
                icon={<CheckCircle className="h-6 w-6 text-emerald-600" />}
                color="bg-emerald-100"
                trend="stable"
              />
            </div>

            <div className="animate-slide-up stagger-8">
              <StatCard
                title="Bekleyen Talep"
                value={stats.pendingEmployeeRequests}
                subtitle="çalışan talepleri"
                icon={<Clock className="h-6 w-6 text-orange-600" />}
                color="bg-orange-100"
                trend={stats.pendingEmployeeRequests > 0 ? "up" : "stable"}
                onClick={() => navigate('/admin/employee-requests')}
              />
            </div>

            <div className="animate-slide-up stagger-9">
              <StatCard
                title="Toplam Mesaj"
                value={stats.totalMessages}
                subtitle="tüm kanallardaki mesajlar"
                icon={<Activity className="h-6 w-6 text-indigo-600" />}
                color="bg-indigo-100"
                trend="up"
              />
            </div>

            <div className="animate-slide-up stagger-10">
              <StatCard
                title="Toplam Ürün"
                value={stats.totalProducts || 0}
                subtitle="sistemdeki ürünler"
                icon={<Package className="h-6 w-6 text-pink-600" />}
                color="bg-pink-100"
                trend="up"
              />
            </div>

            <div className="animate-slide-up stagger-11">
              <StatCard
                title="Toplam Depolama"
                value={`${stats.totalStorageGB || 0} GB`}
                subtitle={`${stats.totalFiles || 0} dosya`}
                icon={<HardDrive className="h-6 w-6 text-teal-600" />}
                color="bg-teal-100"
                trend="stable"
              />
            </div>
          </>
        )}

        {/* Mağaza Yöneticisi için kartlar - SADECE users.manage yetkisi OLMAYANLARA göster */}
        {user?.permissions?.includes('brands.manage') && !user?.permissions?.includes('users.manage') && (
          <>
            <div className="animate-slide-up stagger-1">
              <StatCard
                title="Kanallarım"
                value={stats.totalChannels}
                subtitle={`${stats.myChannels} kanal ben ekledim`}
                icon={<MessageCircle className="h-6 w-6 text-blue-600" />}
                color="bg-blue-100"
                onClick={() => navigate('/admin/social-media/channels')}
              />
            </div>

            <div className="animate-slide-up stagger-2">
              <StatCard
                title="Aktif Kanallar"
                value={stats.activeChannels}
                subtitle="mesaj göndermeye hazır"
                icon={<CheckCircle className="h-6 w-6 text-green-600" />}
                color="bg-green-100"
              />
            </div>

            <div className="animate-slide-up stagger-3">
              <StatCard
                title="Markalarım"
                value={stats.totalBrands}
                subtitle="yönettiğim markalar"
                icon={<Building2 className="h-6 w-6 text-purple-600" />}
                color="bg-purple-100"
                onClick={() => navigate('/admin/brands')}
              />
            </div>

            <div className="animate-slide-up stagger-4">
              <StatCard
                title="Ekibim"
                value={stats.totalEmployees}
                subtitle="markalarımdaki kullanıcılar"
                icon={<Users className="h-6 w-6 text-orange-600" />}
                color="bg-orange-100"
                onClick={() => navigate('/admin/my-employees')}
              />
            </div>

            <div className="animate-slide-up stagger-5">
              <StatCard
                title="Toplam Mesaj"
                value={stats.totalMessages}
                subtitle="gönderilen mesajlar"
                icon={<Activity className="h-6 w-6 text-indigo-600" />}
                color="bg-indigo-100"
              />
            </div>
          </>
        )}

        {!user?.permissions?.includes('users.manage') && !user?.permissions?.includes('brands.manage') && (
          <>
            <div className="animate-slide-up stagger-1">
              <StatCard
                title="Atanan Kanallar"
                value={stats.assignedChannels ?? 0}
                subtitle="erişebileceğim kanallar"
                icon={<MessageCircle className="h-6 w-6 text-blue-600" />}
                color="bg-blue-100"
                onClick={() => navigate('/admin/social-media/channels')}
              />
            </div>

            <div className="animate-slide-up stagger-2">
              <StatCard
                title="Aktif Kanallar"
                value={stats.activeChannels}
                subtitle="mesaj gönderebilirim"
                icon={<CheckCircle className="h-6 w-6 text-green-600" />}
                color="bg-green-100"
              />
            </div>

            <div className="animate-slide-up stagger-3">
              <StatCard
                title="Toplam Mesaj"
                value={stats.totalMessages}
                subtitle="kanallardaki mesajlar"
                icon={<Activity className="h-6 w-6 text-purple-600" />}
                color="bg-purple-100"
              />
            </div>

            <div className="animate-slide-up stagger-4">
              <StatCard
                title="Eklediğim Kanallar"
                value={stats.myChannels ?? 0}
                subtitle="ben ekledim"
                icon={<Package className="h-6 w-6 text-orange-600" />}
                color="bg-orange-100"
              />
            </div>
          </>
        )}
      </div>

      {/* System Stats - Super Admin Only */}
      {user?.permissions?.includes('users.manage') && systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500 rounded-lg">
                <Cpu size={24} className="text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-600 font-medium">CPU Kullanımı</p>
                <p className="text-2xl font-bold text-blue-900">{systemStats.cpu?.usage_percent?.toFixed(1)}%</p>
              </div>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${systemStats.cpu?.usage_percent}%` }}
              />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-green-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500 rounded-lg">
                <HardDrive size={24} className="text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm text-green-600 font-medium">RAM Kullanımı</p>
                <p className="text-2xl font-bold text-green-900">{systemStats.memory?.usage_percent?.toFixed(1)}%</p>
              </div>
            </div>
            <div className="w-full bg-green-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${systemStats.memory?.usage_percent}%` }}
              />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500 rounded-lg">
                <Monitor size={24} className="text-white" />
              </div>
              <div className="text-right">
                <p className="text-sm text-purple-600 font-medium">Disk Kullanımı</p>
                <p className="text-2xl font-bold text-purple-900">{systemStats.disk?.usage_percent?.toFixed(1)}%</p>
              </div>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${systemStats.disk?.usage_percent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Recent Channels */}
      {recentChannels.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Son Kanallar</h2>
            <button
              onClick={() => navigate('/admin/social-media/channels')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Tümünü Gör →
            </button>
          </div>

          <div className="space-y-4">
            {recentChannels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => navigate(`/admin/social-media/channels/${channel.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    channel.is_active ? 'bg-green-100' : 'bg-gray-200'
                  }`}>
                    <MessageCircle 
                      size={24} 
                      className={channel.is_active ? 'text-green-600' : 'text-gray-400'} 
                    />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{channel.name}</h3>
                    <p className="text-sm text-gray-600">{channel.brand_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Users size={16} />
                    <span>{channel.member_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>
                      {channel.last_activity 
                        ? new Date(channel.last_activity).toLocaleDateString('tr-TR')
                        : 'Yok'
                      }
                    </span>
                  </div>
                  {channel.is_active ? (
                    <CheckCircle size={20} className="text-green-500" />
                  ) : (
                    <AlertCircle size={20} className="text-gray-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manager's Brands & Employees - DİNAMİK: brand_ids varsa göster */}
      {user?.brand_ids && user.brand_ids.length > 0 && managerData.brands.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Brands */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Markalarım</h3>
            <div className="space-y-3">
              {managerData.brands.slice(0, 5).map((brand: any) => (
                <div 
                  key={brand.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => navigate('/admin/brands')}
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{brand.name}</p>
                    <p className="text-sm text-gray-600">{brand.description || 'Açıklama yok'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Employees */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Ekibim</h3>
            <div className="space-y-3">
              {managerData.employees.slice(0, 5).map((employee: any) => (
                <div 
                  key={employee.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => navigate('/admin/my-employees')}
                >
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users size={20} className="text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{employee.first_name} {employee.last_name}</p>
                    <p className="text-sm text-gray-600">{employee.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Hızlı İşlemler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/admin/social-media/channels')}
            className="flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
          >
            <MessageCircle size={24} className="text-blue-600" />
            <div>
              <h3 className="font-medium text-gray-900">Kanallar</h3>
              <p className="text-sm text-gray-600">Kanalları yönet</p>
            </div>
          </button>

          {(user?.permissions?.includes('users.manage') || user?.permissions?.includes('brands.manage')) && (
            <>
              <button
                onClick={() => navigate('/admin/users')}
                className="flex items-center gap-4 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left"
              >
                <Users size={24} className="text-green-600" />
                <div>
                  <h3 className="font-medium text-gray-900">Kullanıcılar</h3>
                  <p className="text-sm text-gray-600">Kullanıcıları yönet</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/admin/brands')}
                className="flex items-center gap-4 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left"
              >
                <Building2 size={24} className="text-purple-600" />
                <div>
                  <h3 className="font-medium text-gray-900">Markalar</h3>
                  <p className="text-sm text-gray-600">Markaları yönet</p>
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
