//! In-app notification repository implementation

use crate::db::Database;
use crate::domains::notifications::domain::models::notification::Notification;
use crate::shared::repositories::base::{RepoError, RepoResult, Repository};
use crate::shared::repositories::cache::{ttl, Cache, CacheKeyBuilder};
use async_trait::async_trait;
use rusqlite::params;
use std::sync::Arc;

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
        let cache_key = self
            .cache_key_builder
            .list(&["user", user_id, &limit.to_string()]);

        if let Some(notifications) = self.cache.get::<Vec<Notification>>(&cache_key) {
            return Ok(notifications);
        }

        let notifications = self
            .db
            .query_as::<Notification>(
                "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
                params![user_id, limit],
            )
            .map_err(|e| {
                RepoError::Database(format!("Failed to find notifications by user: {}", e))
            })?;

        self.cache
            .set(&cache_key, notifications.clone(), ttl::SHORT);

        Ok(notifications)
    }

    pub async fn count_unread(&self, user_id: &str) -> RepoResult<i32> {
        let count = self
            .db
            .query_single_value::<i64>(
                "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read = 0",
                params![user_id],
            )
            .map_err(|e| {
                RepoError::Database(format!("Failed to count unread notifications: {}", e))
            })?;

        Ok(count as i32)
    }

    pub async fn mark_read(&self, id: &str) -> RepoResult<()> {
        self.db
            .execute(
                "UPDATE notifications SET read = 1 WHERE id = ?",
                params![id],
            )
            .map_err(|e| {
                RepoError::Database(format!("Failed to mark notification as read: {}", e))
            })?;

        self.cache.clear();

        Ok(())
    }

    pub async fn mark_all_read(&self, user_id: &str) -> RepoResult<()> {
        self.db
            .execute(
                "UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0",
                params![user_id],
            )
            .map_err(|e| {
                RepoError::Database(format!("Failed to mark all notifications as read: {}", e))
            })?;

        self.cache.clear();

        Ok(())
    }

    pub async fn delete(&self, id: &str) -> RepoResult<bool> {
        let result = self
            .db
            .execute("DELETE FROM notifications WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to delete notification: {}", e)))?;

        self.cache.clear();

        Ok(result > 0)
    }
}

#[async_trait]
impl Repository<Notification, String> for NotificationRepository {
    async fn find_by_id(&self, id: String) -> RepoResult<Option<Notification>> {
        let cache_key = self.cache_key_builder.id(&id);

        if let Some(notification) = self.cache.get::<Notification>(&cache_key) {
            return Ok(Some(notification));
        }

        let notification = self
            .db
            .query_single_as::<Notification>(
                "SELECT * FROM notifications WHERE id = ?",
                params![id],
            )
            .map_err(|e| {
                RepoError::Database(format!("Failed to find notification by id: {}", e))
            })?;

        if let Some(ref notification) = notification {
            self.cache
                .set(&cache_key, notification.clone(), ttl::MEDIUM);
        }

        Ok(notification)
    }

    async fn find_all(&self) -> RepoResult<Vec<Notification>> {
        let notifications = self
            .db
            .query_as::<Notification>(
                "SELECT * FROM notifications ORDER BY created_at DESC LIMIT 1000",
                [],
            )
            .map_err(|e| RepoError::Database(format!("Failed to find all notifications: {}", e)))?;

        Ok(notifications)
    }

    async fn save(&self, entity: Notification) -> RepoResult<Notification> {
        self.db
            .execute(
                "INSERT INTO notifications (
                    id, type, title, message, entity_type, entity_id, entity_url, read, user_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![
                    entity.id,
                    entity.r#type,
                    entity.title,
                    entity.message,
                    entity.entity_type,
                    entity.entity_id,
                    entity.entity_url,
                    if entity.read { 1 } else { 0 },
                    entity.user_id,
                    entity.created_at.timestamp(),
                ],
            )
            .map_err(|e| RepoError::Database(format!("Failed to create notification: {}", e)))?;

        self.cache.clear();

        self.find_by_id(entity.id)
            .await?
            .ok_or_else(|| RepoError::NotFound("Notification not found after save".to_string()))
    }

    async fn delete_by_id(&self, id: String) -> RepoResult<bool> {
        let result = self
            .db
            .execute("DELETE FROM notifications WHERE id = ?", params![id])
            .map_err(|e| RepoError::Database(format!("Failed to delete notification: {}", e)))?;

        self.cache.clear();

        Ok(result > 0)
    }

