//! User CRUD operations — list, get, update, delete.

use crate::domains::auth::domain::models::auth::{UserAccount, UserRole};
use chrono::Utc;
use rusqlite::params;

impl super::AuthService {
    /// List all users with optional filters
    pub fn list_users(
        &self,
        limit: Option<i32>,
        offset: Option<i32>,
    ) -> Result<Vec<UserAccount>, String> {
        let conn = self.db.get_connection()?;
        let limit = limit.unwrap_or(50);
        let offset = offset.unwrap_or(0);

        let mut stmt = conn.prepare(
            "SELECT id, email, username, password_hash, salt, first_name, last_name, role, phone, is_active, last_login_at, login_count, preferences, synced, last_synced_at, created_at, updated_at
              FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?"
        ).map_err(|e| format!("Failed to prepare statement: {}", e))?;

        let users = stmt
            .query_map(params![limit, offset], |row| {
                let role_str: String = row.get(7)?;
                let role = match role_str.as_str() {
                    "admin" => UserRole::Admin,
                    "technician" => UserRole::Technician,
                    "supervisor" => UserRole::Supervisor,
                    "viewer" => UserRole::Viewer,
                    _ => UserRole::Viewer,
                };

                Ok(UserAccount {
                    id: row.get(0)?,
                    email: row.get(1)?,
                    username: row.get(2)?,
                    password_hash: row.get(3)?,
                    salt: row.get(4)?,
                    first_name: row.get(5)?,
                    last_name: row.get(6)?,
                    role,
                    phone: row.get(8)?,
                    is_active: row.get::<_, i32>(9)? != 0,
                    last_login: row.get(10)?,
                    login_count: row.get(11)?,
                    preferences: row.get(12)?,
                    synced: row.get::<_, i32>(13)? != 0,
                    last_synced_at: row.get(14)?,
                    created_at: row.get(15)?,
                    updated_at: row.get(16)?,
                })
            })
            .map_err(|e| format!("Failed to query users: {}", e))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to collect users: {}", e))?;

        Ok(users)
    }

    /// Get user by ID
    pub fn get_user(&self, user_id: &str) -> Result<Option<UserAccount>, String> {
        let conn = self.db.get_connection()?;

        let user = conn.query_row(
            "SELECT id, email, username, password_hash, salt, first_name, last_name, role, phone, is_active, last_login_at, login_count, preferences, synced, last_synced_at, created_at, updated_at
              FROM users WHERE id = ?",
            [user_id],
            |row| {
                let role_str: String = row.get(7)?;
                let role = match role_str.as_str() {
                    "admin" => UserRole::Admin,
                    "technician" => UserRole::Technician,
                    "supervisor" => UserRole::Supervisor,
                    "viewer" => UserRole::Viewer,
                    _ => UserRole::Viewer,
                };

                Ok(UserAccount {
                    id: row.get(0)?,
                    email: row.get(1)?,
                    username: row.get(2)?,
                    password_hash: row.get(3)?,
                    salt: row.get(4)?,
                    first_name: row.get(5)?,
                    last_name: row.get(6)?,
                    role,
                    phone: row.get(8)?,
                    is_active: row.get::<_, i32>(9)? != 0,
                    last_login: row.get(10)?,
                    login_count: row.get(11)?,
                    preferences: row.get(12)?,
                    synced: row.get::<_, i32>(13)? != 0,
                    last_synced_at: row.get(14)?,
                    created_at: row.get(15)?,
                    updated_at: row.get(16)?,
                })
            },
        );

        match user {
            Ok(user) => Ok(Some(user)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(format!("Database error: {}", e)),
        }
    }

    /// Update user account
    pub fn update_user(
        &self,
        user_id: &str,
        email: Option<&str>,
        first_name: Option<&str>,
        last_name: Option<&str>,
        role: Option<UserRole>,
        is_active: Option<bool>,
    ) -> Result<UserAccount, String> {
        let conn = self.db.get_connection()?;

        // Get current user
        let mut current_user = self
            .get_user(user_id)?
            .ok_or_else(|| "User not found".to_string())?;

        // Update fields
        if let Some(email) = email {
            current_user.email = email.to_string();
        }
        if let Some(first_name) = first_name {
            current_user.first_name = first_name.to_string();
        }
        if let Some(last_name) = last_name {
            current_user.last_name = last_name.to_string();
        }
        if let Some(role) = role {
            current_user.role = role;
        }
        if let Some(is_active) = is_active {
            current_user.is_active = is_active;
        }

        current_user.updated_at = Utc::now().timestamp_millis();

        // Update in database
        conn.execute(
            "UPDATE users SET email = ?, first_name = ?, last_name = ?, role = ?, phone = ?, is_active = ?, preferences = ?, synced = ?, last_synced_at = ?, updated_at = ? WHERE id = ?",
            params![
                current_user.email,
                current_user.first_name,
                current_user.last_name,
                current_user.role.to_string(),
                current_user.phone,
                current_user.is_active as i32,
                current_user.preferences,
                current_user.synced as i32,
                current_user.last_synced_at,
                current_user.updated_at,
                user_id,
            ],
        ).map_err(|e| format!("Failed to update user: {}", e))?;

        Ok(current_user)
    }

    /// Delete user (soft delete by setting inactive)
    pub fn delete_user(&self, user_id: &str) -> Result<(), String> {
        let conn = self.db.get_connection()?;

        conn.execute(
            "UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?",
            params![Utc::now().timestamp_millis(), user_id],
        )
        .map_err(|e| format!("Failed to delete user: {}", e))?;

        Ok(())
    }
}
