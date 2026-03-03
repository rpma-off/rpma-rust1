//! Shared domain event bus interfaces and helpers.
//!
//! Re-exports the full public surface so bounded contexts depend only on this
//! module instead of reaching into bus/events internals.

pub mod bus;
pub mod events;

pub use bus::{publish_event, register_handler, set_global_event_bus, DomainEventHandler};
pub use events::{
    DomainEvent, InterventionFinalized, MaterialConsumed, QuoteConvertedToTask,
    QuoteCustomerResponded, QuoteShared,
};