    async fn exists_by_id(&self, id: String) -> RepoResult<bool> {
        let exists = self
            .db
            .query_single_value::<i64>(
                "SELECT COUNT(*) FROM notifications WHERE id = ?",
                params![id],
            )
            .map_err(|e| {
                RepoError::Database(format!("Failed to check notification existence: {}", e))
            })?;

        Ok(exists > 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use std::sync::Arc;

    async fn setup_test_db() -> Database {
        crate::test_utils::setup_test_db().await
    }

    #[tokio::test]
    async fn test_create_notification() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationRepository::new(Arc::new(db), Arc::clone(&cache));

        let notification = Notification::new(
            "user-123".to_string(),
            "task_assigned".to_string(),
            "New Task".to_string(),
            "You have been assigned a new task".to_string(),
            "task".to_string(),
            "task-456".to_string(),
            "/tasks/456".to_string(),
        );

        let saved = repo.save(notification).await.unwrap();
        assert_eq!(saved.title, "New Task");
        assert!(!saved.read);
    }

    #[tokio::test]
    async fn test_find_by_user() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationRepository::new(Arc::new(db), Arc::clone(&cache));

        let notification1 = Notification::new(
            "user-123".to_string(),
            "task_assigned".to_string(),
            "Task 1".to_string(),
            "First task".to_string(),
            "task".to_string(),
            "task-1".to_string(),
            "/tasks/1".to_string(),
        );
        let notification2 = Notification::new(
            "user-123".to_string(),
            "intervention_created".to_string(),
            "Intervention 1".to_string(),
            "New intervention".to_string(),
            "intervention".to_string(),
            "intervention-1".to_string(),
            "/interventions/1".to_string(),
        );

        repo.save(notification1).await.unwrap();
        repo.save(notification2).await.unwrap();

        let notifications = repo.find_by_user("user-123", 50).await.unwrap();
        assert_eq!(notifications.len(), 2);
    }

    #[tokio::test]
    async fn test_count_unread() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationRepository::new(Arc::new(db), Arc::clone(&cache));

        let notification1 = Notification::new(
            "user-123".to_string(),
            "task_assigned".to_string(),
            "Task 1".to_string(),
            "First task".to_string(),
            "task".to_string(),
            "task-1".to_string(),
            "/tasks/1".to_string(),
        );
        let notification2 = Notification::new(
            "user-123".to_string(),
            "task_assigned".to_string(),
            "Task 2".to_string(),
            "Second task".to_string(),
            "task".to_string(),
            "task-2".to_string(),
            "/tasks/2".to_string(),
        );

        repo.save(notification1).await.unwrap();
        repo.save(notification2).await.unwrap();

        let unread = repo.count_unread("user-123").await.unwrap();
        assert_eq!(unread, 2);

        repo.mark_read(&repo.find_by_user("user-123", 1).await.unwrap()[0].id)
            .await
            .unwrap();

        let unread = repo.count_unread("user-123").await.unwrap();
        assert_eq!(unread, 1);
    }

    #[tokio::test]
    async fn test_mark_read() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationRepository::new(Arc::new(db), Arc::clone(&cache));

        let notification = Notification::new(
            "user-123".to_string(),
            "task_assigned".to_string(),
            "Task 1".to_string(),
            "First task".to_string(),
            "task".to_string(),
            "task-1".to_string(),
            "/tasks/1".to_string(),
        );

        let saved = repo.save(notification).await.unwrap();
        repo.mark_read(&saved.id).await.unwrap();

        let found = repo.find_by_id(saved.id).await.unwrap().unwrap();
        assert!(found.read);
    }

    #[tokio::test]
    async fn test_delete() {
        let db = setup_test_db().await;
        let cache = Arc::new(Cache::new(100));
        let repo = NotificationRepository::new(Arc::new(db), Arc::clone(&cache));

        let notification = Notification::new(
            "user-123".to_string(),
            "task_assigned".to_string(),
            "Task 1".to_string(),
            "First task".to_string(),
            "task".to_string(),
            "task-1".to_string(),
            "/tasks/1".to_string(),
        );

        let saved = repo.save(notification).await.unwrap();
        let deleted = repo.delete_by_id(saved.id.clone()).await.unwrap();
        assert!(deleted);

        let found = repo.find_by_id(saved.id).await.unwrap();
        assert!(found.is_none());
    }
}
