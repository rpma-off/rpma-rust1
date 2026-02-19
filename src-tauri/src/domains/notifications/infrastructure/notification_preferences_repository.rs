//! Notification preferences repository implementation
//!
//! Provides consistent database access patterns for NotificationPreferences entities.

use crate::db::Database;
use crate::models::notification::NotificationPreferences;
use crate::repositories::base::{RepoError, RepoResult, Repository};
use crate::repositories::cache::{ttl, Cache, CacheKeyBuilder};
use async_trait::async_trait;
use rusqlite::params;
use std::sync::Arc;

/// Query for filtering notification preferences
#[derive(Debug, Clone, Default)]
pub struct NotificationPreferencesQuery {
    pub user_id: Option<String>,
    pub email_enabled: Option<bool>,
    pub sms_enabled: Option<bool>,
    pub in_app_enabled: Option<bool>,
    pub quiet_hours_enabled: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

impl NotificationPreferencesQuery {
    fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>) {
        let mut conditions = vec!["1=1".to_string()];
        let mut params: Vec<rusqlite::types::Value> = Vec::new();

        if let Some(user_id) = &self.user_id {
            conditions.push("user_id = ?".to_string());
            params.push(user_id.clone().into());
        }

        if let Some(email_enabled) = self.email_enabled {
            conditions.push("email_enabled = ?".to_string());
            params.push((if email_enabled { 1 } else { 0 }).into());
        }

        if let Some(sms_enabled) = self.sms_enabled {
            conditions.push("sms_enabled = ?".to_string());
            params.push((if sms_enabled { 1 } else { 0 }).into());
        }

        if let Some(in_app_enabled) = self.in_app_enabled {
            conditions.push("in_app_enabled = ?".to_string());
            params.push((if in_app_enabled { 1 } else { 0 }).into());
        }

        if let Some(quiet_hours_enabled) = self.quiet_hours_enabled {
            conditions.push("quiet_hours_enabled = ?".to_string());
            params.push((if quiet_hours_enabled { 1 } else { 0 }).into());
        }

        let where_clause = if conditions.len() > 1 {
            format!("WHERE {}", conditions.join(" AND "))
        } else {
            String::new()
        };

        (where_clause, params)
    }

    fn validate_sort_column(sort_by: &str) -> Result<String, RepoError> {
        crate::repositories::base::validate_sort_column(
            sort_by,
            &[
                "created_at",
                "updated_at",
                "user_id",
                "email_enabled",
                "sms_enabled",
                "in_app_enabled",
                "quiet_hours_enabled",
            ],
        )
    }

