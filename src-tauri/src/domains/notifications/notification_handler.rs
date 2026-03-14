//! Unified notifications handler: repositories, services, helpers, and IPC commands.

use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{error, info, instrument};
use lazy_static::lazy_static;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use rusqlite::params;

use crate::commands::{ApiResponse, AppError, AppState, init_correlation_context};
use crate::db::Database;
use crate::resolve_context;
use crate::shared::contracts::notification::{NotificationSender, SentMessage};
use crate::shared::repositories::base::{RepoError, RepoResult, Repository};
use crate::shared::repositories::cache::{ttl, Cache, CacheKeyBuilder};

use super::models::*;

// ── NotificationService (quiet hours / config) ────────────────────────────────

#[derive(Clone)]
pub struct NotificationService {
    config: Arc<Mutex<NotificationConfig>>,
}

impl NotificationService {
    pub fn new(config: NotificationConfig) -> Self {
        Self {
            config: Arc::new(Mutex::new(config)),
        }
    }

    pub async fn update_config(&self, config: NotificationConfig) {
        let mut current_config = self.config.lock().await;
        *current_config = config;
    }

    pub async fn is_quiet_hours(&self) -> bool {
        use chrono_tz::Europe;
        use chrono::Utc;
        let config = self.get_config().await;
        let now = Utc::now().with_timezone(&Europe::Paris);

        if let (Some(start), Some(end)) = (&config.quiet_hours_start, &config.quiet_hours_end) {
            let start_time = chrono::NaiveTime::parse_from_str(start, "%H:%M").unwrap_or(
                chrono::NaiveTime::from_hms_opt(22, 0, 0).expect("valid time"),
            );
            let end_time = chrono::NaiveTime::parse_from_str(end, "%H:%M").unwrap_or(
                chrono::NaiveTime::from_hms_opt(8, 0, 0).expect("valid time"),
            );
            let current_time = now.time();
            if start_time <= end_time {
                current_time >= start_time && current_time <= end_time
            } else {
                current_time >= start_time || current_time <= end_time
            }
        } else {
            false
        }
    }

    pub async fn get_config(&self) -> NotificationConfig {
        self.config.lock().await.clone()
    }
}

// ── NotificationRepository (in-app notifications) ────────────────────────────

pub struct NotificationRepository {
    db: Arc<Database>,
    cache: Arc<Cache>,
    cache_key_builder: CacheKeyBuilder,
}

impl NotificationRepository {
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self {
            db,
            cache,
            cache_key_builder: CacheKeyBuilder::new("notification"),
        }
    }

    pub async fn find_by_user(&self, user_id: &str, limit: i32) -> RepoResult<Vec<Notification>> {
        let cache_key = self.cache_key_builder.list(&["user", user_id, &limit.to_string()]);
        if let Some(n) = self.cache.get::<Vec<Notification>>(&cache_key) {
            return Ok(n);
        }
        let notifications = self.db
            .query_as::<Notification>(
                "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
                params![user_id, limit],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find notifications: {}", e)))?;
        self.cache.set(&cache_key, notifications.clone(), ttl::SHORT);
        Ok(notifications)
    }

    pub async fn count_unread(&self, user_id: &str) -> RepoResult<i32> {
        let count = self.db
            .query_single_value::<i64>(
                "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read = 0",
                params![user_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to count unread: {}", e)))?;
        Ok(count as i32)
    }

    pub async fn mark_read(&self, id: &str) -> RepoResult<()> {
        self.db
            .execute("UPDATE notifications SET read = 1 WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to mark read: {}", e)))?;
        self.cache.clear();
        Ok(())
    }

    pub async fn mark_all_read(&self, user_id: &str) -> RepoResult<()> {
        self.db
            .execute(
                "UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0",
                params![user_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to mark all read: {}", e)))?;
        self.cache.clear();
        Ok(())
    }

    pub async fn delete(&self, id: &str) -> RepoResult<bool> {
        let result = self.db
            .execute("DELETE FROM notifications WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to delete: {}", e)))?;
        self.cache.clear();
        Ok(result > 0)
    }
}

#[async_trait]
impl Repository<Notification, String> for NotificationRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<Notification>> {
        let cache_key = self.cache_key_builder.id(&id);
        if let Some(n) = self.cache.get::<Notification>(&cache_key) {
            return Ok(Some(n));
        }
        let notification = self.db
            .query_single_as::<Notification>("SELECT * FROM notifications WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to find notification: {}", e)))?;
        if let Some(ref n) = notification {
            self.cache.set(&cache_key, n.clone(), ttl::MEDIUM);
        }
        Ok(notification)
    }

    async fn find_all(&self) -> RepoResult<Vec<Notification>> {
        self.db
            .query_as::<Notification>(
                "SELECT * FROM notifications ORDER BY created_at DESC LIMIT 1000",
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find all: {}", e)))
    }

    async fn save(&self, entity: Notification) -> RepoResult<Notification> {
        self.db
            .execute(
                "INSERT INTO notifications (id, type, title, message, entity_type, entity_id, entity_url, read, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![
                    entity.id, entity.r#type, entity.title, entity.message,
                    entity.entity_type, entity.entity_id, entity.entity_url,
                    if entity.read { 1 } else { 0 }, entity.user_id,
                    entity.created_at.timestamp(),
                ],
            )
            .map_err(|e| RepoError::Database(format!("Failed to create notification: {}", e)))?;
        self.cache.clear();
        self.find_by_id(entity.id).await?.ok_or_else(|| RepoError::NotFound("Notification not found after save".to_string()))
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        let result = self.db
            .execute("DELETE FROM notifications WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to delete: {}", e)))?;
        self.cache.clear();
        Ok(result > 0)
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let count = self.db
            .query_single_value::<i64>("SELECT COUNT(*) FROM notifications WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to check existence: {}", e)))?;
        Ok(count > 0)
    }
}

// ── NotificationTemplateRepository ───────────────────────────────────────────

