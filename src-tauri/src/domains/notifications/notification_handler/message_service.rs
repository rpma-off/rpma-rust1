use async_trait::async_trait;
use chrono::TimeZone;
use chrono_tz::Tz;
use std::sync::Arc;
use tracing::{error, info};

use crate::commands::AppError;
use crate::db::Database;
use crate::domains::notifications::models::{
    Message, MessageListResponse, MessageQuery, MessageStatus, Notification, SendMessageRequest,
};
use crate::domains::settings::models::UserNotificationSettings;
use crate::domains::settings::UserSettingsRepository;
use crate::shared::contracts::notification::{NotificationSender, SentMessage};
use crate::shared::repositories::base::Repository;
use crate::shared::repositories::cache::Cache;

use super::message_repository::{MessageRepoQuery, MessageRepository};
use super::notification_repository::NotificationRepository;

#[derive(Clone)]
pub struct MessageService {
    repository: Arc<MessageRepository>,
    db: Arc<Database>,
    cache: Arc<Cache>,
}

impl MessageService {
    pub fn new(repository: Arc<MessageRepository>, db: Arc<Database>, cache: Arc<Cache>) -> Self {
        Self {
            repository,
            db,
            cache,
        }
    }

    pub async fn send_message(&self, request: &SendMessageRequest) -> Result<Message, AppError> {
        self.send_message_with_kind(request, None).await
    }

