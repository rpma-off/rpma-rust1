//! IPC request/response types for the clients domain.
//!
//! `ClientCrudRequest` is a pure IPC-layer envelope type (it carries a
//! [`ClientAction`] and an optional correlation ID) and does not belong in
//! the application layer.

use crate::commands::ClientAction;

// ── IPC request envelope ──────────────────────────────────────────────────────

/// Envelope for the deprecated unified `client_crud` Tauri command.
///
/// New code should use the individual `client_create` / `client_get` / …
/// commands instead.
#[derive(serde::Deserialize, Debug)]
pub struct ClientCrudRequest {
    pub action: ClientAction,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

// ── Application-layer re-exports ──────────────────────────────────────────────

pub use crate::domains::clients::application::client_input_validator::{
    required_permission, sanitize_client_action, validate_client_id,
};
pub use crate::domains::clients::application::client_validation_service::ClientValidationService;