#[derive(Debug, Clone, Default)]
pub struct NotificationTemplateQuery {
    pub search: Option<String>,
    pub notification_type: Option<NotificationType>,
    pub channel: Option<NotificationChannel>,
    pub is_active: Option<bool>,
    pub category: Option<String>,
    pub created_by: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

impl NotificationTemplateQuery {
    fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>) {
        let mut conditions = vec!["1=1".to_string()];
        let mut params: Vec<rusqlite::types::Value> = Vec::new();
        if let Some(search) = &self.search {
            conditions.push("(name LIKE ? OR description LIKE ?)".to_string());
            let pattern = format!("%{}%", search);
            params.push(pattern.clone().into());
            params.push(pattern.into());
        }
        if let Some(nt) = &self.notification_type {
            conditions.push("message_type = ?".to_string());
            params.push(nt.to_string().into());
        }
        if let Some(ch) = &self.channel {
            conditions.push("channel = ?".to_string());
            params.push(ch.to_string().into());
        }
        if let Some(is_active) = self.is_active {
            conditions.push("is_active = ?".to_string());
            params.push((if is_active { 1i64 } else { 0i64 }).into());
        }
        if let Some(cat) = &self.category {
            conditions.push("category = ?".to_string());
            params.push(cat.clone().into());
        }
        if let Some(cb) = &self.created_by {
            conditions.push("created_by = ?".to_string());
            params.push(cb.clone().into());
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
            &["created_at", "updated_at", "name", "message_type", "channel", "category", "is_active"],
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

pub struct NotificationTemplateRepository {
    db: Arc<Database>,
    cache: Arc<Cache>,
    cache_key_builder: CacheKeyBuilder,
}

impl NotificationTemplateRepository {
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self { db, cache, cache_key_builder: CacheKeyBuilder::new("notification_template") }
    }

    pub async fn find_by_type(&self, notification_type: NotificationType) -> RepoResult<Vec<NotificationTemplate>> {
        let cache_key = self.cache_key_builder.list(&["type", &notification_type.to_string()]);
        if let Some(t) = self.cache.get::<Vec<NotificationTemplate>>(&cache_key) {
            return Ok(t);
        }
        let templates = self.db
            .query_as::<NotificationTemplate>(
                "SELECT * FROM message_templates WHERE message_type = ? ORDER BY created_at DESC LIMIT 500",
                params![notification_type.to_string()],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find by type: {}", e)))?;
        self.cache.set(&cache_key, templates.clone(), ttl::MEDIUM);
        Ok(templates)
    }

    pub async fn find_by_channel(&self, channel: NotificationChannel) -> RepoResult<Vec<NotificationTemplate>> {
        let cache_key = self.cache_key_builder.list(&["channel", &channel.to_string()]);
        if let Some(t) = self.cache.get::<Vec<NotificationTemplate>>(&cache_key) {
            return Ok(t);
        }
        let templates = self.db
            .query_as::<NotificationTemplate>(
                "SELECT * FROM message_templates WHERE channel = ? ORDER BY created_at DESC LIMIT 500",
                params![channel.to_string()],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find by channel: {}", e)))?;
        self.cache.set(&cache_key, templates.clone(), ttl::MEDIUM);
        Ok(templates)
    }

    pub async fn find_active(&self) -> RepoResult<Vec<NotificationTemplate>> {
        let cache_key = self.cache_key_builder.list(&["active"]);
        if let Some(t) = self.cache.get::<Vec<NotificationTemplate>>(&cache_key) {
            return Ok(t);
        }
        let templates = self.db
            .query_as::<NotificationTemplate>(
                "SELECT * FROM message_templates WHERE is_active = 1 ORDER BY name ASC LIMIT 500",
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find active: {}", e)))?;
        self.cache.set(&cache_key, templates.clone(), ttl::MEDIUM);
        Ok(templates)
    }

    pub async fn find_by_category(&self, category: String) -> RepoResult<Vec<NotificationTemplate>> {
        let cache_key = self.cache_key_builder.list(&["category", &category]);
        if let Some(t) = self.cache.get::<Vec<NotificationTemplate>>(&cache_key) {
            return Ok(t);
        }
        let templates = self.db
            .query_as::<NotificationTemplate>(
                "SELECT * FROM message_templates WHERE category = ? ORDER BY name ASC LIMIT 500",
                params![category],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find by category: {}", e)))?;
        self.cache.set(&cache_key, templates.clone(), ttl::MEDIUM);
        Ok(templates)
    }

    pub async fn activate(&self, template_id: String) -> RepoResult<NotificationTemplate> {
        let now = chrono::Utc::now().timestamp_millis();
        self.db
            .execute("UPDATE message_templates SET is_active = 1, updated_at = ? WHERE id = ?", params![now, template_id])
            .map_err(|e| RepoError::Database(format!("Failed to activate: {}", e)))?;
        self.cache.remove(&self.cache_key_builder.id(&template_id));
        self.cache.clear();
        self.find_by_id(template_id).await?.ok_or_else(|| RepoError::NotFound("Template not found".to_string()))
    }

    pub async fn deactivate(&self, template_id: String) -> RepoResult<NotificationTemplate> {
        let now = chrono::Utc::now().timestamp_millis();
        self.db
            .execute("UPDATE message_templates SET is_active = 0, updated_at = ? WHERE id = ?", params![now, template_id])
            .map_err(|e| RepoError::Database(format!("Failed to deactivate: {}", e)))?;
        self.cache.remove(&self.cache_key_builder.id(&template_id));
        self.cache.clear();
        self.find_by_id(template_id).await?.ok_or_else(|| RepoError::NotFound("Template not found".to_string()))
    }

    pub async fn search(&self, query: NotificationTemplateQuery) -> RepoResult<Vec<NotificationTemplate>> {
        let (where_clause, where_params) = query.build_where_clause();
        let order_by = query.build_order_by_clause().unwrap_or_else(|_| "ORDER BY created_at DESC".to_string());
        let limit_offset = query.build_limit_offset();
        let sql = format!(
            "SELECT * FROM message_templates {} {} {}",
            where_clause, order_by,
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
            .query_as::<NotificationTemplate>(&sql, rusqlite::params_from_iter(where_params))
            .map_err(|e| RepoError::Database(format!("Failed to search templates: {}", e)))
    }

    pub async fn count(&self, query: NotificationTemplateQuery) -> RepoResult<i64> {
        let (where_clause, where_params) = query.build_where_clause();
        let sql = format!("SELECT COUNT(*) as count FROM message_templates {}", where_clause);
        self.db
            .query_single_value::<i64>(&sql, rusqlite::params_from_iter(where_params))
            .map_err(|e| RepoError::Database(format!("Failed to count: {}", e)))
    }

    pub fn invalidate_all_cache(&self) {
        self.cache.clear();
    }
}

#[async_trait]
impl Repository<NotificationTemplate, String> for NotificationTemplateRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<NotificationTemplate>> {
        let cache_key = self.cache_key_builder.id(&id);
        if let Some(t) = self.cache.get::<NotificationTemplate>(&cache_key) {
            return Ok(Some(t));
        }
        let template = self.db
            .query_single_as::<NotificationTemplate>("SELECT * FROM message_templates WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to find template: {}", e)))?;
        if let Some(ref t) = template {
            self.cache.set(&cache_key, t.clone(), ttl::LONG);
        }
        Ok(template)
    }

    async fn find_all(&self) -> RepoResult<Vec<NotificationTemplate>> {
        let cache_key = self.cache_key_builder.list(&["all"]);
        if let Some(t) = self.cache.get::<Vec<NotificationTemplate>>(&cache_key) {
            return Ok(t);
        }
        let templates = self.db
            .query_as::<NotificationTemplate>(
                "SELECT * FROM message_templates ORDER BY created_at DESC LIMIT 1000",
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find all: {}", e)))?;
        self.cache.set(&cache_key, templates.clone(), ttl::MEDIUM);
        Ok(templates)
    }

    async fn save(&self, entity: NotificationTemplate) -> RepoResult<NotificationTemplate> {
        let exists = self.exists_by_id(entity.id.clone()).await?;
        let variables_json = serde_json::to_string(&entity.variables)
            .map_err(|e| RepoError::Database(format!("Failed to serialize variables: {}", e)))?;
        if exists {
            let now = chrono::Utc::now().timestamp_millis();
            self.db.execute(
                "UPDATE message_templates SET name=?, message_type=?, channel=?, subject=?, body=?, variables=?, category=?, is_active=?, created_by=?, updated_at=? WHERE id=?",
                params![entity.name, entity.notification_type.to_string(), entity.channel.to_string(), entity.subject_template, entity.body_template, variables_json, "general", if entity.is_active { 1 } else { 0 }, None::<String>, now, entity.id],
            ).map_err(|e| RepoError::Database(format!("Failed to update template: {}", e)))?;
        } else {
            self.db.execute(
                "INSERT INTO message_templates (id, name, message_type, channel, subject, body, variables, category, is_active, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![entity.id, entity.name, entity.notification_type.to_string(), entity.channel.to_string(), entity.subject_template, entity.body_template, variables_json, "general", if entity.is_active { 1 } else { 0 }, None::<String>, entity.created_at.timestamp_millis(), entity.updated_at.timestamp_millis()],
            ).map_err(|e| RepoError::Database(format!("Failed to create template: {}", e)))?;
        }
        self.cache.remove(&self.cache_key_builder.id(&entity.id));
        self.cache.clear();
        self.find_by_id(entity.id).await?.ok_or_else(|| RepoError::NotFound("Template not found after save".to_string()))
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        let result = self.db
            .execute("DELETE FROM message_templates WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to delete template: {}", e)))?;
        self.cache.remove(&self.cache_key_builder.id(&id));
        self.cache.clear();
        Ok(result > 0)
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let count = self.db
            .query_single_value::<i64>("SELECT COUNT(*) FROM message_templates WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to check existence: {}", e)))?;
        Ok(count > 0)
    }
}

// ── NotificationPreferencesRepository ────────────────────────────────────────

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
            &["created_at", "updated_at", "user_id", "in_app_enabled", "quiet_hours_enabled"],
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
        Self { db, cache, cache_key_builder: CacheKeyBuilder::new("notification_preferences") }
    }

    pub async fn find_by_user_id(&self, user_id: String) -> RepoResult<Option<NotificationPreferences>> {
        let cache_key = self.cache_key_builder.id(&user_id);
        if let Some(p) = self.cache.get::<NotificationPreferences>(&cache_key) {
            return Ok(Some(p));
        }
        let prefs = self.db
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

    pub async fn update_task_settings(&self, user_id: String, task_assigned: bool, task_updated: bool, task_completed: bool, task_overdue: bool) -> RepoResult<NotificationPreferences> {
        let now = chrono::Utc::now().timestamp();
        self.db.execute(
            "UPDATE notification_preferences SET task_assigned=?, task_updated=?, task_completed=?, task_overdue=?, updated_at=? WHERE user_id=?",
            params![if task_assigned{1}else{0}, if task_updated{1}else{0}, if task_completed{1}else{0}, if task_overdue{1}else{0}, now, user_id],
        ).map_err(|e| RepoError::Database(format!("Failed to update task settings: {}", e)))?;
        self.cache.remove(&self.cache_key_builder.id(&user_id));
        self.find_by_user_id(user_id).await?.ok_or_else(|| RepoError::NotFound("Preferences not found".to_string()))
    }

    pub async fn update_client_settings(&self, user_id: String, client_created: bool, client_updated: bool) -> RepoResult<NotificationPreferences> {
        let now = chrono::Utc::now().timestamp();
        self.db.execute(
            "UPDATE notification_preferences SET client_created=?, client_updated=?, updated_at=? WHERE user_id=?",
            params![if client_created{1}else{0}, if client_updated{1}else{0}, now, user_id],
        ).map_err(|e| RepoError::Database(format!("Failed to update client settings: {}", e)))?;
        self.cache.remove(&self.cache_key_builder.id(&user_id));
        self.find_by_user_id(user_id).await?.ok_or_else(|| RepoError::NotFound("Preferences not found".to_string()))
    }

    pub async fn update_system_settings(&self, user_id: String, system_alerts: bool, maintenance_notifications: bool) -> RepoResult<NotificationPreferences> {
        let now = chrono::Utc::now().timestamp();
        self.db.execute(
            "UPDATE notification_preferences SET system_alerts=?, maintenance_notifications=?, updated_at=? WHERE user_id=?",
            params![if system_alerts{1}else{0}, if maintenance_notifications{1}else{0}, now, user_id],
        ).map_err(|e| RepoError::Database(format!("Failed to update system settings: {}", e)))?;
        self.cache.remove(&self.cache_key_builder.id(&user_id));
        self.find_by_user_id(user_id).await?.ok_or_else(|| RepoError::NotFound("Preferences not found".to_string()))
    }

    pub async fn update_quiet_hours(&self, user_id: String, enabled: bool, start_time: Option<String>, end_time: Option<String>) -> RepoResult<NotificationPreferences> {
        let now = chrono::Utc::now().timestamp();
        self.db.execute(
            "UPDATE notification_preferences SET quiet_hours_enabled=?, quiet_hours_start=?, quiet_hours_end=?, updated_at=? WHERE user_id=?",
            params![if enabled{1}else{0}, start_time, end_time, now, user_id],
        ).map_err(|e| RepoError::Database(format!("Failed to update quiet hours: {}", e)))?;
        self.cache.remove(&self.cache_key_builder.id(&user_id));
        self.find_by_user_id(user_id).await?.ok_or_else(|| RepoError::NotFound("Preferences not found".to_string()))
    }

    pub async fn search(&self, query: NotificationPreferencesQuery) -> RepoResult<Vec<NotificationPreferences>> {
        let (where_clause, where_params) = query.build_where_clause();
        let order_by = query.build_order_by_clause().unwrap_or_else(|_| "ORDER BY created_at DESC".to_string());
        let limit_offset = query.build_limit_offset();
        let sql = format!(
            "SELECT * FROM notification_preferences {} {} {}",
            where_clause, order_by,
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
        let sql = format!("SELECT COUNT(*) as count FROM notification_preferences {}", where_clause);
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
        let prefs = self.db
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
        let prefs = self.db
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
            let now = chrono::Utc::now().timestamp();
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
        self.cache.remove(&self.cache_key_builder.id(&entity.user_id));
        self.cache.clear();
        self.find_by_id(entity.id).await?.ok_or_else(|| RepoError::NotFound("Preferences not found after save".to_string()))
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        let result = self.db
            .execute("DELETE FROM notification_preferences WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to delete: {}", e)))?;
        self.cache.remove(&self.cache_key_builder.id(&id));
        self.cache.clear();
        Ok(result > 0)
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let count = self.db
            .query_single_value::<i64>("SELECT COUNT(*) FROM notification_preferences WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to check existence: {}", e)))?;
        Ok(count > 0)
    }
}

