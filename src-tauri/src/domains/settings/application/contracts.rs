//! Request and response contracts for the Settings domain.

use serde::Deserialize;

#[derive(Deserialize)]
pub struct UpdateUserSecurityRequest {
    pub session_token: String,
    pub two_factor_enabled: Option<bool>,
    pub session_timeout: Option<u32>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateSecuritySettingsRequest {
    pub session_token: String,
    pub two_factor_enabled: Option<bool>,
    pub session_timeout: Option<u32>,
    pub password_min_length: Option<u8>,
    pub password_require_special_chars: Option<bool>,
    pub password_require_numbers: Option<bool>,
    pub login_attempts_max: Option<u8>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Normalise an optional string field: trim whitespace and return `None` for
/// blank values.
pub fn normalize_profile_field(value: Option<String>) -> Option<String> {
    value.and_then(|v| {
        let trimmed = v.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

/// Apply a set of partial profile updates to an existing
/// [`UserProfileSettings`], returning the merged result.
///
/// Name handling: if `full_name` is provided it wins; otherwise
/// `first_name`/`last_name` are combined with the existing counterpart when
/// only one side is supplied.
pub fn apply_profile_updates(
    mut profile: crate::domains::settings::domain::models::settings::UserProfileSettings,
    full_name: Option<String>,
    first_name: Option<String>,
    last_name: Option<String>,
    email: Option<String>,
    phone: Option<String>,
    avatar_url: Option<String>,
    notes: Option<String>,
) -> crate::domains::settings::domain::models::settings::UserProfileSettings {
    if let Some(name) = normalize_profile_field(full_name) {
        profile.full_name = name;
    } else if first_name.is_some() || last_name.is_some() {
        let mut parts = profile.full_name.split_whitespace();
        let existing_first = parts.next().unwrap_or("").to_string();
        let existing_last = parts.collect::<Vec<_>>().join(" ");
        let next_first = normalize_profile_field(first_name).unwrap_or(existing_first);
        let next_last = normalize_profile_field(last_name).unwrap_or(existing_last);
        let combined = format!("{} {}", next_first, next_last)
            .trim()
            .to_string();
        if !combined.is_empty() {
            profile.full_name = combined;
        }
    }

    if let Some(e) = normalize_profile_field(email) {
        profile.email = e;
    }
    if phone.is_some() {
        profile.phone = normalize_profile_field(phone);
    }
    if avatar_url.is_some() {
        profile.avatar_url = normalize_profile_field(avatar_url);
    }
    if notes.is_some() {
        profile.notes = normalize_profile_field(notes);
    }

    profile
}

/// Assemble the GDPR data-export payload from the individual parts.
pub fn build_export_payload(
    user_identity: serde_json::Value,
    settings: &crate::domains::settings::domain::models::settings::UserSettings,
    consent: Option<serde_json::Value>,
) -> serde_json::Value {
    serde_json::json!({
        "exported_at": chrono::Utc::now().to_rfc3339(),
        "user": user_identity,
        "profile": settings.profile,
        "settings": settings,
        "consent": consent
    })
}
