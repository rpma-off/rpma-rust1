import { ipcClient } from '@/lib/ipc';
import type {
  AppSettings,
  GeneralSettings,
  SecuritySettings,
  NotificationSettings as BackendNotificationSettings,
  AppearanceSettings,
  DataManagementSettings,
  DatabaseSettings,
  IntegrationSettings,
  PerformanceSettings as BackendPerformanceSettings,
  BackupSettings,
  DiagnosticSettings,
  SystemConfiguration,
} from '@/lib/backend';
import type {
  UserSettings,
  UpdatePreferencesRequest,
  UpdateNotificationsRequest,
  UpdateAccessibilityRequest,
  UpdatePerformanceRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  ApiResponse
} from '@/types/settings.types';
import { notificationService, NotificationConfig } from '@/lib/services/notifications.service';

// Settings service class
export class SettingsService {
  static async getUserSettings(userId: string, sessionToken?: string): Promise<ApiResponse<UserSettings>> {
    try {
      const settings = await ipcClient.settings.getAppSettings(sessionToken) as AppSettings;
      // Helper to convert null to undefined
      const nullToUndefined = <T>(value: T | null): T | undefined => value ?? undefined;

      // Map backend settings to frontend format
      const userSettings: UserSettings = {
        preferences: {
          theme: 'light', // Default, would be stored per user
          language: nullToUndefined(settings.general.language),
          timezone: nullToUndefined(settings.general.timezone)
        },
        notifications: {
          email: nullToUndefined(settings.notifications.email_notifications),
          push: nullToUndefined(settings.notifications.push_notifications),
          sms: nullToUndefined(settings.notifications.sms_notifications)
        },
        accessibility: {
          fontSize: 'medium',
          highContrast: false,
          screenReader: false
        },
        performance: {
          animationsEnabled: true,
          autoRefresh: true
        }
      };
      return { success: true, data: userSettings };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user settings'
      };
    }
  }

  static async updatePreferences(userId: string, data: UpdatePreferencesRequest): Promise<ApiResponse<UserSettings>> {
    // Implementation
    throw new Error('Not implemented');
  }

  static async updateNotifications(userId: string, data: UpdateNotificationsRequest, sessionToken: string): Promise<ApiResponse<UserSettings>> {
    try {
      // Map frontend format to backend format
      const backendRequest = {
        push_notifications: data.push,
        email_notifications: data.email,
        sms_notifications: data.sms,
        task_assignments: data.events?.newAssignments,
        task_completions: data.events?.taskUpdates, // Map appropriately
        system_alerts: data.events?.systemAlerts,
        daily_digest: data.frequency === 'daily'
      };

      await ipcClient.settings.updateNotificationSettings(backendRequest, sessionToken) as BackendNotificationSettings;

      // Return updated settings
      return this.getUserSettings(userId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update notifications'
      };
    }
  }

  static async initializeNotificationService(config: NotificationConfig, sessionToken: string): Promise<ApiResponse<void>> {
    try {
      await notificationService.initializeNotificationService(config, sessionToken);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize notification service'
      };
    }
  }

  static async updateAccessibility(userId: string, data: UpdateAccessibilityRequest): Promise<ApiResponse<UserSettings>> {
    // Implementation
    throw new Error('Not implemented');
  }

  static async updatePerformance(userId: string, data: UpdatePerformanceRequest): Promise<ApiResponse<UserSettings>> {
    // Implementation
    throw new Error('Not implemented');
  }

  static async updateProfile(userId: string, data: UpdateProfileRequest): Promise<ApiResponse<UserSettings>> {
    // Implementation
    throw new Error('Not implemented');
  }

  static async changePassword(userId: string, data: ChangePasswordRequest): Promise<ApiResponse<void>> {
    // Implementation
    throw new Error('Not implemented');
  }

  static async resetSettings(userId: string): Promise<ApiResponse<UserSettings>> {
    // Implementation
    throw new Error('Not implemented');
  }

  static async exportUserData(userId: string): Promise<ApiResponse<Blob>> {
    // Implementation
    throw new Error('Not implemented');
  }
}

// Export singleton instance
export const settingsService = SettingsService;