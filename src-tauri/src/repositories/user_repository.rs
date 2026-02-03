//! User repository implementation
//!
//! Provides consistent database access patterns for User entities.

use crate::db::Database;
use crate::models::user::{User, UserRole};
use crate::repositories::base::{Repository, RepoError, RepoResult};
use crate::repositories::cache::{Cache, CacheKeyBuilder, ttl};
use async_trait::async_trait;
use rusqlite::params;
use std::sync::Arc;

/// Query for filtering users
#[derive(Debug, Clone, Default)]
pub struct UserQuery {
    pub search: Option<String>,
    pub role: Option<UserRole>,
    pub is_active: Option<bool>,
    pub email: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

impl UserQuery {
    fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>) {
        let mut conditions = vec!["deleted_at IS NULL".to_string()];
        let mut params: Vec<rusqlite::types::Value> = Vec::new();

        if let Some(search) = &self.search {
            conditions.push("(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)".to_string());
            params.push(format!("%{}%", search).into());
            params.push(format!("%{}%", search).into());
            params.push(format!("%{}%", search).into());
        }

        if let Some(role) = &self.role {
            conditions.push("role = ?".to_string());
            params.push(role.to_string().into());
        }

        if let Some(is_active) = self.is_active {
            conditions.push("is_active = ?".to_string());
            params.push((if is_active { 1 } else { 0 }).into());
        }

        if let Some(email) = &self.email {
            conditions.push("email = ?".to_string());
            params.push(email.clone().into());
        }

        let where_clause = if conditions.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", conditions.join(" AND "))
        };

        (where_clause, params)
    }

    fn validate_sort_column(sort_by: &str) -> Result<String, RepoError> {
        let allowed_columns = [
            "created_at", "updated_at", "email", "full_name", "role", "phone",
            "is_active", "last_login_at", "login_count"
        ];
        allowed_columns.iter()
            .find(|&&col| col == sort_by)
            .map(|s| s.to_string())
            .ok_or_else(|| RepoError::Validation(format!("Invalid sort column: {}", sort_by)))
    }

    fn build_order_by_clause(&self) -> Result<String, RepoError> {
        let sort_by = Self::validate_sort_column(
            self.sort_by.as_deref().unwrap_or("created_at")
        )?;
        let sort_order = match self.sort_order.as_deref() {
            Some("ASC") => "ASC",
            Some("DESC") => "DESC",
            _ => "DESC",
        };
        Ok(format!("ORDER BY {} {}", sort_by, sort_order))
    }

    fn build_limit_offset(&self) -> Option<(i64, Option<i64>)> {
        match (self.limit, self.offset) {
            (Some(limit), offset) => Some((limit, offset)),
            _ => None,
        }
    }
}

/// User repository for database operations
#[derive(Debug)]
pub struct UserRepository {
    db: Arc<Database>,
    cache: Arc<Cache>,
    cache_key_builder: CacheKeyBuilder,
}