    fn build_order_by_clause(&self) -> Result<String, RepoError> {
        let sort_by = Self::validate_sort_column(self.sort_by.as_deref().unwrap_or("created_at"))?;
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

/// Notification preferences repository for database operations
pub struct NotificationPreferencesRepository {
    db: Arc<Database>,
    cache: Arc<Cache>,
    cache_key_builder: CacheKeyBuilder,
}

impl NotificationPreferencesRepository {
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self {
            db,
            cache,
            cache_key_builder: CacheKeyBuilder::new("notification_preferences"),
        }
    }

    /// Find preferences by user ID
    pub async fn find_by_user_id(
        &self,
        user_id: String,
    ) -> RepoResult<Option<NotificationPreferences>> {
        let cache_key = self.cache_key_builder.id(&user_id);

        if let Some(prefs) = self.cache.get::<NotificationPreferences>(&cache_key) {
            return Ok(Some(prefs));
        }

        let prefs = self
            .db
            .query_single_as::<NotificationPreferences>(
                "SELECT * FROM notification_preferences WHERE user_id = ?",
                params![user_id],
            )
            .map_err(|e| {
                RepoError::Database(format!("Failed to find preferences by user: {}", e))
            })?;

        if let Some(ref prefs) = prefs {
            self.cache.set(&cache_key, prefs.clone(), ttl::LONG);
        }

        Ok(prefs)
    }

    /// Get or create preferences for user (creates if not exists)
    pub async fn get_or_create(&self, user_id: String) -> RepoResult<NotificationPreferences> {
        if let Some(prefs) = self.find_by_user_id(user_id.clone()).await? {
            return Ok(prefs);
        }

        let new_prefs = NotificationPreferences::new(user_id.clone());
        self.save(new_prefs.clone()).await?;
        Ok(new_prefs)
    }

    /// Update task notification settings
    pub async fn update_task_settings(
        &self,
        user_id: String,
        task_assigned: bool,
        task_updated: bool,
        task_completed: bool,
        task_overdue: bool,
    ) -> RepoResult<NotificationPreferences> {
        let now = chrono::Utc::now().timestamp();

        self.db
            .execute(
                "UPDATE notification_preferences SET
                    task_assigned = ?, task_updated = ?, task_completed = ?, task_overdue = ?,
                    updated_at = ? WHERE user_id = ?",
                params![
                    if task_assigned { 1 } else { 0 },
                    if task_updated { 1 } else { 0 },
                    if task_completed { 1 } else { 0 },
                    if task_overdue { 1 } else { 0 },
                    now,
                    user_id,
                ],
            )
            .map_err(|e| RepoError::Database(format!("Failed to update task settings: {}", e)))?;

        self.invalidate_cache(&user_id);

        self.find_by_user_id(user_id)
            .await?
            .ok_or_else(|| RepoError::NotFound("Preferences not found after update".to_string()))
    }

    /// Update client notification settings
    pub async fn update_client_settings(
        &self,
        user_id: String,
        client_created: bool,
        client_updated: bool,
    ) -> RepoResult<NotificationPreferences> {
        let now = chrono::Utc::now().timestamp();

        self.db
            .execute(
                "UPDATE notification_preferences SET
                    client_created = ?, client_updated = ?, updated_at = ?
                    WHERE user_id = ?",
                params![
                    if client_created { 1 } else { 0 },
                    if client_updated { 1 } else { 0 },
                    now,
                    user_id,
                ],
            )
            .map_err(|e| RepoError::Database(format!("Failed to update client settings: {}", e)))?;

        self.invalidate_cache(&user_id);

        self.find_by_user_id(user_id)
            .await?
            .ok_or_else(|| RepoError::NotFound("Preferences not found after update".to_string()))
    }

    /// Update system notification settings
    pub async fn update_system_settings(
        &self,
        user_id: String,
        system_alerts: bool,
        maintenance_notifications: bool,
    ) -> RepoResult<NotificationPreferences> {
        let now = chrono::Utc::now().timestamp();

        self.db
            .execute(
                "UPDATE notification_preferences SET
                    system_alerts = ?, maintenance_notifications = ?, updated_at = ?
                    WHERE user_id = ?",
                params![
                    if system_alerts { 1 } else { 0 },
                    if maintenance_notifications { 1 } else { 0 },
                    now,
                    user_id,
                ],
            )
            .map_err(|e| RepoError::Database(format!("Failed to update system settings: {}", e)))?;

        self.invalidate_cache(&user_id);

        self.find_by_user_id(user_id)
            .await?
            .ok_or_else(|| RepoError::NotFound("Preferences not found after update".to_string()))
    }

    /// Update quiet hours settings
    pub async fn update_quiet_hours(
        &self,
        user_id: String,
        enabled: bool,
        start_time: Option<String>,
        end_time: Option<String>,
    ) -> RepoResult<NotificationPreferences> {
        let now = chrono::Utc::now().timestamp();

        self.db
            .execute(
                "UPDATE notification_preferences SET
                    quiet_hours_enabled = ?, quiet_hours_start = ?, quiet_hours_end = ?,
                    updated_at = ? WHERE user_id = ?",
                params![
                    if enabled { 1 } else { 0 },
                    start_time,
                    end_time,
                    now,
                    user_id,
                ],
            )
            .map_err(|e| RepoError::Database(format!("Failed to update quiet hours: {}", e)))?;

        self.invalidate_cache(&user_id);

        self.find_by_user_id(user_id)
            .await?
            .ok_or_else(|| RepoError::NotFound("Preferences not found after update".to_string()))
    }

    /// Search preferences with query
    pub async fn search(
        &self,
        query: NotificationPreferencesQuery,
    ) -> RepoResult<Vec<NotificationPreferences>> {
        let (where_clause, where_params) = query.build_where_clause();
        let order_by = query.build_order_by_clause().unwrap_or_else(|e| {
            eprintln!("Invalid order clause, using default: {}", e);
            "ORDER BY created_at DESC".to_string()
        });
        let limit_offset = query.build_limit_offset();

        let sql = format!(
            "SELECT * FROM notification_preferences {} {} {}",
            where_clause,
            order_by,
            if let Some((limit, offset)) = limit_offset {
                match offset {
                    Some(offset) => format!("LIMIT {} OFFSET {}", limit, offset),
                    None => format!("LIMIT {}", limit),
                }
            } else {
                "LIMIT 1000".to_string()
            }
        );

        let params = rusqlite::params_from_iter(where_params);

        let prefs = self
            .db
            .query_as::<NotificationPreferences>(&sql, params)
            .map_err(|e| RepoError::Database(format!("Failed to search preferences: {}", e)))?;

        Ok(prefs)
    }

    /// Count preferences matching query
    pub async fn count(&self, query: NotificationPreferencesQuery) -> RepoResult<i64> {
        let (where_clause, where_params) = query.build_where_clause();

        let sql = format!(
            "SELECT COUNT(*) as count FROM notification_preferences {}",
            where_clause
        );
        let params = rusqlite::params_from_iter(where_params);

        let count = self
            .db
            .query_single_value::<i64>(&sql, params)
            .map_err(|e| RepoError::Database(format!("Failed to count preferences: {}", e)))?;

        Ok(count)
    }

    fn invalidate_cache(&self, user_id: &str) {
        self.cache.remove(&self.cache_key_builder.id(user_id));
    }

    pub fn invalidate_all_cache(&self) {
        self.cache.clear();
    }
}

#[async_trait]
impl Repository<NotificationPreferences, String> for NotificationPreferencesRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<NotificationPreferences>> {
        let cache_key = self.cache_key_builder.id(&id);

