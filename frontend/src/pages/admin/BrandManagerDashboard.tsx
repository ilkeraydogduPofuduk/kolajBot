import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  Users, Building2, Clock, UserCheck, 
  MessageCircle, Package, Plus,
  Eye, Grid, Image as ImageIcon
} from 'lucide-react';
import { brandsAPI } from '../../api/brands';
import { usersAPI } from '../../api/users';
import { employeeRequestsAPI } from '../../api/employeeRequests';
import { socialMediaChannelsAPI } from '../../api/socialMediaChannels';
import toast from 'react-hot-toast';

interface BrandManagerStats {
  totalBrands: number;
  totalEmployees: number;
  pendingRequests: number;
  totalChannels: number;
  activeChannels: number;
  totalTemplates: number;
  totalProducts: number;
}

interface BrandManagerData {
  brands: any[];
  employees: any[];
  channels: any[];
  recentActivity: any[];
}

const BrandManagerDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<BrandManagerStats>({
    totalBrands: 0,
    totalEmployees: 0,
    pendingRequests: 0,
    totalChannels: 0,
    activeChannels: 0,
    totalTemplates: 0,
    totalProducts: 0
  });
  const [managerData, setManagerData] = useState<BrandManagerData>({
    brands: [],
    employees: [],
    channels: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(false);

  const loadDashboardData = useCallback(async () => {
    if (!user || !user.brand_ids || user.brand_ids.length === 0) return;

    try {
      setLoading(true);
      
      // Paralel olarak tüm verileri yükle
      const [brandsResponse, usersResponse, requestsResponse, channelsResponse] = await Promise.allSettled([
        brandsAPI.getBrands(1, 1000),
        usersAPI.getUsers(1, 1000),
        employeeRequestsAPI.getEmployeeRequests(1, 1000, 'pending'),
        socialMediaChannelsAPI.getChannels(1, 1000)
      ]);

      const newStats: BrandManagerStats = {
        totalBrands: 0,
        totalEmployees: 0,
        pendingRequests: 0,
        totalChannels: 0,
        activeChannels: 0,
        totalTemplates: 0,
        totalProducts: 0
      };

      const newManagerData: BrandManagerData = {
        brands: [],
        employees: [],
        channels: [],
        recentActivity: []
      };

      // Markalar
      if (brandsResponse.status === 'fulfilled') {
        const myBrands = brandsResponse.value.brands.filter((brand: any) => 
          user.brand_ids?.includes(brand.id)
        );
        newStats.totalBrands = myBrands.length;
        newManagerData.brands = myBrands;
      }

      // Kullanıcılar
      if (usersResponse.status === 'fulfilled') {
        const myEmployees = usersResponse.value.users.filter((u: any) =>
          u.brand_ids?.some((bid: number) => user.brand_ids?.includes(bid)) &&
          u.role !== 'Mağaza Yöneticisi'
        );
        newStats.totalEmployees = myEmployees.length;
        newManagerData.employees = myEmployees;
      }

      // Çalışan talepleri
      if (requestsResponse.status === 'fulfilled') {
        newStats.pendingRequests = requestsResponse.value.total;
      }

      // Kanallar
      if (channelsResponse.status === 'fulfilled') {
        const myChannels = channelsResponse.value.channels.filter((channel: any) =>
          user.brand_ids?.includes(channel.brand_id)
        );
        newStats.totalChannels = myChannels.length;
        newStats.activeChannels = myChannels.filter((c: any) => c.is_active).length;
        newManagerData.channels = myChannels;
      }

      setStats(newStats);
      setManagerData(newManagerData);

    } catch (error) {
      console.error('Dashboard verileri yüklenirken hata:', error);
      toast.error('Dashboard verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    loadDashboardData();
  }, [authLoading, user, loadDashboardData]);

  const getWelcomeMessage = () => {
    const timeOfDay = new Date().getHours();
    const greeting = timeOfDay < 12 ? 'Günaydın' : timeOfDay < 18 ? 'İyi günler' : 'İyi akşamlar';
    return `${greeting}, ${user?.first_name}! Mağaza yönetimi panelinize hoş geldiniz.`;
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{getWelcomeMessage()}</h1>
            <p className="text-blue-100">
              Markalarınızı, ekibinizi ve kanallarınızı yönetebilirsiniz.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Building2 size={32} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Markalarım</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalBrands}</p>
            </div>
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building2 size={28} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Ekibim</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalEmployees}</p>
            </div>
            <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
              <Users size={28} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Kanallarım</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalChannels}</p>
              <p className="text-sm text-gray-500 mt-1">{stats.activeChannels} aktif</p>
            </div>
            <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
              <MessageCircle size={28} className="text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Bekleyen Talepler</p>
              <p className="text-3xl font-bold text-gray-900">{stats.pendingRequests}</p>
            </div>
            <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center">
              <Clock size={28} className="text-orange-600" />
            </div>
          </div>
        </div>

      </div>

      {/* Brands and Employees */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Brands */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Markalarım</h3>
            <button
              onClick={() => navigate('/admin/brands')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Tümünü Gör
            </button>
          </div>
          <div className="space-y-4">
            {managerData.brands.slice(0, 5).map((brand: any) => (
              <div 
                key={brand.id}
                className="flex items-center gap-4 p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => navigate(`/admin/brands/${brand.id}`)}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 size={28} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{brand.name}</p>
                  <p className="text-sm text-gray-600">{brand.description || 'Açıklama yok'}</p>
                </div>
                <Eye size={18} className="text-gray-400" />
              </div>
            ))}
            {managerData.brands.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Building2 size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="text-lg">Henüz marka atanmamış</p>
              </div>
            )}
          </div>
        </div>

        {/* Employees */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Ekibim</h3>
            <button
              onClick={() => navigate('/admin/my-employees')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Tümünü Gör
            </button>
          </div>
          <div className="space-y-4">
            {managerData.employees.slice(0, 5).map((employee: any) => (
              <div 
                key={employee.id}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => navigate('/admin/my-employees')}
              >
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Users size={24} className="text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{employee.first_name} {employee.last_name}</p>
                  <p className="text-sm text-gray-600">{employee.email}</p>
                </div>
                <div className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                  {employee.role}
                </div>
              </div>
            ))}
            {managerData.employees.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="text-lg">Henüz çalışan atanmamış</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Channels */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Sosyal Medya Kanallarım</h3>
          <button
            onClick={() => navigate('/admin/social-media/channels')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Tümünü Gör
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {managerData.channels.slice(0, 6).map((channel: any) => (
            <div 
              key={channel.id}
              className="p-6 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => navigate(`/admin/social-media/channels/${channel.id}`)}
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <MessageCircle size={28} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{channel.name}</p>
                  <p className="text-sm text-gray-600">{channel.platform}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${channel.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              <p className="text-sm text-gray-500">{channel.description || 'Açıklama yok'}</p>
            </div>
          ))}
          {managerData.channels.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              <MessageCircle size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-lg">Henüz kanal oluşturulmamış</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Hızlı İşlemler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/admin/social-media/channels')}
            className="flex items-center gap-4 p-6 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors text-left"
          >
            <MessageCircle size={28} className="text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Kanallar</h3>
              <p className="text-sm text-gray-600">Sosyal medya kanallarını yönet</p>
            </div>
          </button>


          <button
            onClick={() => navigate('/admin/employee-requests')}
            className="flex items-center gap-4 p-6 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors text-left"
          >
            <UserCheck size={28} className="text-orange-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Çalışan Talepleri</h3>
              <p className="text-sm text-gray-600">Bekleyen talepleri görüntüle</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/templates/create')}
            className="flex items-center gap-4 p-6 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors text-left"
          >
            <Plus size={28} className="text-purple-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Şablon Oluştur</h3>
              <p className="text-sm text-gray-600">Yeni şablon oluştur</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/media-gallery')}
            className="flex items-center gap-4 p-6 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors text-left"
          >
            <Package size={28} className="text-indigo-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Ürünler</h3>
              <p className="text-sm text-gray-600">Ürün galerisini yönet</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/collages')}
            className="flex items-center gap-4 p-6 bg-pink-50 hover:bg-pink-100 rounded-xl transition-colors text-left"
          >
            <Grid size={28} className="text-pink-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Kolajlar</h3>
              <p className="text-sm text-gray-600">Kolaj oluştur ve yönet</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/templates/gallery')}
            className="flex items-center gap-4 p-6 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors text-left"
          >
            <ImageIcon size={28} className="text-teal-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Şablon Galerisi</h3>
              <p className="text-sm text-gray-600">Şablonları görüntüle</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/brands')}
            className="flex items-center gap-4 p-6 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
          >
            <Building2 size={28} className="text-gray-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Markalar</h3>
              <p className="text-sm text-gray-600">Marka bilgilerini görüntüle</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrandManagerDashboard;
