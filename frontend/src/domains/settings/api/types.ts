import type { UserSettings } from '@/lib/backend';
import type {
  UpdatePreferencesRequest,
  UpdateNotificationsRequest,
  UpdateAccessibilityRequest,
  UpdatePerformanceRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from '@/types/settings.types';

export type {
  UserSettings,
  UpdatePreferencesRequest,
  UpdateNotificationsRequest,
  UpdateAccessibilityRequest,
  UpdatePerformanceRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
};

export interface Configuration {
  id: string;
  key: string;
  value: unknown;
  category: string;
}

export interface BusinessRule {
  id: string;
  name: string;
  description?: string;
  category: string;
  condition: string;
  action: string;
  priority: 'low' | 'medium' | 'high';
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface UseSettingsResult {
  settings: UserSettings | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
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
