use std::sync::Arc;
use async_trait::async_trait;
use tracing::{error, info};
use rusqlite::params;

use crate::commands::{AppError};
use crate::db::Database;
use crate::domains::notifications::models::{
    Message, MessageListResponse, MessageQuery, MessageStatus, MessageTemplate,
    NotificationPreferences, SendMessageRequest, UpdateNotificationPreferencesRequest,
};
use crate::shared::contracts::notification::{NotificationSender, SentMessage};
use crate::shared::repositories::base::Repository;

use super::message_repository::{MessageRepository, MessageRepoQuery};

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
            message_type: query.message_type.as_deref().and_then(crate::domains::notifications::models::MessageType::from_str),
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