impl UserRepository {
    /// Create a new UserRepository
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self {
            db,
            cache,
            cache_key_builder: CacheKeyBuilder::new("user"),
        }
    }

    /// Find user by email
    pub async fn find_by_email(&self, email: &str) -> RepoResult<Option<User>> {
        let cache_key = self.cache_key_builder.query(&["email", email]);

        if let Some(user) = self.cache.get::<User>(&cache_key) {
            return Ok(Some(user));
        }

        let user = self
            .db
            .query_single_as::<User>(
                r#"
                SELECT
                    id, email, password_hash, full_name, role, phone, is_active,
                    last_login_at, login_count, preferences, synced, last_synced_at,
                    created_at, updated_at, deleted_at
                FROM users
                WHERE email = ? AND deleted_at IS NULL
                LIMIT 1
                "#,
                params![email],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find user by email: {}", e)))?;

        if let Some(ref user) = user {
            self.cache
                .set(&cache_key, user.clone(), ttl::MEDIUM);
        }

        Ok(user)
    }

    /// Find users by role
    pub async fn find_by_role(&self, role: UserRole) -> RepoResult<Vec<User>> {
        let cache_key = self
            .cache_key_builder
            .query(&["role", &role.to_string()]);

        if let Some(users) = self.cache.get::<Vec<User>>(&cache_key) {
            return Ok(users);
        }

        let users = self
            .db
            .query_as::<User>(
                r#"
                SELECT
                    id, email, username, password_hash, full_name, role, phone, is_active,
                    last_login_at, login_count, preferences, synced, last_synced_at,
                    created_at, updated_at, deleted_at
                FROM users
                WHERE role = ? AND deleted_at IS NULL
                ORDER BY full_name ASC
                "#,
                params![role.to_string()],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find users by role: {}", e)))?;

        self.cache
            .set(&cache_key, users.clone(), ttl::MEDIUM);

        Ok(users)
    }

    /// Find active users
    pub async fn find_active(&self) -> RepoResult<Vec<User>> {
        let cache_key = self.cache_key_builder.query(&["active"]);

        if let Some(users) = self.cache.get::<Vec<User>>(&cache_key) {
            return Ok(users);
        }

        let users = self
            .db
            .query_as::<User>(
                r#"
                SELECT
                    id, email, username, password_hash, full_name, role, phone, is_active,
                    last_login_at, login_count, preferences, synced, last_synced_at,
                    created_at, updated_at, deleted_at
                FROM users
                WHERE is_active = 1 AND deleted_at IS NULL
                ORDER BY full_name ASC
                "#,
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find active users: {}", e)))?;

        self.cache
            .set(&cache_key, users.clone(), ttl::SHORT);

        Ok(users)
    }

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

    /// Search users
    pub async fn search(&self, query: UserQuery) -> RepoResult<Vec<User>> {
        let cache_key = self.cache_key_builder.query(&[
            &format!("{:?}", query),
        ]);

        if let Some(users) = self.cache.get::<Vec<User>>(&cache_key) {
            return Ok(users);
        }

        let (where_clause, params) = query.build_where_clause();
        let order_clause = query.build_order_by_clause().unwrap_or_else(|e| {
            eprintln!("Invalid order clause, using default: {}", e);
            "ORDER BY created_at DESC".to_string()
        });
        let (limit, _offset) = query.build_limit_offset().unwrap_or((50, None));

        let sql = format!(
            r#"
            SELECT
                id, email, username, password_hash, full_name, role, phone, is_active,
                last_login_at, login_count, preferences, synced, last_synced_at,
                created_at, updated_at, deleted_at
            FROM users
            {}
            {}
            LIMIT ?
            "#,
            where_clause, order_clause
        );

        let mut params_vec: Vec<rusqlite::types::Value> = params;
        params_vec.push(limit.into());

        let users = self
            .db
            .query_as::<User>(&sql, rusqlite::params_from_iter(params_vec.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to search users: {}", e)))?;

        self.cache
            .set(&cache_key, users.clone(), ttl::SHORT);

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

    /// Invalidate cache for a specific user
    fn invalidate_user_cache(&self, user_id: &str) {
        self.cache.remove(&self.cache_key_builder.id(user_id));
    }

    /// Invalidate all user caches
    pub fn invalidate_all_cache(&self) {
        self.cache.clear();
    }
}

#[async_trait]
impl Repository<User, String> for UserRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<User>> {
        let cache_key = self.cache_key_builder.id(&id);

        if let Some(user) = self.cache.get::<User>(&cache_key) {
            return Ok(Some(user));
        }

        let user = self
            .db
            .query_single_as::<User>(
                r#"
                SELECT
                    id, email, password_hash, full_name, role, phone, is_active,
                    last_login_at, login_count, preferences, synced, last_synced_at,
                    created_at, updated_at, deleted_at
                FROM users
                WHERE id = ? AND deleted_at IS NULL
                "#,
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find user by id: {}", e)))?;

        if let Some(ref user) = user {
            self.cache
                .set(&cache_key, user.clone(), ttl::LONG);
        }

        Ok(user)
    }

    async fn find_all(&self) -> RepoResult<Vec<User>> {
        let cache_key = self.cache_key_builder.list(&["all"]);

        if let Some(users) = self.cache.get::<Vec<User>>(&cache_key) {
            return Ok(users);
        }

        let users = self
            .db
            .query_as::<User>(
                r#"
                SELECT
                    id, email, username, password_hash, full_name, role, phone, is_active,
                    last_login_at, login_count, preferences, synced, last_synced_at,
                    created_at, updated_at, deleted_at
                FROM users
                WHERE deleted_at IS NULL
                ORDER BY full_name ASC
                "#,
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find all users: {}", e)))?;

        self.cache
            .set(&cache_key, users.clone(), ttl::MEDIUM);

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;

    async fn setup_test_db() -> Database {
        Database::new_in_memory().await.unwrap()
    }

    #[tokio::test]
    async fn test_find_by_id() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = UserRepository::new(db, cache);

        // Create test user
        let user = User {
            id: "test-1".to_string(),
            email: "test@example.com".to_string(),
            username: "testuser".to_string(),
            password_hash: "hashed".to_string(),
            full_name: "Test User".to_string(),
            role: UserRole::Technician,
            phone: None,
            is_active: true,
            last_login_at: None,
            login_count: 0,
            preferences: None,
            synced: false,
            last_synced_at: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
        };

        repo.save(user.clone()).await.unwrap();

        // Find by ID
        let found = repo.find_by_id("test-1".to_string()).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().id, "test-1");
    }

    #[tokio::test]
    async fn test_find_by_email() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = UserRepository::new(db, cache);

        // Create test user
        let user = User {
            id: "email-test".to_string(),
            email: "email@example.com".to_string(),
            username: "emailuser".to_string(),
            password_hash: "hashed".to_string(),
            full_name: "Email Test User".to_string(),
            role: UserRole::Technician,
            phone: None,
            is_active: true,
            last_login_at: None,
            login_count: 0,
            preferences: None,
            synced: false,
            last_synced_at: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
        };

        repo.save(user).await.unwrap();

        // Find by email
        let found = repo.find_by_email("email@example.com").await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().full_name, "Email Test User");
    }

    #[tokio::test]
    async fn test_find_by_role() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = UserRepository::new(db, cache);

        // Create test users with different roles
        for i in 0..2 {
            let user = User {
                id: format!("role-test-{}", i),
                email: format!("role{}@example.com", i),
                username: format!("roleuser{}", i),
                password_hash: "hashed".to_string(),
                full_name: format!("Role Test User {}", i),
                role: UserRole::Admin,
                phone: None,
                is_active: true,
                last_login_at: None,
                login_count: 0,
                preferences: None,
                synced: false,
                last_synced_at: None,
                created_at: chrono::Utc::now().timestamp_millis(),
                updated_at: chrono::Utc::now().timestamp_millis(),
            };
            repo.save(user).await.unwrap();
        }

        // Find by role
        let admins = repo.find_by_role(UserRole::Admin).await.unwrap();
        assert!(admins.len() >= 2);
    }

    #[tokio::test]
    async fn test_find_active() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = UserRepository::new(db, cache);

        // Create active user
        let active_user = User {
            id: "active-test".to_string(),
            email: "active@example.com".to_string(),
            username: "activeuser".to_string(),
            password_hash: "hashed".to_string(),
            full_name: "Active User".to_string(),
            role: UserRole::Technician,
            phone: None,
            is_active: true,
            last_login_at: None,
            login_count: 0,
            preferences: None,
            synced: false,
            last_synced_at: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
        };
        repo.save(active_user).await.unwrap();

        // Create inactive user
        let inactive_user = User {
            id: "inactive-test".to_string(),
            email: "inactive@example.com".to_string(),
            username: "inactiveuser".to_string(),
            password_hash: "hashed".to_string(),
            full_name: "Inactive User".to_string(),
            role: UserRole::Technician,
            phone: None,
            is_active: false,
            last_login_at: None,
            login_count: 0,
            preferences: None,
            synced: false,
            last_synced_at: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
        };
        repo.save(inactive_user).await.unwrap();

        // Find active users
        let active_users = repo.find_active().await.unwrap();
        assert!(active_users.len() >= 1);
    }

    #[tokio::test]
    async fn test_update_last_login() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = UserRepository::new(db, cache);

        // Create test user
        let user = User {
            id: "login-test".to_string(),
            email: "login@example.com".to_string(),
            username: "loginuser".to_string(),
            password_hash: "hashed".to_string(),
            full_name: "Login Test User".to_string(),
            role: UserRole::Technician,
            phone: None,
            is_active: true,
            last_login_at: None,
            login_count: 0,
            preferences: None,
            synced: false,
            last_synced_at: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
        };
        repo.save(user).await.unwrap();

        // Update last login
        repo.update_last_login("login-test").await.unwrap();

        // Verify login count increased
        let updated_user = repo.find_by_id("login-test".to_string()).await.unwrap().unwrap();
        assert_eq!(updated_user.login_count, 1);
        assert!(updated_user.last_login_at.is_some());
    }

    #[tokio::test]
    async fn test_cache_hit() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = UserRepository::new(Arc::clone(&db), Arc::clone(&cache));

        // Create test user
        let user = User {
            id: "cache-test".to_string(),
            email: "cache@example.com".to_string(),
            username: "cacheuser".to_string(),
            password_hash: "hashed".to_string(),
            full_name: "Cache Test User".to_string(),
            role: UserRole::Technician,
            phone: None,
            is_active: true,
            last_login_at: None,
            login_count: 0,
            preferences: None,
            synced: false,
            last_synced_at: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
        };

        repo.save(user).await.unwrap();

        // First call - cache miss, hit database
        let _ = repo.find_by_id("cache-test".to_string()).await.unwrap();

        // Second call - cache hit
        let found = repo.find_by_id("cache-test".to_string()).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().full_name, "Cache Test User");
    }

    #[tokio::test]
    async fn test_search() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = UserRepository::new(db, cache);

        // Create test users
        for i in 0..3 {
            let user = User {
                id: format!("search-{}", i),
                email: format!("search{}@example.com", i),
                username: format!("searchuser{}", i),
                password_hash: "hashed".to_string(),
                full_name: format!("Search User {}", i),
                role: UserRole::Technician,
                phone: None,
                is_active: true,
                last_login_at: None,
                login_count: 0,
                preferences: None,
                synced: false,
                last_synced_at: None,
                created_at: chrono::Utc::now().timestamp_millis(),
                updated_at: chrono::Utc::now().timestamp_millis(),
            };

            repo.save(user).await.unwrap();
        }

        // Search users
        let query = UserQuery {
            search: Some("Search".to_string()),
            ..Default::default()
        };

        let results = repo.search(query).await.unwrap();
        assert!(results.len() >= 3);
    }
}

