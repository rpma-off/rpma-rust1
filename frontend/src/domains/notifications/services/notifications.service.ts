import { ipcClient } from '@/lib/ipc';
import type { JsonValue } from '@/types/json';
import type { NotificationConfig as IpcNotificationConfig } from '@/lib/ipc/types/index';

export interface NotificationConfig {
  email_provider?: string;
  email_api_key?: string;
  email_from_email?: string;
  email_from_name?: string;
  sms_provider?: string;
  sms_api_key?: string;
  sms_from_number?: string;
  push_enabled?: boolean;
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
  static async initializeNotificationService(config: NotificationConfig, sessionToken: string): Promise<void> {
    return ipcClient.notifications.initialize(config as unknown as IpcNotificationConfig, sessionToken);
  }

  static async sendNotification(request: SendNotificationRequest, sessionToken: string): Promise<void> {
    return ipcClient.notifications.send({
      ...request,
      correlation_id: request.correlation_id ?? null,
    }, sessionToken);
  }

  static async testNotificationConfig(recipient: string, channel: 'Email' | 'Sms' | 'Push', sessionToken: string): Promise<string> {
    return ipcClient.notifications.testConfig(recipient, channel, sessionToken);
  }

  static async getNotificationStatus(sessionToken: string): Promise<JsonValue> {
    return ipcClient.notifications.getStatus(sessionToken);
  }
}

export const notificationService = NotificationService;

