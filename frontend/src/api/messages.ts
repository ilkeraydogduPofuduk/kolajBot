/**
 * Messages API
 * Mesaj API'si
 */

import api from '../utils/api';

export interface Message {
  id: number;
  message_text: string;
  is_sent: boolean;
  created_at: string;
  updated_at: string;
  timestamp?: string;
  media_url?: string;
  message_type?: string;
  file_name?: string;
}

export interface MessageResponse {
  messages: Message[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export const messagesAPI = {
  // Get messages for a channel
  getMessages: async (channelId: number, page: number = 1, limit: number = 50): Promise<MessageResponse> => {
    const response = await api.get(`/channels/${channelId}/messages`, {
      params: { page, limit }
    });
    return response.data;
  },

  // Send a message
  sendMessage: async (channelId: number, messageText: string): Promise<Message> => {
    const response = await api.post(`/channels/${channelId}/messages`, {
      message_text: messageText
    });
    return response.data;
  },

  // Get channel messages (alias for getMessages)
  getChannelMessages: async (channelId: number, page: number = 1, limit: number = 50): Promise<MessageResponse> => {
    return messagesAPI.getMessages(channelId, page, limit);
  },

  // Send message to channel (alias for sendMessage)
  sendMessageToChannel: async (channelId: number, messageData: { message_text: string }): Promise<Message> => {
    return messagesAPI.sendMessage(channelId, messageData.message_text);
  },

  // Delete a message
  deleteMessage: async (messageId: number): Promise<void> => {
    await api.delete(`/messages/${messageId}`);
  },

  // Update a message
  updateMessage: async (messageId: number, messageText: string): Promise<Message> => {
    const response = await api.put(`/messages/${messageId}`, {
      message_text: messageText
    });
    return response.data;
  }
};
