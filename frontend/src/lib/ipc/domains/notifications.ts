import { safeInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';
import type { SendNotificationRequest, NotificationConfig } from '../types/index';
import type { JsonValue } from '@/types/json';

/**
 * Notification service operations
 */
export const notificationOperations = {
  /**
   * Initializes the notification service with configuration
   * @param config - Notification service configuration
   * @param sessionToken - User's session token
   * @returns Promise resolving when service is initialized
   */
  initialize: (config: NotificationConfig, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.INITIALIZE_NOTIFICATION_SERVICE, {
      config,
      session_token: sessionToken
    }),

  /**
   * Sends a notification
   * @param request - Notification request data
   * @param sessionToken - User's session token
   * @returns Promise resolving when notification is sent
   */
  send: (request: SendNotificationRequest, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.SEND_NOTIFICATION, {
      request,
      session_token: sessionToken
    }),

  /**
   * Tests notification configuration
   * @param recipient - Test recipient
   * @param channel - Notification channel ('email' or 'sms')
   * @param sessionToken - User's session token
   * @returns Promise resolving to test result
   */
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

  /**
   * Gets notification service status
   * @param sessionToken - User's session token
   * @returns Promise resolving to service status
   */
  getStatus: (sessionToken: string): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_NOTIFICATION_STATUS, {
      session_token: sessionToken
    }),

  /**
   * Gets recent activities for admin dashboard
   * @param sessionToken - User's session token
   * @returns Promise resolving to recent activities
   */
  getRecentActivities: (sessionToken: string): Promise<JsonValue[]> =>
    safeInvoke<JsonValue[]>(IPC_COMMANDS.GET_RECENT_ACTIVITIES, {
      session_token: sessionToken
    }),
};
