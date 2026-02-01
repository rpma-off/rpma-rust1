//! Authentication models for local user sessions

use crate::models::common::{now, serialize_optional_timestamp, serialize_timestamp};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fmt;
#[cfg(any(feature = "specta", feature = "ts-rs"))]
use ts_rs::TS;

#[derive(Clone, Serialize, Deserialize, Debug)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct UserSession {
    pub id: String,
    pub user_id: String,
    pub username: String,
    pub email: String,
    pub role: UserRole,
    pub token: String,
    pub refresh_token: Option<String>,
    pub expires_at: String,    // ISO timestamp string
    pub last_activity: String, // ISO timestamp string
    pub created_at: String,    // ISO timestamp string
    // Extended session metadata for management
    pub device_info: Option<DeviceInfo>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub location: Option<String>,
    pub two_factor_verified: bool,
    pub session_timeout_minutes: Option<u32>,
}

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub enum UserRole {
    #[serde(rename = "admin")]
    Admin,
    #[serde(rename = "technician")]
    Technician,
    #[serde(rename = "supervisor")]
    Supervisor,
    #[serde(rename = "viewer")]
    Viewer,
}

impl fmt::Display for UserRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> fmt::Result {
        match self {
            UserRole::Admin => write!(f, "admin"),
            UserRole::Technician => write!(f, "technician"),
            UserRole::Supervisor => write!(f, "supervisor"),
            UserRole::Viewer => write!(f, "viewer"),
        }
    }
}

impl std::str::FromStr for UserRole {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "admin" => Ok(UserRole::Admin),
            "technician" => Ok(UserRole::Technician),
            "supervisor" => Ok(UserRole::Supervisor),
            "viewer" => Ok(UserRole::Viewer),
            _ => Err(format!("Unknown role: {}", s)),
        }
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
pub struct DeviceInfo {
    pub device_type: String, // "desktop", "mobile", "tablet"
    pub os: String,          // "Windows", "macOS", "Linux", "iOS", "Android"
    pub browser: Option<String>,
    pub device_name: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct TwoFactorConfig {
    pub enabled: bool,
    pub secret: Option<String>,      // Encrypted TOTP secret
    pub backup_codes: Vec<String>,   // Encrypted backup codes
    pub verified_at: Option<String>, // ISO timestamp when 2FA was verified
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct TwoFactorSetup {
    pub secret: String,
    pub qr_code_url: String,
    pub backup_codes: Vec<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct SessionTimeoutConfig {
    pub default_timeout_minutes: u32,
    pub max_timeout_minutes: u32,
    pub enforce_timeout: bool,
}

impl UserSession {
    pub fn new(
        user_id: String,
        username: String,
        email: String,
        role: UserRole,
        token: String,
        refresh_token: Option<String>,
        expires_in_seconds: i64,
    ) -> Self {
        let now = Utc::now();
        let expires_at = now + chrono::Duration::seconds(expires_in_seconds);
        Self {
            id: token.clone(),
            user_id,
            username,
            email,
            role,
            token,
            refresh_token,
            expires_at: expires_at.to_rfc3339(),
            last_activity: now.to_rfc3339(),
            created_at: now.to_rfc3339(),
            device_info: None,
            ip_address: None,
            user_agent: None,
            location: None,
            two_factor_verified: false,
            session_timeout_minutes: None,
        }
    }

    pub fn new_with_metadata(
        user_id: String,
        username: String,
        email: String,
        role: UserRole,
        token: String,
        refresh_token: Option<String>,
        expires_in_seconds: i64,
        device_info: Option<DeviceInfo>,
        ip_address: Option<String>,
        user_agent: Option<String>,
        location: Option<String>,
        two_factor_verified: bool,
        session_timeout_minutes: Option<u32>,
    ) -> Self {
        let now = Utc::now();
        let expires_at = now + chrono::Duration::seconds(expires_in_seconds);
        Self {
            id: token.clone(),
            user_id,
            username,
            email,
            role,
            token,
            refresh_token,
            expires_at: expires_at.to_rfc3339(),
            last_activity: now.to_rfc3339(),
            created_at: now.to_rfc3339(),
            device_info,
            ip_address,
            user_agent,
            location,
            two_factor_verified,
            session_timeout_minutes,
        }
    }

    pub fn is_expired(&self) -> bool {
        match DateTime::parse_from_rfc3339(&self.expires_at) {
            Ok(expires_at) => Utc::now() > expires_at.with_timezone(&Utc),
            Err(_) => true, // If we can't parse, consider expired
        }
    }

    pub fn update_activity(&mut self) {
        self.last_activity = Utc::now().to_rfc3339();
    }

    pub fn extend_session(&mut self, additional_seconds: i64) {
        match DateTime::parse_from_rfc3339(&self.expires_at) {
            Ok(current_expires) => {
                let new_expires = current_expires + chrono::Duration::seconds(additional_seconds);
                self.expires_at = new_expires.to_rfc3339();
            }
            Err(_) => {
                // Fallback: set to now + additional_seconds
                let new_expires = Utc::now() + chrono::Duration::seconds(additional_seconds);
                self.expires_at = new_expires.to_rfc3339();
            }
        }
        self.update_activity();
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[cfg_attr(any(feature = "specta", feature = "ts-rs"), derive(TS))]
#[cfg_attr(feature = "ts-rs", ts(export))]
pub struct UserAccount {
    pub id: String,
    pub email: String,
    pub username: String,
    pub first_name: String,
    pub last_name: String,
    pub role: UserRole,
    pub password_hash: String,
    pub salt: Option<String>,
    pub phone: Option<String>,
    pub is_active: bool,
    pub last_login: Option<i64>,
    pub login_count: i32,
    pub preferences: Option<String>,
    pub synced: bool,
    #[serde(serialize_with = "serialize_optional_timestamp")]
    #[cfg_attr(feature = "ts-rs", ts(type = "string | null"))]
    pub last_synced_at: Option<i64>,
    #[serde(serialize_with = "serialize_timestamp")]
    #[cfg_attr(feature = "ts-rs", ts(type = "string"))]
    pub created_at: i64,
    #[serde(serialize_with = "serialize_timestamp")]
    #[cfg_attr(feature = "ts-rs", ts(type = "string"))]
    pub updated_at: i64,
}

impl UserAccount {
    pub fn new(
        email: String,
        username: String,
        first_name: String,
        role: UserRole,
        password_hash: String,
    ) -> Self {
        let now = now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            email,
            username,
            first_name,
            last_name: "".to_string(), // Add last_name parameter or default
            role,
            password_hash,
            salt: None,
            phone: None,
            is_active: true,
            last_login: None,
            login_count: 0,
            preferences: None,
            synced: false,
            last_synced_at: None,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn update_last_login(&mut self) {
        self.last_login = Some(now());
        self.login_count += 1;
        self.updated_at = now();
    }
}
