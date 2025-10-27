import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { socialMediaChannelsAPI, SocialMediaChannel } from '../../api/socialMediaChannels';
import { brandsAPI } from '../../api/brands';
import { Send, Users, Clock, ArrowLeft, RefreshCw, Paperclip, X, Image, File, Video, MessageCircle, Building2, BarChart3, CheckCircle, XCircle, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { messagesAPI } from '../../api/messages';
import api from '../../utils/api';
import { AssignUsersModal } from '../../components/channels/AssignUsersModal';

interface Message {
  id: number;
  text?: string;
  sender: 'user' | 'bot';
  timestamp: string;
  mediaUrl?: string;  
  mediaType?: 'image' | 'video' | 'document';
  fileName?: string;
  isSending?: boolean;
}

const ChannelDetail: React.FC = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [channel, setChannel] = useState<SocialMediaChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);

  // Message sending state
  const [message, setMessage] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [previewTypes, setPreviewTypes] = useState<('image' | 'video' | 'document')[]>([]);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  
  // Employee assignment
  const [showAssignUsersModal, setShowAssignUsersModal] = useState(false);
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);

  // Statistics
  const [statistics, setStatistics] = useState<any>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);

  const loadAssignedUsers = async () => {
    try {
      const response = await socialMediaChannelsAPI.getChannelAssignedUsers(Number(channelId));
      setAssignedUsers(response.assigned_users || []);
    } catch (error) {
      console.error('Error loading assigned users:', error);
    }
  };

  const loadStatistics = async () => {
    if (!channelId) return;

    setStatisticsLoading(true);
    try {
      const response = await socialMediaChannelsAPI.getChannelStatistics(Number(channelId));
      setStatistics(response);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setStatisticsLoading(false);
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load channel first
      const loadedChannel = await socialMediaChannelsAPI.getChannel(Number(channelId));
      setChannel(loadedChannel);
      
      // Load brands
      await loadBrands();
      
      // Load messages
      await loadMessages();
      
      // Load assigned users
      await loadAssignedUsers();

      // Load statistics
      await loadStatistics();

      // Try to refresh channel info from Telegram (optional)
      try {
        const refreshedChannel = await socialMediaChannelsAPI.refreshChannelInfo(Number(channelId));
        setChannel(refreshedChannel);
      } catch (refreshError) {
        // Continue with original channel data if refresh fails
      }
      
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      if (error instanceof Error && error.message.includes('404')) {
        toast.error('Kanal bulunamadı');
        navigate('/admin/social-media/channels');
      } else {
        toast.error('Kanal verileri yüklenemedi: ' + (error as any).message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (channelId) {
      loadInitialData();
    }
  }, [channelId, navigate]);

  const loadMessages = async () => {
    if (!channelId) {
      return;
    }
    
    try {
      setMessagesLoading(true);
      const response = await messagesAPI.getChannelMessages(Number(channelId), 1, 100);
      
      // Transform API messages to the format expected by the component
      const transformedMessages = response.messages.map(msg => ({
        id: msg.id,
        text: msg.message_text,
        sender: msg.is_sent ? 'bot' : 'user' as 'user' | 'bot',
        timestamp: msg.timestamp || msg.created_at,
        mediaUrl: msg.media_url,
        mediaType: msg.message_type as 'image' | 'video' | 'document' | undefined,
        fileName: msg.file_name
      }));
      
      setMessages(transformedMessages);
      
    } catch (error: any) {
      console.error('❌ Error loading messages:', error);
      console.error('❌ Error details:', error.response?.data);
      
      if (error.response?.status !== 404) {
        toast.error('Mesajlar yüklenemedi: ' + (error.message || 'Bilinmeyen hata'));
      }
      
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };


  const loadBrands = async () => {
    try {
      const response = await brandsAPI.getBrands(1, 1000);
      setBrands(response.brands);
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const handleRefreshInfo = async () => {
    try {
      toast.loading('Kanal bilgileri güncelleniyor...', { id: 'refresh' });
      const updatedChannel = await socialMediaChannelsAPI.refreshChannelInfo(Number(channelId));
      setChannel(updatedChannel);
      toast.success('✅ Kanal bilgileri güncellendi!', { id: 'refresh' });
    } catch (error: any) {
      console.error('Error refreshing channel info:', error);
      toast.error('❌ Kanal bilgileri güncellenemedi', { id: 'refresh' });
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() && mediaFiles.length === 0) {
      toast.error('Lütfen bir mesaj girin veya dosya seçin');
      return;
    }

    setSending(true);
    try {
      // Handle multiple files or single message
      if (mediaFiles.length > 0) {
        // Send each file as a separate message
        for (let i = 0; i < mediaFiles.length; i++) {
          const file = mediaFiles[i];
          
          const newMessage: Message = {
            id: Date.now() + i, // temporary ID
            text: mediaFiles.length === 1 ? message : `📎 ${file.name}${message ? `\n\n${message}` : ''}`,
            sender: 'user',
            timestamp: new Date().toISOString(),
            isSending: true,
            mediaUrl: URL.createObjectURL(file),
            fileName: file.name,
            mediaType: file.type.startsWith('image/') ? 'image' : 
                       file.type.startsWith('video/') ? 'video' : 'document'
          };

          setMessages(prev => [...prev, newMessage]);

          // Prepare message data for API
          const messageData: any = {
            message_text: mediaFiles.length === 1 ? message : `📎 ${file.name}${message ? `\n\n${message}` : ''}`,
            message_type: file.type.startsWith('image/') ? 'image' : 
                         file.type.startsWith('video/') ? 'video' : 'document',
            file_name: file.name
          };

          // Upload file
          const formData = new FormData();
          formData.append('file', file);
          const uploadResp = await api.post('/api/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          messageData.media_url = uploadResp.data.url;

          // Send the message
          const response = await messagesAPI.sendMessageToChannel(Number(channelId), messageData);

          // Update the message with the correct ID
          setMessages(prev => 
            prev.map(msg => 
              msg.id === Date.now() + i ? { 
                ...msg, 
                id: response.id,
                isSending: false 
              } : msg
            )
          );
        }
      } else {
        // Text-only message
        const newMessage: Message = {
          id: Date.now(),
          text: message,
          sender: 'user',
          timestamp: new Date().toISOString(),
          isSending: true
        };

        setMessages(prev => [...prev, newMessage]);

        const messageData = {
          message_text: message,
          message_type: 'text'
        };

        const response = await messagesAPI.sendMessageToChannel(Number(channelId), messageData);

        setMessages(prev => 
          prev.map(msg => 
            msg.id === Date.now() ? { 
              ...msg, 
              id: response.id,
              isSending: false 
            } : msg
          )
        );
      }

      // Clear input fields
      setMessage('');
      clearAllMedia();

      // Reload messages to show the new messages
      setTimeout(() => {
        loadMessages();
      }, 1000);

      toast.success(`✅ ${mediaFiles.length > 0 ? mediaFiles.length : 1} mesaj gönderildi!`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Mesaj gönderilemedi';
      toast.error(`❌ ${errorMessage}`);
      
      // Remove the temporary messages from UI
      if (mediaFiles.length > 0) {
        setMessages(prev => prev.filter(msg => !mediaFiles.some((_, i) => msg.id === Date.now() + i)));
      } else {
        setMessages(prev => prev.filter(msg => msg.id !== Date.now()));
      }
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const updatedFiles = [...mediaFiles, ...newFiles];
      setMediaFiles(updatedFiles);

      // Create previews for new files
      const newPreviewUrls: string[] = [];
      const newPreviewTypes: ('image' | 'video' | 'document')[] = [];
      
      newFiles.forEach(file => {
        if (file.type.startsWith('image/')) {
          newPreviewUrls.push(URL.createObjectURL(file));
          newPreviewTypes.push('image');
        } else if (file.type.startsWith('video/')) {
          newPreviewUrls.push(URL.createObjectURL(file));
          newPreviewTypes.push('video');
        } else {
          newPreviewUrls.push(URL.createObjectURL(file));
          newPreviewTypes.push('document');
        }
      });
      
      setPreviewUrls([...previewUrls, ...newPreviewUrls]);
      setPreviewTypes([...previewTypes, ...newPreviewTypes]);
    }
  };

  const removeMedia = (index: number) => {
    const newFiles = mediaFiles.filter((_, i) => i !== index);
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index);
    const newPreviewTypes = previewTypes.filter((_, i) => i !== index);
    
    // Revoke the URL to free memory
    URL.revokeObjectURL(previewUrls[index]);
    
    setMediaFiles(newFiles);
    setPreviewUrls(newPreviewUrls);
    setPreviewTypes(newPreviewTypes);
  };

  const clearAllMedia = () => {
    // Revoke all URLs to free memory
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    
    setMediaFiles([]);
    setPreviewUrls([]);
    setPreviewTypes([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Show loading while authentication is being checked
  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kanal Ayrıntıları</h1>
            <p className="text-gray-600">Kanal bilgileri ve mesajlaşma yönetimi</p>
          </div>
        </div>
        
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kanal Ayrıntıları</h1>
            <p className="text-gray-600">Kanal bilgileri ve mesajlaşma yönetimi</p>
          </div>
        </div>
        
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

  if (!channel) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kanal Ayrıntıları</h1>
            <p className="text-gray-600">Kanal bilgileri ve mesajlaşma yönetimi</p>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-64 bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Kanal bulunamadı</h2>
          <button 
            onClick={() => navigate('/admin/social-media/channels')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Kanallara Dön
          </button>
        </div>
      </div>
    );
  }

  const brand = brands.find(b => b.id === channel.brand_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{channel.name || `Kanal: ${channel.channel_id}`}</h1>
          <p className="text-gray-600">Kanal bilgileri ve mesajlaşma yönetimi</p>
        </div>
        <button 
          onClick={() => navigate('/admin/social-media/channels')}
          className="btn btn-secondary"
        >
          <ArrowLeft className="mr-2" size={18} />
          Kanallara Dön
        </button>
      </div>

      {/* Channel Info Card */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Send className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{channel.name || 'Kanal Adı Yok'}</h2>
              <p className="text-sm text-gray-600">
                {channel.platform} • {channel.type === 'group' ? 'Grup' : 'Kanal'} • {channel.channel_id}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              channel.is_active
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {channel.is_active ? (
                <CheckCircle className="mr-1" size={16} />
              ) : (
                <XCircle className="mr-1" size={16} />
              )}
              {channel.is_active ? 'Aktif' : 'Pasif'}
            </span>
            
            <button 
              onClick={handleRefreshInfo}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Kanal Bilgilerini Güncelle"
            >
              <RefreshCw size={20} />
            </button>
            
            <button 
              onClick={async () => {
                try {
                  toast.loading('Telegram mesajları senkronize ediliyor...', { duration: 3000 });
                  await api.post(`/api/social-media/channels/${channelId}/sync-messages`);
                  toast.success('Mesajlar senkronize ediliyor (arka planda)');
                  setTimeout(() => loadMessages(), 3000);
                } catch (error) {
                  toast.error('Senkronizasyon başarısız');
                }
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors"
              title="Telegram'dan Mesajları Çek"
            >
              <RefreshCw size={16} />
              Telegram Sync
            </button>
            
            {/* Show assign button only for Super Admin and Mağaza Yöneticisi */}
            {(user?.permissions?.includes('social.manage') || user?.permissions?.includes('brands.manage')) && (
              <button 
                onClick={() => setShowAssignUsersModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Kullanıcı Ata (Çalışan/Yönetici)"
              >
                <UserPlus size={18} />
                Kullanıcı Yönet ({assignedUsers.length})
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-blue-600" />
              <span className="text-gray-600">Üye Sayısı</span>
            </div>
            <span className="font-semibold text-gray-900">{channel.member_count?.toLocaleString() || 0}</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-blue-600" />
              <span className="text-gray-600">Son Aktivite</span>
            </div>
            <span className="font-semibold text-gray-900">
              {channel.last_activity 
                ? new Date(channel.last_activity).toLocaleDateString('tr-TR') 
                : 'Hiç'}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Building2 size={20} className="text-blue-600" />
              <span className="text-gray-600">Marka</span>
            </div>
            <span className="font-semibold text-gray-900">{brand?.name || 'Bilinmiyor'}</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Send size={20} className="text-blue-600" />
              <span className="text-gray-600">Platform</span>
            </div>
            <span className="font-semibold text-gray-900 capitalize">{channel.platform}</span>
          </div>
        </div>
        
        {/* Assigned Users */}
        {assignedUsers.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Atanan Kullanıcılar ({assignedUsers.length})</h4>
            <div className="flex flex-wrap gap-2">
              {assignedUsers.map((user: any) => (
                <div key={user.id} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-gray-200">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    user.role === 'Mağaza Yöneticisi' ? 'bg-purple-100' : 'bg-blue-100'
                  }`}>
                    <Users size={14} className={user.role === 'Mağaza Yöneticisi' ? 'text-purple-600' : 'text-blue-600'} />
                  </div>
                  <span className="text-sm text-gray-700">{user.first_name} {user.last_name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'Mağaza Yöneticisi' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.role === 'Mağaza Yöneticisi' ? 'Yön.' : 'Çalş.'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Inactive Channel Warning */}
      {!channel.is_active && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <XCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">Kanal Pasif Durumda</h3>
              <p className="text-yellow-700">
                Bu kanal şu anda pasif durumda. Mesaj gönderemezsiniz ancak geçmiş mesajları görüntüleyebilir ve kanal bilgilerini güncelleyebilirsiniz.
              </p>
              <div className="mt-2">
                <button
                  onClick={async () => {
                    try {
                      const result = await socialMediaChannelsAPI.toggleChannelStatus(channel.id);
                      setChannel(prev => prev ? { ...prev, is_active: result.is_active } : null);
                      toast.success('Kanal başarıyla aktif edildi!');
                    } catch (error) {
                      toast.error('Kanal aktif edilemedi');
                    }
                  }}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                >
                  Kanalı Aktif Et
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messaging Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageCircle size={20} className="text-blue-600" />
            Mesajlaşma ({messages.length})
          </h3>
          
          {/* Clear messages button - only for admins */}
          {(user?.role === 'Super Admin' || user?.role === 'Mağaza Yöneticisi') && messages.length > 0 && (
            <button
              onClick={async () => {
                if (window.confirm('Tüm mesajları silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
                  try {
                    toast.loading('Mesajlar temizleniyor...', { id: 'clear' });
                    const response = await api.delete(`/api/social-media/channels/${channelId}/messages/clear`);
                    setMessages([]);
                    toast.success(`✅ ${response.data.deleted_count} mesaj temizlendi!`, { id: 'clear' });
                  } catch (error: any) {
                    console.error('Clear messages error:', error);
                    const message = error?.response?.data?.detail || 'Mesajlar temizlenemedi';
                    toast.error(`❌ ${message}`, { id: 'clear' });
                  }
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
              title="Tüm mesajları temizle"
            >
              <X size={16} />
              Tümünü Temizle
            </button>
          )}
        </div>
        
        <div className="flex flex-col h-[400px] border border-gray-200 rounded-lg">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            <div className="max-w-4xl mx-auto">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
                    <p>Mesajlar yükleniyor...</p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <MessageCircle size={48} className="text-gray-300 mb-4" />
                      <p>Henüz mesaj yok</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg) => (
                        <div 
                          key={msg.id} 
                          className={`flex mb-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${
                              msg.sender === 'user' 
                                ? 'bg-blue-500 text-white rounded-tr-none' 
                                : 'bg-white text-gray-800 rounded-tl-none'
                            }`}
                          >
                            {msg.text && <p className="break-words">{msg.text}</p>}
                            
                            {msg.mediaUrl && msg.mediaType === 'image' && (
                              <div className="mt-2">
                                <img 
                                  src={msg.mediaUrl} 
                                  alt={msg.fileName} 
                                  className="max-w-full h-auto rounded-lg max-h-64 object-contain"
                                />
                              </div>
                            )}
                            
                            {msg.mediaUrl && msg.mediaType === 'video' && (
                              <div className="mt-2">
                                <video 
                                  src={msg.mediaUrl} 
                                  controls 
                                  className="max-w-full rounded-lg max-h-64"
                                />
                              </div>
                            )}
                            
                            {msg.mediaUrl && msg.mediaType === 'document' && (
                              <div className="mt-2 flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
                                <File size={16} className="text-gray-600" />
                                <span className="text-sm truncate">{msg.fileName}</span>
                              </div>
                            )}
                            
                            <div className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                              {new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              {msg.isSending && (
                                <span className="ml-1">...</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className={`bg-white border-t border-gray-200 p-4 ${!channel.is_active ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="max-w-4xl mx-auto">
              {/* Preview for selected media */}
              {previewUrls.length > 0 && (
                <div className="mb-3 space-y-2">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-100 rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        {previewTypes[index] === 'image' ? (
                          <Image size={20} className="text-blue-600" />
                        ) : previewTypes[index] === 'video' ? (
                          <Video size={20} className="text-blue-600" />
                        ) : (
                          <File size={20} className="text-blue-600" />
                        )}
                        <span className="text-sm truncate">{mediaFiles[index]?.name}</span>
                      </div>
                      <button 
                        onClick={() => removeMedia(index)}
                        className="p-1 text-gray-500 hover:text-gray-700"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {previewUrls.length > 1 && (
                    <button 
                      onClick={clearAllMedia}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Tümünü Temizle
                    </button>
                  )}
                </div>
              )}
              
              <div className="flex items-end gap-2">
                <div className="flex-1 bg-gray-100 rounded-lg p-2">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    rows={1}
                    className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32"
                    placeholder="Mesaj yaz..."
                    disabled={sending}
                  />
                </div>
                <div className="flex gap-2">
                  <label className="p-2 text-gray-600 hover:text-gray-900 cursor-pointer">
                    <Paperclip size={24} />
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
                      multiple
                      disabled={sending}
                    />
                  </label>
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || (!message.trim() && mediaFiles.length === 0) || !channel.is_active}
                    className={`p-2 rounded-lg ${
                      sending || (!message.trim() && mediaFiles.length === 0) || !channel.is_active
                        ? 'bg-gray-300 text-gray-500'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {sending ? (
                      <div className="w-6 h-6 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <Send size={24} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Statistics */}
      {statistics && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Kanal İstatistikleri</h3>
            <button
              onClick={loadStatistics}
              disabled={statisticsLoading}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw size={16} className={statisticsLoading ? 'animate-spin' : ''} />
              Yenile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Toplam Mesaj</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">{statistics.statistics?.total_messages || 0}</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Send className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Gönderilen Post</span>
              </div>
              <div className="text-2xl font-bold text-green-700">{statistics.statistics?.sent_posts || 0}</div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Toplam Üye</span>
              </div>
              <div className="text-2xl font-bold text-purple-700">{statistics.statistics?.total_members || 0}</div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Atanan Çalışan</span>
              </div>
              <div className="text-2xl font-bold text-orange-700">{statistics.statistics?.assigned_users_count || 0}</div>
            </div>
          </div>

          {/* Bot Information */}
          {statistics.bot && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Bot Bilgileri
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Bot Adı</span>
                  <div className="font-medium text-gray-900">{statistics.bot.name}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Kullanıcı Adı</span>
                  <div className="font-medium text-gray-900">{statistics.bot.username}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Durum</span>
                  <div className="flex items-center gap-2">
                    {statistics.bot.is_active ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`font-medium ${statistics.bot.is_active ? 'text-green-700' : 'text-red-700'}`}>
                      {statistics.bot.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Assigned Users Details */}
          {statistics.assigned_users && statistics.assigned_users.length > 0 && (
            <div className="bg-indigo-50 rounded-lg p-4">
              <h4 className="font-medium text-indigo-900 mb-3 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Atanan Çalışanlar
              </h4>
              <div className="space-y-2">
                {statistics.assigned_users.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Gönderilen Mesaj</div>
                      <div className="font-medium text-indigo-700">{user.sent_messages || 0}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Additional Channel Management */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Kanal Yönetimi</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Send className="h-5 w-5" />
              Mesaj Gönderme
            </h4>
            <p className="text-sm text-blue-700">
              Bu kanala metin, resim, video ve dosya mesajları gönderebilirsiniz.
            </p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              İstatistikler
            </h4>
            <p className="text-sm text-green-700">
              Üye sayısını ve son aktivite bilgilerini takip edebilirsiniz.
            </p>
          </div>
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
            loadInitialData();
          }}
        />
      )}
    </div>
  );
};

export default ChannelDetail;