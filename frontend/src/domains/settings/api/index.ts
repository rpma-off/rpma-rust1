/**
 * settings Domain - Public API
 */

export { SettingsProvider, useSettingsContext } from './SettingsProvider';
export { useSettings } from './useSettings';
export { useSettingsActions } from './useSettingsActions';
export { useOrganization, useUpdateOrganization, useUploadLogo, useOrganizationSettings, useUpdateOrganizationSettings } from './useOrganization';
export { useOnboardingStatus, useCompleteOnboarding, useNeedsOnboarding } from './useOnboarding';
export { useOnboardingCheck } from '../hooks/useOnboardingCheck';
export { configurationService } from './configurationService';
export * from './defaults';

export { ProfileSettingsTab } from '../components/ProfileSettingsTab';
export { PreferencesTab } from '../components/PreferencesTab';
export { OrganizationSettingsTab } from '../components/OrganizationSettingsTab';
export { default as SettingsPageContent } from '../components/SettingsPageContent';

export type {
  Configuration,
  BusinessRule,
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
