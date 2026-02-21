/**
 * settings Domain - Public API
 */

export { SettingsProvider, useSettingsContext } from './SettingsProvider';
export { useSettings } from './useSettings';
export { useSettingsActions } from './useSettingsActions';

export { ProfileSettingsTab } from '../components/ProfileSettingsTab';
export { PreferencesTab } from '../components/PreferencesTab';
export { SecurityTab } from '../components/SecurityTab';
export { PerformanceTab } from '../components/PerformanceTab';
export { AccessibilityTab } from '../components/AccessibilityTab';
export { NotificationsTab } from '../components/NotificationsTab';

export { settingsService, configurationService } from '../server';

export type {
  UserSettings,
  UpdatePreferencesRequest,
  UpdateNotificationsRequest,
  UpdateAccessibilityRequest,
  UpdatePerformanceRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  UseSettingsResult,
  UseSettingsActionsResult,
} from './types';

export type { Configuration, BusinessRule } from '../services';
