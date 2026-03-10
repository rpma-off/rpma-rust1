use std::sync::Arc;

use crate::domains::clients::infrastructure::client::ClientService;
use crate::shared::ipc::errors::AppError;

/// Facade for the Clients bounded context.
///
/// Provides input validation and error mapping on top of the underlying
/// `ClientService`.
#[derive(Debug)]
pub struct ClientsFacade {
    client_service: Arc<ClientService>,
}

impl ClientsFacade {
    /// TODO: document
    pub fn new(client_service: Arc<ClientService>) -> Self {
        Self { client_service }
    }

    /// TODO: document
    pub fn is_ready(&self) -> bool {
        true
    }

    /// Access the underlying client service.
    pub fn client_service(&self) -> &Arc<ClientService> {
        &self.client_service
    }

    /// Validate that a client ID is present.
    pub fn validate_client_id(&self, client_id: &str) -> Result<(), AppError> {
        if client_id.trim().is_empty() {
            return Err(AppError::Validation("client_id is required".to_string()));
        }
        Ok(())
    }

    /// Map a raw service error string into a structured AppError.
    pub fn map_service_error(&self, context: &str, error: &str) -> AppError {
        let normalized = error.to_lowercase();
        if normalized.contains("not found") {
            AppError::NotFound(format!("{}: {}", context, error))
        } else if normalized.contains("permission")
            || normalized.contains("only update")
            || normalized.contains("only delete")
        {
            AppError::Authorization(error.to_string())
        } else if normalized.contains("validation")
            || normalized.contains("invalid")
            || normalized.contains("required")
            || normalized.contains("cannot")
            || normalized.contains("must")
            || normalized.contains("already exists")
            || normalized.contains("too long")
            || normalized.contains("duplicate")
        {
            AppError::Validation(error.to_string())
        } else {
            AppError::db_sanitized(context, error)
        }
    }
}
