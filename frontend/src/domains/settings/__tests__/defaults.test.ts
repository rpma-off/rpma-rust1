import {
  DEFAULT_PROFILE,
  DEFAULT_PREFERENCES,
  DEFAULT_SECURITY,
  DEFAULT_PERFORMANCE,
  DEFAULT_ACCESSIBILITY,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_USER_SETTINGS,
  isAdminOnlyCategory,
} from '../api/defaults';

describe('Settings defaults', () => {
  it('DEFAULT_PREFERENCES has expected language default', () => {
    expect(DEFAULT_PREFERENCES.language).toBe('fr');
    expect(DEFAULT_PREFERENCES.theme).toBe('system');
    expect(DEFAULT_PREFERENCES.date_format).toBe('DD/MM/YYYY');
  });

  it('DEFAULT_SECURITY has expected session_timeout', () => {
    expect(DEFAULT_SECURITY.session_timeout).toBe(480);
    expect(DEFAULT_SECURITY.two_factor_enabled).toBe(false);
  });

  it('DEFAULT_PERFORMANCE has caching enabled by default', () => {
    expect(DEFAULT_PERFORMANCE.cache_enabled).toBe(true);
    expect(DEFAULT_PERFORMANCE.cache_size).toBe(100);
  });

  it('DEFAULT_ACCESSIBILITY starts with everything off', () => {
    expect(DEFAULT_ACCESSIBILITY.high_contrast).toBe(false);
    expect(DEFAULT_ACCESSIBILITY.large_text).toBe(false);
    expect(DEFAULT_ACCESSIBILITY.focus_indicators).toBe(true);
    expect(DEFAULT_ACCESSIBILITY.font_size).toBe(16);
  });

  it('DEFAULT_NOTIFICATIONS enables core channels', () => {
    expect(DEFAULT_NOTIFICATIONS.email_enabled).toBe(true);
    expect(DEFAULT_NOTIFICATIONS.push_enabled).toBe(true);
    expect(DEFAULT_NOTIFICATIONS.sound_enabled).toBe(true);
  });

  it('DEFAULT_PROFILE is empty template', () => {
    expect(DEFAULT_PROFILE.full_name).toBe('');
    expect(DEFAULT_PROFILE.email).toBe('');
  });

  it('DEFAULT_USER_SETTINGS composes all sub-defaults', () => {
    expect(DEFAULT_USER_SETTINGS.profile).toEqual(DEFAULT_PROFILE);
    expect(DEFAULT_USER_SETTINGS.preferences).toEqual(DEFAULT_PREFERENCES);
    expect(DEFAULT_USER_SETTINGS.security).toEqual(DEFAULT_SECURITY);
    expect(DEFAULT_USER_SETTINGS.performance).toEqual(DEFAULT_PERFORMANCE);
    expect(DEFAULT_USER_SETTINGS.accessibility).toEqual(DEFAULT_ACCESSIBILITY);
    expect(DEFAULT_USER_SETTINGS.notifications).toEqual(DEFAULT_NOTIFICATIONS);
  });
});

describe('isAdminOnlyCategory', () => {
  it('marks app_settings as admin-only', () => {
    expect(isAdminOnlyCategory('app_settings')).toBe(true);
  });

  it('marks system_config as admin-only', () => {
    expect(isAdminOnlyCategory('system_config')).toBe(true);
  });

  it.each([
    'profile',
    'preferences',
    'security',
    'performance',
    'accessibility',
    'notifications',
    'consent',
  ] as const)('%s is NOT admin-only', (category) => {
    expect(isAdminOnlyCategory(category)).toBe(false);
  });
});
