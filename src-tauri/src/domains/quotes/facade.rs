use std::sync::Arc;

use crate::domains::quotes::infrastructure::quote::QuoteService;
use crate::shared::ipc::errors::AppError;

/// Facade for the Quotes bounded context.
///
/// Provides quote lifecycle management — create, send, accept/reject —
/// with input validation and error mapping.
#[derive(Debug)]
pub struct QuotesFacade {
    quote_service: Arc<QuoteService>,
}

impl QuotesFacade {
    pub fn new(quote_service: Arc<QuoteService>) -> Self {
        Self { quote_service }
    }

    pub fn is_ready(&self) -> bool {
        true
    }

    /// Access the underlying quote service.
    pub fn quote_service(&self) -> &Arc<QuoteService> {
        &self.quote_service
    }

    /// Map a raw quote service error into a structured AppError.
    pub fn map_quote_error(&self, context: &str, error: &str) -> AppError {
        if error.contains("not found") {
            AppError::NotFound(format!("{}: {}", context, error))
        } else if error.contains("validation") || error.contains("invalid") {
            AppError::Validation(format!("{}: {}", context, error))
        } else {
            AppError::Internal(format!("{}: {}", context, error))
        }
    }
}
