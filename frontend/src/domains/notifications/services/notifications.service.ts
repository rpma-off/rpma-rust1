import { ipcClient } from '@/lib/ipc';
import type { NotificationConfig as IpcNotificationConfig } from '@/lib/ipc/types/index';
import type { SendNotificationRequest } from '@/lib/backend';
import type { JsonValue } from '@/types/json';

export interface NotificationConfig {
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone?: string;
}

export type { SendNotificationRequest };

export class NotificationService {
  static async initializeNotificationService(config: NotificationConfig, _sessionToken: string): Promise<void> {
    return ipcClient.notifications.initialize(config as unknown as IpcNotificationConfig);
  }

  static async sendNotification(request: SendNotificationRequest, _sessionToken: string): Promise<void> {
    return ipcClient.notifications.send({
      ...request,
      correlation_id: request.correlation_id ?? null,
    });
  }

  static async getNotificationStatus(_sessionToken: string): Promise<JsonValue> {
    return ipcClient.notifications.getStatus();
  }
}

export const notificationService = NotificationService;

