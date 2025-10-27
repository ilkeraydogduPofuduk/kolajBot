import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { socialMediaChannelsAPI, SocialMediaChannel, ChannelStatistics } from '../../api/socialMediaChannels';
import { brandsAPI } from '../../api/brands';
import DynamicChannelModal from '../../components/modals/DynamicChannelModal';
import { 
  MessageCircle, 
  Plus, 
  Edit, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  Phone,
  Send,
  Users,
  Activity,
  MoreVertical,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

const SocialMediaChannels: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [channels, setChannels] = useState<SocialMediaChannel[]>([]);
  const [statistics, setStatistics] = useState<ChannelStatistics | null>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<SocialMediaChannel | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'telegram' | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [brandFilter, setBrandFilter] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 12;

  // Define functions first
  const loadChannels = useCallback(async () => {
    try {
      setLoading(true);
      const response = await socialMediaChannelsAPI.getChannels(
        currentPage,
        perPage,
        undefined, // platform filter removed
        brandFilter || undefined,
        debouncedSearchTerm || undefined
      );
      
      // Apply status filter on frontend since backend doesn't support it yet
      let filteredChannels = response.channels;
      if (statusFilter !== 'all') {
        filteredChannels = response.channels.filter(channel => {
          if (statusFilter === 'active') return channel.is_active;
          if (statusFilter === 'inactive') return !channel.is_active;
          return true;
        });
      }
      
      setChannels(filteredChannels);
      setTotalPages(response.total_pages);
    } catch (error) {
      toast.error('Kanallar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPage, brandFilter, debouncedSearchTerm, statusFilter]);

  const loadStatistics = useCallback(async () => {
    try {
      const stats = await socialMediaChannelsAPI.getStatistics();
      setStatistics(stats);
    } catch (error) {
      // Silently handle error - statistics are not critical
    }
  }, []);

  const loadBrands = useCallback(async () => {
    try {
      const response = await brandsAPI.getBrands(1, 1000);
      
      // DİNAMİK: brand_ids varsa filtrele
      if (user?.brand_ids && user.brand_ids.length > 0 && !user?.permissions?.includes('brands.manage')) {
        const filteredBrands = response.brands.filter(b => 
          user.brand_ids.includes(b.id)
        );
        setBrands(filteredBrands);
      } else {
        setBrands(response.brands);
      }
    } catch (error) {
      // Silently handle error - brands are not critical for basic functionality
    }
  }, [user?.brand_ids, user?.permissions]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load data when filters change
  useEffect(() => {
    loadChannels();
    loadStatistics();
    loadBrands();
  }, [loadChannels, loadStatistics, loadBrands, currentPage, debouncedSearchTerm, brandFilter, statusFilter]);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadChannels();
      loadStatistics();
      setLastRefresh(new Date());
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, loadChannels, loadStatistics]);

  const handleToggleChannel = async (channelId: number, isActive: boolean) => {
    try {
      const result = await socialMediaChannelsAPI.toggleChannelStatus(channelId);
      
      setChannels(prev => prev.map(channel => 
        channel.id === channelId 
          ? { ...channel, is_active: result.is_active }
          : channel
      ));
      
      // Update statistics
      if (statistics) {
        setStatistics(prev => prev ? {
          ...prev,
          active_channels: result.is_active 
            ? prev.active_channels + 1 
            : prev.active_channels - 1
        } : null);
      }
      
      toast.success(result.message);
      
      // Reload to ensure consistency
      await loadChannels();
    } catch (error) {
      toast.error('Kanal durumu değiştirilemedi');
    }
  };

  const handleDeleteChannel = async (channelId: number) => {
    if (window.confirm('Bu kanalı silmek istediğinizden emin misiniz?')) {
      try {
        await socialMediaChannelsAPI.deleteChannel(channelId);
        setChannels(prev => prev.filter(channel => channel.id !== channelId));
        
        // Update statistics
        if (statistics) {
          const deletedChannel = channels.find(c => c.id === channelId);
          if (deletedChannel) {
            setStatistics(prev => prev ? {
              ...prev,
              total_channels: prev.total_channels - 1,
              telegram_channels: deletedChannel.platform === 'telegram' 
                ? prev.telegram_channels - 1 
                : prev.telegram_channels,
              active_channels: deletedChannel.is_active 
                ? prev.active_channels - 1 
                : prev.active_channels,
              total_members: prev.total_members - deletedChannel.member_count
            } : null);
          }
        }
        
        toast.success('Kanal silindi');
        
        // Reload from backend to ensure data consistency
        await loadChannels();
        await loadStatistics();
      } catch (error) {
        toast.error('Kanal silinemedi');
      }
    }
  };

  const handleRefreshChannelInfo = async (channelId: number) => {
    try {
      toast.loading('Kanal bilgileri güncelleniyor...', { id: `refresh-${channelId}` });
      
      const updatedChannel = await socialMediaChannelsAPI.refreshChannelInfo(channelId);
      
      // Update the channel in the list
      setChannels(prev => prev.map(c => 
        c.id === channelId ? { ...c, 
          name: updatedChannel.name,
          type: updatedChannel.type,
          member_count: updatedChannel.member_count
        } : c
      ));
      
      // Update statistics if needed
      if (statistics) {
        const oldChannel = channels.find(c => c.id === channelId);
        if (oldChannel) {
          setStatistics(prev => prev ? {
            ...prev,
            total_members: prev.total_members - (oldChannel.member_count || 0) + (updatedChannel.member_count || 0)
          } : null);
        }
      }
      
      toast.dismiss(`refresh-${channelId}`);
      toast.success('✅ Kanal bilgileri başarıyla güncellendi!');
      
      // Full reload to ensure consistency
      await loadChannels();
      await loadStatistics();
    } catch (e: any) {
      toast.dismiss(`refresh-${channelId}`);
      const message = e?.response?.data?.detail || 'Kanal bilgileri güncellenemedi';
      toast.error(`❌ ${message}`);
    }
  };

  const handleTestHealth = async (channelId: number) => {
    try {
      toast.loading('Bağlantı test ediliyor...', { id: `test-${channelId}` });

      // Sadece bot token'ı ve kanal ID'sinin doğruluğunu test et
      const res = await socialMediaChannelsAPI.testHealth(channelId);
      const status = res.connection_status;
      const messageSent = res.test_message_sent;
      const errorMsg = res.test_message_error;
      
      toast.dismiss(`test-${channelId}`);
      
      if (status === 'connected') {
        if (messageSent) {
          toast.success('✅ Kanal bağlantısı başarılı ve test mesajı gönderildi!');
        } else {
          toast.success('✅ Bağlantı başarılı! (Not: Mesaj gönderme yetkisi sohbet türüne göre değişir)');
        }
      } else if (status === 'disconnected') {
        toast('⚠️ Kanal bağlantısı başarısız - Token veya kanal ID\'si hatalı olabilir', { 
          icon: '⚠️',
          duration: 5000 
        });
      } else {
        toast.error('❌ Bağlantı testi sırasında hata oluştu');
      }
    } catch (e: any) {
      toast.dismiss(`test-${channelId}`);
      const message = e?.response?.data?.detail || 'Kanal bağlantısı testi başarısız';
      toast.error(`❌ ${message}`);
    }
  };

  

  const handleEditChannel = (channel: SocialMediaChannel) => {
    setEditingChannel(channel);
    setSelectedPlatform(channel.platform as 'telegram');  // Cast to union type
    setShowModal(true);
  };

  const handleAddChannel = (platform: 'telegram') => {
    setEditingChannel(null);
    setSelectedPlatform(platform);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingChannel(null);
    setSelectedPlatform(null);
  };

  const handleModalSuccess = () => {
    setCurrentPage(1); // Reset to first page
    loadChannels();
    loadStatistics();
  };

  // Rol tabanlı izin kontrolleri
  const isAdmin = user?.permissions?.includes('social.manage');
  const hasBrandAccess = (brandId: number) => {
    return user?.brand_ids?.includes(brandId) || isAdmin;
  };
  const isAssignedToChannel = (channel: SocialMediaChannel) => {
    return channel.assigned_user_ids?.includes(user?.id || 0);
  };
  const canManageChannel = (channel: SocialMediaChannel) => {
    return isAdmin || hasBrandAccess(channel.brand_id || 0);
  };
  const canViewChannel = (channel: SocialMediaChannel) => {
    return canManageChannel(channel) || isAssignedToChannel(channel);
  };

  const getPlatformIcon = (platform: string) => {
    return Send;
  };

  const getPlatformColor = (platform: string) => {
    return 'blue';
  };

  const getTypeLabel = (type: string) => {
    return type === 'group' ? 'Grup' : 'Kanal';
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Aktif
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="w-3 h-3 mr-1" />
        Pasif
      </span>
    );
  };

  // Show loading while authentication is being checked
  if (authLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated (but only after loading is done)
  if (!authLoading && !user) {
    navigate('/login');
    return null;
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sosyal Medya Kanalları</h1>
            <p className="text-gray-600 mt-1">Sosyal medya kanallarınızı yönetin</p>
            {autoRefresh && (
              <p className="text-xs text-green-600 mt-1">
                🔄 Otomatik yenileme aktif • Son: {lastRefresh.toLocaleTimeString('tr-TR')}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                autoRefresh
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Otomatik yenileme (30 saniye)"
            >
              <RefreshCw size={16} className={autoRefresh ? 'animate-spin' : ''} />
              {autoRefresh ? 'Auto ON' : 'Auto OFF'}
            </button>
            {isAdmin && (
              <button
                onClick={() => handleAddChannel('telegram')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Send size={16} />
                Telegram Kanalı Ekle
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Arama</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Kanal adı ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marka</label>
            <select
              value={brandFilter || ''}
              onChange={(e) => setBrandFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tüm Markalar</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setDebouncedSearchTerm('');
                setStatusFilter('all');
                setBrandFilter(null);
                setCurrentPage(1);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Filter size={16} />
              Temizle
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Toplam</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statistics.total_channels}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Telegram</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statistics.telegram_channels}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aktif</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statistics.active_channels}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Toplam Üye</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statistics.total_members.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channels.map((channel) => {
          const PlatformIcon = getPlatformIcon(channel.platform);
          const platformColor = getPlatformColor(channel.platform);
          
          return (
            <div key={channel.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${!channel.is_active ? 'opacity-75' : ''}`}>
              {/* Header */}
              <div 
                className="flex items-start justify-between mb-4 cursor-pointer"
                onClick={() => navigate(`/admin/social-media/channels/${channel.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${platformColor}-100`}>
                    <PlatformIcon className={`h-5 w-5 text-${platformColor}-600`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{channel.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">
                      {channel.platform} • {getTypeLabel(channel.type)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(channel.is_active)}
                  {!channel.is_active && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Mesaj Gönderimi Kapalı
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Üye Sayısı</p>
                  <p className="font-semibold text-gray-900">{channel.member_count.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Son Aktivite</p>
                  <p className="font-semibold text-gray-900">
                    {channel.last_activity ? new Date(channel.last_activity).toLocaleDateString('tr-TR') : 'Hiç'}
                  </p>
                </div>
              </div>
              
              {/* Channel Details */}
              <div className="grid grid-cols-1 gap-3 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Kanal ID / Adı</p>
                  <p className="font-medium text-gray-900 text-sm">{channel.channel_id} {!channel.name.includes('@') && channel.name !== channel.channel_id ? `(${channel.name})` : ''}</p>
                </div>
                {channel.platform === 'telegram' && (
                  <div>
                    <p className="text-sm text-gray-500">Tip</p>
                    <p className="font-medium text-gray-900 text-sm capitalize">{getTypeLabel(channel.type)}</p>
                  </div>
                )}
                {(channel.platform === 'telegram' && channel.bot_token) && (
                  <div>
                    <p className="text-sm text-gray-500">Token</p>
                    <p className="font-medium text-gray-900 text-sm">...{channel.bot_token?.slice(-4) || 'N/A'}</p>
                  </div>
                )}
                {/* WhatsApp alanları kaldırıldı */}
              </div>
              
              {/* Brand Info */}
              <div className="mb-4">
                <p className="text-sm text-gray-500">Marka</p>
                <p className="font-semibold text-gray-900">
                  {brands.find(b => b.id === channel.brand_id)?.name || 'Bilinmiyor'}
                </p>
              </div>

              {/* Actions */}
              {canManageChannel(channel) && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleToggleChannel(channel.id, channel.is_active)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      channel.is_active
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {channel.is_active ? (
                      <>
                        <ToggleLeft size={16} />
                        Pasif Et
                      </>
                    ) : (
                      <>
                        <ToggleRight size={16} />
                        Aktif Et
                      </>
                    )}
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRefreshChannelInfo(channel.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Kanal Bilgilerini Güncelle"
                    >
                      <RefreshCw size={16} className="text-green-600" />
                    </button>
                  </div>
                </div>
              )}

              {/* Çalışanlar için sadece görüntüleme mesajı */}
              {!canManageChannel(channel) && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 text-center">Bu kanal size atanmış - sadece görüntüleme yetkiniz var</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Önceki
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 text-sm font-medium rounded-lg ${
                  page === currentPage
                    ? 'text-white bg-blue-600 border border-blue-600'
                    : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {channels.length === 0 && (
        <div className="text-center py-12">
          <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz kanal eklenmemiş</h3>
          <p className="mt-1 text-sm text-gray-500">
            Telegram kanalı ekleyerek başlayın.
          </p>
          {isAdmin && (
            <div className="mt-6 flex justify-center gap-3">
              {/* WhatsApp ekleme kaldırıldı */}
              <button
                onClick={() => handleAddChannel('telegram')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Send size={16} />
                Telegram Kanalı Ekle
              </button>
            </div>
          )}
          {!isAdmin && (
            <p className="mt-4 text-sm text-gray-500">
              Kanal eklemek için admin yetkisine sahip olmanız gerekir.
            </p>
          )}
        </div>
      )}

      {/* Channel Modal */}
      <DynamicChannelModal
        isOpen={showModal}
        onClose={handleModalClose}
        platform={selectedPlatform}
        onSuccess={handleModalSuccess}
        editingChannel={editingChannel}
      />
    </div>
  );
};

export default SocialMediaChannels;
