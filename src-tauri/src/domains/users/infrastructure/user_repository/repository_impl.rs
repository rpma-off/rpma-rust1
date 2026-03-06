//! `Repository<User, String>` trait implementation for `UserRepository`.

use crate::domains::users::domain::models::user::User;
use crate::shared::repositories::base::{RepoError, RepoResult, Repository};
use crate::shared::repositories::cache::ttl;
use async_trait::async_trait;
use rusqlite::params;

use super::columns::USER_COLUMNS;

#[async_trait]
impl Repository<User, String> for super::UserRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<User>> {
        let cache_key = self.cache_key_builder.id(&id);

        if let Some(user) = self.cache.get::<User>(&cache_key) {
            return Ok(Some(user));
        }

        let sql = format!(
            r#"
            SELECT {}
            FROM users
            WHERE id = ? AND deleted_at IS NULL
            "#,
            USER_COLUMNS
        );

        let user = self
            .db
            .query_single_as::<User>(&sql, params![id])
            .map_err(|e| RepoError::Database(format!("Failed to find user by id: {}", e)))?;

        if let Some(ref user) = user {
            self.cache.set(&cache_key, user.clone(), ttl::LONG);
        }

        Ok(user)
    }

    async fn find_all(&self) -> RepoResult<Vec<User>> {
        let cache_key = self.cache_key_builder.list(&["all"]);

        if let Some(users) = self.cache.get::<Vec<User>>(&cache_key) {
            return Ok(users);
        }

        let sql = format!(
            r#"
            SELECT {}
            FROM users
            WHERE deleted_at IS NULL
            ORDER BY full_name ASC
            "#,
            USER_COLUMNS
        );

        let users = self
            .db
            .query_as::<User>(&sql, [])
            .map_err(|e| RepoError::Database(format!("Failed to find all users: {}", e)))?;

        self.cache.set(&cache_key, users.clone(), ttl::MEDIUM);

        Ok(users)
    }

    async fn save(&self, entity: User) -> RepoResult<User> {
        let exists = self.exists_by_id(entity.id.clone()).await?;

        let preferences_json = entity
            .preferences
            .map(|v| serde_json::to_string(&v).unwrap_or_default())
            .unwrap_or_default();

        if exists {
            // Update existing user
            self.db
                .execute(
                    r#"
                    UPDATE users SET
                        email = ?, username = ?, password_hash = ?, full_name = ?, role = ?, phone = ?, is_active = ?,
                        preferences = ?, updated_at = (unixepoch() * 1000)
                    WHERE id = ?
                    "#,
                    params![
                        entity.email,
                        entity.username,
                        entity.password_hash,
                        entity.full_name,
                        entity.role.to_string(),
                        entity.phone,
                        entity.is_active,
                        preferences_json,
                        entity.id,
                    ],
                )
                .map_err(|e| RepoError::Database(format!("Failed to update user: {}", e)))?;
        } else {
            // Create new user
            self.db
                .execute(
                    r#"
                    INSERT INTO users (
                        id, email, username, password_hash, full_name, role, phone, is_active,
                        preferences, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, (unixepoch() * 1000), (unixepoch() * 1000))
                    "#,
                    params![
                        entity.id,
                        entity.email,
                        entity.username,
                        entity.password_hash,
                        entity.full_name,
                        entity.role.to_string(),
                        entity.phone,
                        entity.is_active,
                        preferences_json,
                    ],
                )
                .map_err(|e| RepoError::Database(format!("Failed to create user: {}", e)))?;
        }

        // Invalidate cache
        self.invalidate_user_cache(&entity.id);

        // Return the saved user
        self.find_by_id(entity.id)
            .await?
            .ok_or_else(|| RepoError::NotFound("User not found after save".to_string()))
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        let rows_affected = self
            .db
            .execute(
                "UPDATE users SET deleted_at = (unixepoch() * 1000), updated_at = (unixepoch() * 1000) WHERE id = ? AND deleted_at IS NULL",
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to delete user: {}", e)))?;

        if rows_affected > 0 {
            // Invalidate cache
            self.invalidate_user_cache(&id);
        }

        Ok(rows_affected > 0)
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let count: i64 = self
            .db
            .query_single_value(
                "SELECT COUNT(*) FROM users WHERE id = ? AND deleted_at IS NULL",
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to check user existence: {}", e)))?;

        Ok(count > 0)
    }
}
