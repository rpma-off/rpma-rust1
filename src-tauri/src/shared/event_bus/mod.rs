//! Shared domain event bus interfaces and helpers.

mod bus;
mod events;

pub use bus::{
    global_event_bus, publish_event, register_handler, set_global_event_bus, DomainEventBus,
    DomainEventHandler,
};
pub use events::{DomainEvent, InterventionFinalized, MaterialConsumed};
