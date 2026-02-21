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
