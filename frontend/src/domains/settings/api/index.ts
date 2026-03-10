/**
 * settings Domain - Public API
 */

export { SettingsProvider, useSettingsContext } from './SettingsProvider';
/** TODO: document */
export { useSettings } from './useSettings';
/** TODO: document */
export { useSettingsActions } from './useSettingsActions';

/** TODO: document */
export { ProfileSettingsTab } from '../components/ProfileSettingsTab';
/** TODO: document */
export { PreferencesTab } from '../components/PreferencesTab';
/** TODO: document */
export { SecurityTab } from '../components/SecurityTab';
/** TODO: document */
export { PerformanceTab } from '../components/PerformanceTab';
/** TODO: document */
export { AccessibilityTab } from '../components/AccessibilityTab';
/** TODO: document */
export { NotificationsTab } from '../components/NotificationsTab';
/** TODO: document */
export { default as SettingsPageContent } from '../components/SettingsPageContent';

/** TODO: document */
export { settingsService, configurationService } from '../server';
/** TODO: document */
export { settingsIpc } from '../ipc/settings.ipc';

/** TODO: document */
export {
  DEFAULT_PROFILE,
  DEFAULT_PREFERENCES,
  DEFAULT_SECURITY,
  DEFAULT_PERFORMANCE,
  DEFAULT_ACCESSIBILITY,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_USER_SETTINGS,
  isAdminOnlyCategory,
} from '../services';

/** TODO: document */
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

/** TODO: document */
export type { Configuration, BusinessRule, SettingsCategory } from '../services';
