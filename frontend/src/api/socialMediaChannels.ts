import api from '../utils/api';

export interface SocialMediaChannel {
  id: number;
  name: string;
  platform: string;
  type: string;
  channel_id: string;
  chat_id: string;
  channel_username?: string;
  member_count: number;
  is_active: boolean;
  telegram_bot_id?: number;
  brand_id: number;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
  avatar_url?: string;
  last_post_at?: string;
  brand_name?: string;
  last_activity?: string;
  assigned_user_ids?: number[];  // Add for assign users modal
  bot_token?: string;  // Add for token display
}

export interface SocialMediaChannelCreate {
  name: string;
  platform: 'telegram';
  type: 'group' | 'channel';
  channel_id: string;
  member_count?: number;
  is_active?: boolean;
  // Telegram specific
  bot_token?: string;
  chat_id?: string;
  brand_id: number;
}

export interface SocialMediaChannelUpdate {
  name?: string;
  platform?: 'telegram';
  type?: 'group' | 'channel';
  channel_id?: string;
  member_count?: number;
  is_active?: boolean;
  // Telegram specific
  bot_token?: string;
  chat_id?: string;
}

export interface SocialMediaChannelListResponse {
  channels: SocialMediaChannel[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ChannelStatistics {
  total_channels: number;
  telegram_channels: number;
  active_channels: number;
  total_members: number;
}

export const socialMediaChannelsAPI = {
  // Get platform configurations
  getPlatforms: async (): Promise<any> => {
    const response = await api.get('/api/social-media/platforms');
    return response.data;
  },

  // Telegram helpers
  discoverTelegramChats: async (bot_token: string): Promise<{ 
    success: boolean;
    chats: Array<{ 
      chat_id: string; 
      type?: string; 
      title?: string; 
      username?: string;
      member_count?: number;
      description?: string;
      invite_link?: string;
      is_admin?: boolean;
    }>;
    message?: string;
    instructions?: string[];
    bot_info?: {
      id: number;
      username: string;
      first_name: string;
      can_join_groups: boolean;
      can_read_all_group_messages: boolean;
    };
  }> => {
    const response = await api.post('/api/social-media/telegram/discover', { bot_token });
    return response.data;
  },
  getTelegramChatInfo: async (bot_token: string, chat_id: string): Promise<{ chat_id: string; type?: string; title?: string; username?: string; member_count?: number }> => {
    const response = await api.post('/api/social-media/telegram/chat-info', { bot_token, chat_id });
    return response.data;
  },

  // Get channels with filtering and pagination
  getChannels: async (
    page: number = 1,
    per_page: number = 10,
    platform?: string,
    brand_id?: number,
    search?: string
  ): Promise<SocialMediaChannelListResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: per_page.toString(),
    });

    if (platform) params.append('platform', platform);
    if (brand_id) params.append('brand_id', brand_id.toString());
    if (search) params.append('search', search);

    const response = await api.get(`/api/social-media/channels?${params.toString()}`);
    return response.data;
  },

  // Get single channel
  getChannel: async (channelId: number): Promise<SocialMediaChannel> => {
    const response = await api.get(`/api/social-media/channels/${channelId}`);
    return response.data;
  },

  // Get channel statistics
  getStatistics: async (): Promise<ChannelStatistics> => {
    const response = await api.get('/api/social-media/channels/statistics');
    return response.data;
  },

  // Create a new channel
  createChannel: async (channelData: SocialMediaChannelCreate): Promise<SocialMediaChannel> => {
    const response = await api.post('/api/social-media/channels', channelData);
    return response.data;
  },

  // Update a channel
  updateChannel: async (channelId: number, channelData: SocialMediaChannelUpdate): Promise<SocialMediaChannel> => {
    const response = await api.put(`/api/social-media/channels/${channelId}`, channelData);
    return response.data;
  },

  // Delete a channel
  deleteChannel: async (channelId: number): Promise<void> => {
    await api.delete(`/api/social-media/channels/${channelId}`);
  },

  // Toggle channel status
  toggleChannelStatus: async (channelId: number): Promise<{ message: string; is_active: boolean }> => {
    const response = await api.patch(`/api/social-media/channels/${channelId}/toggle`);
    return response.data;
  },

  // Health check
  testHealth: async (
    channelId: number
  ): Promise<{ connection_status: 'connected' | 'disconnected' | 'error'; test_message_sent: boolean; test_message_error?: string | null }> => {
    const response = await api.post(`/api/social-media/channels/${channelId}/health`);
    return response.data;
  },

  // Token rotate
  rotateToken: async (channelId: number, token: string): Promise<{ message: string; token_preview: string }> => {
    const response = await api.post(`/api/social-media/channels/${channelId}/rotate-token`, { token });
    return response.data;
  },

  // Refresh channel info
  refreshChannelInfo: async (channelId: number): Promise<SocialMediaChannel> => {
    const response = await api.post(`/api/social-media/channels/${channelId}/refresh-info`);
    return response.data;
  },

  // YENİ YAPI: Bot seçerek kanal ekle
  addChannelByBot: async (request: {
    telegram_bot_id: number;
    channel_identifier?: string;
    channel_identifiers?: string[];  // Bulk için
    brand_id: number;
    step?: string;
    channel_username?: string;
  }) => {
    const payload = {
      telegram_bot_id: request.telegram_bot_id,
      brand_id: request.brand_id,
      ...(request.channel_identifier && { channel_identifier: request.channel_identifier }),
      ...(request.channel_identifiers && { channel_identifiers: request.channel_identifiers }),
      ...(request.step && { step: request.step }),
      ...(request.channel_username && { channel_username: request.channel_username }),
    };

    const response = await api.post('/api/social-media/channels/add-by-bot', payload);
    return response.data;
  },

  // LEGACY: Add channel by username or chat_id (eski yöntem)
  addChannelByUsername: async (botToken: string, channelUsername: string | null, brandId: number, chatId?: string): Promise<{
    success: boolean;
    message: string;
    channel: {
      id: number;
      name: string;
      username: string;
      chat_id: string;
      member_count: number;
      type: string;
    };
  }> => {
    const payload: any = { bot_token: botToken, brand_id: brandId };
    if (chatId) {
      payload.chat_id = chatId;
    }
    if (channelUsername) {
      payload.channel_username = channelUsername;
    }
    const response = await api.post('/api/social-media/channels/add-by-username', payload);
    return response.data;
  },

  // Assign users to channel
  assignUsersToChannel: async (channelId: number, userIds: number[]): Promise<any> => {
    const response = await api.put(`/api/social-media/channels/${channelId}/assign-users`, { user_ids: userIds });
    return response.data;
  },

  // Get assigned users for channel
  getChannelAssignedUsers: async (channelId: number): Promise<any> => {
    const response = await api.get(`/api/social-media/channels/${channelId}/assigned-users`);
    return response.data;
  },

  // Assign channel to brand and users
  assignChannel: async (channelId: number, data: { brand_id?: number; user_ids?: number[] }): Promise<any> => {
    const response = await api.post(`/api/social-media/channels/${channelId}/assign`, data);
    return response.data;
  },

  bulkAssignChannels: async (data: { channel_ids: number[]; brand_id?: number; user_ids?: number[] }): Promise<any> => {
    const response = await api.post('/api/social-media/channels/bulk-assign', data);
    return response.data;
  },

  getChannelStatistics: async (channelId: number): Promise<any> => {
    const response = await api.get(`/api/social-media/channels/${channelId}/statistics`);
    return response.data;
  }
};