// ── MessageRepository ─────────────────────────────────────────────────────────

/// Internal query struct for MessageRepository (distinct from domain MessageQuery).
#[derive(Debug, Clone, Default)]
pub struct MessageRepoQuery {
    pub search: Option<String>,
    pub message_type: Option<MessageType>,
    pub status: Option<MessageStatus>,
    pub sender_id: Option<String>,
    pub recipient_id: Option<String>,
    pub task_id: Option<String>,
    pub client_id: Option<String>,
    pub date_from: Option<i64>,
    pub date_to: Option<i64>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

impl MessageRepoQuery {
    fn build_where_clause(&self) -> (String, Vec<rusqlite::types::Value>) {
        let mut conditions = vec!["1=1".to_string()];
        let mut params: Vec<rusqlite::types::Value> = Vec::new();
        if let Some(search) = &self.search {
            conditions.push("(subject LIKE ? OR body LIKE ?)".to_string());
            params.push(format!("%{}%", search).into());
            params.push(format!("%{}%", search).into());
        }
        if let Some(mt) = &self.message_type {
            conditions.push("message_type = ?".to_string());
            params.push(mt.to_string().into());
        }
        if let Some(st) = &self.status {
            conditions.push("status = ?".to_string());
            params.push(st.to_string().into());
        }
        if let Some(sid) = &self.sender_id {
            conditions.push("sender_id = ?".to_string());
            params.push(sid.clone().into());
        }
        if let Some(rid) = &self.recipient_id {
            conditions.push("recipient_id = ?".to_string());
            params.push(rid.clone().into());
        }
        if let Some(tid) = &self.task_id {
            conditions.push("task_id = ?".to_string());
            params.push(tid.clone().into());
        }
        if let Some(cid) = &self.client_id {
            conditions.push("client_id = ?".to_string());
            params.push(cid.clone().into());
        }
        if let Some(df) = self.date_from {
            conditions.push("created_at >= ?".to_string());
            params.push(df.into());
        }
        if let Some(dt) = self.date_to {
            conditions.push("created_at <= ?".to_string());
            params.push(dt.into());
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
            &["created_at", "updated_at", "message_type", "status", "priority", "scheduled_at", "sent_at", "read_at", "subject"],
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

pub struct MessageRepository {
    db: Arc<Database>,
    cache: Arc<Cache>,
    cache_key_builder: CacheKeyBuilder,
}

impl MessageRepository {
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self { db, cache, cache_key_builder: CacheKeyBuilder::new("message") }
    }

    pub async fn find_by_type(&self, message_type: MessageType) -> RepoResult<Vec<Message>> {
        let cache_key = self.cache_key_builder.query(&["type", &message_type.to_string()]);
        if let Some(m) = self.cache.get::<Vec<Message>>(&cache_key) {
            return Ok(m);
        }
        let messages = self.db
            .query_as::<Message>(
                "SELECT id, message_type, sender_id, recipient_id, recipient_email, recipient_phone, subject, body, template_id, task_id, client_id, status, priority, scheduled_at, sent_at, read_at, error_message, metadata, created_at, updated_at FROM messages WHERE message_type = ? ORDER BY created_at DESC",
                params![message_type.to_string()],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find by type: {}", e)))?;
        self.cache.set(&cache_key, messages.clone(), ttl::SHORT);
        Ok(messages)
    }

    pub async fn find_by_status(&self, status: MessageStatus) -> RepoResult<Vec<Message>> {
        let cache_key = self.cache_key_builder.query(&["status", &status.to_string()]);
        if let Some(m) = self.cache.get::<Vec<Message>>(&cache_key) {
            return Ok(m);
        }
        let messages = self.db
            .query_as::<Message>(
                "SELECT id, message_type, sender_id, recipient_id, recipient_email, recipient_phone, subject, body, template_id, task_id, client_id, status, priority, scheduled_at, sent_at, read_at, error_message, metadata, created_at, updated_at FROM messages WHERE status = ? ORDER BY created_at DESC",
                params![status.to_string()],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find by status: {}", e)))?;
        self.cache.set(&cache_key, messages.clone(), ttl::SHORT);
        Ok(messages)
    }

    pub async fn find_by_recipient(&self, recipient_id: &str) -> RepoResult<Vec<Message>> {
        let cache_key = self.cache_key_builder.query(&["recipient", recipient_id]);
        if let Some(m) = self.cache.get::<Vec<Message>>(&cache_key) {
            return Ok(m);
        }
        let messages = self.db
            .query_as::<Message>(
                "SELECT id, message_type, sender_id, recipient_id, recipient_email, recipient_phone, subject, body, template_id, task_id, client_id, status, priority, scheduled_at, sent_at, read_at, error_message, metadata, created_at, updated_at FROM messages WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 100",
                params![recipient_id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find by recipient: {}", e)))?;
        self.cache.set(&cache_key, messages.clone(), ttl::SHORT);
        Ok(messages)
    }

    pub async fn find_unsent(&self) -> RepoResult<Vec<Message>> {
        let cache_key = self.cache_key_builder.query(&["unsent"]);
        if let Some(m) = self.cache.get::<Vec<Message>>(&cache_key) {
            return Ok(m);
        }
        let messages = self.db
            .query_as::<Message>(
                "SELECT id, message_type, sender_id, recipient_id, recipient_email, recipient_phone, subject, body, template_id, task_id, client_id, status, priority, scheduled_at, sent_at, read_at, error_message, metadata, created_at, updated_at FROM messages WHERE status IN ('pending', 'failed') AND (scheduled_at IS NULL OR scheduled_at <= strftime('%s', 'now')) ORDER BY priority DESC, created_at ASC LIMIT 50",
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find unsent: {}", e)))?;
        self.cache.set(&cache_key, messages.clone(), ttl::SHORT);
        Ok(messages)
    }

    pub async fn update_status(&self, message_id: &str, status: MessageStatus) -> RepoResult<()> {
        let timestamp = chrono::Utc::now().timestamp();
        let (sent_at, read_at) = match status {
            MessageStatus::Sent | MessageStatus::Delivered => (Some(timestamp), None),
            MessageStatus::Read => (Some(timestamp), Some(timestamp)),
            _ => (None, None),
        };
        self.db.execute(
            "UPDATE messages SET status=?, sent_at=COALESCE(?,sent_at), read_at=COALESCE(?,read_at), updated_at=strftime('%s','now') WHERE id=?",
            params![status.to_string(), sent_at, read_at, message_id],
        ).map_err(|e| RepoError::Database(format!("Failed to update status: {}", e)))?;
        self.cache.remove(&self.cache_key_builder.id(message_id));
        Ok(())
    }

    pub async fn search(&self, query: MessageRepoQuery) -> RepoResult<Vec<Message>> {
        let cache_key = self.cache_key_builder.query(&[&format!("{:?}", query)]);
        if let Some(m) = self.cache.get::<Vec<Message>>(&cache_key) {
            return Ok(m);
        }
        let (where_clause, params) = query.build_where_clause();
        let order_clause = query.build_order_by_clause().unwrap_or_else(|_| "ORDER BY created_at DESC".to_string());
        let (limit, _offset) = query.build_limit_offset().unwrap_or((100, None));
        let sql = format!(
            "SELECT id, message_type, sender_id, recipient_id, recipient_email, recipient_phone, subject, body, template_id, task_id, client_id, status, priority, scheduled_at, sent_at, read_at, error_message, metadata, created_at, updated_at FROM messages {} {} LIMIT ?",
            where_clause, order_clause
        );
        let mut params_vec: Vec<rusqlite::types::Value> = params;
        params_vec.push(limit.into());
        let messages = self.db
            .query_as::<Message>(&sql, rusqlite::params_from_iter(params_vec.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to search: {}", e)))?;
        self.cache.set(&cache_key, messages.clone(), ttl::SHORT);
        Ok(messages)
    }

    pub async fn count(&self, query: MessageRepoQuery) -> RepoResult<i64> {
        let (where_clause, params) = query.build_where_clause();
        let sql = format!("SELECT COUNT(*) FROM messages {}", where_clause);
        self.db
            .query_single_value(&sql, rusqlite::params_from_iter(params.iter()))
            .map_err(|e| RepoError::Database(format!("Failed to count: {}", e)))
    }

    pub fn invalidate_all_cache(&self) {
        self.cache.clear();
    }
}

#[async_trait]
impl Repository<Message, String> for MessageRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<Message>> {
        let cache_key = self.cache_key_builder.id(&id);
        if let Some(m) = self.cache.get::<Message>(&cache_key) {
            return Ok(Some(m));
        }
        let message = self.db
            .query_single_as::<Message>(
                "SELECT id, message_type, sender_id, recipient_id, recipient_email, recipient_phone, subject, body, template_id, task_id, client_id, status, priority, scheduled_at, sent_at, read_at, error_message, metadata, created_at, updated_at FROM messages WHERE id = ?",
                params![id],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find message: {}", e)))?;
        if let Some(ref m) = message {
            self.cache.set(&cache_key, m.clone(), ttl::MEDIUM);
        }
        Ok(message)
    }

    async fn find_all(&self) -> RepoResult<Vec<Message>> {
        let cache_key = self.cache_key_builder.list(&["all"]);
        if let Some(m) = self.cache.get::<Vec<Message>>(&cache_key) {
            return Ok(m);
        }
        let messages = self.db
            .query_as::<Message>(
                "SELECT id, message_type, sender_id, recipient_id, recipient_email, recipient_phone, subject, body, template_id, task_id, client_id, status, priority, scheduled_at, sent_at, read_at, error_message, metadata, created_at, updated_at FROM messages ORDER BY created_at DESC LIMIT 1000",
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find all: {}", e)))?;
        self.cache.set(&cache_key, messages.clone(), ttl::SHORT);
        Ok(messages)
    }

    async fn save(&self, entity: Message) -> RepoResult<Message> {
        let exists = self.exists_by_id(entity.id.clone()).await?;
        if exists {
            self.db.execute(
                "UPDATE messages SET message_type=?, sender_id=?, recipient_id=?, recipient_email=?, recipient_phone=?, subject=?, body=?, template_id=?, task_id=?, client_id=?, status=?, priority=?, scheduled_at=?, sent_at=?, read_at=?, error_message=?, metadata=?, updated_at=strftime('%s','now') WHERE id=?",
                params![entity.message_type, entity.sender_id, entity.recipient_id, entity.recipient_email, entity.recipient_phone, entity.subject, entity.body, entity.template_id, entity.task_id, entity.client_id, entity.status, entity.priority, entity.scheduled_at, entity.sent_at, entity.read_at, entity.error_message, entity.metadata, entity.id],
            ).map_err(|e| RepoError::Database(format!("Failed to update message: {}", e)))?;
        } else {
            self.db.execute(
                "INSERT INTO messages (id, message_type, sender_id, recipient_id, recipient_email, recipient_phone, subject, body, template_id, task_id, client_id, status, priority, scheduled_at, sent_at, read_at, error_message, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s','now'), strftime('%s','now'))",
                params![entity.id, entity.message_type, entity.sender_id, entity.recipient_id, entity.recipient_email, entity.recipient_phone, entity.subject, entity.body, entity.template_id, entity.task_id, entity.client_id, entity.status, entity.priority, entity.scheduled_at, entity.sent_at, entity.read_at, entity.error_message, entity.metadata],
            ).map_err(|e| RepoError::Database(format!("Failed to create message: {}", e)))?;
        }
        self.cache.remove(&self.cache_key_builder.id(&entity.id));
        self.find_by_id(entity.id).await?.ok_or_else(|| RepoError::NotFound("Message not found after save".to_string()))
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        let rows = self.db
            .execute("DELETE FROM messages WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to delete: {}", e)))?;
        if rows > 0 { self.cache.remove(&self.cache_key_builder.id(&id)); }
        Ok(rows > 0)
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let count = self.db
            .query_single_value::<i64>("SELECT COUNT(*) FROM messages WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to check existence: {}", e)))?;
        Ok(count > 0)
    }
}

// ── MessageService ────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct MessageService {
    repository: Arc<MessageRepository>,
    db: Arc<Database>,
}

impl MessageService {
    pub fn new(repository: Arc<MessageRepository>, db: Arc<Database>) -> Self {
        Self { repository, db }
    }

    pub async fn send_message(&self, request: &SendMessageRequest) -> Result<Message, AppError> {
        let id = format!("{:x}", rand::random::<u128>());
        let now = chrono::Utc::now().timestamp();
        let message = Message {
            id,
            message_type: request.message_type.clone(),
            sender_id: None,
            recipient_id: request.recipient_id.clone(),
            recipient_email: request.recipient_email.clone(),
            recipient_phone: request.recipient_phone.clone(),
            subject: request.subject.clone(),
            body: request.body.clone(),
            template_id: request.template_id.clone(),
            task_id: request.task_id.clone(),
            client_id: request.client_id.clone(),
            status: "pending".to_string(),
            priority: request.priority.clone().unwrap_or_else(|| "normal".to_string()),
            scheduled_at: request.scheduled_at,
            sent_at: None,
            read_at: None,
            error_message: None,
            metadata: None,
            created_at: now,
            updated_at: now,
        };
        let saved = self.repository.save(message).await.map_err(|e| {
            error!("Failed to save message: {}", e);
            AppError::Database("Failed to save message".to_string())
        })?;
        // NOTE: message is queued (status: "pending") — no actual delivery channel is implemented yet.
        // Email/SMS/push delivery is not yet supported; this only persists the message.
        info!("Message {} queued for delivery (status: pending)", saved.id);
        Ok(saved)
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn send_message_raw(
        &self,
        message_type: String,
        recipient_id: Option<String>,
        recipient_email: Option<String>,
        recipient_phone: Option<String>,
        subject: Option<String>,
        body: String,
        task_id: Option<String>,
        client_id: Option<String>,
        priority: Option<String>,
        scheduled_at: Option<i64>,
        correlation_id: Option<String>,
    ) -> Result<Message, AppError> {
        self.send_message(&SendMessageRequest {
            message_type, recipient_id, recipient_email, recipient_phone, subject, body,
            template_id: None, task_id, client_id, priority, scheduled_at, correlation_id,
        }).await
    }

    pub async fn get_messages(&self, query: &MessageQuery) -> Result<MessageListResponse, AppError> {
        let repo_query = MessageRepoQuery {
            search: None,
            message_type: query.message_type.as_deref().and_then(MessageType::from_str),
            status: query.status.as_deref().and_then(MessageStatus::from_str),
            sender_id: query.sender_id.clone(),
            recipient_id: query.recipient_id.clone(),
            task_id: query.task_id.clone(),
            client_id: query.client_id.clone(),
            date_from: query.date_from,
            date_to: query.date_to,
            limit: query.limit.map(|l| l as i64),
            offset: query.offset.map(|o| o as i64),
            sort_by: None,
            sort_order: None,
        };
        let count_query = repo_query.clone();
        let messages = self.repository.search(repo_query).await.map_err(|e| {
            error!("Failed to search messages: {}", e);
            AppError::Database("Failed to search messages".to_string())
        })?;
        let total = self.repository.count(count_query).await.map_err(|e| {
            error!("Failed to count messages: {}", e);
            AppError::Database("Failed to count messages".to_string())
        })? as i32;
        let offset = query.offset.unwrap_or(0);
        let has_more = (offset + messages.len() as i32) < total;
        Ok(MessageListResponse { messages, total, has_more })
    }

    pub async fn mark_read(&self, message_id: &str) -> Result<(), AppError> {
        self.repository.update_status(message_id, MessageStatus::Read).await.map_err(|e| {
            error!("Failed to mark message {} as read: {}", message_id, e);
            AppError::Database("Failed to mark message as read".to_string())
        })?;
        info!("Message {} marked as read", message_id);
        Ok(())
    }

    pub async fn get_templates(&self, category: Option<&str>, message_type: Option<&str>) -> Result<Vec<MessageTemplate>, AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get DB connection: {}", e);
            AppError::Database("Failed to get database connection".to_string())
        })?;
        let mut sql = String::from("SELECT id, name, description, message_type, subject, body, variables, category, is_active, created_by, created_at, updated_at FROM message_templates WHERE is_active = 1");
        let mut owned_params: Vec<String> = Vec::new();
        if let Some(cat) = category {
            sql.push_str(" AND category = ?");
            owned_params.push(cat.to_string());
        }
        if let Some(msg_type) = message_type {
            sql.push_str(" AND message_type = ?");
            owned_params.push(msg_type.to_string());
        }
        sql.push_str(" ORDER BY name");
        let mut stmt = conn.prepare(&sql).map_err(|e| AppError::Database(format!("Failed to query templates: {}", e)))?;
        let templates = stmt
            .query_map(rusqlite::params_from_iter(owned_params), |row| {
                Ok(MessageTemplate {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    message_type: row.get(3)?,
                    subject: row.get(4)?,
                    body: row.get(5)?,
                    variables: row.get(6)?,
                    category: row.get(7)?,
                    is_active: row.get(8)?,
                    created_by: row.get(9)?,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                })
            })
            .map_err(|e| AppError::Database(format!("Failed to query templates: {}", e)))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| AppError::Database(format!("Failed to collect templates: {}", e)))?;
        Ok(templates)
    }

    pub async fn get_preferences(&self, user_id: &str) -> Result<NotificationPreferences, AppError> {
        let conn = self.db.get_connection().map_err(|e| AppError::Database(e.to_string()))?;
        conn.query_row(
            "SELECT id, user_id, in_app_enabled, task_assigned, task_updated, task_completed, task_overdue, client_created, client_updated, system_alerts, maintenance_notifications, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, created_at, updated_at FROM notification_preferences WHERE user_id = ?",
            params![user_id],
            |row| Ok(NotificationPreferences {
                id: row.get(0)?,
                user_id: row.get(1)?,
                in_app_enabled: row.get(2)?,
                task_assigned: row.get(3)?,
                task_updated: row.get(4)?,
                task_completed: row.get(5)?,
                task_overdue: row.get(6)?,
                client_created: row.get(7)?,
                client_updated: row.get(8)?,
                system_alerts: row.get(9)?,
                maintenance_notifications: row.get(10)?,
                quiet_hours_enabled: row.get(11)?,
                quiet_hours_start: row.get(12)?,
                quiet_hours_end: row.get(13)?,
                created_at: row.get(14)?,
                updated_at: row.get(15)?,
            }),
        )
        .map_err(|e| AppError::Database(format!("Failed to get preferences: {}", e)))
    }

    pub async fn update_preferences(&self, user_id: &str, updates: &UpdateNotificationPreferencesRequest) -> Result<NotificationPreferences, AppError> {
        let conn = self.db.get_connection().map_err(|e| AppError::Database(e.to_string()))?;
        let mut sql = String::from("UPDATE notification_preferences SET updated_at = ?");
        let now = chrono::Utc::now().timestamp();
        let mut param_values: Vec<String> = vec![now.to_string()];
        macro_rules! maybe_field {
            ($field:expr, $col:literal) => {
                if let Some(v) = $field { sql.push_str(concat!(", ", $col, " = ?")); param_values.push(v.to_string()); }
            };
        }
        maybe_field!(updates.in_app_enabled, "in_app_enabled");
        maybe_field!(updates.task_assigned, "task_assigned");
        maybe_field!(updates.task_updated, "task_updated");
        maybe_field!(updates.task_completed, "task_completed");
        maybe_field!(updates.task_overdue, "task_overdue");
        maybe_field!(updates.client_created, "client_created");
        maybe_field!(updates.client_updated, "client_updated");
        maybe_field!(updates.system_alerts, "system_alerts");
        maybe_field!(updates.maintenance_notifications, "maintenance_notifications");
        maybe_field!(updates.quiet_hours_enabled, "quiet_hours_enabled");
        if let Some(ref v) = updates.quiet_hours_start { sql.push_str(", quiet_hours_start = ?"); param_values.push(v.clone()); }
        if let Some(ref v) = updates.quiet_hours_end { sql.push_str(", quiet_hours_end = ?"); param_values.push(v.clone()); }
        sql.push_str(" WHERE user_id = ?");
        param_values.push(user_id.to_string());
        conn.execute(&sql, rusqlite::params_from_iter(param_values))
            .map_err(|e| AppError::Database(format!("Failed to update preferences: {}", e)))?;
        info!("Updated notification preferences for user {}", user_id);
        self.get_preferences(user_id).await
    }
}

#[async_trait]
impl NotificationSender for MessageService {
    async fn send_message_raw(
        &self,
        message_type: String,
        recipient_id: Option<String>,
        recipient_email: Option<String>,
        recipient_phone: Option<String>,
        subject: Option<String>,
        body: String,
        task_id: Option<String>,
        client_id: Option<String>,
        priority: Option<String>,
        scheduled_at: Option<i64>,
        correlation_id: Option<String>,
    ) -> Result<SentMessage, AppError> {
        let msg = self.send_message_raw(message_type, recipient_id, recipient_email, recipient_phone, subject, body, task_id, client_id, priority, scheduled_at, correlation_id).await?;
        Ok(SentMessage { id: msg.id })
    }
}

// ── NotificationHelper ────────────────────────────────────────────────────────

pub struct NotificationHelper;

impl NotificationHelper {
    pub async fn create_task_assigned(db: &Arc<Database>, cache: &Arc<Cache>, user_id: &str, task_id: &str, task_title: &str) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        repo.save(Notification::new(user_id.to_string(), "TaskAssignment".to_string(), "Nouvelle tâche assignée".to_string(), format!("Vous avez été assigné à la tâche: {}", task_title), "task".to_string(), task_id.to_string(), format!("/tasks/{}", task_id))).await.map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }

    pub async fn create_task_updated(db: &Arc<Database>, cache: &Arc<Cache>, user_id: &str, task_id: &str, task_title: &str, status: &str) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        repo.save(Notification::new(user_id.to_string(), "TaskUpdate".to_string(), "Mise à jour de tâche".to_string(), format!("La tâche '{}' a été mise à jour: {}", task_title, status), "task".to_string(), task_id.to_string(), format!("/tasks/{}", task_id))).await.map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }

