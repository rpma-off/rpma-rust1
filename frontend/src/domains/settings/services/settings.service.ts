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
import {
  DEFAULT_PREFERENCES,
  DEFAULT_ACCESSIBILITY,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_PERFORMANCE,
} from './defaults';

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
      const settings = await ipcClient.settings.getUserSettings();
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
      await ipcClient.settings.updateUserPreferences(data);
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
      await ipcClient.settings.updateUserNotifications(data);
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
      await ipcClient.settings.updateUserAccessibility(data);
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
      await ipcClient.settings.updateUserPerformance(data);
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

      await ipcClient.settings.updateUserProfile(profilePayload as JsonObject);
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
      await ipcClient.settings.changeUserPassword(payload);
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
        ipcClient.settings.updateUserPreferences(DEFAULT_PREFERENCES),
        ipcClient.settings.updateUserNotifications(DEFAULT_NOTIFICATIONS),
        ipcClient.settings.updateUserAccessibility(DEFAULT_ACCESSIBILITY),
        ipcClient.settings.updateUserPerformance(DEFAULT_PERFORMANCE),
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
      const data = await ipcClient.settings.exportUserData();
      return ok(data);
    } catch (error) {
      return fail(error, 'Failed to export user data');
    }
  }
}

export const settingsService = SettingsService;
