use std::sync::{Arc, OnceLock};

use async_trait::async_trait;

use crate::shared::services::event_bus::{EventHandler, InMemoryEventBus};

use super::events::DomainEvent;

#[async_trait]
/// Handles published domain events for subscribed consumers. Implementations declare the event names they accept.
pub trait DomainEventHandler: Send + Sync {
    async fn handle(&self, event: &DomainEvent) -> Result<(), String>;
    fn interested_events(&self) -> Vec<&'static str>;
}

/// Publishes domain events to registered handlers. Implementations must support concurrent shared access.
pub trait DomainEventBus: Send + Sync {
    fn publish(&self, event: DomainEvent);
    fn subscribe(&self, handler: Arc<dyn DomainEventHandler>);
}

struct HandlerAdapter {
    handler: Arc<dyn DomainEventHandler>,
}

#[async_trait]
impl EventHandler for HandlerAdapter {
    async fn handle(&self, event: &DomainEvent) -> Result<(), String> {
        self.handler.handle(event).await
    }

    fn interested_events(&self) -> Vec<&'static str> {
        self.handler.interested_events()
    }
}

impl DomainEventBus for InMemoryEventBus {
    fn publish(&self, event: DomainEvent) {
        let bus = self.clone();
        tokio::spawn(async move {
            if let Err(err) = bus.dispatch(event).await {
                tracing::error!(error = %err, "Failed to publish domain event");
            }
        });
    }

    fn subscribe(&self, handler: Arc<dyn DomainEventHandler>) {
        self.register_handler(HandlerAdapter { handler });
    }
}

/// Process-global event bus instance.
///
/// Initialised once by `service_builder::build_services` before any IPC
/// handler can run. All bounded contexts publish and subscribe through the
/// free functions below — they must never hold a direct `Arc<InMemoryEventBus>`
/// reference.  This keeps cross-domain coupling limited to the event contract.
static GLOBAL_EVENT_BUS: OnceLock<Arc<InMemoryEventBus>> = OnceLock::new();

/// Register the process-global event bus.
///
/// Must be called exactly once during application startup (see
/// `service_builder::build_services`). Subsequent calls are silently ignored
/// because `OnceLock::set` is a no-op if a value is already present.
pub fn set_global_event_bus(bus: Arc<InMemoryEventBus>) {
    let _ = GLOBAL_EVENT_BUS.set(bus);
}

/// Return the process-global event bus, or `None` before startup completes.
pub fn global_event_bus() -> Option<Arc<InMemoryEventBus>> {
    GLOBAL_EVENT_BUS.get().cloned()
}

/// Publish a domain event to all registered handlers.
///
/// If the bus has not yet been initialised (e.g. during test setup or before
/// `service_builder` runs), the event is dropped and a warning is logged so
/// the caller has an observable signal rather than silent data loss.
pub fn publish_event(event: DomainEvent) {
    if let Some(bus) = GLOBAL_EVENT_BUS.get() {
        DomainEventBus::publish(bus.as_ref(), event);
    } else {
        tracing::warn!(
            event_type = event.event_type(),
            "publish_event called before global bus was initialised — event dropped"
        );
    }
}

/// Subscribe a handler to the process-global event bus.
///
/// Like `publish_event`, this is a no-op (with a warning) if the bus has not
/// yet been initialised.  In production the bus is always ready before any
/// domain code calls this function.
pub fn register_handler(handler: Arc<dyn DomainEventHandler>) {
    if let Some(bus) = GLOBAL_EVENT_BUS.get() {
        DomainEventBus::subscribe(bus.as_ref(), handler);
    } else {
        tracing::warn!(
            "register_handler called before global bus was initialised — handler not registered"
        );
    }
}

#[cfg(test)]
mod tests {
    use crate::shared::event_bus::bus::{DomainEventBus, DomainEventHandler};
    use crate::shared::event_bus::events::DomainEvent;
    use crate::shared::services::event_bus::InMemoryEventBus;
    use async_trait::async_trait;
    use chrono::Utc;
    use std::sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    };

    /// `publish_event` must not panic when the global bus has not been
    /// initialised.  In that state the event is silently dropped (with a
    /// tracing::warn) — this test verifies the call completes without
    /// unwinding.
    #[tokio::test]
    async fn test_publish_event_before_init_does_not_panic() {
        // The OnceLock may or may not already be set by a prior test.
        // Either way, calling `publish_event` must never panic.
        let event = DomainEvent::TaskCreated {
            id: "test-id".to_string(),
            task_id: "task-1".to_string(),
            task_number: "T-001".to_string(),
            title: "Test task".to_string(),
            user_id: "user-1".to_string(),
            timestamp: Utc::now(),
            metadata: None,
        };
        // Must not panic regardless of bus initialisation state.
        super::publish_event(event);
    }

    /// `InMemoryEventBus::publish` dispatches asynchronously; a handler
    /// registered before publishing must eventually receive the event.
    #[tokio::test]
    async fn test_domain_event_bus_publish_reaches_handler() {
        let bus = Arc::new(InMemoryEventBus::new());
        let received = Arc::new(AtomicBool::new(false));
        let received_clone = received.clone();

        struct TestHandler(Arc<AtomicBool>);
        #[async_trait]
        impl DomainEventHandler for TestHandler {
            async fn handle(&self, _event: &DomainEvent) -> Result<(), String> {
                self.0.store(true, Ordering::SeqCst);
                Ok(())
            }
            fn interested_events(&self) -> Vec<&'static str> {
                vec![DomainEvent::TASK_CREATED]
            }
        }

        DomainEventBus::subscribe(bus.as_ref(), Arc::new(TestHandler(received_clone)));
        let event = DomainEvent::TaskCreated {
            id: "e1".to_string(),
            task_id: "t1".to_string(),
            task_number: "T-001".to_string(),
            title: "Hello".to_string(),
            user_id: "u1".to_string(),
            timestamp: Utc::now(),
            metadata: None,
        };
        DomainEventBus::publish(bus.as_ref(), event);

        // Give the spawned task time to run.
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        assert!(
            received.load(Ordering::SeqCst),
            "handler should have been called"
        );
    }
}
