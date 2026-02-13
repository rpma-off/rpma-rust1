import { ipcClient } from '@/lib/ipc';
import type { JsonObject } from '@/types/json';
import type {
  UserSettings,
  UserPreferences,
  UserNotificationSettings,
  UserAccessibilitySettings,
  UserPerformanceSettings,
  UserProfileSettings,
} from '@/lib/backend';

export interface SettingsServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type UpdatePreferencesRequest = Partial<UserPreferences>;
export type UpdateNotificationsRequest = Partial<UserNotificationSettings>;
export type UpdateAccessibilityRequest = Partial<UserAccessibilitySettings>;
export type UpdatePerformanceRequest = Partial<UserPerformanceSettings>;
export type UpdateProfileRequest = Partial<UserProfileSettings> & {
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
};

export interface ChangePasswordRequest {
  current_password?: string;
  new_password?: string;
  confirm_password?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  email_notifications: true,
  push_notifications: true,
  task_assignments: true,
  task_updates: true,
  system_alerts: true,
  weekly_reports: false,
  theme: 'system',
  language: 'fr',
  date_format: 'DD/MM/YYYY',
  time_format: '24h',
  high_contrast: false,
  large_text: false,
  reduce_motion: false,
  screen_reader: false,
  auto_refresh: true,
  refresh_interval: 60,
};

const DEFAULT_ACCESSIBILITY: UserAccessibilitySettings = {
  high_contrast: false,
  large_text: false,
  reduce_motion: false,
  screen_reader: false,
  focus_indicators: true,
  keyboard_navigation: true,
  text_to_speech: false,
  speech_rate: 1,
  font_size: 16,
  color_blind_mode: 'none',
};

const DEFAULT_NOTIFICATIONS: UserNotificationSettings = {
  email_enabled: true,
  push_enabled: true,
  in_app_enabled: true,
  task_assigned: true,
  task_updated: true,
  task_completed: false,
  task_overdue: true,
  system_alerts: true,
  maintenance: false,
  security_alerts: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  digest_frequency: 'never',
  batch_notifications: false,
  sound_enabled: true,
  sound_volume: 70,
};

const DEFAULT_PERFORMANCE: UserPerformanceSettings = {
  cache_enabled: true,
  cache_size: 100,
  offline_mode: false,
  sync_on_startup: true,
  background_sync: true,
  image_compression: true,
  preload_data: false,
};

function ok<T>(data: T): SettingsServiceResponse<T> {
  return { success: true, data };
}

function fail<T>(error: unknown, fallback: string): SettingsServiceResponse<T> {
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

function requireToken(sessionToken?: string): string {
  if (!sessionToken) {
    throw new Error('Missing session token');
  }
  return sessionToken;
}

function resolveToken(sessionTokenOrUserId: string, maybeSessionToken?: string): string {
  // Backward compatibility: callers may still pass (userId, ..., sessionToken)
  return requireToken(maybeSessionToken ?? sessionTokenOrUserId);
}

function normalizePasswordRequest(data: ChangePasswordRequest): { current_password: string; new_password: string } {
  const currentPassword = data.current_password ?? data.currentPassword ?? '';
  const newPassword = data.new_password ?? data.newPassword ?? '';
  const confirmPassword = data.confirm_password ?? data.confirmPassword ?? undefined;

  if (!currentPassword || !newPassword) {
    throw new Error('Current password and new password are required');
  }

  if (confirmPassword && confirmPassword !== newPassword) {
    throw new Error('New password and confirmation do not match');
  }

  // Password strength validation
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
    throw new Error('Password must contain at least one lowercase letter, one uppercase letter, and one number');
  }

  return {
    current_password: currentPassword,
    new_password: newPassword
  };
}

export class SettingsService {
  static async getUserSettings(
    sessionTokenOrUserId: string,
    maybeSessionToken?: string
  ): Promise<SettingsServiceResponse<UserSettings>> {
    try {
      const token = resolveToken(sessionTokenOrUserId, maybeSessionToken);
      const settings = await ipcClient.settings.getUserSettings(token);
      return ok(settings);
    } catch (error) {
      return fail(error, 'Failed to get user settings');
    }
  }

