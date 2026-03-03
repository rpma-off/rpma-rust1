/**
 * Centralized settings defaults for the Settings domain.
 *
 * These values are the **single frontend source of truth** for every
 * user-level settings category.  They mirror the Rust `Default` impls
 * in `src-tauri/src/domains/settings/domain/models/settings.rs`.
 *
 * Import from `@/domains/settings` (the public API barrel) rather than
 * reaching into this file directly.
 */

import type {
  UserPreferences,
  UserNotificationSettings,
  UserAccessibilitySettings,
  UserPerformanceSettings,
  UserSecuritySettings,
  UserProfileSettings,
  UserSettings,
} from '@/lib/backend';

// ── Per-category defaults ───────────────────────────────────────────

export const DEFAULT_PROFILE: UserProfileSettings = {
  full_name: '',
  email: '',
  phone: null,
  avatar_url: null,
  notes: null,
};

export const DEFAULT_PREFERENCES: UserPreferences = {
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

export const DEFAULT_SECURITY: UserSecuritySettings = {
  two_factor_enabled: false,
  session_timeout: 480,
};

export const DEFAULT_PERFORMANCE: UserPerformanceSettings = {
  cache_enabled: true,
  cache_size: 100,
  offline_mode: false,
  sync_on_startup: true,
  background_sync: true,
  image_compression: true,
  preload_data: false,
};

export const DEFAULT_ACCESSIBILITY: UserAccessibilitySettings = {
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

export const DEFAULT_NOTIFICATIONS: UserNotificationSettings = {
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

// ── Composite default ───────────────────────────────────────────────

export const DEFAULT_USER_SETTINGS: UserSettings = {
  profile: DEFAULT_PROFILE,
  preferences: DEFAULT_PREFERENCES,
  security: DEFAULT_SECURITY,
  performance: DEFAULT_PERFORMANCE,
  accessibility: DEFAULT_ACCESSIBILITY,
  notifications: DEFAULT_NOTIFICATIONS,
};

// ── RBAC helpers ────────────────────────────────────────────────────

/** Settings categories that require Admin role. */
export type SettingsCategory =
  | 'profile'
  | 'preferences'
  | 'security'
  | 'performance'
  | 'accessibility'
  | 'notifications'
  | 'app_settings'
  | 'system_config'
  | 'consent';

/**
 * Must stay in sync with the backend `SettingsAccessPolicy::is_admin_only()`
 * in `src-tauri/src/domains/settings/domain/policy.rs`.
 */
const ADMIN_ONLY_CATEGORIES: ReadonlySet<SettingsCategory> = new Set([
  'app_settings',
  'system_config',
]);

/** Returns `true` when the category requires Admin privileges. */
export function isAdminOnlyCategory(category: SettingsCategory): boolean {
  return ADMIN_ONLY_CATEGORIES.has(category);
}
