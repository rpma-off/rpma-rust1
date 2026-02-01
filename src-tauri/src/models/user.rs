//! User model

use super::common::*;
use crate::db::FromSqlRow;
use rusqlite::Row;
use serde::{Deserialize, Serialize};
#[cfg(feature = "specta")]
use ts_rs::TS;

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub email: String,
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

impl FromSqlRow for User {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(User {
            id: row.get("id")?,
            email: row.get("email")?,
            password_hash: row.get("password_hash")?,
            full_name: row.get("full_name")?,
            role: match row.get::<_, String>("role")?.as_str() {
                "admin" => UserRole::Admin,
                "technician" => UserRole::Technician,
                "supervisor" => UserRole::Supervisor,
                "viewer" => UserRole::Viewer,
                _ => UserRole::Viewer,
            },
            phone: row.get("phone")?,
            is_active: row.get::<_, i32>("is_active")? != 0,
            last_login_at: row.get("last_login_at")?,
            login_count: row.get("login_count")?,
            preferences: row
                .get::<_, Option<String>>("preferences")?
                .and_then(|s| serde_json::from_str(&s).ok()),
            synced: row.get::<_, i32>("synced")? != 0,
            last_synced_at: row.get("last_synced_at")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}
