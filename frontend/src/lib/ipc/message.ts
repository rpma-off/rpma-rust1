import { invoke } from '@tauri-apps/api/core';
import type {
  SendMessageRequest,
  Message,
  MessageQuery,
  MessageListResponse,
  MessageTemplate,
  NotificationPreferences,
  UpdateNotificationPreferencesRequest
} from '@/lib/backend';

export const messageApi = {
  /**
   * Send a new message
   */
  send: async (request: SendMessageRequest): Promise<Message> => {
    return invoke('message_send', { request });
  },

  /**
   * Get messages with filtering
   */
  getList: async (query: MessageQuery): Promise<MessageListResponse> => {
    return invoke('message_get_list', { query });
  },

  /**
   * Mark message as read
   */
  markRead: async (messageId: string): Promise<void> => {
    return invoke('message_mark_read', { messageId });
  },

  /**
   * Get message templates
   */
  getTemplates: async (
    category?: string,
    messageType?: string
  ): Promise<MessageTemplate[]> => {
    return invoke('message_get_templates', { category, messageType });
  },

  /**
   * Get user notification preferences
   */
  getPreferences: async (userId: string): Promise<NotificationPreferences> => {
    return invoke('message_get_preferences', { userId });
  },

  /**
   * Update user notification preferences
   */
  updatePreferences: async (
    userId: string,
    updates: UpdateNotificationPreferencesRequest
  ): Promise<NotificationPreferences> => {
    return invoke('message_update_preferences', { userId, updates });
  },
};