import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { socialMediaChannelsAPI, SocialMediaChannel } from '../../api/socialMediaChannels';
import { telegramBotsAPI } from '../../api/telegramBots';
import { 
  MessageCircle, 
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
  RefreshCw,
  Bot,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const SocialMediaChannelsOptimized: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [channels, setChannels] = useState<SocialMediaChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [bots, setBots] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [discoverLoading, setDiscoverLoading] = useState(false);
  
  // Use brand_ids[0] only
  const userBrandId = user?.brand_ids?.[0] || null;

  const fetchChannels = useCallback(async ({ page, perPage, search, status }: { page: number; perPage: number; search: string; status: string }) => {
    const params = {
      page,
      per_page: perPage,
      search,
      ...(userBrandId && { brand_id: userBrandId }),
      ...(status !== 'all' && { is_active: status === 'active' })
    };
    const response = await socialMediaChannelsAPI.getChannels(params.page, params.per_page, 'telegram', params.brand_id, params.search);
    return {
      data: response.channels,
      total: response.total,
      totalPages: response.total_pages
    };
  }, [userBrandId]);

  const loadChannels = useCallback(async (page = 1, search = '', status = 'all') => {
    setChannelsLoading(true);
    try {
      const { data, total, totalPages } = await fetchChannels({ page, perPage: pageSize, search, status });
      setChannels(data);
      setTotalPages(totalPages || Math.ceil(total / pageSize));
    } catch (error: any) {
      toast.error(String(error.response?.data?.detail || 'Kanallar yüklenemedi'));
    } finally {
      setChannelsLoading(false);
    }
  }, [fetchChannels, pageSize]);

  const loadBots = useCallback(async () => {
    try {
      const response = await telegramBotsAPI.getBots();
      const userBots = response.bots.filter((b: any) => b.brand_id === userBrandId);
      setBots(userBots);
    } catch (error) {
      console.error('Bots load error');
    }
  }, [userBrandId]);

  const handleDiscoverChannels = async () => {
    if (bots.length === 0) {
      toast.error('Önce bot ekleyin');
      return;
    }

    setDiscoverLoading(true);
    let totalDiscovered = 0;
    const promises = bots.map(async (bot: any) => {
      try {
        const response = await telegramBotsAPI.discoverChannelsForBot(bot.id);
        if (response.success) {
          totalDiscovered += response.discovered_count || 0;
          toast.success(`Bot ${bot.bot_name}: ${response.discovered_count} kanal eklendi`);
        }
      } catch (error: any) {
        toast.error(String(error.response?.data?.detail || 'Keşif hatası oluştu'));
      }
    });

    try {
      await Promise.all(promises);
      toast.success(`Toplam ${totalDiscovered} kanal keşfedildi!`);
      loadChannels(currentPage, searchTerm, statusFilter);
    } catch (error) {
      toast.error('Keşif tamamlanamadı');
    } finally {
      setDiscoverLoading(false);
    }
  };

  const handleToggleStatus = async (channelId: number, currentStatus: boolean) => {
    try {
      await socialMediaChannelsAPI.toggleChannelStatus(channelId);
      toast.success('Kanal durumu güncellendi');
      loadChannels(currentPage, searchTerm, statusFilter);
    } catch (error: any) {
      toast.error(String(error.response?.data?.detail || 'Durum güncellenemedi'));
    }
  };

  const handleDelete = async (channelId: number) => {
    if (!window.confirm('Bu kanalı silmek istediğinizden emin misiniz?')) return;
    try {
      await socialMediaChannelsAPI.deleteChannel(channelId);
      toast.success('Kanal silindi');
      loadChannels(currentPage, searchTerm, statusFilter);
    } catch (error: any) {
      toast.error(String(error.response?.data?.detail || 'Kanal silinemedi'));
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      loadChannels(newPage, searchTerm, statusFilter);
    }
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    loadChannels(1, searchTerm, value);
  };

  const handleSearch = () => {
    loadChannels(1, searchTerm, statusFilter);
  };

  useEffect(() => {
    if (user) {
      loadBots();
      loadChannels(1, '', 'all');
    }
  }, [user, loadChannels, loadBots]);

  if (authLoading) {
    return <div className="p-6">Yükleniyor...</div>;
  }

  if (!user) {
    return <div className="p-6">Giriş yapın</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Telegram Kanalları</h1>
          <p className="text-gray-600 mt-1">Bot'larınıza bağlı kanallar</p>
        </div>
        {bots.length > 0 && (
          <button
            onClick={handleDiscoverChannels}
            disabled={discoverLoading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {discoverLoading ? (
              <RefreshCw className="animate-spin h-4 w-4" />
            ) : (
              <Bot size={20} />
            )}
            Kanalları Keşfet
          </button>
        )}
        {channels.length === 0 && bots.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Henüz bot eklenmemiş. Bot ekleyin ki kanallar otomatik keşfedilsin.</p>
            <button
              onClick={() => navigate('/admin/telegram/bots')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Bot Ekle
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Kanal ara..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="inactive">Pasif</option>
        </select>

        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Ara
        </button>
      </div>

      {channelsLoading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="animate-spin h-8 w-8 text-gray-500" />
        </div>
      ) : channels.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kanal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Üye Sayısı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Son Post</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {channels.map((channel) => (
                <tr key={channel.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img className="h-10 w-10 rounded-full" src={channel.avatar_url || '/default-channel.png'} alt="" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{channel.name}</div>
                        <div className="text-sm text-gray-500">{channel.channel_username || channel.channel_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{channel.platform}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{channel.member_count?.toLocaleString() || '0'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      channel.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {channel.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {channel.last_post_at ? new Date(channel.last_post_at).toLocaleDateString() : 'Hiç'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/admin/channels/${channel.id}`)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Detay
                      </button>
                      <button
                        onClick={() => handleToggleStatus(channel.id, channel.is_active)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        {channel.is_active ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                      </button>
                      <button
                        onClick={() => handleDelete(channel.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Henüz kanal yok</h3>
          <p className="mt-1 text-sm text-gray-500">
            Bot ekleyin ve kanalları keşfedin.
          </p>
          <div className="mt-6">
            <button
              onClick={handleDiscoverChannels}
              disabled={discoverLoading || bots.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {discoverLoading ? <RefreshCw className="animate-spin mr-2 h-4 w-4" /> : <Bot className="mr-2 h-4 w-4" />}
              Keşfet
            </button>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 border rounded-lg disabled:opacity-50"
          >
            Önceki
          </button>
          <span className="px-3 py-2">{currentPage} / {totalPages}</span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border rounded-lg disabled:opacity-50"
          >
            Sonraki
          </button>
        </div>
      )}
    </div>
  );
};

export default SocialMediaChannelsOptimized;

