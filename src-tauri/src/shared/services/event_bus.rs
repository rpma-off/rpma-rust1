//! Event Bus Implementation
//!
//! Provides a publish/subscribe event bus for loose coupling between services.
//! Thread-safe with Arc<Mutex<>> for handler registration.

use async_trait::async_trait;
use chrono::Utc;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::Emitter;

use crate::shared::services::domain_event::DomainEvent;

/// Event handler trait for subscribing to domain events
#[async_trait]
pub trait EventHandler: Send + Sync {
    /// Handle a domain event
    async fn handle(&self, event: &DomainEvent) -> Result<(), String>;

    /// Get the event types this handler is interested in
    fn interested_events(&self) -> Vec<&'static str>;
}

/// In-memory event bus with publish/subscribe pattern
pub struct InMemoryEventBus {
    handlers: Arc<Mutex<HashMap<String, Vec<Arc<dyn EventHandler>>>>>,
}

impl InMemoryEventBus {
    /// Create a new in-memory event bus
    pub fn new() -> Self {
        Self {
            handlers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Register an event handler for specific event types
    pub fn register_handler<H>(&self, handler: H)
    where
        H: EventHandler + 'static,
    {
        let handler = Arc::new(handler);
        let mut handlers = self.handlers.lock().unwrap_or_else(|e| e.into_inner());

        for event_type in handler.interested_events() {
            handlers
                .entry(event_type.to_string())
                .or_insert_with(Vec::new)
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
            let handlers = self.handlers.lock().unwrap_or_else(|e| e.into_inner());
            handlers.get(event_type).cloned().unwrap_or_default()
        };

        for handler in handlers {
            let handler = handler.clone();
            let event_clone = event.clone();
            let event_type_owned = event_type.to_string();

            // Spawn each handler in its own task so panics are isolated
            let join_result = tokio::spawn(async move { handler.handle(&event_clone).await }).await;

            match join_result {
                Ok(Ok(())) => {}
                Ok(Err(e)) => {
                    tracing::error!("Event handler failed for {}: {}", event_type_owned, e);
                }
                Err(_) => {
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
        let handlers = self.handlers.lock().unwrap_or_else(|e| e.into_inner());
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

/// Event publisher trait for dependency injection (sync interface)
pub trait EventPublisher: Send + Sync {
    /// Publish a domain event
    fn publish(&self, event: DomainEvent) -> Result<(), String>;

    /// Publish multiple events
    fn publish_batch(&self, events: Vec<DomainEvent>) -> Result<(), String>;
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

/// Tauri event emitter that bridges domain events to the frontend via Tauri's event system.
///
/// Subscribes to key domain events and re-emits them as Tauri events so that
/// frontend listeners can invalidate TanStack Query caches without polling.
pub struct TauriEmitter {
    app_handle: tauri::AppHandle,
}

impl TauriEmitter {
    /// Create a new TauriEmitter backed by the given AppHandle.
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        Self { app_handle }
    }
}

#[async_trait]
impl EventHandler for TauriEmitter {
    async fn handle(&self, event: &DomainEvent) -> Result<(), String> {
        match event {
            DomainEvent::TaskStatusChanged {
                task_id,
                old_status,
                new_status,
                ..
            } => {
                self.app_handle
                    .emit(
                        "task:status_changed",
                        serde_json::json!({
                            "task_id": task_id,
                            "old_status": old_status,
                            "new_status": new_status,
                        }),
                    )
                    .map_err(|e| e.to_string())?;
            }
            DomainEvent::InterventionStarted {
                intervention_id,
                task_id,
                ..
            } => {
                self.app_handle
                    .emit(
                        "intervention:started",
                        serde_json::json!({
                            "intervention_id": intervention_id,
                            "task_id": task_id,
                        }),
                    )
                    .map_err(|e| e.to_string())?;
            }
            DomainEvent::NotificationReceived {
                notification_id,
                user_id,
                message,
                ..
            } => {
                self.app_handle
                    .emit(
                        "notification:received",
                        serde_json::json!({
                            "notification_id": notification_id,
                            "user_id": user_id,
                            "message": message,
                        }),
                    )
                    .map_err(|e| e.to_string())?;
            }
            // TODO: ADD_MORE_EVENTS — register additional domain-to-Tauri event mappings here
            _ => {}
        }
        Ok(())
    }

    fn interested_events(&self) -> Vec<&'static str> {
        vec![
            "TaskStatusChanged",
            "InterventionStarted",
            "NotificationReceived",
            // TODO: ADD_MORE_EVENTS — add event type names here when extending handle()
        ]
    }
}

/// Helper function to create domain events with current timestamp
pub mod event_factory {
    use super::*;
    use uuid::Uuid;

    /// Create a TaskCreated event (no correlation context).
    pub fn task_created(
        task_id: String,
        title: String,
        assigned_to: Option<String>,
    ) -> DomainEvent {
        DomainEvent::TaskCreated {
            id: Uuid::new_v4().to_string(),
            task_id: task_id.clone(),
            task_number: task_id,
            title,
            user_id: assigned_to.unwrap_or_else(|| "system".to_string()),
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// Create a TaskCreated event that carries the request correlation ID in
    /// its metadata so that audit log entries and other handlers can preserve
    /// trace continuity across the IPC → service → event pipeline.
    ///
    /// Unlike [`task_created`], this variant requires explicit user and task
    /// number fields so that the audit record is fully populated.
    pub fn task_created_with_ctx(
        task_id: String,
        task_number: String,
        title: String,
        user_id: String,
        correlation_id: String,
    ) -> DomainEvent {
        DomainEvent::TaskCreated {
            id: Uuid::new_v4().to_string(),
            task_id,
            task_number,
            title,
            user_id,
            timestamp: Utc::now(),
            metadata: Some(serde_json::json!({ "correlation_id": correlation_id })),
        }
    }

    /// TODO: document
    pub fn task_updated(task_id: String, changes: Vec<String>) -> DomainEvent {
        DomainEvent::TaskUpdated {
            id: Uuid::new_v4().to_string(),
            task_id,
            previous_state: None,
            new_state: None,
            changed_fields: changes,
            user_id: "system".to_string(),
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// TODO: document
    pub fn task_status_changed(
        task_id: String,
        old_status: String,
        new_status: String,
    ) -> DomainEvent {
        DomainEvent::TaskStatusChanged {
            id: Uuid::new_v4().to_string(),
            task_id,
            old_status,
            new_status,
            user_id: "system".to_string(),
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// TODO: document
    pub fn task_assigned(task_id: String, assigned_to: String) -> DomainEvent {
        DomainEvent::TaskAssigned {
            id: Uuid::new_v4().to_string(),
            task_id,
            technician_id: assigned_to,
            assigned_by: "system".to_string(),
            assigned_at: Utc::now(),
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// TODO: document
    pub fn authentication_failed(user_id: Option<String>, reason: String) -> DomainEvent {
        DomainEvent::AuthenticationFailed {
            id: Uuid::new_v4().to_string(),
            user_id,
            reason,
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// TODO: document
    pub fn authentication_success(user_id: String) -> DomainEvent {
        DomainEvent::AuthenticationSuccess {
            id: Uuid::new_v4().to_string(),
            user_id,
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// TODO: document
    pub fn intervention_started(intervention_id: String, task_id: String) -> DomainEvent {
        DomainEvent::InterventionStarted {
            id: Uuid::new_v4().to_string(),
            intervention_id,
            task_id,
            started_by: "system".to_string(),
            started_at: Utc::now(),
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// TODO: document
    pub fn intervention_completed(intervention_id: String) -> DomainEvent {
        DomainEvent::InterventionCompleted {
            id: Uuid::new_v4().to_string(),
            intervention_id,
            completed_by: "system".to_string(),
            completed_at: Utc::now(),
            quality_score: None,
            customer_satisfaction: None,
            actual_duration: None,
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// TODO: document
    pub fn intervention_finalized(
        intervention_id: String,
        task_id: String,
        technician_id: String,
        completed_at_ms: i64,
    ) -> DomainEvent {
        DomainEvent::InterventionFinalized {
            id: Uuid::new_v4().to_string(),
            intervention_id,
            task_id,
            technician_id,
            completed_at_ms,
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// TODO: document
    pub fn material_consumed(
        material_id: String,
        intervention_id: String,
        quantity: f64,
        unit: String,
    ) -> DomainEvent {
        DomainEvent::MaterialConsumed {
            id: Uuid::new_v4().to_string(),
            material_id,
            intervention_id,
            quantity,
            unit,
            consumed_by: "system".to_string(),
            timestamp: Utc::now(),
            metadata: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    /// Test handler that counts events
    struct TestHandler {
        counter: Arc<AtomicUsize>,
        event_types: Vec<&'static str>,
    }

    #[async_trait]
    impl EventHandler for TestHandler {
        async fn handle(&self, _event: &DomainEvent) -> Result<(), String> {
            self.counter.fetch_add(1, Ordering::SeqCst);
            Ok(())
        }

        fn interested_events(&self) -> Vec<&'static str> {
            self.event_types.clone()
        }
    }

    #[tokio::test]
    async fn test_event_bus_publish() {
        let event_bus = InMemoryEventBus::new();
        let counter = Arc::new(AtomicUsize::new(0));

        let handler = TestHandler {
            counter: counter.clone(),
            event_types: vec!["TaskCreated"],
        };

        event_bus.register_handler(handler);

        let event =
            event_factory::task_created("task-123".to_string(), "Test Task".to_string(), None);

        event_bus.dispatch(event).await.unwrap();

        assert_eq!(counter.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn test_event_bus_multiple_handlers() {
        let event_bus = InMemoryEventBus::new();
        let counter1 = Arc::new(AtomicUsize::new(0));
        let counter2 = Arc::new(AtomicUsize::new(0));

        let handler1 = TestHandler {
            counter: counter1.clone(),
            event_types: vec!["TaskCreated"],
        };

        let handler2 = TestHandler {
            counter: counter2.clone(),
            event_types: vec!["TaskCreated", "TaskUpdated"],
        };

        event_bus.register_handler(handler1);
        event_bus.register_handler(handler2);

        let event =
            event_factory::task_created("task-123".to_string(), "Test Task".to_string(), None);

        event_bus.dispatch(event).await.unwrap();

        // Both handlers should receive the TaskCreated event
        assert_eq!(counter1.load(Ordering::SeqCst), 1);
        assert_eq!(counter2.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn test_event_bus_filtered_events() {
        let event_bus = InMemoryEventBus::new();
        let counter = Arc::new(AtomicUsize::new(0));

        let handler = TestHandler {
            counter: counter.clone(),
            event_types: vec!["TaskCreated"],
        };

        event_bus.register_handler(handler);

        // Publish an event the handler is NOT interested in
        let event = event_factory::authentication_success("user-123".to_string());
        event_bus.dispatch(event).await.unwrap();

        // Handler should not have been called
        assert_eq!(counter.load(Ordering::SeqCst), 0);
    }

    #[tokio::test]
    async fn test_event_bus_batch_publish() {
        let event_bus = InMemoryEventBus::new();
        let counter = Arc::new(AtomicUsize::new(0));

        let handler = TestHandler {
            counter: counter.clone(),
            event_types: vec!["TaskCreated", "TaskUpdated"],
        };

        event_bus.register_handler(handler);

        let events = vec![
            event_factory::task_created("task-1".to_string(), "Task 1".to_string(), None),
            event_factory::task_updated("task-2".to_string(), vec!["title".to_string()]),
            event_factory::task_created("task-3".to_string(), "Task 3".to_string(), None),
        ];

        event_bus.dispatch_batch(events).await.unwrap();

        assert_eq!(counter.load(Ordering::SeqCst), 3);
    }

    #[test]
    fn test_domain_event_types() {
        let task_created =
            event_factory::task_created("task-123".to_string(), "Test".to_string(), None);
        assert_eq!(task_created.event_type(), "TaskCreated");

        let auth_success = event_factory::authentication_success("user-123".to_string());
        assert_eq!(auth_success.event_type(), "AuthenticationSuccess");

        let intervention_started =
            event_factory::intervention_started("int-123".to_string(), "task-123".to_string());
        assert_eq!(intervention_started.event_type(), "InterventionStarted");

        let intervention_finalized = event_factory::intervention_finalized(
            "int-999".to_string(),
            "task-999".to_string(),
            "tech-1".to_string(),
            Utc::now().timestamp_millis(),
        );
        assert_eq!(intervention_finalized.event_type(), "InterventionFinalized");

        let material_consumed = event_factory::material_consumed(
            "mat-1".to_string(),
            "int-1".to_string(),
            1.5,
            "m²".to_string(),
        );
        assert_eq!(material_consumed.event_type(), "MaterialConsumed");
    }

    #[test]
    fn test_handler_count() {
        let event_bus = InMemoryEventBus::new();

        assert_eq!(event_bus.handler_count("TaskCreated"), 0);

        let handler = TestHandler {
            counter: Arc::new(AtomicUsize::new(0)),
            event_types: vec!["TaskCreated"],
        };

        event_bus.register_handler(handler);

        assert_eq!(event_bus.handler_count("TaskCreated"), 1);
        assert_eq!(event_bus.handler_count("TaskUpdated"), 0);
    }

    #[test]
    fn test_event_bus_clone() {
        let event_bus1 = InMemoryEventBus::new();
        let event_bus2 = event_bus1.clone();

        let handler = TestHandler {
            counter: Arc::new(AtomicUsize::new(0)),
            event_types: vec!["TaskCreated"],
        };

        event_bus1.register_handler(handler);

        // Both event buses should share the same handlers
        assert_eq!(event_bus2.handler_count("TaskCreated"), 1);
    }
}
