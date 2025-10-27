import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { telegramBotsAPI, TelegramBot, BotChannelListResponse } from '../../api/telegramBots';
import { ArrowLeft, RefreshCw, Users, Hash } from 'lucide-react';
import toast from 'react-hot-toast';

const TelegramBotDetail: React.FC = () => {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const [bot, setBot] = useState<TelegramBot | null>(null);
  const [channels, setChannels] = useState<BotChannelListResponse['channels']>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (botId) {
      loadBotData();
    }
  }, [botId]);

  const loadBotData = async () => {
    try {
      setLoading(true);
      const [botData, channelsData] = await Promise.all([
        telegramBotsAPI.getBot(Number(botId)),
        telegramBotsAPI.getBotChannels(Number(botId))
      ]);
      setBot(botData);
      setChannels(channelsData.channels);
    } catch (error: any) {
      console.error('Bot detayları yüklenirken hata:', error);
      toast.error('Bot detayları yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscoverChannels = async () => {
    try {
      const response = await telegramBotsAPI.discoverChannelsForBot(Number(botId));
      toast.success(response.message || 'Kanallar keşfedildi');
      loadBotData(); // Refresh
    } catch (error: any) {
      toast.error(String(error.response?.data?.detail || 'Keşif başarısız'));
    }
  };

  if (loading) {
    return <div className="p-6">Yükleniyor...</div>;
  }

  if (!bot) {
    return <div className="p-6">Bot bulunamadı</div>;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/telegram/bots')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{bot.bot_name}</h1>
            <p className="text-sm text-gray-600">@{bot.bot_username}</p>
          </div>
        </div>
        <button
          onClick={handleDiscoverChannels}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw size={18} />
          Kanalları Keşfet
        </button>
      </div>

      {/* Bot Info Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Durum</div>
            <div className={`font-semibold ${bot.is_active ? 'text-green-600' : 'text-red-600'}`}>
              {bot.is_active ? 'Aktif' : 'Pasif'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Doğrulama</div>
            <div className={`font-semibold ${bot.is_verified ? 'text-green-600' : 'text-yellow-600'}`}>
              {bot.is_verified ? 'Doğrulandı' : 'Doğrulanmadı'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Toplam Kanal</div>
            <div className="font-semibold text-gray-900">{channels.length}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Ekleyen</div>
            <div className="font-semibold text-gray-900">{bot.creator_name || 'Bilinmiyor'}</div>
          </div>
        </div>
      </div>

      {/* Channels List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Bot Kanalları ({channels.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kanal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marka</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Üye Sayısı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Atanan Kullanıcılar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {channels.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Henüz kanal keşfedilmedi. "Kanalları Keşfet" butonuna tıklayın.
                  </td>
                </tr>
              ) : (
                channels.map((channel) => (
                  <tr key={channel.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{channel.name}</div>
                        {channel.channel_username && (
                          <div className="text-sm text-gray-500">@{channel.channel_username}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {channel.brand_name ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {channel.brand_name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">Atanmadı</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-700">
                        <Users size={16} />
                        <span>{channel.member_count}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {channel.assigned_users.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {channel.assigned_users.map((user) => (
                            <span
                              key={user.id}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {user.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          channel.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {channel.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TelegramBotDetail;

