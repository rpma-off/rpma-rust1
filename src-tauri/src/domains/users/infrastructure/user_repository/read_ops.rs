//! Read-only query operations for `UserRepository`.

use crate::domains::users::domain::models::user::{User, UserRole};
use crate::shared::repositories::base::{RepoError, RepoResult};
use crate::shared::repositories::cache::ttl;
use rusqlite::params;
use tracing::warn;

use super::columns::USER_COLUMNS;
use super::query::UserQuery;

impl super::UserRepository {
    /// Find user by email
    pub async fn find_by_email(&self, email: &str) -> RepoResult<Option<User>> {
        let cache_key = self.cache_key_builder.query(&["email", email]);

        if let Some(user) = self.cache.get::<User>(&cache_key) {
            return Ok(Some(user));
        }

        let sql = format!(
            r#"
            SELECT {}
            FROM users
            WHERE email = ? AND deleted_at IS NULL
            LIMIT 1
            "#,
            USER_COLUMNS
        );

        let user = self
            .db
            .query_single_as::<User>(&sql, params![email])
            .map_err(|e| RepoError::Database(format!("Failed to find user by email: {}", e)))?;

        if let Some(ref user) = user {
            self.cache.set(&cache_key, user.clone(), ttl::MEDIUM);
        }

        Ok(user)
    }

    /// Find users by role
    pub async fn find_by_role(&self, role: UserRole) -> RepoResult<Vec<User>> {
        let cache_key = self.cache_key_builder.query(&["role", &role.to_string()]);

        if let Some(users) = self.cache.get::<Vec<User>>(&cache_key) {
            return Ok(users);
        }

        let sql = format!(
            r#"
            SELECT {}
            FROM users
            WHERE role = ? AND deleted_at IS NULL
            ORDER BY full_name ASC
            "#,
            USER_COLUMNS
        );

        let users = self
            .db
            .query_as::<User>(&sql, params![role.to_string()])
            .map_err(|e| RepoError::Database(format!("Failed to find users by role: {}", e)))?;

        self.cache.set(&cache_key, users.clone(), ttl::MEDIUM);

        Ok(users)
    }

    /// Find active users
    pub async fn find_active(&self) -> RepoResult<Vec<User>> {
        let cache_key = self.cache_key_builder.query(&["active"]);

        if let Some(users) = self.cache.get::<Vec<User>>(&cache_key) {
            return Ok(users);
        }

        let sql = format!(
            r#"
            SELECT {}
            FROM users
            WHERE is_active = 1 AND deleted_at IS NULL
            ORDER BY full_name ASC
            "#,
            USER_COLUMNS
        );

        let users = self
            .db
            .query_as::<User>(&sql, [])
            .map_err(|e| RepoError::Database(format!("Failed to find active users: {}", e)))?;

        self.cache.set(&cache_key, users.clone(), ttl::SHORT);

        Ok(users)
    }

    /// Search users
    pub async fn search(&self, query: UserQuery) -> RepoResult<Vec<User>> {
        let cache_key = self.cache_key_builder.query(&[&format!("{:?}", query)]);

        if let Some(users) = self.cache.get::<Vec<User>>(&cache_key) {
            return Ok(users);
        }

        let (where_clause, params) = query.build_where_clause();
        let order_clause = query.build_order_by_clause().unwrap_or_else(|e| {
            warn!("Invalid order clause, using default: {}", e);
            "ORDER BY created_at DESC".to_string()
        });
        let (limit, _offset) = query.build_limit_offset().unwrap_or((50, None));

        let sql = format!(
            r#"
            SELECT {}
            FROM users
            {}
            {}
            LIMIT ?
            "#,
            USER_COLUMNS, where_clause, order_clause
        );

        let mut params_vec: Vec<rusqlite::types::Value> = params;
        params_vec.push(limit.into());

        let users = self
            .db
            .query_as::<User>(&sql, rusqlite::params_from_iter(params_vec.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to search users: {}", e)))?;

        self.cache.set(&cache_key, users.clone(), ttl::SHORT);

        Ok(users)
    }

    /// Count users matching query
    pub async fn count(&self, query: UserQuery) -> RepoResult<i64> {
        let (where_clause, params) = query.build_where_clause();

        let sql = format!("SELECT COUNT(*) FROM users {}", where_clause);

        let count: i64 = self
            .db
            .query_single_value(&sql, rusqlite::params_from_iter(params.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to count users: {}", e)))?;

        Ok(count)
    }

    /// Count admin users in the system
    pub async fn count_admins(&self) -> RepoResult<i64> {
        let count: i64 = self
            .db
            .query_single_value(
                "SELECT COUNT(*) FROM users WHERE role = ? AND deleted_at IS NULL",
                params![UserRole::Admin.to_string()],
            )
            .map_err(|e| RepoError::Database(format!("Failed to count admin users: {}", e)))?;
        Ok(count)
    }

    /// Get user email by ID
    pub async fn get_email_by_id(&self, id: &str) -> RepoResult<Option<String>> {
        let email: Option<String> = self
            .db
            .query_row_tuple(
                "SELECT email FROM users WHERE id = ? AND deleted_at IS NULL",
                params![id],
                |row| row.get::<_, Option<String>>(0),
            )
            .map_err(|e| RepoError::Database(format!("Failed to get user email: {}", e)))?;
        Ok(email)
    }
}
