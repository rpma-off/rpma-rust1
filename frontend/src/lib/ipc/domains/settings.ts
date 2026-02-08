import { safeInvoke, cachedInvoke, invalidatePattern } from '../core';
import { IPC_COMMANDS } from '../commands';
import type { UserSettings } from '../types/index';

const getUserSettingsCacheKey = (sessionToken: string): string => `user-settings:${sessionToken}`;
const invalidateUserSettingsCache = (sessionToken: string): void => {
  invalidatePattern(`user-settings:${sessionToken}`);
};

/**
 * Settings and configuration operations
 */
export const settingsOperations = {
  // App settings operations
  getAppSettings: (sessionToken?: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.GET_APP_SETTINGS, {
      sessionToken: sessionToken || ''
    }),

  updateNotificationSettings: (request: Record<string, unknown>, sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.UPDATE_NOTIFICATION_SETTINGS, {
      request: { ...request, session_token: sessionToken }
    }),

  // User settings operations
  getUserSettings: (sessionToken: string): Promise<UserSettings> =>
    cachedInvoke<UserSettings>(getUserSettingsCacheKey(sessionToken), IPC_COMMANDS.GET_USER_SETTINGS, {
      sessionToken
    }, undefined, 30000),

  updateUserProfile: async (request: Record<string, unknown>, sessionToken: string): Promise<unknown> => {
    const result = await safeInvoke<unknown>(IPC_COMMANDS.UPDATE_USER_PROFILE, {
      request: { ...request, session_token: sessionToken }
    });
    invalidateUserSettingsCache(sessionToken);
    return result;
  },

  updateUserPreferences: async (request: Record<string, unknown>, sessionToken: string): Promise<unknown> => {
    const result = await safeInvoke<unknown>(IPC_COMMANDS.UPDATE_USER_PREFERENCES, {
      request: { ...request, session_token: sessionToken }
    });
    invalidateUserSettingsCache(sessionToken);
    return result;
  },

  updateUserSecurity: async (request: Record<string, unknown>, sessionToken: string): Promise<unknown> => {
    const result = await safeInvoke<unknown>(IPC_COMMANDS.UPDATE_USER_SECURITY, {
      request: { ...request, session_token: sessionToken }
    });
    invalidateUserSettingsCache(sessionToken);
    return result;
  },

  updateUserPerformance: async (request: Record<string, unknown>, sessionToken: string): Promise<unknown> => {
    const result = await safeInvoke<unknown>(IPC_COMMANDS.UPDATE_USER_PERFORMANCE, {
      request,
      sessionToken
    });
    invalidateUserSettingsCache(sessionToken);
    return result;
  },

  updateUserAccessibility: async (request: Record<string, unknown>, sessionToken: string): Promise<unknown> => {
    const result = await safeInvoke<unknown>(IPC_COMMANDS.UPDATE_USER_ACCESSIBILITY, {
      request: { ...request, session_token: sessionToken }
    });
    invalidateUserSettingsCache(sessionToken);
    return result;
  },

  updateUserNotifications: async (request: Record<string, unknown>, sessionToken: string): Promise<unknown> => {
    const result = await safeInvoke<unknown>(IPC_COMMANDS.UPDATE_USER_NOTIFICATIONS, {
      request: { ...request, session_token: sessionToken }
    });
    invalidateUserSettingsCache(sessionToken);
    return result;
  },

  changeUserPassword: async (request: Record<string, unknown>, sessionToken: string): Promise<string> => {
    const result = await safeInvoke<string>(IPC_COMMANDS.CHANGE_USER_PASSWORD, {
      request: { ...request, session_token: sessionToken }
    });
    invalidateUserSettingsCache(sessionToken);
    return result;
  },

  // Security operations
  getActiveSessions: (sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.GET_ACTIVE_SESSIONS, {
      sessionToken
    }),

  revokeSession: (sessionId: string, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.REVOKE_SESSION, {
      sessionId,
      sessionToken
    }),

  revokeAllSessionsExceptCurrent: (sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.REVOKE_ALL_SESSIONS_EXCEPT_CURRENT, {
      sessionToken
    }),

  updateSessionTimeout: (timeoutMinutes: number, sessionToken: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.UPDATE_SESSION_TIMEOUT, {
      timeoutMinutes,
      sessionToken
    }),

  getSessionTimeoutConfig: (sessionToken: string): Promise<unknown> =>
    safeInvoke<unknown>(IPC_COMMANDS.GET_SESSION_TIMEOUT_CONFIG, {
      sessionToken
    }),

  uploadUserAvatar: (
    fileData: string,
    fileName: string,
    mimeType: string,
    sessionToken: string
  ): Promise<string> =>
    safeInvoke<string>(IPC_COMMANDS.UPLOAD_USER_AVATAR, {
      request: { avatar_data: fileData, mime_type: mimeType, session_token: sessionToken }
    }).then((result) => {
      invalidateUserSettingsCache(sessionToken);
      return result;
    }),

  exportUserData: (sessionToken: string): Promise<Record<string, unknown>> =>
    safeInvoke<Record<string, unknown>>(IPC_COMMANDS.EXPORT_USER_DATA, {
      sessionToken
    }),

  deleteUserAccount: async (confirmation: string, sessionToken: string): Promise<string> => {
    const result = await safeInvoke<string>(IPC_COMMANDS.DELETE_USER_ACCOUNT, {
      request: { confirmation, session_token: sessionToken }
    });
    invalidateUserSettingsCache(sessionToken);
    return result;
  },

  getDataConsent: (sessionToken: string): Promise<Record<string, unknown>> =>
    safeInvoke<Record<string, unknown>>(IPC_COMMANDS.GET_DATA_CONSENT, {
      sessionToken
    }),

  updateDataConsent: (request: Record<string, unknown>, sessionToken: string): Promise<Record<string, unknown>> =>
    safeInvoke<Record<string, unknown>>(IPC_COMMANDS.UPDATE_DATA_CONSENT, {
      request: { ...request, session_token: sessionToken }
    }),
};