// Additional methods for UserRepository that are not part of Repository trait
impl UserRepository {
    /// Count admin users in the system
    pub async fn count_admins(&self) -> RepoResult<i64> {
        let count: i64 = self
            .db
            .query_single_value(
                "SELECT COUNT(*) FROM users WHERE role = 'admin' AND deleted_at IS NULL",
                [],
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

    /// Update user role to admin
    pub async fn update_role_to_admin(&self, user_id: &str) -> RepoResult<bool> {
        let rows_affected = self
            .db
            .execute(
                "UPDATE users SET role = 'admin', updated_at = (unixepoch() * 1000) WHERE id = ? AND deleted_at IS NULL",
                params![user_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to update user role: {}", e)))?;
        
        if rows_affected > 0 {
            self.invalidate_user_cache(user_id);
        }
        
        Ok(rows_affected > 0)
    }

    /// Create an audit log entry for admin bootstrap
    pub async fn create_admin_bootstrap_audit_log(&self, user_id: &str, user_email: &str) -> RepoResult<()> {
        self.db
            .execute(
                "INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, old_values, new_values, created_at)
                 VALUES (?, ?, 'bootstrap_admin', 'user', ?, 'viewer', 'admin', (unixepoch() * 1000))",
                params![user_id, user_email, user_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to create audit log: {}", e)))?;
        Ok(())
    }
}
