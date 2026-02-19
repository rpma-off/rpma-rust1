import type { UserSettings } from '@/lib/backend';
import type {
  UpdatePreferencesRequest,
  UpdateNotificationsRequest,
  UpdateAccessibilityRequest,
  UpdatePerformanceRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from '../server';

export type {
  UserSettings,
  UpdatePreferencesRequest,
  UpdateNotificationsRequest,
  UpdateAccessibilityRequest,
  UpdatePerformanceRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
};

export interface UseSettingsResult {
  settings: UserSettings | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseSettingsActionsResult {
  updatePreferences: (data: UpdatePreferencesRequest) => Promise<boolean>;
  updateNotifications: (data: UpdateNotificationsRequest) => Promise<boolean>;
  updateAccessibility: (data: UpdateAccessibilityRequest) => Promise<boolean>;
  updatePerformance: (data: UpdatePerformanceRequest) => Promise<boolean>;
  updateProfile: (data: UpdateProfileRequest) => Promise<boolean>;
  changePassword: (data: ChangePasswordRequest) => Promise<boolean>;
  resetSettings: () => Promise<boolean>;
}
