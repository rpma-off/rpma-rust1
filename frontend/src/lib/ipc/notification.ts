import { safeInvoke } from './utils';
import type { Notification } from '@/lib/backend/notifications';
import type { JsonObject } from '@/types/json';

export interface GetNotificationsResponse {
  notifications: Notification[];
  unread_count: number;
}

export interface SuccessResponse {
  success: boolean;
}

export interface CreateNotificationRequest {
  user_id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string;
  entity_id: string;
  entity_url: string;
  correlation_id?: string | null;
}

export const notificationApi = {
  /**
   * Get notifications for current user
   */
  get: async (sessionToken: string): Promise<GetNotificationsResponse> => {
    return safeInvoke('get_notifications', { sessionToken });
  },

  /**
   * Mark a notification as read
   */
  markRead: async (id: string, sessionToken: string): Promise<SuccessResponse> => {
    return safeInvoke('mark_notification_read', { id, sessionToken });
  },

  /**
   * Mark all notifications as read
   */
  markAllRead: async (sessionToken: string): Promise<SuccessResponse> => {
    return safeInvoke('mark_all_notifications_read', { sessionToken });
  },

  /**
   * Delete a notification
   */
  delete: async (id: string, sessionToken: string): Promise<SuccessResponse> => {
    return safeInvoke('delete_notification', { id, sessionToken });
  },

  /**
   * Create a notification (used by other domains)
   */
  create: async (request: CreateNotificationRequest): Promise<Notification> => {
    return safeInvoke('create_notification', { request: request as unknown as JsonObject });
  },
};
