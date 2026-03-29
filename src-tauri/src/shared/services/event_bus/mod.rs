//! Event Bus Implementation
//!
//! Provides a publish/subscribe event bus for loose coupling between services.
//! Thread-safe with Arc<RwLock<>> for handler registration.

mod bus;
pub mod event_factory;
mod tauri_emitter;
mod traits;

pub use bus::InMemoryEventBus;
pub use tauri_emitter::TauriEmitter;
pub use traits::{EventHandler, EventPublisher};

#[cfg(test)]
mod tests;
