import type {
  UserSettings,
  UserPreferences,
  UserNotificationSettings,
  UserAccessibilitySettings,
  UserPerformanceSettings,
  UserProfileSettings,
} from '@/lib/backend';

export type {
  UserSettings,
  UserPreferences,
  UserNotificationSettings as NotificationSettings,
  UserAccessibilitySettings as AccessibilitySettings,
  UserPerformanceSettings as PerformanceSettings,
  UserProfileSettings as UserProfile,
};

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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
