//! Message service for messaging operations

use crate::commands::AppError;
use crate::domains::notifications::domain::models::message::*;
use crate::domains::notifications::infrastructure::message_repository::{
    self as repo, MessageRepository,
};
use crate::repositories::Repository;
use rusqlite::params;
use std::sync::Arc;
use tracing::{error, info};

#[derive(Clone)]
pub struct MessageService {
    repository: Arc<MessageRepository>,
    db: Arc<crate::db::Database>,
}

impl MessageService {
    pub fn new(repository: Arc<MessageRepository>, db: Arc<crate::db::Database>) -> Self {
        Self { repository, db }
    }

    /// Send a new message by creating and saving it through the repository
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
            priority: request
                .priority
                .clone()
                .unwrap_or_else(|| "normal".to_string()),
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

        info!("Message {} sent successfully", saved.id);
        Ok(saved)
    }

    /// Get messages with filtering and pagination
    pub async fn get_messages(
        &self,
        query: &crate::domains::notifications::domain::models::message::MessageQuery,
    ) -> Result<MessageListResponse, AppError> {
        let repo_query = repo::MessageQuery {
            search: None,
            message_type: query
                .message_type
                .as_deref()
                .and_then(MessageType::from_str),
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

    /// Mark a message as read
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

    /// Get message templates with optional category and type filters
    pub async fn get_templates(
        &self,
        category: Option<&str>,
        message_type: Option<&str>,
    ) -> Result<Vec<MessageTemplate>, AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Failed to get database connection".to_string())
        })?;

        let mut sql = String::from(
            "SELECT id, name, description, message_type, subject, body, variables, category, \
             is_active, created_by, created_at, updated_at \
             FROM message_templates WHERE is_active = 1",
        );
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

        let mut stmt = conn.prepare(&sql).map_err(|e| {
            error!("Failed to prepare template query: {}", e);
            AppError::Database("Failed to query templates".to_string())
        })?;

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
            .map_err(|e| {
                error!("Failed to query templates: {}", e);
                AppError::Database("Failed to query templates".to_string())
            })?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| {
                error!("Failed to collect templates: {}", e);
                AppError::Database("Failed to collect templates".to_string())
            })?;

        Ok(templates)
    }

    /// Get user notification preferences
    pub async fn get_preferences(
        &self,
        user_id: &str,
    ) -> Result<NotificationPreferences, AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Failed to get database connection".to_string())
        })?;

        let prefs = conn
            .query_row(
                "SELECT id, user_id, email_enabled, sms_enabled, in_app_enabled, \
                 task_assigned, task_updated, task_completed, task_overdue, \
                 client_created, client_updated, system_alerts, maintenance_notifications, \
                 quiet_hours_enabled, quiet_hours_start, quiet_hours_end, \
                 email_frequency, email_digest_time, created_at, updated_at \
                 FROM notification_preferences WHERE user_id = ?",
                params![user_id],
                |row| {
                    Ok(NotificationPreferences {
                        id: row.get(0)?,
                        user_id: row.get(1)?,
                        email_enabled: row.get(2)?,
                        sms_enabled: row.get(3)?,
                        in_app_enabled: row.get(4)?,
                        task_assigned: row.get(5)?,
                        task_updated: row.get(6)?,
                        task_completed: row.get(7)?,
                        task_overdue: row.get(8)?,
                        client_created: row.get(9)?,
                        client_updated: row.get(10)?,
                        system_alerts: row.get(11)?,
                        maintenance_notifications: row.get(12)?,
                        quiet_hours_enabled: row.get(13)?,
                        quiet_hours_start: row.get(14)?,
                        quiet_hours_end: row.get(15)?,
                        email_frequency: row.get(16)?,
                        email_digest_time: row.get(17)?,
                        created_at: row.get(18)?,
                        updated_at: row.get(19)?,
                    })
                },
            )
            .map_err(|e| {
                error!("Failed to get preferences for user {}: {}", user_id, e);
                AppError::Database("Failed to get notification preferences".to_string())
            })?;

        Ok(prefs)
    }

    /// Update user notification preferences and return the updated result
    pub async fn update_preferences(
        &self,
        user_id: &str,
        updates: &UpdateNotificationPreferencesRequest,
    ) -> Result<NotificationPreferences, AppError> {
        let conn = self.db.get_connection().map_err(|e| {
            error!("Failed to get database connection: {}", e);
            AppError::Database("Failed to get database connection".to_string())
        })?;

        let mut sql = String::from("UPDATE notification_preferences SET updated_at = ?");
        let now = chrono::Utc::now().timestamp();
        let mut param_values: Vec<String> = vec![now.to_string()];

        if let Some(v) = updates.email_enabled {
            sql.push_str(", email_enabled = ?");
            param_values.push(v.to_string());
        }
        if let Some(v) = updates.sms_enabled {
            sql.push_str(", sms_enabled = ?");
            param_values.push(v.to_string());
        }
        if let Some(v) = updates.in_app_enabled {
            sql.push_str(", in_app_enabled = ?");
            param_values.push(v.to_string());
        }
        if let Some(v) = updates.task_assigned {
            sql.push_str(", task_assigned = ?");
            param_values.push(v.to_string());
        }
        if let Some(v) = updates.task_updated {
            sql.push_str(", task_updated = ?");
            param_values.push(v.to_string());
        }
        if let Some(v) = updates.task_completed {
            sql.push_str(", task_completed = ?");
            param_values.push(v.to_string());
        }
        if let Some(v) = updates.task_overdue {
            sql.push_str(", task_overdue = ?");
            param_values.push(v.to_string());
        }
        if let Some(v) = updates.client_created {
            sql.push_str(", client_created = ?");
            param_values.push(v.to_string());
        }
        if let Some(v) = updates.client_updated {
            sql.push_str(", client_updated = ?");
            param_values.push(v.to_string());
        }
        if let Some(v) = updates.system_alerts {
            sql.push_str(", system_alerts = ?");
            param_values.push(v.to_string());
        }
        if let Some(v) = updates.maintenance_notifications {
            sql.push_str(", maintenance_notifications = ?");
            param_values.push(v.to_string());
        }
        if let Some(v) = updates.quiet_hours_enabled {
            sql.push_str(", quiet_hours_enabled = ?");
            param_values.push(v.to_string());
        }
        if let Some(ref v) = updates.quiet_hours_start {
            sql.push_str(", quiet_hours_start = ?");
            param_values.push(v.clone());
        }
        if let Some(ref v) = updates.quiet_hours_end {
            sql.push_str(", quiet_hours_end = ?");
            param_values.push(v.clone());
        }
        if let Some(ref v) = updates.email_frequency {
            sql.push_str(", email_frequency = ?");
            param_values.push(v.clone());
        }
        if let Some(ref v) = updates.email_digest_time {
            sql.push_str(", email_digest_time = ?");
            param_values.push(v.clone());
        }

        sql.push_str(" WHERE user_id = ?");
        param_values.push(user_id.to_string());

        conn.execute(&sql, rusqlite::params_from_iter(param_values))
            .map_err(|e| {
                error!("Failed to update preferences for user {}: {}", user_id, e);
                AppError::Database("Failed to update notification preferences".to_string())
            })?;

        info!("Updated notification preferences for user {}", user_id);

        self.get_preferences(user_id).await
    }
}
