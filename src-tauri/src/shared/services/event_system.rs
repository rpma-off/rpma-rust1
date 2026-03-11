//! Backward-compatible re-exports.
//!
//! The canonical event types now live in `domain_event` and `event_bus`.
//! This module exists only so that existing `use crate::shared::services::event_system::*`
//! paths continue to compile. New code should import from those modules directly.

pub use crate::shared::services::domain_event::{
    AlertSeverity, DomainEvent, ErrorSeverity, EventEnvelope, EventFilter, EventMetadata,
    EventStore, InMemoryEventStore,
};
pub use crate::shared::services::event_bus::{EventHandler, EventPublisher, InMemoryEventBus};
