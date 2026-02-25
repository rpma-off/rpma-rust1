//! Authentication models for local user sessions

use crate::shared::contracts::common::{now, serialize_optional_timestamp, serialize_timestamp};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fmt;
use ts_rs::TS;

/// A simplified session stored as a UUID in SQLite (no JWT, no 2FA).
#[derive(Clone, Serialize, Deserialize, Debug, TS)]
pub struct UserSession {
    pub id: String, // UUID — also the session token
    pub user_id: String,
    pub username: String,
    pub email: String,
    pub role: UserRole,
    pub token: String,         // alias of id
    pub expires_at: String,    // RFC3339
    pub last_activity: String, // RFC3339
    pub created_at: String,    // RFC3339
}

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, TS)]
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

/// Kept for backward-compatible IPC responses; session timeout is fixed at 8h.
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct SessionTimeoutConfig {
    pub default_timeout_minutes: u32,
    pub max_timeout_minutes: u32,
    pub enforce_timeout: bool,
}

impl Default for SessionTimeoutConfig {
    fn default() -> Self {
        Self {
            default_timeout_minutes: 480, // 8 hours
            max_timeout_minutes: 1440,    // 24 hours
            enforce_timeout: true,
        }
    }
}

impl UserSession {
    pub fn new(
        user_id: String,
        username: String,
        email: String,
        role: UserRole,
        token: String,
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
            expires_at: expires_at.to_rfc3339(),
            last_activity: now.to_rfc3339(),
            created_at: now.to_rfc3339(),
        }
    }

    pub fn is_expired(&self) -> bool {
        match DateTime::parse_from_rfc3339(&self.expires_at) {
            Ok(expires_at) => Utc::now() > expires_at.with_timezone(&Utc),
            Err(_) => true,
        }
    }

    pub fn update_activity(&mut self) {
        self.last_activity = Utc::now().to_rfc3339();
    }
}

#[derive(Clone, Serialize, Deserialize, Debug, TS)]
#[ts(export)]
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
    #[ts(type = "string | null")]
    pub last_synced_at: Option<i64>,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub created_at: i64,
    #[serde(serialize_with = "serialize_timestamp")]
    #[ts(type = "string")]
    pub updated_at: i64,
}

impl UserAccount {
    pub fn new(
        email: String,
        username: String,
        first_name: String,
        last_name: String,
        role: UserRole,
        password_hash: String,
    ) -> Self {
        let now = now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            email,
            username,
            first_name,
            last_name,
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