        if let Some(prefs) = self.cache.get::<NotificationPreferences>(&cache_key) {
            return Ok(Some(prefs));
        }

        let prefs = self
            .db
            .query_single_as::<NotificationPreferences>(
                "SELECT * FROM notification_preferences WHERE id = ?",
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find preferences by id: {}", e)))?;

        if let Some(ref prefs) = prefs {
            self.cache.set(&cache_key, prefs.clone(), ttl::LONG);
        }

        Ok(prefs)
    }

    async fn find_all(&self) -> RepoResult<Vec<NotificationPreferences>> {
        let cache_key = self.cache_key_builder.list(&["all"]);

        if let Some(prefs) = self.cache.get::<Vec<NotificationPreferences>>(&cache_key) {
            return Ok(prefs);
        }

        let prefs = self
            .db
            .query_as::<NotificationPreferences>(
                "SELECT * FROM notification_preferences ORDER BY created_at DESC LIMIT 1000",
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find all preferences: {}", e)))?;

        self.cache.set(&cache_key, prefs.clone(), ttl::MEDIUM);

        Ok(prefs)
    }

    async fn save(&self, entity: NotificationPreferences) -> RepoResult<NotificationPreferences> {
        let exists = self.exists_by_id(entity.id.clone()).await?;

        if exists {
            let now = chrono::Utc::now().timestamp();

            self.db
                .execute(
                    "UPDATE notification_preferences SET
                        user_id = ?,
                        email_enabled = ?,
                        sms_enabled = ?,
                        in_app_enabled = ?,
                        task_assigned = ?,
                        task_updated = ?,
                        task_completed = ?,
                        task_overdue = ?,
                        client_created = ?,
                        client_updated = ?,
                        system_alerts = ?,
                        maintenance_notifications = ?,
                        quiet_hours_enabled = ?,
                        quiet_hours_start = ?,
                        quiet_hours_end = ?,
                        email_frequency = ?,
                        email_digest_time = ?,
                        updated_at = ?
                        WHERE id = ?",
                    params![
                        entity.user_id,
                        if entity.email_enabled { 1 } else { 0 },
                        if entity.sms_enabled { 1 } else { 0 },
                        if entity.in_app_enabled { 1 } else { 0 },
                        if entity.task_assigned { 1 } else { 0 },
                        if entity.task_updated { 1 } else { 0 },
                        if entity.task_completed { 1 } else { 0 },
                        if entity.task_overdue { 1 } else { 0 },
                        if entity.client_created { 1 } else { 0 },
                        if entity.client_updated { 1 } else { 0 },
                        if entity.system_alerts { 1 } else { 0 },
                        if entity.maintenance_notifications {
                            1
                        } else {
                            0
                        },
                        if entity.quiet_hours_enabled { 1 } else { 0 },
                        entity.quiet_hours_start,
                        entity.quiet_hours_end,
                        entity.email_frequency,
                        entity.email_digest_time,
                        now,
                        entity.id,
                    ],
                )
                .map_err(|e| RepoError::Database(format!("Failed to update preferences: {}", e)))?;
        } else {
            self.db
                .execute(
                    "INSERT INTO notification_preferences (
                        id, user_id, email_enabled, sms_enabled, in_app_enabled,
                        task_assigned, task_updated, task_completed, task_overdue,
                        client_created, client_updated, system_alerts, maintenance_notifications,
                        quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
                        email_frequency, email_digest_time,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    params![
                        entity.id,
                        entity.user_id,
                        if entity.email_enabled { 1 } else { 0 },
                        if entity.sms_enabled { 1 } else { 0 },
                        if entity.in_app_enabled { 1 } else { 0 },
                        if entity.task_assigned { 1 } else { 0 },
                        if entity.task_updated { 1 } else { 0 },
                        if entity.task_completed { 1 } else { 0 },
                        if entity.task_overdue { 1 } else { 0 },
                        if entity.client_created { 1 } else { 0 },
                        if entity.client_updated { 1 } else { 0 },
                        if entity.system_alerts { 1 } else { 0 },
                        if entity.maintenance_notifications {
                            1
                        } else {
                            0
                        },
                        if entity.quiet_hours_enabled { 1 } else { 0 },
                        entity.quiet_hours_start,
                        entity.quiet_hours_end,
                        entity.email_frequency,
                        entity.email_digest_time,
                        entity.created_at,
                        entity.updated_at,
                    ],
                )
                .map_err(|e| RepoError::Database(format!("Failed to create preferences: {}", e)))?;
        }

        self.invalidate_cache(&entity.user_id);
        self.invalidate_all_cache();

        self.find_by_id(entity.id)
            .await?
            .ok_or_else(|| RepoError::NotFound("Preferences not found after save".to_string()))
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        let result = self
            .db
            .execute(
                "DELETE FROM notification_preferences WHERE id = ?",
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to delete preferences: {}", e)))?;

        self.cache.remove(&self.cache_key_builder.id(&id));
        self.invalidate_all_cache();

        Ok(result > 0)
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let exists = self
            .db
            .query_single_value::<i64>(
                "SELECT COUNT(*) FROM notification_preferences WHERE id = ?",
                params![id],
            )
            .map_err(|e| {
                RepoError::Database(format!("Failed to check preferences existence: {}", e))
            })?;

        Ok(exists > 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use rusqlite::params;

    async fn setup_test_db() -> Database {
        crate::test_utils::setup_test_db().await
    }

    fn seed_user(db: &Database, user_id: &str) {
        db.execute(
            r#"
            INSERT INTO users (
                id, email, username, password_hash, full_name, role,
                is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            params![
                user_id,
                format!("{}@example.com", user_id),
                user_id,
                "hash",
                "Test User",
                "technician",
                1,
                chrono::Utc::now().timestamp_millis(),
                chrono::Utc::now().timestamp_millis(),
            ],
        )
        .unwrap();
    }

    #[tokio::test]
    async fn test_find_by_id() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationPreferencesRepository::new(Arc::new(db), Arc::clone(&cache));

        let user_id = uuid::Uuid::new_v4().to_string();
        seed_user(repo.db.as_ref(), &user_id);
        let prefs = NotificationPreferences::new(user_id.clone());

        repo.save(prefs.clone()).await.unwrap();

        let found = repo.find_by_id(prefs.id.clone()).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().user_id, prefs.user_id);
    }

    #[tokio::test]
    async fn test_find_by_id_not_found() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationPreferencesRepository::new(Arc::new(db), Arc::clone(&cache));

        let found = repo.find_by_id("nonexistent".to_string()).await.unwrap();
        assert!(found.is_none());
    }

    #[tokio::test]
    async fn test_find_all() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationPreferencesRepository::new(Arc::new(db), Arc::clone(&cache));

        let user1_id = uuid::Uuid::new_v4().to_string();
        let user2_id = uuid::Uuid::new_v4().to_string();
        seed_user(repo.db.as_ref(), &user1_id);
        seed_user(repo.db.as_ref(), &user2_id);
        let prefs1 = NotificationPreferences::new(user1_id);
        let prefs2 = NotificationPreferences::new(user2_id);

        repo.save(prefs1).await.unwrap();
        repo.save(prefs2).await.unwrap();

        let all = repo.find_all().await.unwrap();
        assert_eq!(all.len(), 2);
    }

    #[tokio::test]
    async fn test_save_create() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationPreferencesRepository::new(Arc::new(db), Arc::clone(&cache));

        let user_id = uuid::Uuid::new_v4().to_string();
        seed_user(repo.db.as_ref(), &user_id);
        let prefs = NotificationPreferences::new(user_id);

        let saved = repo.save(prefs.clone()).await.unwrap();
        assert_eq!(saved.user_id, prefs.user_id);
        assert!(repo.exists_by_id(saved.id).await.unwrap());
    }

