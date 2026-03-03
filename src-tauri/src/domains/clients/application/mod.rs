//! Application layer for the Clients bounded context.
//!
//! Re-exports request/response contracts for external consumers.

mod contracts;
pub mod input_validation;

pub use contracts::ClientCrudRequest;
pub use input_validation::{required_permission, sanitize_client_action};