    pub async fn create_intervention_created(db: &Arc<Database>, cache: &Arc<Cache>, user_id: &str, intervention_id: &str, task_id: &str) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        repo.save(Notification::new(user_id.to_string(), "InterventionCreated".to_string(), "Nouvelle intervention".to_string(), format!("Une intervention a été créée pour la tâche {}", task_id), "intervention".to_string(), intervention_id.to_string(), format!("/interventions/{}", intervention_id))).await.map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }

    pub async fn create_quote_created(db: &Arc<Database>, cache: &Arc<Cache>, user_id: &str, quote_id: &str, client_name: &str) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        repo.save(Notification::new(user_id.to_string(), "QuoteCreated".to_string(), "Nouveau devis créé".to_string(), format!("Un nouveau devis a été créé pour le client: {}", client_name), "quote".to_string(), quote_id.to_string(), format!("/quotes/{}", quote_id))).await.map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }

    pub async fn create_quote_approved(db: &Arc<Database>, cache: &Arc<Cache>, user_id: &str, quote_id: &str, client_name: &str) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        repo.save(Notification::new(user_id.to_string(), "QuoteApproved".to_string(), "Devis approuvé".to_string(), format!("Le devis pour {} a été approuvé", client_name), "quote".to_string(), quote_id.to_string(), format!("/quotes/{}", quote_id))).await.map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }

    pub async fn create_client_created(db: &Arc<Database>, cache: &Arc<Cache>, user_id: &str, client_id: &str, client_name: &str) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        repo.save(Notification::new(user_id.to_string(), "ClientCreated".to_string(), "Nouveau client ajouté".to_string(), format!("Un nouveau client a été ajouté: {}", client_name), "client".to_string(), client_id.to_string(), format!("/clients/{}", client_id))).await.map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }

    pub async fn create_system_alert(db: &Arc<Database>, cache: &Arc<Cache>, user_id: &str, title: &str, message: &str) -> Result<(), String> {
        let repo = NotificationRepository::new(db.clone(), cache.clone());
        repo.save(Notification::new(user_id.to_string(), "SystemAlert".to_string(), title.to_string(), message.to_string(), "system".to_string(), "system".to_string(), "/".to_string())).await.map_err(|e| format!("Failed to create notification: {}", e))?;
        Ok(())
    }
}