  static async updatePreferences(
    sessionTokenOrUserId: string,
    data: UpdatePreferencesRequest,
    maybeSessionToken?: string
  ): Promise<SettingsServiceResponse<UserSettings>> {
    try {
      const token = resolveToken(sessionTokenOrUserId, maybeSessionToken);
      await ipcClient.settings.updateUserPreferences(data, token);
      return this.getUserSettings(token);
    } catch (error) {
      return fail(error, 'Failed to update preferences');
    }
  }

  static async updateNotifications(
    sessionTokenOrUserId: string,
    data: UpdateNotificationsRequest,
    maybeSessionToken?: string
  ): Promise<SettingsServiceResponse<UserSettings>> {
    try {
      const token = resolveToken(sessionTokenOrUserId, maybeSessionToken);
      await ipcClient.settings.updateUserNotifications(data, token);
      return this.getUserSettings(token);
    } catch (error) {
      return fail(error, 'Failed to update notifications');
    }
  }

  static async updateAccessibility(
    sessionTokenOrUserId: string,
    data: UpdateAccessibilityRequest,
    maybeSessionToken?: string
  ): Promise<SettingsServiceResponse<UserSettings>> {
    try {
      const token = resolveToken(sessionTokenOrUserId, maybeSessionToken);
      await ipcClient.settings.updateUserAccessibility(data, token);
      return this.getUserSettings(token);
    } catch (error) {
      return fail(error, 'Failed to update accessibility settings');
    }
  }

  static async updatePerformance(
    sessionTokenOrUserId: string,
    data: UpdatePerformanceRequest,
    maybeSessionToken?: string
  ): Promise<SettingsServiceResponse<UserSettings>> {
    try {
      const token = resolveToken(sessionTokenOrUserId, maybeSessionToken);
      await ipcClient.settings.updateUserPerformance(data, token);
      return this.getUserSettings(token);
    } catch (error) {
      return fail(error, 'Failed to update performance settings');
    }
  }

  static async updateProfile(
    sessionTokenOrUserId: string,
    data: UpdateProfileRequest,
    maybeSessionToken?: string
  ): Promise<SettingsServiceResponse<UserSettings>> {
    try {
      const token = resolveToken(sessionTokenOrUserId, maybeSessionToken);
      const profilePayload: Record<string, unknown> = {
        ...data,
      };

      if (data.profile_picture && !data.avatar_url) {
        profilePayload.avatar_url = data.profile_picture;
      }

      await ipcClient.settings.updateUserProfile(profilePayload as JsonObject, token);
      return this.getUserSettings(token);
    } catch (error) {
      return fail(error, 'Failed to update profile');
    }
  }

  static async changePassword(
    sessionTokenOrUserId: string,
    data: ChangePasswordRequest,
    maybeSessionToken?: string
  ): Promise<SettingsServiceResponse<void>> {
    try {
      const token = resolveToken(sessionTokenOrUserId, maybeSessionToken);
      const payload = normalizePasswordRequest(data);
      await ipcClient.settings.changeUserPassword(payload, token);
      return ok(undefined);
    } catch (error) {
      return fail(error, 'Failed to change password');
    }
  }

  static async resetSettings(
    sessionTokenOrUserId: string,
    maybeSessionToken?: string
  ): Promise<SettingsServiceResponse<UserSettings>> {
    try {
      const token = resolveToken(sessionTokenOrUserId, maybeSessionToken);
      await Promise.all([
        ipcClient.settings.updateUserPreferences(DEFAULT_PREFERENCES, token),
        ipcClient.settings.updateUserNotifications(DEFAULT_NOTIFICATIONS, token),
        ipcClient.settings.updateUserAccessibility(DEFAULT_ACCESSIBILITY, token),
        ipcClient.settings.updateUserPerformance(DEFAULT_PERFORMANCE, token),
      ]);
      return this.getUserSettings(token);
    } catch (error) {
      return fail(error, 'Failed to reset settings');
    }
  }

  static async exportUserData(
    sessionTokenOrUserId: string,
    maybeSessionToken?: string
  ): Promise<SettingsServiceResponse<Record<string, unknown>>> {
    try {
      const token = resolveToken(sessionTokenOrUserId, maybeSessionToken);
      const data = await ipcClient.settings.exportUserData(token);
      return ok(data);
    } catch (error) {
      return fail(error, 'Failed to export user data');
    }
  }
}

export const settingsService = SettingsService;
