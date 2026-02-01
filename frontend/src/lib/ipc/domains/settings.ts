import { safeInvoke, cachedInvoke } from '../core';
import { IPC_COMMANDS } from '../commands';
import type { UserSettings } from '../types/index';

/**
 * Settings and configuration operations
 */
export const settingsOperations = {
  // App settings operations
  getAppSettings: (sessionToken?: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.GET_APP_SETTINGS, {
      session_token: sessionToken || ''
    }),

  updateNotificationSettings: (request: Record<string, unknown>, sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.UPDATE_NOTIFICATION_SETTINGS, {
      request,
      session_token: sessionToken
    }),

  // User settings operations
  getUserSettings: (sessionToken: string): Promise<UserSettings> =>
    cachedInvoke<UserSettings>(`user-settings`, IPC_COMMANDS.GET_USER_SETTINGS, {
      session_token: sessionToken
    }, undefined, 30000),

  updateUserProfile: (request: Record<string, unknown>, sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.UPDATE_USER_PROFILE, {
      request,
      session_token: sessionToken
    }),

  updateUserPreferences: (request: Record<string, unknown>, sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.UPDATE_USER_PREFERENCES, {
      request,
      session_token: sessionToken
    }),

  updateUserSecurity: (request: Record<string, unknown>, sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.UPDATE_USER_SECURITY, {
      request,
      session_token: sessionToken
    }),

  updateUserPerformance: (request: Record<string, unknown>, sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.UPDATE_USER_PERFORMANCE, {
      request,
      session_token: sessionToken
    }),

  updateUserAccessibility: (request: Record<string, unknown>, sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.UPDATE_USER_ACCESSIBILITY, {
      request,
      session_token: sessionToken
    }),

  updateUserNotifications: (request: Record<string, unknown>, sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.UPDATE_USER_NOTIFICATIONS, {
      request,
      session_token: sessionToken
    }),

  changeUserPassword: (request: Record<string, unknown>, sessionToken: string): Promise<string> =>
    safeInvoke<string>(IPC_COMMANDS.CHANGE_USER_PASSWORD, {
      request,
      session_token: sessionToken
    }),

  // Security operations
  getActiveSessions: (sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.GET_ACTIVE_SESSIONS, {
      session_token: sessionToken
    }),

  revokeSession: (sessionId: string, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.REVOKE_SESSION, {
      session_id: sessionId,
      session_token: sessionToken
    }),

  revokeAllSessionsExceptCurrent: (sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.REVOKE_ALL_SESSIONS_EXCEPT_CURRENT, {
      session_token: sessionToken
    }),

  updateSessionTimeout: (timeoutMinutes: number, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.UPDATE_SESSION_TIMEOUT, {
      timeout_minutes: timeoutMinutes,
      session_token: sessionToken
    }),

  getSessionTimeoutConfig: (sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.GET_SESSION_TIMEOUT_CONFIG, {
      session_token: sessionToken
    }),

  uploadUserAvatar: (
    fileData: string,
    fileName: string,
    mimeType: string,
    sessionToken: string
  ): Promise<string> =>
    safeInvoke<string>(IPC_COMMANDS.UPLOAD_USER_AVATAR, {
      request: { file_data: fileData, file_name: fileName, mime_type: mimeType },
      session_token: sessionToken
    }),
};