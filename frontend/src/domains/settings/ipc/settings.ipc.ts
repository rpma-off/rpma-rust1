import { safeInvoke, cachedInvoke, invalidatePattern } from '@/lib/ipc/core';
import type { UserSettings } from '@/lib/backend';
import type { JsonObject, JsonValue } from '@/types/json';

const invalidateUserSettingsCache = (): void => {
  invalidatePattern('user-settings');
};

export const settingsIpc = {
  getAppSettings: () =>
    safeInvoke<JsonValue>('get_app_settings', {}),

  updateNotificationSettings: async (request: JsonObject) => {
    return safeInvoke<JsonValue>('update_notification_settings', { request });
  },

  // User settings operations
  getUserSettings: () =>
    cachedInvoke<UserSettings>('user-settings', 'get_user_settings', {}, undefined, 30000),

  updateUserProfile: async (request: JsonObject) => {
    const result = await safeInvoke<JsonValue>('update_user_profile', { request });
    invalidateUserSettingsCache();
    return result;
  },

  updateUserPreferences: async (request: JsonObject) => {
    const result = await safeInvoke<JsonValue>('update_user_preferences', { request });
    invalidateUserSettingsCache();
    return result;
  },

  updateUserSecurity: async (request: JsonObject) => {
    const result = await safeInvoke<JsonValue>('update_user_security', { request });
    invalidateUserSettingsCache();
    return result;
  },

  updateUserPerformance: async (request: JsonObject) => {
    const result = await safeInvoke<JsonValue>('update_user_performance', { request });
    invalidateUserSettingsCache();
    return result;
  },

  updateUserAccessibility: async (request: JsonObject) => {
    const result = await safeInvoke<JsonValue>('update_user_accessibility', { request });
    invalidateUserSettingsCache();
    return result;
  },

  updateUserNotifications: async (request: JsonObject) => {
    const result = await safeInvoke<JsonValue>('update_user_notifications', { request });
    invalidateUserSettingsCache();
    return result;
  },

  updateGeneralSettings: async (request: JsonObject): Promise<JsonValue> => {
    const result = await safeInvoke<JsonValue>('update_general_settings', {
      request
    });
    return result;
  },

  updateBusinessRules: async (rules: JsonValue[]): Promise<JsonValue> => {
    return safeInvoke<JsonValue>('update_business_rules', {
      request: { rules }
    });
  },

  updateSecurityPolicies: async (policies: JsonValue[]): Promise<JsonValue> => {
    return safeInvoke<JsonValue>('update_security_policies', {
      request: { policies }
    });
  },

  updateIntegrations: async (integrations: JsonValue[]): Promise<JsonValue> => {
    return safeInvoke<JsonValue>('update_integrations', {
      request: { integrations }
    });
  },

  updatePerformanceConfigs: async (configs: JsonValue[]): Promise<JsonValue> => {
    return safeInvoke<JsonValue>('update_performance_configs', {
      request: { configs }
    });
  },

  updateBusinessHours: async (hours: JsonObject): Promise<JsonValue> => {
    return safeInvoke<JsonValue>('update_business_hours', {
      request: { hours }
    });
  },

  changeUserPassword: async (request: JsonObject) => {
    const result = await safeInvoke<string>('change_user_password', { request });
    invalidateUserSettingsCache();
    return result;
  },

  // Security operations
  getActiveSessions: () =>
    safeInvoke<JsonValue>('get_active_sessions', {}),

  revokeSession: (sessionId: string) =>
    safeInvoke<void>('revoke_session', { session_id: sessionId }),

  revokeAllSessionsExceptCurrent: () =>
    safeInvoke<void>('revoke_all_sessions_except_current', {}),

  updateSessionTimeout: (timeoutMinutes: number) =>
    safeInvoke<void>('update_session_timeout', { timeout_minutes: timeoutMinutes }),

  getSessionTimeoutConfig: () =>
    safeInvoke<JsonValue>('get_session_timeout_config', {}),

  uploadUserAvatar: (fileData: string, fileName: string, mimeType: string) =>
    safeInvoke<string>('upload_user_avatar', {
      request: { avatar_data: fileData, mime_type: mimeType }
    }).then((result) => {
      invalidateUserSettingsCache();
      return result;
    }),

  exportUserData: () =>
    safeInvoke<JsonObject>('export_user_data', {}),

  deleteUserAccount: async (confirmation: string) => {
    const result = await safeInvoke<string>('delete_user_account', {
      request: { confirmation }
    });
    invalidateUserSettingsCache();
    return result;
  },

  getDataConsent: () =>
    safeInvoke<JsonObject>('get_data_consent', {}),

  updateDataConsent: (request: JsonObject) =>
    safeInvoke<JsonObject>('update_data_consent', {
      request
    }),
};
