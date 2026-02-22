import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import type { SendNotificationRequest, NotificationConfig } from '@/lib/ipc/types/index';
import type { JsonValue } from '@/types/json';

export const notificationsIpc = {
  initialize: (config: NotificationConfig, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.INITIALIZE_NOTIFICATION_SERVICE, {
      config,
      session_token: sessionToken
    }),

  send: (request: SendNotificationRequest, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.SEND_NOTIFICATION, {
      request,
      session_token: sessionToken
    }),

  testConfig: (
    recipient: string,
    channel: 'email' | 'sms',
    sessionToken: string
  ): Promise<string> =>
    safeInvoke<string>(IPC_COMMANDS.TEST_NOTIFICATION_CONFIG, {
      recipient,
      channel,
      session_token: sessionToken
    }),

  getStatus: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_NOTIFICATION_STATUS, {
      session_token: sessionToken
    }),

  getRecentActivities: (sessionToken: string): Promise<JsonValue[]> =>
    safeInvoke<JsonValue[]>(IPC_COMMANDS.GET_RECENT_ACTIVITIES, {
      session_token: sessionToken
    }),
};
