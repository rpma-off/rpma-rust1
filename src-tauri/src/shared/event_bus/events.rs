//! Domain event DTOs.
//!
//! Event structs are **owned** by their respective bounded contexts (see
//! `domains/*/domain/events.rs`). This module re-exports them so that
//! existing consumers that import from `shared::event_bus` continue to
//! compile without changes.

pub use crate::shared::services::domain_event::DomainEvent;

// Re-export from owning domains for backward compatibility.
pub use crate::domains::interventions::domain::events::InterventionFinalized;
pub use crate::domains::inventory::domain::events::MaterialConsumed;
pub use crate::domains::quotes::domain::events::{
    QuoteConvertedToTask, QuoteCustomerResponded, QuoteShared,
};
