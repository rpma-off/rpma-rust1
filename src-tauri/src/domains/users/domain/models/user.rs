//! User model

use crate::shared::contracts::common::*;
use serde::{Deserialize, Serialize};

// Re-export the canonical RBAC role from the shared kernel (ADR-003).
// A local duplicate previously existed here; consumers of
// `users::domain::models::user::UserRole` transparently get the shared type.
pub use crate::shared::contracts::auth::UserRole;

/// Core user entity. Password hash is excluded from serialization.
#[derive(Clone, Serialize, Deserialize)]
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

/// Manual `Debug` impl: redacts `password_hash` to prevent credential leakage in logs.
impl std::fmt::Debug for User {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("User")
            .field("id", &self.id)
            .field("email", &self.email)
            .field("username", &self.username)
            .field("role", &self.role)
            .field("is_active", &self.is_active)
            .field("password_hash", &"[REDACTED]")
            .finish()
    }
}
