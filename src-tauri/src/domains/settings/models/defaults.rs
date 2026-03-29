use super::{
    UserAccessibilitySettings, UserNotificationSettings, UserPerformanceSettings,
    UserPreferences, UserProfileSettings, UserSecuritySettings, UserSettings,
};

pub fn default_profile() -> UserProfileSettings {
    UserProfileSettings::default()
}

pub fn default_preferences() -> UserPreferences {
    UserPreferences::default()
}

pub fn default_security() -> UserSecuritySettings {
    UserSecuritySettings::default()
}

pub fn default_performance() -> UserPerformanceSettings {
    UserPerformanceSettings::default()
}

pub fn default_accessibility() -> UserAccessibilitySettings {
    UserAccessibilitySettings::default()
}

pub fn default_notifications() -> UserNotificationSettings {
    UserNotificationSettings::default()
}

pub fn default_user_settings() -> UserSettings {
    UserSettings::default()
}
