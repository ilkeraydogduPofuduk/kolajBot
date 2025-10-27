import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { telegramBotsAPI, TelegramBot, TelegramBotCreate, BotDeleteInfoResponse } from '../../api/telegramBots';
import { Plus, Trash2, CheckCircle, XCircle, RefreshCw, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const TelegramBots: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState<BotDeleteInfoResponse | null>(null);
  const [showTokens, setShowTokens] = useState<Record<number, boolean>>({});
  const [formData, setFormData] = useState<TelegramBotCreate>({
    bot_token: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      setLoading(true);
      const response = await telegramBotsAPI.getBots();
      setBots(response.bots);
    } catch (error: any) {
      console.error('Bot listesi yüklenirken hata:', error);
      toast.error(error.response?.data?.detail || 'Bot listesi yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bot_token || formData.bot_token.trim() === '') {
      toast.error('Lütfen bot token girin');
      return;
    }

    setSubmitting(true);
    try {
      console.log('Sending bot data:', formData);
      const response = await telegramBotsAPI.createBot(formData);
      console.log('Bot creation response:', response);
      toast.success(`Bot başarıyla eklendi! ${response.discovered_channels_count || 0} kanal otomatik keşfedildi ve eklendi.`);
      setShowModal(false);
      setFormData({ bot_token: '' });
      loadBots();
    } catch (error: any) {
      console.error('Bot eklenirken hata:', error);
      console.error('Error detail:', error.response?.data);
      toast.error(String(error.response?.data?.detail || 'Bot eklenemedi'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (botId: number) => {
    try {
      const info = await telegramBotsAPI.getBotDeleteInfo(botId);
      setDeleteInfo(info);
      setShowDeleteModal(true);
    } catch (error: any) {
      toast.error('Bot bilgileri alınamadı');
    }
  };

  const confirmDelete = async () => {
    if (!deleteInfo) return;

    setDeleting(true);
    try {
      await telegramBotsAPI.deleteBot(deleteInfo.bot_id);
      toast.success(`Bot ve ${deleteInfo.channel_count} kanal silindi`);
      setShowDeleteModal(false);
      setDeleteInfo(null);
      loadBots();
    } catch (error: any) {
      toast.error('Bot silinemedi');
    } finally {
      setDeleting(false);
    }
  };

  const toggleTokenVisibility = (botId: number) => {
    setShowTokens(prev => ({
      ...prev,
      botId: !prev[botId]
    }));
  };

  if (loading) {
    return <div className="p-6">Yükleniyor...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Telegram Botları</h1>
          <p className="text-sm text-gray-600 mt-1">Telegram bot token'larını yönetin</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Bot Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Toplam Bot</div>
          <div className="text-2xl font-bold text-gray-900">{bots.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Aktif Bot</div>
          <div className="text-2xl font-bold text-green-600">
            {bots.filter(b => b.is_active).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Toplam Kanal</div>
          <div className="text-2xl font-bold text-blue-600">
            {bots.reduce((sum, b) => sum + (b.channel_count || 0), 0)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bot Adı</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı Adı</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Son Doğrulama</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bots.map((bot) => (
              <tr 
                key={bot.id} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/admin/telegram/bots/${bot.id}`)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{bot.bot_name}</div>
                  <div className="text-xs text-gray-500">{bot.channel_count || 0} kanal</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">@{bot.bot_username}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    bot.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {bot.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {bot.last_verified_at ? new Date(bot.last_verified_at).toLocaleDateString() : 'Doğrulanmadı'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTokenVisibility(bot.id);
                      }}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      {showTokens[bot.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(bot.id);
                      }}
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Bot Ekle</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bot Token *
                </label>
                <input
                  type="password"
                  value={formData.bot_token}
                  onChange={(e) => setFormData({ bot_token: e.target.value })}
                  placeholder="BotFather'dan aldığınız token"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Ekleniyor...' : 'Bot Ekle'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Bot Silme Onayı</h2>
            </div>

            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="text-sm text-red-800">
                  <strong>{deleteInfo.bot_name}</strong> ({deleteInfo.bot_username}) botunu silmek istediğinizden emin misiniz?
                </div>
              </div>

              <div className="text-sm text-gray-700 mb-4">
                {deleteInfo.warning_message}
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm">
                  <strong>Silinecek öğeler:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Bot: {deleteInfo.bot_name} (@{deleteInfo.bot_username})</li>
                    {deleteInfo.channel_count > 0 && (
                      <li>{deleteInfo.channel_count} adet kanal ve tüm verileri</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteInfo(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={deleting}
              >
                İptal
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelegramBots;

