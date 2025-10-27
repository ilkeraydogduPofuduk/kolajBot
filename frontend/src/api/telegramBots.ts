/**
 * Telegram Bots API
 * Admin: Bot token yönetimi
 */

import api from '../utils/api';

export interface TelegramBot {
  id: number;
  bot_name: string;
  bot_username: string;
  bot_user_id?: string;
  is_active: boolean;
  is_verified: boolean;
  last_verified_at?: string;
  created_by: number;
  creator_name?: string;
  created_at: string;
  updated_at: string;
  channel_count?: number;
}

export interface TelegramBotCreate {
  bot_token: string; // Sadece token yeterli, diğer bilgiler otomatik gelecek!
}

export interface TelegramBotUpdate {
  bot_name?: string;
  bot_username?: string;
  bot_token?: string;
  is_active?: boolean;
}

export interface TelegramBotListResponse {
  bots: TelegramBot[];
  total: number;
}

export interface TelegramBotVerifyResponse {
  success: boolean;
  message: string;
  bot_info?: {
    id: number;
    first_name: string;
    username: string;
    can_join_groups: boolean;
    can_read_all_group_messages: boolean;
  };
}

export interface TelegramBotResponseExtended {
  success: boolean;
  bot: TelegramBot;
  message: string;
  discovered_channels_count?: number;
  channel_count?: number;
}

export interface BotChannelListResponse {
  channels: Array<{
    id: number;
    name: string;
    channel_username?: string;
    member_count: number;
    is_active: boolean;
    brand_id?: number;
    brand_name?: string;
    assigned_users: Array<{
      id: number;
      name: string;
      email: string;
    }>;
  }>;
  total: number;
}

export interface BotDeleteInfoResponse {
  bot_id: number;
  bot_name: string;
  bot_username: string;
  channel_count: number;
  warning_message: string;
}

export interface TelegramBotsAPI {
  getBots(): Promise<TelegramBotListResponse>;
  getBot(botId: number): Promise<TelegramBot>;
  getBotChannels(botId: number): Promise<BotChannelListResponse>;
  getBotDeleteInfo(botId: number): Promise<BotDeleteInfoResponse>;
  createBot(botData: TelegramBotCreate): Promise<TelegramBotResponseExtended>;
  updateBot(botId: number, data: TelegramBotUpdate): Promise<TelegramBot>;
  deleteBot(botId: number): Promise<void>;
  verifyBot(botId: number): Promise<TelegramBotVerifyResponse>;
  discoverChannelsForBot(botId: number): Promise<any>;
}

export const telegramBotsAPI: TelegramBotsAPI = {
  /**
   * Bot listesini getir
   */
  async getBots(): Promise<TelegramBotListResponse> {
    const response = await api.get('/api/telegram-bots');
    return response.data;
  },

  /**
   * Belirli bir botu getir
   */
  async getBot(botId: number): Promise<TelegramBot> {
    const response = await api.get(`/api/telegram-bots/${botId}`);
    return response.data;
  },

  /**
   * Yeni bot ekle (Sadece Admin)
   */
  async createBot(botData: TelegramBotCreate): Promise<TelegramBotResponseExtended> {
    const response = await api.post('/api/telegram-bots', botData);
    return response.data;
  },

  /**
   * Bot bilgilerini güncelle (Sadece Admin)
   */
  async updateBot(botId: number, data: TelegramBotUpdate): Promise<TelegramBot> {
    const response = await api.put(`/api/telegram-bots/${botId}`, data);
    return response.data;
  },

  /**
   * Botu sil (Sadece Admin)
   */
  async deleteBot(botId: number): Promise<void> {
    await api.delete(`/api/telegram-bots/${botId}`);
  },

  /**
   * Bot token'ını doğrula
   */
  async verifyBot(botId: number): Promise<TelegramBotVerifyResponse> {
    const response = await api.post(`/api/telegram-bots/${botId}/verify`);
    return response.data;
  },

  /**
   * Botun kanalını keşfet
   */
  async discoverChannelsForBot(botId: number): Promise<any> {
    const response = await api.post(`/api/telegram-bots/${botId}/discover-channels`);
    return response.data;
  },

  /**
   * Bot'a ait kanalları getir
   */
  async getBotChannels(botId: number): Promise<BotChannelListResponse> {
    const response = await api.get(`/api/telegram-bots/${botId}/channels`);
    return response.data;
  },

  /**
   * Bot silme öncesi bilgi getir
   */
  async getBotDeleteInfo(botId: number): Promise<BotDeleteInfoResponse> {
    const response = await api.get(`/api/telegram-bots/${botId}/delete-info`);
    return response.data;
  }
};

