//! Domain event models and storage primitives.

mod events;
mod filter;
mod metadata;
mod store;

pub use events::{AlertSeverity, DomainEvent, ErrorSeverity};
pub use filter::EventFilter;
pub use metadata::{EventEnvelope, EventMetadata};
pub use store::{EventStore, InMemoryEventStore};
