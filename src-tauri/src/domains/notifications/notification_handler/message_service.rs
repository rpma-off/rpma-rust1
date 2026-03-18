use async_trait::async_trait;
use std::sync::Arc;
use tracing::{error, info};

use crate::commands::AppError;
use crate::domains::notifications::models::{
    Message, MessageListResponse, MessageQuery, MessageStatus, SendMessageRequest,
};
use crate::shared::contracts::notification::{NotificationSender, SentMessage};
use crate::shared::repositories::base::Repository;

use super::message_repository::{MessageRepoQuery, MessageRepository};

#[derive(Clone)]
pub struct MessageService {
    repository: Arc<MessageRepository>,
}

impl MessageService {
    pub fn new(repository: Arc<MessageRepository>) -> Self {
        Self { repository }
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
        })
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
        let msg = self
            .send_message_raw(
                message_type,
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
