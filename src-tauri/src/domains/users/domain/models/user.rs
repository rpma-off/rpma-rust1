//! User model

use crate::shared::contracts::common::*;
use serde::{Deserialize, Serialize};

/// TODO: document
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    Admin,
    Technician,
    Supervisor,
    Viewer,
}

impl std::str::FromStr for UserRole {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "admin" => Ok(Self::Admin),
            "technician" => Ok(Self::Technician),
            "supervisor" => Ok(Self::Supervisor),
            "viewer" => Ok(Self::Viewer),
            _ => Err(format!("Invalid user role: {}", s)),
        }
    }
}

impl std::fmt::Display for UserRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::Admin => "admin",
            Self::Technician => "technician",
            Self::Supervisor => "supervisor",
            Self::Viewer => "viewer",
        };
        write!(f, "{}", s)
    }
}

/// TODO: document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub email: String,
    pub username: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub full_name: String,
    pub role: UserRole,
    pub phone: Option<String>,
    pub is_active: bool,
    pub last_login_at: Option<Timestamp>,
    pub login_count: i32,
    pub preferences: Option<serde_json::Value>,
    pub synced: bool,
    pub last_synced_at: Option<Timestamp>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}


