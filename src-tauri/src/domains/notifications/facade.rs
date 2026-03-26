//! Application-layer facade for the Notifications bounded context.
//!
//! Provides a single entry point for all notification operations. IPC handlers
//! should use `NotificationsFacade` and must not instantiate `NotificationRepository`
//! or call `MessageService` methods directly.

use std::sync::Arc;

use crate::db::Database;
use crate::shared::services::cross_domain::{UserSettings, UserSettingsRepository};
use crate::shared::ipc::errors::AppError;
use crate::shared::repositories::cache::Cache;

use crate::shared::services::event_bus::{event_factory, EventPublisher, InMemoryEventBus};

use super::models::{
    Message, MessageListResponse, MessageQuery, MessageTemplate, Notification,
    NotificationPreferences, SendMessageRequest, UpdateNotificationPreferencesRequest,
};
use super::notification_handler::{
    GetNotificationsResponse, MessageService, NotificationRepository,
    NotificationTemplateRepository,
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
    event_bus: Arc<InMemoryEventBus>,
}

impl NotificationsFacade {
    /// Create a new facade.
    pub fn new(
        db: Arc<Database>,
        cache: Arc<Cache>,
        message_service: Arc<MessageService>,
        event_bus: Arc<InMemoryEventBus>,
    ) -> Self {
        Self {
            db,
            cache,
            message_service,
            event_bus,
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

    /// Persist a new in-app notification and publish a domain event.
    pub async fn create_notification(
        &self,
        notification: Notification,
    ) -> Result<Notification, AppError> {
        use crate::shared::repositories::base::Repository;
        let saved = self
            .notification_repo()
            .save(notification)
            .await
            .map_err(|e| AppError::Database(format!("Failed to create notification: {}", e)))?;

        // ADR-016: Publish domain event so the frontend is notified in real-time
        let event = event_factory::notification_received(
            saved.id.clone(),
            saved.user_id.clone(),
            saved.message.clone(),
        );
        if let Err(e) = self.event_bus.publish(event) {
            tracing::warn!(
                notification_id = %saved.id,
                "Failed to publish NotificationReceived event: {}",
                e
            );
        }

        Ok(saved)
    }

    /// Construct a `Notification` from its constituent parts and persist it.
    ///
    /// Use this instead of calling `Notification::new()` in IPC handlers.
    #[allow(clippy::too_many_arguments)]
    pub async fn create_notification_from_parts(
        &self,
        user_id: String,
        notification_type: String,
        title: String,
        message: String,
        entity_type: String,
        entity_id: String,
        entity_url: String,
    ) -> Result<Notification, AppError> {
        let notification = Notification::new(
            user_id,
            notification_type,
            title,
            message,
            entity_type,
            entity_id,
            entity_url,
        );
        self.create_notification(notification).await
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
        self.template_repo()
            .find_active_message_templates(category, message_type)
            .await
            .map_err(|e| AppError::Database(e.to_string()))
    }

    /// Retrieve notification preferences for the given user.
    pub async fn get_preferences(
        &self,
        user_id: &str,
    ) -> Result<NotificationPreferences, AppError> {
        let settings = self.user_settings_repo().get_user_settings(user_id)?;
        Ok(map_user_settings_to_preferences(user_id, &settings))
    }

    /// Update notification preferences for the given user.
    pub async fn update_preferences(
        &self,
        user_id: &str,
        updates: &UpdateNotificationPreferencesRequest,
    ) -> Result<NotificationPreferences, AppError> {
        let repo = self.user_settings_repo();
        let mut settings = repo.get_user_settings(user_id)?;

        if let Some(v) = updates.in_app_enabled {
            settings.notifications.in_app_enabled = v;
        }
        if let Some(v) = updates.task_assigned {
            settings.notifications.task_assigned = v;
        }
        if let Some(v) = updates.task_updated {
            settings.notifications.task_updated = v;
        }
        if let Some(v) = updates.task_completed {
            settings.notifications.task_completed = v;
        }
        if let Some(v) = updates.task_overdue {
            settings.notifications.task_overdue = v;
        }
        if let Some(v) = updates.system_alerts {
            settings.notifications.system_alerts = v;
        }
        if let Some(v) = updates.maintenance_notifications {
            settings.notifications.maintenance = v;
        }
        if let Some(v) = updates.quiet_hours_enabled {
            settings.notifications.quiet_hours_enabled = v;
        }
        if let Some(ref v) = updates.quiet_hours_start {
            settings.notifications.quiet_hours_start = v.clone();
        }
        if let Some(ref v) = updates.quiet_hours_end {
            settings.notifications.quiet_hours_end = v.clone();
        }

        repo.save_user_settings(user_id, &settings)?;
        let refreshed = repo.get_user_settings(user_id)?;
        Ok(map_user_settings_to_preferences(user_id, &refreshed))
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    fn notification_repo(&self) -> NotificationRepository {
        NotificationRepository::new(self.db.clone(), self.cache.clone())
    }

    fn template_repo(&self) -> NotificationTemplateRepository {
        NotificationTemplateRepository::new(self.db.clone(), self.cache.clone())
    }

    fn user_settings_repo(&self) -> UserSettingsRepository {
        UserSettingsRepository::new(self.db.clone())
    }
}

fn map_user_settings_to_preferences(
    user_id: &str,
    settings: &UserSettings,
) -> NotificationPreferences {
    NotificationPreferences {
        id: format!("user-settings:{}", user_id),
        user_id: user_id.to_string(),
        in_app_enabled: settings.notifications.in_app_enabled,
        task_assigned: settings.notifications.task_assigned,
        task_updated: settings.notifications.task_updated,
        task_completed: settings.notifications.task_completed,
        task_overdue: settings.notifications.task_overdue,
        client_created: false,
        client_updated: false,
        system_alerts: settings.notifications.system_alerts,
        maintenance_notifications: settings.notifications.maintenance,
        quiet_hours_enabled: settings.notifications.quiet_hours_enabled,
        quiet_hours_start: Some(settings.notifications.quiet_hours_start.clone()),
        quiet_hours_end: Some(settings.notifications.quiet_hours_end.clone()),
        created_at: 0,
        updated_at: chrono::Utc::now().timestamp_millis(),
    }
}
