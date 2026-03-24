use async_trait::async_trait;
use rusqlite::params;
use std::sync::Arc;

use crate::db::Database;
use crate::domains::notifications::models::NotificationPreferences;
use crate::shared::repositories::base::{RepoError, RepoResult, Repository};
use crate::shared::repositories::cache::{ttl, Cache, CacheKeyBuilder};

#[derive(Debug, Clone, Default)]
pub struct NotificationPreferencesQuery {
    pub user_id: Option<String>,
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
        if let Some(uid) = &self.user_id {
            conditions.push("user_id = ?".to_string());
            params.push(uid.clone().into());
        }
        if let Some(v) = self.in_app_enabled {
            conditions.push("in_app_enabled = ?".to_string());
            params.push((if v { 1i64 } else { 0i64 }).into());
        }
        if let Some(v) = self.quiet_hours_enabled {
            conditions.push("quiet_hours_enabled = ?".to_string());
            params.push((if v { 1i64 } else { 0i64 }).into());
        }
        let where_clause = if conditions.len() > 1 {
            format!("WHERE {}", conditions.join(" AND "))
        } else {
            String::new()
        };
        (where_clause, params)
    }

    fn build_order_by_clause(&self) -> Result<String, RepoError> {
        let sort_by = crate::shared::repositories::base::validate_sort_column(
            self.sort_by.as_deref().unwrap_or("created_at"),
            &[
                "created_at",
                "updated_at",
                "user_id",
                "in_app_enabled",
                "quiet_hours_enabled",
            ],
        )?;
        let sort_order = match self.sort_order.as_deref() {
            Some("ASC") => "ASC",
            _ => "DESC",
        };
        Ok(format!("ORDER BY {} {}", sort_by, sort_order))
    }

    fn build_limit_offset(&self) -> Option<(i64, Option<i64>)> {
        self.limit.map(|l| (l, self.offset))
    }
}

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

    pub async fn find_by_user_id(
        &self,
        user_id: String,
    ) -> RepoResult<Option<NotificationPreferences>> {
        let cache_key = self.cache_key_builder.id(&user_id);
        if let Some(p) = self.cache.get::<NotificationPreferences>(&cache_key) {
            return Ok(Some(p));
        }
        let prefs = self
            .db
            .query_single_as::<NotificationPreferences>(
                "SELECT * FROM notification_preferences WHERE user_id = ?",
                params![user_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find preferences: {}", e)))?;
        if let Some(ref p) = prefs {
            self.cache.set(&cache_key, p.clone(), ttl::LONG);
        }
        Ok(prefs)
    }

    pub async fn get_or_create(&self, user_id: String) -> RepoResult<NotificationPreferences> {
        if let Some(prefs) = self.find_by_user_id(user_id.clone()).await? {
            return Ok(prefs);
        }
        let new_prefs = NotificationPreferences::new(user_id);
        self.save(new_prefs.clone()).await?;
        Ok(new_prefs)
    }

    pub async fn update_task_settings(
        &self,
        user_id: String,
        task_assigned: bool,
        task_updated: bool,
        task_completed: bool,
        task_overdue: bool,
    ) -> RepoResult<NotificationPreferences> {
        let now = chrono::Utc::now().timestamp_millis();
        self.db.execute(
            "UPDATE notification_preferences SET task_assigned=?, task_updated=?, task_completed=?, task_overdue=?, updated_at=? WHERE user_id=?",
            params![if task_assigned{1}else{0}, if task_updated{1}else{0}, if task_completed{1}else{0}, if task_overdue{1}else{0}, now, user_id],
        ).map_err(|e| RepoError::Database(format!("Failed to update task settings: {}", e)))?;
        self.cache.remove(&self.cache_key_builder.id(&user_id));
        self.find_by_user_id(user_id)
            .await?
            .ok_or_else(|| RepoError::NotFound("Preferences not found".to_string()))
    }

    pub async fn update_client_settings(
        &self,
        user_id: String,
        client_created: bool,
        client_updated: bool,
    ) -> RepoResult<NotificationPreferences> {
        let now = chrono::Utc::now().timestamp_millis();
        self.db.execute(
            "UPDATE notification_preferences SET client_created=?, client_updated=?, updated_at=? WHERE user_id=?",
            params![if client_created{1}else{0}, if client_updated{1}else{0}, now, user_id],
        ).map_err(|e| RepoError::Database(format!("Failed to update client settings: {}", e)))?;
        self.cache.remove(&self.cache_key_builder.id(&user_id));
        self.find_by_user_id(user_id)
            .await?
            .ok_or_else(|| RepoError::NotFound("Preferences not found".to_string()))
    }

    pub async fn update_system_settings(
        &self,
        user_id: String,
        system_alerts: bool,
        maintenance_notifications: bool,
    ) -> RepoResult<NotificationPreferences> {
        let now = chrono::Utc::now().timestamp_millis();
        self.db.execute(
            "UPDATE notification_preferences SET system_alerts=?, maintenance_notifications=?, updated_at=? WHERE user_id=?",
            params![if system_alerts{1}else{0}, if maintenance_notifications{1}else{0}, now, user_id],
        ).map_err(|e| RepoError::Database(format!("Failed to update system settings: {}", e)))?;
        self.cache.remove(&self.cache_key_builder.id(&user_id));
        self.find_by_user_id(user_id)
            .await?
            .ok_or_else(|| RepoError::NotFound("Preferences not found".to_string()))
    }

    pub async fn update_quiet_hours(
        &self,
        user_id: String,
        enabled: bool,
        start_time: Option<String>,
        end_time: Option<String>,
    ) -> RepoResult<NotificationPreferences> {
        let now = chrono::Utc::now().timestamp_millis();
        self.db.execute(
            "UPDATE notification_preferences SET quiet_hours_enabled=?, quiet_hours_start=?, quiet_hours_end=?, updated_at=? WHERE user_id=?",
            params![if enabled{1}else{0}, start_time, end_time, now, user_id],
        ).map_err(|e| RepoError::Database(format!("Failed to update quiet hours: {}", e)))?;
        self.cache.remove(&self.cache_key_builder.id(&user_id));
        self.find_by_user_id(user_id)
            .await?
            .ok_or_else(|| RepoError::NotFound("Preferences not found".to_string()))
    }

    pub async fn search(
        &self,
        query: NotificationPreferencesQuery,
    ) -> RepoResult<Vec<NotificationPreferences>> {
        let (where_clause, where_params) = query.build_where_clause();
        let order_by = query
            .build_order_by_clause()
            .unwrap_or_else(|_| "ORDER BY created_at DESC".to_string());
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
        self.db
            .query_as::<NotificationPreferences>(&sql, rusqlite::params_from_iter(where_params))
            .map_err(|e| RepoError::Database(format!("Failed to search preferences: {}", e)))
    }

    pub async fn count(&self, query: NotificationPreferencesQuery) -> RepoResult<i64> {
        let (where_clause, where_params) = query.build_where_clause();
        let sql = format!(
            "SELECT COUNT(*) as count FROM notification_preferences {}",
            where_clause
        );
        self.db
            .query_single_value::<i64>(&sql, rusqlite::params_from_iter(where_params))
            .map_err(|e| RepoError::Database(format!("Failed to count: {}", e)))
    }

    pub fn invalidate_all_cache(&self) {
        self.cache.clear();
    }
}

#[async_trait]
impl Repository<NotificationPreferences, String> for NotificationPreferencesRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<NotificationPreferences>> {
        let cache_key = self.cache_key_builder.id(&id);
        if let Some(p) = self.cache.get::<NotificationPreferences>(&cache_key) {
            return Ok(Some(p));
        }
        let prefs = self
            .db
            .query_single_as::<NotificationPreferences>(
                "SELECT * FROM notification_preferences WHERE id = ?",
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find preferences: {}", e)))?;
        if let Some(ref p) = prefs {
            self.cache.set(&cache_key, p.clone(), ttl::LONG);
        }
        Ok(prefs)
    }

    async fn find_all(&self) -> RepoResult<Vec<NotificationPreferences>> {
        let cache_key = self.cache_key_builder.list(&["all"]);
        if let Some(p) = self.cache.get::<Vec<NotificationPreferences>>(&cache_key) {
            return Ok(p);
        }
        let prefs = self
            .db
            .query_as::<NotificationPreferences>(
                "SELECT * FROM notification_preferences ORDER BY created_at DESC LIMIT 1000",
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find all: {}", e)))?;
        self.cache.set(&cache_key, prefs.clone(), ttl::MEDIUM);
        Ok(prefs)
    }

    async fn save(&self, entity: NotificationPreferences) -> RepoResult<NotificationPreferences> {
        let exists = self.exists_by_id(entity.id.clone()).await?;
        if exists {
            let now = chrono::Utc::now().timestamp_millis();
            self.db.execute(
                "UPDATE notification_preferences SET user_id=?, in_app_enabled=?, task_assigned=?, task_updated=?, task_completed=?, task_overdue=?, client_created=?, client_updated=?, system_alerts=?, maintenance_notifications=?, quiet_hours_enabled=?, quiet_hours_start=?, quiet_hours_end=?, updated_at=? WHERE id=?",
                params![entity.user_id, if entity.in_app_enabled{1}else{0}, if entity.task_assigned{1}else{0}, if entity.task_updated{1}else{0}, if entity.task_completed{1}else{0}, if entity.task_overdue{1}else{0}, if entity.client_created{1}else{0}, if entity.client_updated{1}else{0}, if entity.system_alerts{1}else{0}, if entity.maintenance_notifications{1}else{0}, if entity.quiet_hours_enabled{1}else{0}, entity.quiet_hours_start, entity.quiet_hours_end, now, entity.id],
            ).map_err(|e| RepoError::Database(format!("Failed to update preferences: {}", e)))?;
        } else {
            self.db.execute(
                "INSERT INTO notification_preferences (id, user_id, in_app_enabled, task_assigned, task_updated, task_completed, task_overdue, client_created, client_updated, system_alerts, maintenance_notifications, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![entity.id, entity.user_id, if entity.in_app_enabled{1}else{0}, if entity.task_assigned{1}else{0}, if entity.task_updated{1}else{0}, if entity.task_completed{1}else{0}, if entity.task_overdue{1}else{0}, if entity.client_created{1}else{0}, if entity.client_updated{1}else{0}, if entity.system_alerts{1}else{0}, if entity.maintenance_notifications{1}else{0}, if entity.quiet_hours_enabled{1}else{0}, entity.quiet_hours_start, entity.quiet_hours_end, entity.created_at, entity.updated_at],
            ).map_err(|e| RepoError::Database(format!("Failed to create preferences: {}", e)))?;
        }
        self.cache
            .remove(&self.cache_key_builder.id(&entity.user_id));
        self.cache.clear();
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
            .map_err(|e| RepoError::Database(format!("Failed to delete: {}", e)))?;
        self.cache.remove(&self.cache_key_builder.id(&id));
        self.cache.clear();
        Ok(result > 0)
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let count = self
            .db
            .query_single_value::<i64>(
                "SELECT COUNT(*) FROM notification_preferences WHERE id = ?",
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to check existence: {}", e)))?;
        Ok(count > 0)
    }
}