// ── IPC command structs ───────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateNotificationConfigRequest {
    pub quiet_hours_start: Option<String>,
    pub quiet_hours_end: Option<String>,
    pub timezone: Option<String>,
    pub correlation_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetNotificationsResponse {
    pub notifications: Vec<Notification>,
    pub unread_count: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SuccessResponse {
    pub success: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateNotificationRequest {
    pub user_id: String,
    pub r#type: String,
    pub title: String,
    pub message: String,
    pub entity_type: String,
    pub entity_id: String,
    pub entity_url: String,
    pub correlation_id: Option<String>,
}

lazy_static! {
    static ref NOTIFICATION_SERVICE: Arc<Mutex<Option<NotificationService>>> =
        Arc::new(Mutex::new(None));
}

// ── IPC commands ──────────────────────────────────────────────────────────────
//
// Each command authenticates the caller, then delegates to `NotificationsFacade`
// — direct use of `NotificationRepository` or `MessageService` is forbidden here.

fn notifications_facade(state: &AppState<'_>) -> super::facade::NotificationsFacade {
    super::facade::NotificationsFacade::new(
        state.db.clone(),
        state.repositories.cache.clone(),
        state.message_service.clone(),
    )
}

/// ADR-018: Thin IPC layer
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_send(
    request: SendMessageRequest,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Message>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let msg = notifications_facade(&state).send_message(&request).await?;
    Ok(ApiResponse::success(msg).with_correlation_id(Some(ctx.correlation_id)))
}

#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_get_list(
    query: MessageQuery,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<MessageListResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let list = notifications_facade(&state).get_messages(&query).await?;
    Ok(ApiResponse::success(list).with_correlation_id(Some(ctx.correlation_id)))
}

#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_mark_read(
    message_id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    notifications_facade(&state).mark_message_read(&message_id).await?;
    Ok(ApiResponse::success(()).with_correlation_id(Some(ctx.correlation_id)))
}