    async fn send_message_with_kind(
        &self,
        request: &SendMessageRequest,
        notification_kind: Option<&str>,
    ) -> Result<Message, AppError> {
        let id = format!("{:x}", rand::random::<u128>());
        let now = chrono::Utc::now().timestamp_millis();
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
            priority: request
                .priority
                .clone()
                .unwrap_or_else(|| "normal".to_string()),
            scheduled_at: request.scheduled_at,
            sent_at: None,
            read_at: None,
            error_message: None,
            metadata: notification_kind
                .map(|kind| format!(r#"{{"notification_kind":"{}"}}"#, kind)),
            created_at: now,
            updated_at: now,
        };
        let saved = self.repository.save(message).await.map_err(|e| {
            error!("Failed to save message: {}", e);
            AppError::Database("Failed to save message".to_string())
        })?;

        if request.message_type == "in_app" {
            self.store_in_app_notification(request, notification_kind)
                .await?;
        }

        info!("Message {} queued for delivery (status: pending)", saved.id);
        Ok(saved)
    }

    async fn store_in_app_notification(
        &self,
        request: &SendMessageRequest,
        notification_kind: Option<&str>,
    ) -> Result<(), AppError> {
        let Some(recipient_id) = request.recipient_id.as_deref() else {
            return Ok(());
        };

        let settings =
            UserSettingsRepository::new(self.db.clone()).get_user_settings(recipient_id)?;
        if !should_store_notification(&settings.notifications, notification_kind) {
            info!(
                user_id = recipient_id,
                notification_kind = notification_kind.unwrap_or("generic"),
                "Skipped in-app notification because user preferences disable it"
            );
            return Ok(());
        }

        let title = request
            .subject
            .clone()
            .unwrap_or_else(|| "Nouvelle notification".to_string());
        let entity_type = notification_entity_type(request);
        let entity_id = request
            .task_id
            .clone()
            .or_else(|| request.client_id.clone())
            .unwrap_or_else(|| "system".to_string());
        let entity_url = notification_entity_url(request);
        let notification = Notification::new(
            recipient_id.to_string(),
            notification_kind.unwrap_or("generic").to_string(),
            title,
            request.body.clone(),
            entity_type,
            entity_id,
            entity_url,
        );

        NotificationRepository::new(self.db.clone(), self.cache.clone())
            .save(notification)
            .await
            .map_err(|e| {
                error!("Failed to save in-app notification: {}", e);
                AppError::Database("Failed to save in-app notification".to_string())
            })?;

        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn send_message_raw(
        &self,
        message_type: String,
        notification_kind: Option<String>,
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
        self.send_message_with_kind(
            &SendMessageRequest {
                message_type,
                recipient_id,
                recipient_email,
                recipient_phone,
                subject,
                body,
                template_id: None,
                task_id,
                client_id,
                priority,
                scheduled_at,
                correlation_id,
            },
            notification_kind.as_deref(),
        )
        .await
    }

    pub async fn get_messages(
        &self,
        query: &MessageQuery,
    ) -> Result<MessageListResponse, AppError> {
        let repo_query = MessageRepoQuery {
            search: None,
            message_type: query
                .message_type
                .as_deref()
                .and_then(crate::domains::notifications::models::MessageType::from_str),
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
        Ok(MessageListResponse {
            messages,
            total,
            has_more,
        })
    }

    pub async fn mark_read(&self, message_id: &str) -> Result<(), AppError> {
        self.repository
            .update_status(message_id, MessageStatus::Read)
            .await
            .map_err(|e| {
                error!("Failed to mark message {} as read: {}", message_id, e);
                AppError::Database("Failed to mark message as read".to_string())
            })?;
        info!("Message {} marked as read", message_id);
        Ok(())
    }
}

fn notification_entity_type(request: &SendMessageRequest) -> String {
    if request.task_id.is_some() {
        "task".to_string()
    } else if request.client_id.is_some() {
        "client".to_string()
    } else {
        "system".to_string()
    }
}

fn notification_entity_url(request: &SendMessageRequest) -> String {
    if let Some(task_id) = request.task_id.as_deref() {
        format!("/tasks/{}", task_id)
    } else if let Some(client_id) = request.client_id.as_deref() {
        format!("/clients/{}", client_id)
    } else {
        "/".to_string()
    }
}

fn should_store_notification(
    settings: &UserNotificationSettings,
    notification_kind: Option<&str>,
) -> bool {
    if !settings.in_app_enabled {
        return false;
    }

    match notification_kind.unwrap_or("generic") {
        "task_assigned" => settings.task_assigned,
        "task_updated" => settings.task_updated,
        "task_completed" => settings.task_completed,
        "task_overdue" => settings.task_overdue,
        "system_alert" => settings.system_alerts,
        _ => true,
    }
}

pub fn is_quiet_hours_at(
    settings: &UserNotificationSettings,
    timezone: Option<&str>,
    timestamp_millis: i64,
) -> bool {
    if !settings.quiet_hours_enabled {
        return false;
    }

    let Ok(start_time) = chrono::NaiveTime::parse_from_str(&settings.quiet_hours_start, "%H:%M")
    else {
        return false;
    };
    let Ok(end_time) = chrono::NaiveTime::parse_from_str(&settings.quiet_hours_end, "%H:%M") else {
        return false;
    };
    let timezone = timezone
        .and_then(|value| value.parse::<Tz>().ok())
        .unwrap_or(chrono_tz::Europe::Paris);
    let Some(local_time) = timezone.timestamp_millis_opt(timestamp_millis).single() else {
        return false;
    };
    let current_time = local_time.time();

    if start_time <= end_time {
        current_time >= start_time && current_time <= end_time
    } else {
        current_time >= start_time || current_time <= end_time
    }
}

#[async_trait]
impl NotificationSender for MessageService {
    async fn send_message_raw(
        &self,
        message_type: String,
        notification_kind: Option<String>,
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
        let msg = self
            .send_message_raw(
                message_type,
                notification_kind,
                recipient_id,
                recipient_email,
                recipient_phone,
                subject,
                body,
                task_id,
                client_id,
                priority,
                scheduled_at,
                correlation_id,
            )
            .await?;
        Ok(SentMessage { id: msg.id })
    }
}

#[cfg(test)]
mod tests {
    use super::{is_quiet_hours_at, should_store_notification};
    use chrono::{TimeZone, Utc};
    use crate::domains::settings::models::UserNotificationSettings;

    #[test]
    fn test_should_store_notification_honors_global_in_app_toggle() {
        let settings = UserNotificationSettings {
            in_app_enabled: false,
            ..Default::default()
        };

        assert!(!should_store_notification(&settings, Some("task_assigned")));
    }

    #[test]
    fn test_should_store_notification_honors_category_toggle() {
        let settings = UserNotificationSettings {
            task_updated: false,
            ..Default::default()
        };

        assert!(!should_store_notification(&settings, Some("task_updated")));
        assert!(should_store_notification(&settings, Some("task_assigned")));
    }

    #[test]
    fn test_is_quiet_hours_at_detects_range_crossing_midnight() {
        let settings = UserNotificationSettings {
            quiet_hours_enabled: true,
            quiet_hours_start: "22:00".to_string(),
            quiet_hours_end: "08:00".to_string(),
            ..Default::default()
        };
        let timestamp = Utc
            .with_ymd_and_hms(2026, 3, 18, 22, 30, 0)
            .single()
            .expect("valid timestamp")
            .timestamp_millis();

        assert!(is_quiet_hours_at(
            &settings,
            Some("Europe/Paris"),
            timestamp
        ));
    }

    #[test]
    fn test_is_quiet_hours_at_returns_false_outside_configured_range() {
        let settings = UserNotificationSettings {
            quiet_hours_enabled: true,
            quiet_hours_start: "22:00".to_string(),
            quiet_hours_end: "08:00".to_string(),
            ..Default::default()
        };
        let timestamp = Utc
            .with_ymd_and_hms(2026, 3, 18, 12, 0, 0)
            .single()
            .expect("valid timestamp")
            .timestamp_millis();

        assert!(!is_quiet_hours_at(
            &settings,
            Some("Europe/Paris"),
            timestamp
        ));
    }
}
