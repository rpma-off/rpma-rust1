use futures_util::FutureExt;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

use crate::shared::services::domain_event::DomainEvent;

use super::{EventHandler, EventPublisher};

/// In-memory event bus with publish/subscribe pattern
pub struct InMemoryEventBus {
    // RwLock: read-heavy, written only on handler registration at startup.
    handlers: Arc<RwLock<HashMap<String, Vec<Arc<dyn EventHandler>>>>>,
}

impl InMemoryEventBus {
    /// Create a new in-memory event bus
    pub fn new() -> Self {
        Self {
            handlers: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Register an event handler for specific event types
    pub fn register_handler<H>(&self, handler: H)
    where
        H: EventHandler + 'static,
    {
        let handler = Arc::new(handler);
        let mut handlers = self.handlers.write().unwrap_or_else(|e| e.into_inner());

        for event_type in handler.interested_events() {
            handlers
                .entry(event_type.to_string())
                .or_default()
                .push(handler.clone());
        }
    }

    /// Publish an event to all registered handlers
    ///
    /// Handler errors are logged but never propagate to the caller.
    /// Handler panics are caught so one faulty handler cannot break others.
    pub async fn dispatch(&self, event: DomainEvent) -> Result<(), String> {
        let event_type = event.event_type();
        let handlers = {
            let handlers = self.handlers.read().unwrap_or_else(|e| e.into_inner());
            handlers.get(event_type).cloned().unwrap_or_default()
        };

        let event_type_owned = event_type.to_string();
        for handler in handlers {
            let handler = handler.clone();
            let event_clone = event.clone();
            let event_type_owned = event_type_owned.clone();

            let join_result = tokio::spawn(async move {
                std::panic::AssertUnwindSafe(handler.handle(&event_clone))
                    .catch_unwind()
                    .await
            })
            .await;

            match join_result {
                Ok(Ok(Ok(()))) => {}
                Ok(Ok(Err(e))) => {
                    tracing::error!("Event handler failed for {}: {}", event_type_owned, e);
                }
                Ok(Err(_)) | Err(_) => {
                    tracing::error!(
                        "Event handler panicked for {}, isolating failure",
                        event_type_owned
                    );
                }
            }
        }

        Ok(())
    }

    /// Publish multiple events
    ///
    /// All events are published even if individual handlers fail.
    pub async fn dispatch_batch(&self, events: Vec<DomainEvent>) -> Result<(), String> {
        for event in events {
            let _ = self.dispatch(event).await;
        }
        Ok(())
    }

    /// Get the number of registered handlers for an event type
    pub fn handler_count(&self, event_type: &str) -> usize {
        let handlers = self.handlers.read().unwrap_or_else(|e| e.into_inner());
        handlers.get(event_type).map(|h| h.len()).unwrap_or(0)
    }

    /// Check if there are any handlers registered for an event type
    pub fn has_handlers(&self, event_type: &str) -> bool {
        self.handler_count(event_type) > 0
    }
}

impl Default for InMemoryEventBus {
    fn default() -> Self {
        Self::new()
    }
}

impl Clone for InMemoryEventBus {
    fn clone(&self) -> Self {
        Self {
            handlers: Arc::clone(&self.handlers),
        }
    }
}

impl EventPublisher for InMemoryEventBus {
    fn publish(&self, event: DomainEvent) -> Result<(), String> {
        let bus = self.clone();
        tokio::spawn(async move {
            if let Err(e) = bus.dispatch(event).await {
                tracing::error!("Failed to publish event: {}", e);
            }
        });
        Ok(())
    }

    fn publish_batch(&self, events: Vec<DomainEvent>) -> Result<(), String> {
        for event in events {
            EventPublisher::publish(self, event)?;
        }
        Ok(())
    }
}
