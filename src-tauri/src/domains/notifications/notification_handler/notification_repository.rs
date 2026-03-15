use std::sync::Arc;
use async_trait::async_trait;
use rusqlite::params;

use crate::db::Database;
use crate::domains::notifications::models::Notification;
use crate::shared::repositories::base::{RepoError, RepoResult, Repository};
use crate::shared::repositories::cache::{ttl, Cache, CacheKeyBuilder};

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
