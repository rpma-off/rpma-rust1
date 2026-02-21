//! Application layer for the Clients bounded context.
//!
//! Re-exports request/response contracts for external consumers.

mod contracts;

pub use contracts::ClientCrudRequest;
