//! Application-layer facade for the Notifications bounded context.
//!
//! Provides a single entry point for all notification operations. IPC handlers
//! should use `NotificationsFacade` and must not instantiate `NotificationRepository`
//! or call `MessageService` methods directly.

use std::sync::Arc;

use crate::db::Database;
use crate::shared::ipc::errors::AppError;
use crate::shared::repositories::cache::Cache;

use super::models::{
    Message, MessageListResponse, MessageQuery, MessageTemplate, Notification,
    NotificationPreferences, SendMessageRequest, UpdateNotificationPreferencesRequest,
};
use super::notification_handler::{
    GetNotificationsResponse, MessageService, NotificationRepository,
};

/// Facade for the Notifications bounded context.
///
/// Wraps the in-app `NotificationRepository` and the cross-channel
/// `MessageService`. IPC handlers must use this facade and must not
/// instantiate the underlying services directly.
#[derive(Clone)]
pub struct NotificationsFacade {
    db: Arc<Database>,
    cache: Arc<Cache>,
    message_service: Arc<MessageService>,
}

impl NotificationsFacade {
    /// Create a new facade.
    pub fn new(db: Arc<Database>, cache: Arc<Cache>, message_service: Arc<MessageService>) -> Self {
        Self {
            db,
            cache,
            message_service,
        }
    }

    // ── In-app notifications ──────────────────────────────────────────────────

    /// Retrieve in-app notifications for the given user (up to `limit`).
    pub async fn get_notifications(
        &self,
        user_id: &str,
        limit: i32,
    ) -> Result<GetNotificationsResponse, AppError> {
        let repo = self.notification_repo();
        let notifications = repo
            .find_by_user(user_id, limit)
            .await
            .map_err(|e| AppError::Database(format!("Failed to get notifications: {}", e)))?;
        let unread_count = repo.count_unread(user_id).await.unwrap_or(0);
        Ok(GetNotificationsResponse {
            notifications,
            unread_count,
        })
    }

    /// Mark a single notification as read.
    pub async fn mark_notification_read(&self, id: &str) -> Result<(), AppError> {
        self.notification_repo()
            .mark_read(id)
            .await
            .map_err(|e| AppError::Database(format!("Failed to mark notification as read: {}", e)))
    }

    /// Mark all notifications for the given user as read.
    pub async fn mark_all_notifications_read(&self, user_id: &str) -> Result<(), AppError> {
        self.notification_repo()
            .mark_all_read(user_id)
            .await
            .map_err(|e| {
                AppError::Database(format!("Failed to mark all notifications as read: {}", e))
            })
    }

    /// Delete a single notification.
    pub async fn delete_notification(&self, id: &str) -> Result<bool, AppError> {
        self.notification_repo()
            .delete(id)
            .await
            .map_err(|e| AppError::Database(format!("Failed to delete notification: {}", e)))
    }

    /// Persist a new in-app notification.
    pub async fn create_notification(
        &self,
        notification: Notification,
    ) -> Result<Notification, AppError> {
        use crate::shared::repositories::base::Repository;
        self.notification_repo()
            .save(notification)
            .await
            .map_err(|e| AppError::Database(format!("Failed to create notification: {}", e)))
    }

    // ── Messages ──────────────────────────────────────────────────────────────

    /// Send a message through the message service.
    pub async fn send_message(&self, request: &SendMessageRequest) -> Result<Message, AppError> {
        self.message_service
            .send_message(request)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))
    }

    /// List messages matching the given query.
    pub async fn get_messages(
        &self,
        query: &MessageQuery,
    ) -> Result<MessageListResponse, AppError> {
        self.message_service
            .get_messages(query)
            .await
            .map_err(|e| AppError::Database(e.to_string()))
    }

    /// Mark a single message as read.
    pub async fn mark_message_read(&self, message_id: &str) -> Result<(), AppError> {
        self.message_service
            .mark_read(message_id)
            .await
            .map_err(|e| AppError::Database(e.to_string()))
    }

    /// Retrieve message templates, optionally filtered by category and type.
    pub async fn get_message_templates(
        &self,
        category: Option<&str>,
        message_type: Option<&str>,
    ) -> Result<Vec<MessageTemplate>, AppError> {
        self.message_service
            .get_templates(category, message_type)
            .await
            .map_err(|e| AppError::Database(e.to_string()))
    }

    /// Retrieve notification preferences for the given user.
    pub async fn get_preferences(
        &self,
        user_id: &str,
    ) -> Result<NotificationPreferences, AppError> {
        self.message_service
            .get_preferences(user_id)
            .await
            .map_err(|e| AppError::Database(e.to_string()))
    }

    /// Update notification preferences for the given user.
    pub async fn update_preferences(
        &self,
        user_id: &str,
        updates: &UpdateNotificationPreferencesRequest,
    ) -> Result<NotificationPreferences, AppError> {
        self.message_service
            .update_preferences(user_id, updates)
            .await
            .map_err(|e| AppError::Database(e.to_string()))
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    fn notification_repo(&self) -> NotificationRepository {
        NotificationRepository::new(self.db.clone(), self.cache.clone())
    }
}
