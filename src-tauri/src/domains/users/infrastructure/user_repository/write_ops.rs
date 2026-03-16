//! Write operations for `UserRepository`.

use crate::domains::users::domain::models::user::UserRole;
use crate::shared::repositories::base::{RepoError, RepoResult};
use rusqlite::params;
use tracing::{debug, info, instrument, warn};

impl super::UserRepository {
    /// Update user last login
    pub async fn update_last_login(&self, user_id: &str) -> RepoResult<()> {
        self.db
            .execute(
                r#"
                UPDATE users SET
                    last_login_at = (unixepoch() * 1000),
                    login_count = login_count + 1,
                    updated_at = (unixepoch() * 1000)
                WHERE id = ? AND deleted_at IS NULL
                "#,
                params![user_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to update last login: {}", e)))?;

        // Invalidate cache for this user
        self.invalidate_user_cache(user_id);

        Ok(())
    }

    /// Bootstrap the first admin user in a single transaction
    #[instrument(skip(self), fields(user_id = %user_id))]
    pub async fn bootstrap_first_admin(&self, user_id: &str) -> RepoResult<String> {
        info!("Starting admin bootstrap transaction");

        let mut conn = self.db.get_connection().map_err(|e| {
            RepoError::Database(format!(
                "Failed to get connection for bootstrap admin: {}",
                e
            ))
        })?;

        let tx = conn.transaction().map_err(|e| {
            RepoError::Database(format!(
                "Failed to start bootstrap admin transaction: {}",
                e
            ))
        })?;

        let admin_count: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM users WHERE role = ? AND deleted_at IS NULL",
                params![UserRole::Admin.to_string()],
                |row| row.get(0),
            )
            .map_err(|e| RepoError::Database(format!("Failed to count admins: {}", e)))?;

        if admin_count > 0 {
            warn!(admin_count, "Admin already exists, bootstrap blocked");
            return Err(RepoError::Conflict(
                "An admin user already exists".to_string(),
            ));
        }

        let (user_email, is_active): (String, i32) = match tx.query_row(
            "SELECT email, is_active FROM users WHERE id = ? AND deleted_at IS NULL",
            params![user_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        ) {
            Ok(result) => result,
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                warn!("User not found for bootstrap");
                return Err(RepoError::NotFound("User not found".to_string()));
            }
            Err(e) => {
                return Err(RepoError::Database(format!(
                    "Failed to load user for bootstrap: {}",
                    e
                )))
            }
        };

        if is_active == 0 {
            warn!("User is inactive, bootstrap blocked");
            return Err(RepoError::Validation("User is inactive".to_string()));
        }

        let rows_affected = tx
            .execute(
                "UPDATE users SET role = ?, updated_at = (unixepoch() * 1000) WHERE id = ? AND deleted_at IS NULL",
                params![UserRole::Admin.to_string(), user_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to update user role: {}", e)))?;

        if rows_affected == 0 {
            warn!("No rows updated during bootstrap");
            return Err(RepoError::NotFound("User not found".to_string()));
        }

        tx.execute(
            "INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, old_values, new_values, timestamp)
             VALUES (?, ?, 'bootstrap_admin', 'user', ?, ?, ?, (unixepoch() * 1000))",
            params![user_id, user_email, user_id, UserRole::Viewer.to_string(), UserRole::Admin.to_string()],
        )
        .map_err(|e| RepoError::Database(format!("Failed to create audit log: {}", e)))?;

        tx.commit()
            .map_err(|e| RepoError::Database(format!("Failed to commit bootstrap: {}", e)))?;

        self.invalidate_user_cache(user_id);
        self.invalidate_all_cache();

        debug!("Admin bootstrap transaction committed");
        Ok(user_email)
    }

    /// Update user role to admin
    pub async fn update_role_to_admin(&self, user_id: &str) -> RepoResult<bool> {
        let rows_affected = self
            .db
            .execute(
                "UPDATE users SET role = ?, updated_at = (unixepoch() * 1000) WHERE id = ? AND deleted_at IS NULL",
                params![UserRole::Admin.to_string(), user_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to update user role: {}", e)))?;

        if rows_affected > 0 {
            self.invalidate_user_cache(user_id);
        }

        Ok(rows_affected > 0)
    }

    /// Create an audit log entry for admin bootstrap
    pub async fn create_admin_bootstrap_audit_log(
        &self,
        user_id: &str,
        user_email: &str,
    ) -> RepoResult<()> {
        self.db
            .execute(
                "INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, old_values, new_values, timestamp)
                 VALUES (?, ?, 'bootstrap_admin', 'user', ?, 'viewer', 'admin', (unixepoch() * 1000))",
                params![user_id, user_email, user_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to create audit log: {}", e)))?;
        Ok(())
    }
}
