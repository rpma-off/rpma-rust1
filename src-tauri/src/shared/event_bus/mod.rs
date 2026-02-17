//! Shared domain event bus interfaces and helpers.
//!
//! Re-exports the full public surface so bounded contexts depend only on this
//! module instead of reaching into bus/events internals.

mod bus;
mod events;

pub use bus::{
    publish_event, register_handler, set_global_event_bus, DomainEventBus, DomainEventHandler,
};
pub use events::{DomainEvent, InterventionFinalized, MaterialConsumed};