    #[tokio::test]
    async fn test_save_update() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationPreferencesRepository::new(Arc::new(db), Arc::clone(&cache));

        let user_id = uuid::Uuid::new_v4().to_string();
        seed_user(repo.db.as_ref(), &user_id);
        let mut prefs = NotificationPreferences::new(user_id);
        repo.save(prefs.clone()).await.unwrap();

        prefs.task_assigned = false;
        prefs.email_enabled = false;
        let updated = repo.save(prefs).await.unwrap();
        assert!(!updated.task_assigned);
        assert!(!updated.email_enabled);
    }

    #[tokio::test]
    async fn test_delete_by_id() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationPreferencesRepository::new(Arc::new(db), Arc::clone(&cache));

        let user_id = uuid::Uuid::new_v4().to_string();
        seed_user(repo.db.as_ref(), &user_id);
        let prefs = NotificationPreferences::new(user_id);
        repo.save(prefs.clone()).await.unwrap();

        let deleted = repo.delete_by_id(prefs.id.clone()).await.unwrap();
        assert!(deleted);
        assert!(!repo.exists_by_id(prefs.id).await.unwrap());
    }

    #[tokio::test]
    async fn test_find_by_user_id() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationPreferencesRepository::new(Arc::new(db), Arc::clone(&cache));

        let user_id = uuid::Uuid::new_v4().to_string();
        seed_user(repo.db.as_ref(), &user_id);
        let prefs = NotificationPreferences::new(user_id.clone());
        repo.save(prefs).await.unwrap();

        let found = repo.find_by_user_id(user_id).await.unwrap();
        assert!(found.is_some());
    }

    #[tokio::test]
    async fn test_get_or_create() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationPreferencesRepository::new(Arc::new(db), Arc::clone(&cache));

        let user_id = uuid::Uuid::new_v4().to_string();
        seed_user(repo.db.as_ref(), &user_id);

        let prefs1 = repo.get_or_create(user_id.clone()).await.unwrap();
        assert_eq!(prefs1.user_id, user_id);

        let prefs2 = repo.get_or_create(user_id).await.unwrap();
        assert_eq!(prefs1.id, prefs2.id);
    }

    #[tokio::test]
    async fn test_update_task_settings() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationPreferencesRepository::new(Arc::new(db), Arc::clone(&cache));

        let user_id = uuid::Uuid::new_v4().to_string();
        seed_user(repo.db.as_ref(), &user_id);
        let prefs = NotificationPreferences::new(user_id.clone());
        repo.save(prefs).await.unwrap();

        let updated = repo
            .update_task_settings(user_id, false, false, true, false)
            .await
            .unwrap();

        assert!(!updated.task_assigned);
        assert!(!updated.task_updated);
        assert!(updated.task_completed);
        assert!(!updated.task_overdue);
    }
}
