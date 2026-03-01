use std::sync::Arc;

use crate::db::Database;
use crate::domains::notifications::domain::models::notification::Notification;
use crate::domains::notifications::infrastructure::notification_in_app_repository::NotificationRepository;
use crate::shared::repositories::base::Repository;
use crate::shared::repositories::cache::Cache;

#[derive(Debug, Clone)]
pub struct NotificationInAppService {
    db: Arc<Database>,
    cache: Arc<Cache>,
}

impl NotificationInAppService {
    pub fn new(db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self { db, cache }
    }

    fn repo(&self) -> NotificationRepository {
        NotificationRepository::new(self.db.clone(), self.cache.clone())
    }

    pub async fn find_by_user(
        &self,
        user_id: &str,
        limit: i32,
    ) -> Result<Vec<Notification>, String> {
        self.repo()
            .find_by_user(user_id, limit)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn count_unread(&self, user_id: &str) -> Result<i32, String> {
        self.repo()
            .count_unread(user_id)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn mark_read(&self, id: &str) -> Result<(), String> {
        self.repo().mark_read(id).await.map_err(|e| e.to_string())
    }

    pub async fn mark_all_read(&self, user_id: &str) -> Result<(), String> {
        self.repo()
            .mark_all_read(user_id)
            .await
            .map_err(|e| e.to_string())
    }

    pub async fn delete(&self, id: &str) -> Result<(), String> {
        self.repo()
            .delete(id)
            .await
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    pub async fn save(&self, notification: Notification) -> Result<Notification, String> {
        self.repo()
            .save(notification)
            .await
            .map_err(|e| e.to_string())
    }
}