#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_get_templates(
    category: Option<String>,
    message_type: Option<String>,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<MessageTemplate>>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let templates = notifications_facade(&state)
        .get_message_templates(category.as_deref(), message_type.as_deref())
        .await?;
    Ok(ApiResponse::success(templates).with_correlation_id(Some(ctx.correlation_id)))
}

#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_get_preferences(
    user_id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<NotificationPreferences>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let prefs = notifications_facade(&state).get_preferences(&user_id).await?;
    Ok(ApiResponse::success(prefs).with_correlation_id(Some(ctx.correlation_id)))
}

#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn message_update_preferences(
    user_id: String,
    updates: UpdateNotificationPreferencesRequest,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<NotificationPreferences>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let prefs = notifications_facade(&state)
        .update_preferences(&user_id, &updates)
        .await?;
    Ok(ApiResponse::success(prefs).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(config, state))]
pub async fn initialize_notification_service(
    config: UpdateNotificationConfigRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let ctx = resolve_context!(&state, &config.correlation_id);
    let notification_config = NotificationConfig {
        quiet_hours_start: config.quiet_hours_start.clone(),
        quiet_hours_end: config.quiet_hours_end.clone(),
        timezone: config.timezone.clone().unwrap_or_else(|| "Europe/Paris".to_string()),
    };
    let service = NotificationService::new(notification_config);
    let mut global_service = NOTIFICATION_SERVICE.lock().await;
    *global_service = Some(service);
    info!("Notification service initialized (in-app only)");
    Ok(ApiResponse::success(()).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_notification_status(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let service_guard = NOTIFICATION_SERVICE.lock().await;
    let config = if service_guard.is_some() {
        serde_json::json!({ "initialized": true, "channels": ["in_app"] })
    } else {
        serde_json::json!({ "initialized": false })
    };
    Ok(ApiResponse::success(config).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn get_notifications(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<GetNotificationsResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let result = notifications_facade(&state)
        .get_notifications(&ctx.auth.user_id, 50)
        .await
        .map_err(|e: AppError| {
            error!(error = %e, "Failed to get notifications");
            e
        })?;
    info!(
        user_id = %ctx.auth.user_id,
        count = result.notifications.len(),
        unread = result.unread_count,
        "Retrieved notifications"
    );
    Ok(ApiResponse::success(result).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state), fields(notification_id = %id))]
pub async fn mark_notification_read(
    id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<SuccessResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    notifications_facade(&state)
        .mark_notification_read(&id)
        .await
        .map_err(|e| {
            error!(error = %e, notification_id = %id, "Failed to mark as read");
            e
        })?;
    info!(notification_id = %id, "Notification marked as read");
    Ok(ApiResponse::success(SuccessResponse { success: true }).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn mark_all_notifications_read(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<SuccessResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    notifications_facade(&state)
        .mark_all_notifications_read(&ctx.auth.user_id)
        .await
        .map_err(|e| {
            error!(error = %e, "Failed to mark all as read");
            e
        })?;
    info!(user_id = %ctx.auth.user_id, "All notifications marked as read");
    Ok(ApiResponse::success(SuccessResponse { success: true }).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state), fields(notification_id = %id))]
pub async fn delete_notification(
    id: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<SuccessResponse>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    notifications_facade(&state)
        .delete_notification(&id)
        .await
        .map_err(|e| {
            error!(error = %e, notification_id = %id, "Failed to delete");
            e
        })?;
    info!(notification_id = %id, "Notification deleted");
    Ok(ApiResponse::success(SuccessResponse { success: true }).with_correlation_id(Some(ctx.correlation_id)))
}

#[tauri::command]
#[instrument(skip(state, request))]
pub async fn create_notification(
    request: CreateNotificationRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Notification>, AppError> {
    let correlation_id = init_correlation_context(&request.correlation_id, None);
    let user_id = request.user_id.clone();
    let notification_type = request.r#type.clone();
    let notification = Notification::new(
        user_id.clone(),
        notification_type.clone(),
        request.title,
        request.message,
        request.entity_type,
        request.entity_id,
        request.entity_url,
    );
    let created = notifications_facade(&state)
        .create_notification(notification)
        .await
        .map_err(|e| {
            error!(error = %e, user_id = %user_id, "Failed to create notification");
            e
        })?;
    info!(
        user_id = %user_id,
        notification_type = %notification_type,
        notification_id = %created.id,
        "Notification created"
    );
    Ok(ApiResponse::success(created).with_correlation_id(Some(correlation_id)))
}

