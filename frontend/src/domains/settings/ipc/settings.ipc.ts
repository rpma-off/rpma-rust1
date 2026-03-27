import { safeInvoke, cachedInvoke, invalidatePattern } from "@/lib/ipc/core";
import { IPC_COMMANDS } from "@/lib/ipc/commands";
import type { UserSettings } from "@/lib/backend";
import type { JsonObject, JsonValue } from "@/types/json";

const invalidateUserSettingsCache = (): void => {
  invalidatePattern("user-settings");
};

export const settingsIpc = {
  getAppSettings: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_APP_SETTINGS, {}),

  updateNotificationSettings: async (request: JsonObject) => {
    return safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_NOTIFICATION_SETTINGS, {
      settings: request,
    });
  },

  updateSecuritySettings: async (request: JsonObject) => {
    return safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_SECURITY_SETTINGS, {
      settings: request,
    });
  },

  getUserSettings: () =>
    cachedInvoke<UserSettings>(
      "user-settings",
      IPC_COMMANDS.GET_USER_SETTINGS,
      {},
      undefined,
      30000,
    ),

  updateUserProfile: async (request: JsonObject) => {
    const current = await settingsIpc.getUserSettings();
    const result = await safeInvoke<JsonValue>(
      IPC_COMMANDS.UPDATE_USER_PROFILE,
      { profile: { ...current.profile, ...request } },
    );
    invalidateUserSettingsCache();
    return result;
  },

  updateUserPreferences: async (request: JsonObject) => {
    const current = await settingsIpc.getUserSettings();
    const result = await safeInvoke<JsonValue>(
      IPC_COMMANDS.UPDATE_USER_PREFERENCES,
      { preferences: { ...current.preferences, ...request } },
    );
    invalidateUserSettingsCache();
    return result;
  },

  updateUserSecurity: async (request: JsonObject) => {
    const current = await settingsIpc.getUserSettings();
    const result = await safeInvoke<JsonValue>(
      IPC_COMMANDS.UPDATE_USER_SECURITY,
      { security: { ...current.security, ...request } },
    );
    invalidateUserSettingsCache();
    return result;
  },

  updateUserPerformance: async (request: JsonObject) => {
    const current = await settingsIpc.getUserSettings();
    const result = await safeInvoke<JsonValue>(
      IPC_COMMANDS.UPDATE_USER_PERFORMANCE,
      { performance: { ...current.performance, ...request } },
    );
    invalidateUserSettingsCache();
    return result;
  },

  updateUserAccessibility: async (request: JsonObject) => {
    const current = await settingsIpc.getUserSettings();
    const result = await safeInvoke<JsonValue>(
      IPC_COMMANDS.UPDATE_USER_ACCESSIBILITY,
      { accessibility: { ...current.accessibility, ...request } },
    );
    invalidateUserSettingsCache();
    return result;
  },

  updateUserNotifications: async (request: JsonObject) => {
    const current = await settingsIpc.getUserSettings();
    const result = await safeInvoke<JsonValue>(
      IPC_COMMANDS.UPDATE_USER_NOTIFICATIONS,
      { notifications: { ...current.notifications, ...request } },
    );
    invalidateUserSettingsCache();
    return result;
  },

  updateGeneralSettings: async (request: JsonObject): Promise<JsonValue> => {
    return safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_GENERAL_SETTINGS, {
      settings: request,
    });
  },

  updateBusinessRules: async (rules: JsonValue[]): Promise<JsonValue> => {
    return safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_BUSINESS_RULES, {
      rules,
    });
  },

  updateSecurityPolicies: async (policies: JsonValue[]): Promise<JsonValue> => {
    return safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_SECURITY_POLICIES, {
      policies,
    });
  },

  updateIntegrations: async (integrations: JsonValue[]): Promise<JsonValue> => {
    return safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_INTEGRATIONS, {
      integrations,
    });
  },

  updatePerformanceConfigs: async (configs: JsonValue[]): Promise<JsonValue> => {
    return safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_PERFORMANCE_CONFIGS, {
      configs,
    });
  },

  updateBusinessHours: async (hours: JsonObject): Promise<JsonValue> => {
    return safeInvoke<JsonValue>(IPC_COMMANDS.UPDATE_BUSINESS_HOURS, {
      hours,
    });
  },

  getActiveSessions: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_ACTIVE_SESSIONS, {}),

  revokeSession: (sessionId: string) =>
    safeInvoke<void>(IPC_COMMANDS.REVOKE_SESSION, { session_id: sessionId }),

  revokeAllSessionsExceptCurrent: () =>
    safeInvoke<void>(IPC_COMMANDS.REVOKE_ALL_SESSIONS_EXCEPT_CURRENT, {}),

  updateSessionTimeout: (timeoutMinutes: number) =>
    safeInvoke<void>(IPC_COMMANDS.UPDATE_SESSION_TIMEOUT, {
      timeout_minutes: timeoutMinutes,
    }),

  getSessionTimeoutConfig: () =>
    safeInvoke<JsonValue>(IPC_COMMANDS.GET_SESSION_TIMEOUT_CONFIG, {}),

  uploadUserAvatar: (fileData: string, fileName: string, mimeType: string) =>
    safeInvoke<string>(IPC_COMMANDS.UPLOAD_USER_AVATAR, {
      request: { avatar_data: fileData, mime_type: mimeType },
    }).then((result) => {
      invalidateUserSettingsCache();
      return result;
    }),
};
