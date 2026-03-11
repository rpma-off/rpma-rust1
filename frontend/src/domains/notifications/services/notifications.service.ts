import { ipcClient } from '@/lib/ipc';
import type { NotificationConfig as IpcNotificationConfig } from '@/lib/ipc/types/index';
import type { JsonValue } from '@/types/json';

export interface NotificationConfig {
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone?: string;
}

export interface SendNotificationRequest {
  user_id: string;
  notification_type: 'TaskAssignment' | 'TaskUpdate' | 'TaskCompletion' | 'StatusChange' | 'OverdueWarning' | 'SystemAlert' | 'NewAssignment' | 'DeadlineReminder' | 'QualityApproval';
  recipient: string;
  variables: {
    user_name: string | null;
    task_title: string | null;
    task_id: string | null;
    client_name: string | null;
    due_date: string | null;
    status: string | null;
    priority: string | null;
    assignee_name: string | null;
    system_message: string | null;
  };
  correlation_id: string | null;
}

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

