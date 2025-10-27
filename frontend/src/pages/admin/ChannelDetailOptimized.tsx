import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { socialMediaChannelsAPI, SocialMediaChannel } from '../../api/socialMediaChannels';
import { 
  ArrowLeft, RefreshCw, Users, MessageSquare, Send, 
  Paperclip, X, Image as ImageIcon, Video, FileText, 
  CheckCircle, XCircle, Trash2, Download, UserPlus, 
  Building2, BarChart3, TrendingUp, Bot
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { format } from 'date-fns';
import { AssignUsersModal } from '../../components/channels/AssignUsersModal';

interface Message {
  id: number;
  message_text: string;
  is_sent: boolean;
  timestamp: string;
  media_url?: string | null;
  message_type?: string | null;
  file_name?: string | null;
  is_sending?: boolean;
  temp_id?: number;
}

interface ChannelStatistics {
  total_messages: number;
  sent_posts: number;
  total_members: number;
  assigned_users_count: number;
}

interface BotInfo {
  id: number;
  name: string;
  username: string;
  is_active: boolean;
  is_verified: boolean;
}

interface AssignedUserStats {
  id: number;
  name: string;
  email: string;
  sent_messages: number;
}

const ChannelDetailOptimized: React.FC = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  // State
  const [channel, setChannel] = useState<SocialMediaChannel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssignUsersModal, setShowAssignUsersModal] = useState(false);
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<ChannelStatistics | null>(null);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [assignedUsersStats, setAssignedUsersStats] = useState<AssignedUserStats[]>([]);
  const [showStats, setShowStats] = useState(true);
  
  // Message input
  const [messageText, setMessageText] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageCountRef = useRef<number>(0);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Load channel
  const loadChannel = useCallback(async () => {
    if (!channelId) return;
    
    try {
      const data = await socialMediaChannelsAPI.getChannel(Number(channelId));
      setChannel(data);
    } catch (error: any) {
      toast.error('Kanal bilgileri yüklenemedi');
      navigate('/admin/social-media/channels');
    }
  }, [channelId, navigate]);

  // Load assigned users
  const loadAssignedUsers = useCallback(async () => {
    if (!channelId) return;
    
    try {
      const response = await socialMediaChannelsAPI.getChannelAssignedUsers(Number(channelId));
      setAssignedUsers(response.assigned_users || []);
    } catch (error) {
      // Silently handle error - assigned users are not critical
    }
  }, [channelId]);

  // Load statistics
  const loadStatistics = useCallback(async () => {
    if (!channelId) return;
    
    try {
      const response = await api.get(`/api/social-media/channels/${channelId}/statistics`);
      setStatistics(response.data.statistics);
      setBotInfo(response.data.bot);
      setAssignedUsersStats(response.data.assigned_users || []);
    } catch (error) {
      console.error('Statistics load error:', error);
    }
  }, [channelId]);

  // Load messages
  const loadMessages = useCallback(async (silent = false) => {
    if (!channelId) return;
    
    try {
      if (!silent) setLoading(true);
      
      const response = await api.get(`/api/social-media/channels/${channelId}/messages`, {
        params: { per_page: 500 }
      });

      const fetchedMessages: Message[] = response.data.messages || [];
      
      // Check for new messages
      const hasNewMessages = fetchedMessages.length > lastMessageCountRef.current;
      lastMessageCountRef.current = fetchedMessages.length;
      
      setMessages(fetchedMessages);
      
      // Auto-scroll on new messages
      if (hasNewMessages) {
        scrollToBottom();
      }
    } catch (error: any) {
      if (!silent) toast.error('Mesajlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [channelId, scrollToBottom]);

  // Initial load
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    
    loadChannel();
    loadAssignedUsers();
    loadMessages();
    loadStatistics();
  }, [authLoading, user, navigate, loadChannel, loadAssignedUsers, loadMessages, loadStatistics]);

  // Real-time polling (every 3 seconds)
  useEffect(() => {
    if (!channelId) return;
    
    pollIntervalRef.current = setInterval(() => {
      loadMessages(true);
    }, 3000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [channelId, loadMessages]);

  // File handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const files = Array.from(e.target.files);
    
    // Dosya sayısı kontrolü
    if (files.length + mediaFiles.length > 50) {
      toast.error('En fazla 50 dosya ekleyebilirsiniz');
      return;
    }

    // Dosya boyutu kontrolü (her dosya max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    const oversizedFiles = files.filter(f => f.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast.error(`Bazı dosyalar çok büyük (max 50MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setMediaFiles(prev => [...prev, ...files]);
    toast.success(`${files.length} dosya eklendi`);
  };

  const removeFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setMediaFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Send message - TAM ÇALIŞIR VERSİYON
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasyon
    if (!channelId) {
      toast.error('Kanal ID bulunamadı');
      return;
    }
    
    if (!messageText.trim() && mediaFiles.length === 0) {
      toast.error('Lütfen mesaj yazın veya dosya ekleyin');
      return;
    }
    
    if (isSending) return;

    setIsSending(true);
    const textToSend = messageText.trim();
    const filesToSend = [...mediaFiles];
    
    // Clear inputs immediately for better UX
    setMessageText('');
    clearAllFiles();

    try {
      // SENARYO 1: Sadece metin (dosya yok)
      if (filesToSend.length === 0 && textToSend) {
        await api.post(`/api/social-media/channels/${channelId}/messages`, {
          message_text: textToSend,
          message_type: 'text'
        });
        toast.success('✅ Mesaj gönderildi!');
      }
      
      // SENARYO 2: Tek dosya + metin (opsiyonel)
      else if (filesToSend.length === 1) {
        const file = filesToSend[0];
        const formData = new FormData();
        formData.append('file', file);
        if (textToSend) {
          formData.append('message_text', textToSend);
        }
        
        await api.post(
          `/api/social-media/channels/${channelId}/messages/upload`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' }
          }
        );
        toast.success(`✅ ${textToSend ? 'Mesaj ve dosya' : 'Dosya'} gönderildi!`);
      }
      
      // SENARYO 3: Çoklu dosya + metin (opsiyonel)
      else if (filesToSend.length > 1) {
        let successCount = 0;
        let failCount = 0;
        
        // İlk dosyaya metni ekle
        for (let i = 0; i < filesToSend.length; i++) {
          const file = filesToSend[i];
          
          try {
            const formData = new FormData();
            formData.append('file', file);
            
            // Sadece ilk dosyaya metin ekle
            if (i === 0 && textToSend) {
              formData.append('message_text', textToSend);
            }
            
            await api.post(
              `/api/social-media/channels/${channelId}/messages/upload`,
              formData,
              {
                headers: { 'Content-Type': 'multipart/form-data' }
              }
            );
            
            successCount++;
            
            // Rate limiting: Her dosya arasında 500ms bekle
            if (i < filesToSend.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
          } catch (error: any) {
            failCount++;
            console.error(`Dosya gönderimi başarısız: ${file.name}`, error);
            toast.error(`❌ ${file.name} gönderilemedi`, { duration: 2000 });
          }
        }
        
        // Özet mesaj
        if (successCount > 0) {
          toast.success(`✅ ${successCount}/${filesToSend.length} dosya gönderildi!`);
        }
        if (failCount > 0) {
          toast.error(`⚠️ ${failCount} dosya gönderilemedi`);
        }
      }

      // Mesajları yenile
      setTimeout(() => {
        loadMessages(true);
        scrollToBottom();
      }, 2000);

    } catch (error: any) {
      console.error('Mesaj gönderme hatası:', error);
      const errorMessage = error?.response?.data?.detail || error.message || 'Mesaj gönderilemedi';
      toast.error(`❌ ${errorMessage}`);
      
      // Hata durumunda girişleri geri yükle
      if (textToSend) setMessageText(textToSend);
      if (filesToSend.length > 0) setMediaFiles(filesToSend);
      
    } finally {
      setIsSending(false);
    }
  };

  // Sync from Telegram
  const handleTelegramSync = async () => {
    try {
      toast.loading('Telegram mesajları senkronize ediliyor...', { duration: 2000 });
      await api.post(`/api/social-media/channels/${channelId}/sync-messages`);
      toast.success('Mesajlar senkronize ediliyor');
      setTimeout(() => loadMessages(true), 3000);
    } catch (error) {
      toast.error('Senkronizasyon başarısız');
    }
  };

  // Clear all messages
  const handleClearMessages = async () => {
    if (!window.confirm('Tüm mesajları silmek istediğinizden emin misiniz?')) return;
    
    try {
      toast.loading('Mesajlar temizleniyor...', { id: 'clear' });
      const response = await api.delete(`/api/social-media/channels/${channelId}/messages/clear`);
      setMessages([]);
      lastMessageCountRef.current = 0;
      toast.success(`✅ ${response.data.deleted_count} mesaj temizlendi!`, { id: 'clear' });
    } catch (error: any) {
      toast.error('Mesajlar temizlenemedi', { id: 'clear' });
    }
  };

  // Render file icon
  const renderFileIcon = (type?: string | null) => {
    if (type === 'image') return <ImageIcon size={16} className="text-blue-500" />;
    if (type === 'video') return <Video size={16} className="text-purple-500" />;
    return <FileText size={16} className="text-gray-500" />;
  };

  // Loading states
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!channel) return null;

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      {/* Header - Modern & Elegant */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/telegram/channels')}
                className="p-2.5 hover:bg-gray-100 rounded-xl transition-all hover:shadow-md group"
                title="Geri Dön"
              >
                <ArrowLeft size={22} className="group-hover:-translate-x-0.5 transition-transform" />
              </button>
              
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900">{channel.name}</h1>
                  {channel.is_active ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <CheckCircle size={14} />
                      Aktif
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      <XCircle size={14} />
                      Pasif
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1.5">
                  <span className="flex items-center gap-1.5 text-sm text-gray-600">
                    <MessageSquare size={14} className="text-blue-500" />
                    <span className="font-medium">{messages.length}</span> mesaj
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Users size={14} className="text-purple-500" />
                    <span className="font-medium">{channel.member_count || 0}</span> üye
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-gray-600">
                    <Building2 size={14} className="text-indigo-500" />
                    {channel.brand_name || 'Marka'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStats(!showStats)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all shadow-sm ${
                  showStats 
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-indigo-200' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
                title="İstatistikleri Göster/Gizle"
              >
                <BarChart3 size={16} />
                İstatistikler
              </button>

              {(user?.permissions?.includes('social.manage') || user?.permissions?.includes('brands.manage')) && (
                <button
                  onClick={() => setShowAssignUsersModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-sm shadow-purple-200"
                  title="Kullanıcı Yönet"
                >
                  <UserPlus size={16} />
                  Kullanıcı ({assignedUsers.length})
                </button>
              )}

              <button
                onClick={handleTelegramSync}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-white text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-all shadow-sm"
                title="Telegram'dan Mesajları Çek"
              >
                <RefreshCw size={16} />
                Sync
              </button>

              {(user?.role === 'Super Admin' || user?.role === 'Mağaza Yöneticisi') && messages.length > 0 && (
                <button
                  onClick={handleClearMessages}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-white text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-all shadow-sm"
                  title="Tüm mesajları temizle"
                >
                  <Trash2 size={16} />
                  Temizle
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Panel - Toggle */}
      {showStats && statistics && (
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
            {/* Stat Card 1: Total Messages */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 mb-1">Toplam Mesaj</p>
                  <p className="text-2xl font-bold text-blue-900">{statistics.total_messages}</p>
                </div>
                <MessageSquare className="text-blue-500" size={32} />
              </div>
            </div>

            {/* Stat Card 2: Sent Posts */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-600 mb-1">Gönderilen Post</p>
                  <p className="text-2xl font-bold text-green-900">{statistics.sent_posts}</p>
                </div>
                <Send className="text-green-500" size={32} />
              </div>
            </div>

            {/* Stat Card 3: Total Members */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-600 mb-1">Toplam Üye</p>
                  <p className="text-2xl font-bold text-purple-900">{statistics.total_members}</p>
                </div>
                <Users className="text-purple-500" size={32} />
              </div>
            </div>

            {/* Stat Card 4: Assigned Users */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-orange-600 mb-1">Atanmış Çalışan</p>
                  <p className="text-2xl font-bold text-orange-900">{statistics.assigned_users_count}</p>
                </div>
                <UserPlus className="text-orange-500" size={32} />
              </div>
            </div>
          </div>

          {/* Bot Info */}
          {botInfo && (
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200 mb-4">
              <div className="flex items-center gap-3">
                <Bot className="text-indigo-600" size={28} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-indigo-900">{botInfo.name}</p>
                  <p className="text-xs text-indigo-600">{botInfo.username}</p>
                </div>
                <div className="flex gap-2">
                  {botInfo.is_active && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                      <CheckCircle size={12} />
                      Aktif
                    </span>
                  )}
                  {botInfo.is_verified && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                      <CheckCircle size={12} />
                      Doğrulanmış
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Employee Performance Table */}
          {assignedUsersStats.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp size={16} className="text-gray-600" />
                  Çalışan Performansı
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Çalışan</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Email</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Gönderilen Post</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {assignedUsersStats.map((userStat) => (
                      <tr key={userStat.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{userStat.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{userStat.email}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                            {userStat.sent_messages}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assigned Users Display */}
      {assignedUsers.length > 0 && (
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Atanan Kullanıcılar:</span>
            <div className="flex flex-wrap gap-1">
              {assignedUsers.map((user: any) => (
                <span
                  key={user.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded-full border border-gray-200 text-xs text-gray-700"
                >
                  <Users size={10} />
                  {user.first_name} {user.last_name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages Area - Modern Chat Design */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm">
              <MessageSquare size={56} className="mb-4 text-blue-400 mx-auto" />
              <p className="text-base font-medium text-gray-700 mb-1">Henüz mesaj yok</p>
              <p className="text-sm text-gray-500">Aşağıdan ilk mesajınızı gönderin</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.is_sent ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                  message.is_sent
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                } ${message.is_sending ? 'opacity-60 animate-pulse' : ''}`}
              >
                {/* Media */}
                {message.media_url && (
                  <div className="mb-2">
                    {message.message_type === 'image' && (
                      <img
                        src={message.media_url}
                        alt={message.file_name || 'Image'}
                        className="max-w-full max-h-64 rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(message.media_url!, '_blank')}
                      />
                    )}
                    {message.message_type === 'video' && (
                      <video
                        src={message.media_url}
                        controls
                        className="max-w-full max-h-64 rounded-xl"
                      />
                    )}
                    {message.message_type === 'document' && (
                      <a
                        href={message.media_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:underline"
                      >
                        <Download size={14} />
                        {message.file_name || 'Dosya'}
                      </a>
                    )}
                  </div>
                )}

                {/* Text */}
                {message.message_text && (
                  <p className="text-sm break-words">{message.message_text}</p>
                )}

                {/* Timestamp */}
                <div className={`text-xs mt-1 ${message.is_sent ? 'text-blue-100' : 'text-gray-400'}`}>
                  {format(new Date(message.timestamp), 'HH:mm')}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Previews - Modern Design */}
      {mediaFiles.length > 0 && (
        <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Paperclip size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-900">{mediaFiles.length} dosya seçildi</span>
            </div>
            <button
              onClick={clearAllFiles}
              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 hover:underline"
            >
              <X size={14} />
              Tümünü Kaldır
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {mediaFiles.map((file, index) => (
              <div
                key={index}
                className="group relative flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-all"
              >
                <div className="p-1.5 bg-blue-100 rounded">
                  {renderFileIcon(file.type.split('/')[0])}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-900 max-w-[120px] truncate">{file.name}</span>
                  <span className="text-[10px] text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  title="Kaldır"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area - Modern & Beautiful */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-200 px-4 py-4">
        <form onSubmit={handleSendMessage} className="flex items-end gap-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx,.zip,.rar"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 p-3 text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-all shadow-sm hover:shadow-md"
            disabled={isSending}
            title="Dosya Ekle"
          >
            <Paperclip size={22} />
          </button>

          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Mesajınızı yazın... (Enter: Gönder, Shift+Enter: Yeni satır)"
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none shadow-sm transition-all placeholder:text-gray-400"
              rows={1}
              disabled={isSending}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            {messageText.trim() && (
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {messageText.length} karakter
              </div>
            )}
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={isSending || (!messageText.trim() && mediaFiles.length === 0)}
            className="flex-shrink-0 p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 group"
            title={isSending ? 'Gönderiliyor...' : 'Gönder'}
          >
            {isSending ? (
              <RefreshCw size={22} className="animate-spin" />
            ) : (
              <Send size={22} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            )}
          </button>
        </form>
        
        {/* Helper Text */}
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <MessageSquare size={12} />
            Enter ile hızlıca gönderin
          </p>
          {mediaFiles.length === 0 && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Paperclip size={12} />
              Dosya ekleyebilirsiniz
            </p>
          )}
        </div>
      </div>

      {/* Assign Users Modal */}
      {showAssignUsersModal && channel && user && (
        <AssignUsersModal
          channelId={channel.id}
          channelName={channel.name}
          brandId={channel.brand_id}
          currentAssignedUserIds={channel.assigned_user_ids || []}
          currentUserId={user.id}
          onClose={() => setShowAssignUsersModal(false)}
          onSuccess={() => {
            loadAssignedUsers();
            loadChannel();
          }}
        />
      )}
    </div>
  );
};

export default ChannelDetailOptimized;
