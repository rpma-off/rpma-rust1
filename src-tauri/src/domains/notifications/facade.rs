use std::sync::Arc;

use crate::domains::notifications::infrastructure::message::MessageService;
use crate::shared::ipc::errors::AppError;

/// Facade for the Notifications bounded context.
///
/// Provides message sending, notification management, and preference
/// handling with input validation and error mapping.
pub struct NotificationsFacade {
    message_service: Arc<MessageService>,
}

impl NotificationsFacade {
    pub fn new(message_service: Arc<MessageService>) -> Self {
        Self { message_service }
    }

    pub fn is_ready(&self) -> bool {
        true
    }

    /// Access the underlying message service.
    pub fn message_service(&self) -> &Arc<MessageService> {
        &self.message_service
    }

    /// Validate a message body before sending.
    pub fn validate_message(&self, message: &str) -> Result<String, AppError> {
        let trimmed = message.trim();
        if trimmed.is_empty() {
            return Err(AppError::Validation(
                "Message body cannot be empty".to_string(),
            ));
        }
        if trimmed.len() > 10_000 {
            return Err(AppError::Validation(
                "Message body exceeds maximum length of 10000 characters".to_string(),
            ));
        }
        Ok(trimmed.to_string())
    }
}
