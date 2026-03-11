import { safeInvoke, cachedInvoke, invalidatePattern } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';
import { requireSessionToken } from '@/shared/contracts/session';
import type { UserSettings } from '@/lib/ipc/types/index';
import type { JsonObject, JsonValue } from '@/types/json';

const invalidateUserSettingsCache = (): void => {
  invalidatePattern('user-settings');
};

export const settingsIpc = {
  getAppSettings: (): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_APP_SETTINGS, {}),

  updateGeneralSettings: async (request: JsonObject): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_GENERAL_SETTINGS, {
      request: { ...request, session_token: sessionToken }
    });
    return result;
  },

  updateNotificationSettings: async (request: JsonObject): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_NOTIFICATION_SETTINGS, {
      request: { ...request, session_token: sessionToken }
    });
  },

  getUserSettings: (): Promise<UserSettings> =>
    cachedInvoke<UserSettings>('user-settings', IPC_COMMANDS.GET_USER_SETTINGS, {}, undefined, 30000),

  updateUserProfile: async (request: JsonObject): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_USER_PROFILE, {
      request: { ...request, session_token: sessionToken }
    });
    invalidateUserSettingsCache();
    return result;
  },

  updateUserPreferences: async (request: JsonObject): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_USER_PREFERENCES, {
      request: { ...request, session_token: sessionToken }
    });
    invalidateUserSettingsCache();
    return result;
  },

  updateUserSecurity: async (request: JsonObject): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_USER_SECURITY, {
      request: { ...request, session_token: sessionToken }
    });
    invalidateUserSettingsCache();
    return result;
  },

  updateUserPerformance: async (request: JsonObject): Promise<JsonValue> => {
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_USER_PERFORMANCE, {
      request
    });
    invalidateUserSettingsCache();
    return result;
  },

  updateUserAccessibility: async (request: JsonObject): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_USER_ACCESSIBILITY, {
      request: { ...request, session_token: sessionToken }
    });
    invalidateUserSettingsCache();
    return result;
  },

  updateUserNotifications: async (request: JsonObject): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_USER_NOTIFICATIONS, {
      request: { ...request, session_token: sessionToken }
    });
    invalidateUserSettingsCache();
    return result;
  },

  changeUserPassword: async (request: JsonObject): Promise<string> => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke<string>(IPC_COMMANDS.CHANGE_USER_PASSWORD, {
      request: { ...request, session_token: sessionToken }
    });
    invalidateUserSettingsCache();
    return result;
  },

  getActiveSessions: (): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_ACTIVE_SESSIONS, {}),

  revokeSession: (sessionId: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.REVOKE_SESSION, {
      sessionId
    }),

  revokeAllSessionsExceptCurrent: (): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.REVOKE_ALL_SESSIONS_EXCEPT_CURRENT, {}),

  updateSessionTimeout: (timeoutMinutes: number): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.UPDATE_SESSION_TIMEOUT, {
      timeoutMinutes
    }),

  getSessionTimeoutConfig: (): Promise<JsonValue> =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SESSION_TIMEOUT_CONFIG, {}),

  uploadUserAvatar: async (
    fileData: string,
    fileName: string,
    mimeType: string
  ): Promise<string> => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke<string>(IPC_COMMANDS.UPLOAD_USER_AVATAR, {
      request: { avatar_data: fileData, mime_type: mimeType, session_token: sessionToken }
    });
    invalidateUserSettingsCache();
    return result;
  },

  exportUserData: (): Promise<JsonObject> =>
    safeInvoke<JsonObject>(IPC_COMMANDS.EXPORT_USER_DATA, {}),

  deleteUserAccount: async (confirmation: string): Promise<string> => {
    const sessionToken = await requireSessionToken();
    const result = await safeInvoke<string>(IPC_COMMANDS.DELETE_USER_ACCOUNT, {
      request: { confirmation, session_token: sessionToken }
    });
    invalidateUserSettingsCache();
    return result;
  },

  getDataConsent: (): Promise<JsonObject> =>
    safeInvoke<JsonObject>(IPC_COMMANDS.GET_DATA_CONSENT, {}),

  updateDataConsent: async (request: JsonObject): Promise<JsonObject> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonObject>(IPC_COMMANDS.UPDATE_DATA_CONSENT, {
      request: { ...request, session_token: sessionToken }
    });
  },

  updateBusinessRules: async (rules: JsonValue[]): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_BUSINESS_RULES, {
      request: { rules, session_token: sessionToken }
    });
  },

  updateSecurityPolicies: async (policies: JsonValue[]): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_SECURITY_POLICIES, {
      request: { policies, session_token: sessionToken }
    });
  },

  updateIntegrations: async (integrations: JsonValue[]): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_INTEGRATIONS, {
      request: { integrations, session_token: sessionToken }
    });
  },

  updatePerformanceConfigs: async (configs: JsonValue[]): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_PERFORMANCE_CONFIGS, {
      request: { configs, session_token: sessionToken }
    });
  },

  updateBusinessHours: async (hours: JsonObject): Promise<JsonValue> => {
    const sessionToken = await requireSessionToken();
    return safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_BUSINESS_HOURS, {
      request: { hours, session_token: sessionToken }
    });
  },
};
