import React, { useState, useEffect } from 'react';
import { X, Send, AlertCircle, Bot, Hash, RefreshCw, Download, CheckCircle, XCircle } from 'lucide-react';
import { socialMediaChannelsAPI } from '../../api/socialMediaChannels';
import { brandsAPI } from '../../api/brands';
import { telegramBotsAPI, TelegramBot } from '../../api/telegramBots';
import toast from 'react-hot-toast';

interface ChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: 'telegram' | null;
  onSuccess: () => void;
  editingChannel?: any;
}

const DynamicChannelModal: React.FC<ChannelModalProps> = ({
  isOpen,
  onClose,
  platform,
  onSuccess,
  editingChannel
}) => {
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<number | null>(null);
  const [channelInput, setChannelInput] = useState('');  // Textarea
  const [selectedBrandId, setSelectedBrandId] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [loadingBots, setLoadingBots] = useState(false);
  const [selectedBot, setSelectedBot] = useState<TelegramBot | null>(null);
  const [bulkResult, setBulkResult] = useState<any>(null);  // Bulk response
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (isOpen && platform) {
      loadBots();
      loadBrands();
      setChannelInput('');
      setBulkResult(null);
      setShowInstructions(false);
    }
  }, [isOpen, platform]);

  const loadBots = async () => {
    try {
      setLoadingBots(true);
      const response = await telegramBotsAPI.getBots();
      setBots(response.bots.filter(bot => bot.is_active));
    } catch (error) {
      toast.error('Botlar yüklenemedi');
    } finally {
      setLoadingBots(false);
    }
  };

  const loadBrands = async () => {
    try {
      const response = await brandsAPI.getBrands(1, 1000);
      setBrands(response.brands);
    } catch (error) {
      console.error('Brands load error:', error);
    }
  };

  const handleBotChange = (botId: number) => {
    setSelectedBotId(botId);
    const bot = bots.find(b => b.id === botId);
    setSelectedBot(bot || null);
  };

  // Parse textarea to array
  const parseChannels = () => {
    return channelInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.startsWith('@') || line.includes('t.me/'));
  };

  const handleAddChannels = async () => {
    if (!selectedBotId || !channelInput.trim() || !selectedBrandId) {
      toast.error('Bot, kanallar ve marka gerekli');
      return;
    }

    const channels = parseChannels();
    if (channels.length === 0) {
      toast.error('En az bir kanal girin (her satıra @kanaladim)');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading(`Doğrulanıyor... (${channels.length} kanal)`);

    try {
      const response = await socialMediaChannelsAPI.addChannelByBot({
        telegram_bot_id: selectedBotId,
        channel_identifiers: channels,
        brand_id: selectedBrandId
      });

      if (response.success) {
        setBulkResult(response);
        toast.success(`${response.success_count} kanal eklendi!`);
        onSuccess();
      } else {
        toast.error('Hata oluştu');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Hata oluştu');
    } finally {
      setLoading(false);
      toast.dismiss(loadingToast);
    }
  };

  const handleInstructionsConfirm = async () => {
    setShowInstructions(false);
    setBulkResult(null);
    setChannelInput('');  // Reset
  };

  // CSV export for failed
  const exportFailedCSV = () => {
    if (!bulkResult?.failed_channels?.length) return;
    const csv = bulkResult.failed_channels.map((f: any) => `${f.username},${f.reason}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'failed_channels.csv';
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Send className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold">Telegram Kanallarını Ekle (Bulk)</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {!bulkResult ? (
          <form onSubmit={(e) => { e.preventDefault(); handleAddChannels(); }} className="space-y-6">
            {/* Bot Seçimi */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Bot className="inline mr-1" size={16} />
                Bot Seçin *
              </label>
              {loadingBots ? (
                <div className="text-sm text-gray-500">Yükleniyor...</div>
              ) : bots.length === 0 ? (
                <div className="bg-yellow-50 border rounded p-3">
                  <p className="text-sm text-yellow-800">Bot eklenmemiş. Admin bot eklesin.</p>
                </div>
              ) : (
                <select
                  value={selectedBotId || ''}
                  onChange={(e) => handleBotChange(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seçin...</option>
                  {bots.map((bot) => (
                    <option key={bot.id} value={bot.id}>
                      {bot.bot_name} (@{bot.bot_username})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Bulk Kanal Input */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Hash className="inline mr-1" size={16} />
                Kanallar (Her satıra bir tane) *
              </label>
              <textarea
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                placeholder="Satır 1: @kanal1
Satır 2: @kanal2
Satır 3: https://t.me/kanal3"
                rows={8}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Örn: Her satıra bir kanal username'i (@kanaladim) veya link. Toplu ekleme için ideal.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {parseChannels().length} kanal algılandı.
              </p>
            </div>

            {/* Marka Seçimi */}
            <div>
              <label className="block text-sm font-medium mb-2">Marka Seçin *</label>
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value={0}>Seçin...</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedBotId || !channelInput.trim() || !selectedBrandId}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="animate-spin h-4 w-4" />
                  Doğrulanıyor...
                </span>
              ) : (
                'Kanalları Ekle'
              )}
            </button>
          </form>
        ) : (
          // Bulk Sonuç
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800">Sonuç: {bulkResult.success_count} / {bulkResult.success_count + bulkResult.failed_count} Kanal Eklendi</h3>
              <p className="text-sm text-green-700">{bulkResult.message}</p>
            </div>

            {bulkResult.added_channels.length > 0 && (
              <div className="bg-blue-50 border rounded-lg p-3">
                <h4 className="font-medium mb-2">Eklenen Kanallar:</h4>
                <ul className="text-sm space-y-1">
                  {bulkResult.added_channels.map((ch: any, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={16} />
                      {ch.name || ch.username} ({ch.member_count} üye)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {bulkResult.failed_channels.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-yellow-800 flex items-center gap-2">
                  <AlertCircle size={18} />
                  {bulkResult.failed_count} Başarısız Kanal
                </h4>
                <ul className="text-sm space-y-1">
                  {bulkResult.failed_channels.map((f: any, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 text-yellow-600">
                      <XCircle size={16} />
                      @{f.username}: {f.reason}
                    </li>
                  ))}
                </ul>
                {bulkResult.instructions && (
                  <div className="mt-3 p-3 bg-yellow-100 rounded">
                    <h5 className="font-medium mb-2">Talimatlar:</h5>
                    <ul className="text-xs space-y-1">
                      {bulkResult.instructions.map((instr: string, idx: number) => (
                        <li key={idx}>• {instr}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {bulkResult.failed_count > 5 && (
                  <button
                    onClick={exportFailedCSV}
                    className="flex items-center gap-2 text-xs text-blue-600 hover:underline"
                  >
                    <Download size={14} />
                    Başarısızları CSV Olarak İndir
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleInstructionsConfirm}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Yeni Bulk Ekle
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Kapat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicChannelModal;
