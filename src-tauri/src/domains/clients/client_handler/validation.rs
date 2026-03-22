//! Client IPC validation shim — backward-compatible re-exports.
//!
//! All validation and sanitization logic has been promoted to the application
//! layer (ADR-001).  This file re-exports those symbols so that every existing
//! import path inside `client_handler/` continues to compile unchanged.
//!
//! `ClientCrudRequest` is defined here because it is a pure IPC-layer envelope
//! type (it carries a [`ClientAction`] and an optional correlation ID) and does
//! not belong in the application layer.

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
pub(crate) use crate::domains::clients::application::client_input_validator::{
    sanitize_create_request, sanitize_update_request,
};
pub use crate::domains::clients::application::client_validation_service::ClientValidationService;
