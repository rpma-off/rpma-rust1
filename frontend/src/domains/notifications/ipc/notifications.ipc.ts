import { safeInvoke } from '@/lib/ipc/core';
import type { SendNotificationRequest } from '@/lib/backend';
import type { JsonValue } from '@/types/json';

interface NotificationConfig {
  provider?: string;
  api_key?: string;
  sender_email?: string;
  sender_phone?: string;
  enabled_channels?: string[];
  [key: string]: JsonValue | undefined;
}

export const notificationsIpc = {
  initialize: (config: NotificationConfig) =>
    safeInvoke<void>('initialize_notification_service', { config }),

  send: (request: SendNotificationRequest) =>
    safeInvoke<void>('send_notification', { request }),

  getStatus: () =>
    safeInvoke<JsonValue>('get_notification_status', {}),

  // Recent activities for admin dashboard
  getRecentActivities: () =>
    safeInvoke<JsonValue[]>('get_recent_activities', {}),
};
