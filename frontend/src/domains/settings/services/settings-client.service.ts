import {
  settingsService,
  type SettingsServiceResponse,
  type ChangePasswordRequest,
  type UpdateAccessibilityRequest,
  type UpdateNotificationsRequest,
  type UpdatePerformanceRequest,
  type UpdatePreferencesRequest,
  type UpdateProfileRequest,
} from './settings.service';
import type { UserSettings } from '@/lib/backend';

/**
 * @deprecated Use `settingsService` from `settings.service.ts`.
 * This compatibility layer forwards all calls to the canonical implementation.
 */
export class SettingsClientService {
  static getUserSettings(userId: string, sessionToken?: string): Promise<SettingsServiceResponse<UserSettings>> {
    return settingsService.getUserSettings(userId, sessionToken);
  }

  static updatePreferences(
    userId: string,
    data: UpdatePreferencesRequest,
    sessionToken?: string
  ): Promise<SettingsServiceResponse<UserSettings>> {
    return settingsService.updatePreferences(userId, data, sessionToken);
  }

  static updateNotifications(
    userId: string,
    data: UpdateNotificationsRequest,
    sessionToken?: string
  ): Promise<SettingsServiceResponse<UserSettings>> {
    return settingsService.updateNotifications(userId, data, sessionToken);
  }

  static updateAccessibility(
    userId: string,
    data: UpdateAccessibilityRequest,
    sessionToken?: string
  ): Promise<SettingsServiceResponse<UserSettings>> {
    return settingsService.updateAccessibility(userId, data, sessionToken);
  }

  static updatePerformance(
    userId: string,
    data: UpdatePerformanceRequest,
    sessionToken?: string
  ): Promise<SettingsServiceResponse<UserSettings>> {
    return settingsService.updatePerformance(userId, data, sessionToken);
  }

  static updateProfile(
    userId: string,
    data: UpdateProfileRequest,
    sessionToken?: string
  ): Promise<SettingsServiceResponse<UserSettings>> {
    return settingsService.updateProfile(userId, data, sessionToken);
  }

  static changePassword(
    userId: string,
    data: ChangePasswordRequest,
    sessionToken?: string
  ): Promise<SettingsServiceResponse<void>> {
    return settingsService.changePassword(userId, data, sessionToken);
  }

  static resetSettings(userId: string, sessionToken?: string): Promise<SettingsServiceResponse<UserSettings>> {
    return settingsService.resetSettings(userId, sessionToken);
  }

  static exportUserData(
    userId: string,
    sessionToken?: string
  ): Promise<SettingsServiceResponse<Record<string, unknown>>> {
    return settingsService.exportUserData(userId, sessionToken);
  }
}

export const settingsClientService = SettingsClientService;
