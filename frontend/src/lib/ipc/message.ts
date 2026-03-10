import { safeInvoke } from './utils';
import type {
  SendMessageRequest,
  Message,
  MessageQuery,
  MessageListResponse,
  MessageTemplate,
  NotificationPreferences,
  UpdateNotificationPreferencesRequest
} from '@/lib/backend';
import type { JsonObject } from '@/types/json';

export const messageApi = {
  /**
   * Send a new message
   */
  send: async (request: SendMessageRequest): Promise<Message> => {
    return safeInvoke('message_send', { request: request as unknown as JsonObject });
  },

  /**
   * Get messages with filtering
   */
  getList: async (query: MessageQuery): Promise<MessageListResponse> => {
    return safeInvoke('message_get_list', { query: query as unknown as JsonObject });
  },

  /**
   * Mark message as read
   */
  markRead: async (messageId: string): Promise<void> => {
    return safeInvoke('message_mark_read', { messageId });
  },

  /**
   * Get message templates
   */
  getTemplates: async (
    category: string | undefined,
    messageType: string | undefined,
  ): Promise<MessageTemplate[]> => {
    return safeInvoke('message_get_templates', { category, messageType });
  },

  /**
   * Get user notification preferences
   */
  getPreferences: async (userId: string): Promise<NotificationPreferences> => {
    return safeInvoke('message_get_preferences', { userId });
  },

  /**
   * Update user notification preferences
   */
  updatePreferences: async (
    userId: string,
    updates: UpdateNotificationPreferencesRequest,
  ): Promise<NotificationPreferences> => {
    return safeInvoke('message_update_preferences', {
      userId,
      updates: updates as unknown as JsonObject,
    });
  },
};
