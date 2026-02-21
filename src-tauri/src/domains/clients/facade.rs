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
    pub fn new(client_service: Arc<ClientService>) -> Self {
        Self { client_service }
    }

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
        if error.contains("not found") {
            AppError::NotFound(format!("{}: {}", context, error))
        } else if error.contains("validation") || error.contains("invalid") {
            AppError::Validation(format!("{}: {}", context, error))
        } else {
            AppError::Internal(format!("{}: {}", context, error))
        }
    }
}
