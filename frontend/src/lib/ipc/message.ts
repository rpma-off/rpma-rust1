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
  send: async (request: SendMessageRequest, sessionToken: string): Promise<Message> => {
    return invoke('message_send', { request, session_token: sessionToken });
  },

  /**
   * Get messages with filtering
   */
  getList: async (query: MessageQuery, sessionToken: string): Promise<MessageListResponse> => {
    return invoke('message_get_list', { query, session_token: sessionToken });
  },

  /**
   * Mark message as read
   */
  markRead: async (messageId: string, sessionToken: string): Promise<void> => {
    return invoke('message_mark_read', { messageId, session_token: sessionToken });
  },

  /**
   * Get message templates
   */
  getTemplates: async (
    category: string | undefined,
    messageType: string | undefined,
    sessionToken: string
  ): Promise<MessageTemplate[]> => {
    return invoke('message_get_templates', { category, messageType, session_token: sessionToken });
  },

  /**
   * Get user notification preferences
   */
  getPreferences: async (userId: string, sessionToken: string): Promise<NotificationPreferences> => {
    return invoke('message_get_preferences', { userId, session_token: sessionToken });
  },

  /**
   * Update user notification preferences
   */
  updatePreferences: async (
    userId: string,
    updates: UpdateNotificationPreferencesRequest,
    sessionToken: string
  ): Promise<NotificationPreferences> => {
    return invoke('message_update_preferences', { userId, updates, session_token: sessionToken });
  },
};