//! Cross-domain event contract re-exports.
//!
//! Only structs that are *actually consumed across bounded-context boundaries*
//! are re-exported here.  Domain-internal event helpers stay in their own
//! `domains/*/domain/events.rs` files.

pub use crate::shared::contracts::events::InterventionFinalized;
pub use crate::shared::services::domain_event::DomainEvent;
