//! Event Bus Implementation
//!
//! Provides a publish/subscribe event bus for loose coupling between services.
//! Thread-safe with Arc<RwLock<>> for handler registration.

use async_trait::async_trait;
use chrono::Utc;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
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
            let handlers = self.handlers.read().unwrap_or_else(|e| e.into_inner());
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

    /// Creates a `TaskUpdated` event attributed to the system user.
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

    /// Create a TaskUpdated event with actor + correlation context.
    pub fn task_updated_with_ctx(
        task_id: String,
        changes: Vec<String>,
        user_id: String,
        correlation_id: String,
    ) -> DomainEvent {
        DomainEvent::TaskUpdated {
            id: Uuid::new_v4().to_string(),
            task_id,
            previous_state: None,
            new_state: None,
            changed_fields: changes,
            user_id,
            timestamp: Utc::now(),
            metadata: Some(serde_json::json!({ "correlation_id": correlation_id })),
        }
    }

    /// Creates a `TaskStatusChanged` event attributed to the system user.
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

    /// Create a TaskStatusChanged event with actor + correlation context.
    pub fn task_status_changed_with_ctx(
        task_id: String,
        old_status: String,
        new_status: String,
        user_id: String,
        correlation_id: String,
        reason: Option<String>,
    ) -> DomainEvent {
        DomainEvent::TaskStatusChanged {
            id: Uuid::new_v4().to_string(),
            task_id,
            old_status,
            new_status,
            user_id,
            timestamp: Utc::now(),
            metadata: Some(serde_json::json!({
                "correlation_id": correlation_id,
                "reason": reason
            })),
        }
    }

    /// Create a TaskDeleted event with actor + correlation context.
    pub fn task_deleted_with_ctx(
        task_id: String,
        task_number: Option<String>,
        deleted_by: String,
        correlation_id: String,
    ) -> DomainEvent {
        DomainEvent::TaskDeleted {
            id: Uuid::new_v4().to_string(),
            task_id,
            task_number,
            deleted_by,
            timestamp: Utc::now(),
            metadata: Some(serde_json::json!({ "correlation_id": correlation_id })),
        }
    }

    /// Creates a `TaskAssigned` event for the given technician.
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

    /// Creates an `AuthenticationFailed` event with an optional user identifier.
    pub fn authentication_failed(user_id: Option<String>, reason: String) -> DomainEvent {
        DomainEvent::AuthenticationFailed {
            id: Uuid::new_v4().to_string(),
            user_id,
            reason,
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// Creates an `AuthenticationSuccess` event for the given user.
    pub fn authentication_success(user_id: String) -> DomainEvent {
        DomainEvent::AuthenticationSuccess {
            id: Uuid::new_v4().to_string(),
            user_id,
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// Creates an `InterventionStarted` event linking intervention to task.
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

    /// Creates an `InterventionCompleted` event with default quality fields.
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

    /// Creates an `InterventionFinalized` event with completion timestamp.
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

    /// Creates a `MaterialConsumed` event for inventory tracking.
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

    /// Create a QuoteAccepted event.
    pub fn quote_accepted(
        quote_id: String,
        quote_number: String,
        client_id: String,
        accepted_by: String,
        task_id: Option<String>,
        metadata: Option<serde_json::Value>,
    ) -> DomainEvent {
        DomainEvent::QuoteAccepted {
            id: Uuid::new_v4().to_string(),
            quote_id,
            quote_number,
            client_id,
            accepted_by,
            task_id,
            timestamp: Utc::now(),
            metadata,
        }
    }

    /// Create a QuoteRejected event.
    pub fn quote_rejected(
        quote_id: String,
        quote_number: String,
        client_id: String,
        rejected_by: String,
        reason: Option<String>,
    ) -> DomainEvent {
        DomainEvent::QuoteRejected {
            id: Uuid::new_v4().to_string(),
            quote_id,
            quote_number,
            client_id,
            rejected_by,
            reason,
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// Create a QuoteConverted event.
    pub fn quote_converted(
        quote_id: String,
        quote_number: String,
        client_id: String,
        task_id: String,
        task_number: String,
        converted_by: String,
    ) -> DomainEvent {
        DomainEvent::QuoteConverted {
            id: Uuid::new_v4().to_string(),
            quote_id,
            quote_number,
            client_id,
            task_id,
            task_number,
            converted_by,
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// Create an EntityRestored event.
    pub fn entity_restored(
        entity_id: String,
        entity_type: String,
        restored_by: String,
    ) -> DomainEvent {
        DomainEvent::EntityRestored {
            id: Uuid::new_v4().to_string(),
            entity_id,
            entity_type,
            restored_by,
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// Create an EntityHardDeleted event.
    pub fn entity_hard_deleted(
        entity_id: String,
        entity_type: String,
        deleted_by: String,
    ) -> DomainEvent {
        DomainEvent::EntityHardDeleted {
            id: Uuid::new_v4().to_string(),
            entity_id,
            entity_type,
            deleted_by,
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    // ── Client events ─────────────────────────────────────────────────────────

    /// Create a `ClientCreated` domain event (ADR-017).
    pub fn client_created(client_id: String, name: String, user_id: String) -> DomainEvent {
        DomainEvent::ClientCreated {
            id: Uuid::new_v4().to_string(),
            client_id,
            name,
            user_id,
            timestamp: Utc::now(),
            metadata: None,
        }
    }

    /// Create a `ClientDeactivated` domain event (ADR-017).
    pub fn client_deactivated(client_id: String, deactivated_by: String) -> DomainEvent {
        DomainEvent::ClientDeactivated {
            id: Uuid::new_v4().to_string(),
            client_id,
            deactivated_by,
            reason: None,
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
            event_types: vec![DomainEvent::TASK_CREATED],
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
            event_types: vec![DomainEvent::TASK_CREATED],
        };

        let handler2 = TestHandler {
            counter: counter2.clone(),
            event_types: vec![DomainEvent::TASK_CREATED, DomainEvent::TASK_UPDATED],
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
            event_types: vec![DomainEvent::TASK_CREATED],
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
            event_types: vec![DomainEvent::TASK_CREATED, DomainEvent::TASK_UPDATED],
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
        assert_eq!(task_created.event_type(), DomainEvent::TASK_CREATED);

        let auth_success = event_factory::authentication_success("user-123".to_string());
        assert_eq!(auth_success.event_type(), DomainEvent::AUTHENTICATION_SUCCESS);

        let intervention_started =
            event_factory::intervention_started("int-123".to_string(), "task-123".to_string());
        assert_eq!(intervention_started.event_type(), DomainEvent::INTERVENTION_STARTED);

        let intervention_finalized = event_factory::intervention_finalized(
            "int-999".to_string(),
            "task-999".to_string(),
            "tech-1".to_string(),
            Utc::now().timestamp_millis(),
        );
        assert_eq!(intervention_finalized.event_type(), DomainEvent::INTERVENTION_FINALIZED);

        let material_consumed = event_factory::material_consumed(
            "mat-1".to_string(),
            "int-1".to_string(),
            1.5,
            "m²".to_string(),
        );
        assert_eq!(material_consumed.event_type(), DomainEvent::MATERIAL_CONSUMED);

        let quote_accepted = event_factory::quote_accepted(
            "quote-1".to_string(),
            "Q-001".to_string(),
            "client-1".to_string(),
            "user-1".to_string(),
            Some("task-1".to_string()),
            Some(serde_json::json!({ "error": "none" })),
        );
        assert_eq!(quote_accepted.event_type(), DomainEvent::QUOTE_ACCEPTED);

        let quote_rejected = event_factory::quote_rejected(
            "quote-2".to_string(),
            "Q-002".to_string(),
            "client-2".to_string(),
            "user-2".to_string(),
            Some("too expensive".to_string()),
        );
        assert_eq!(quote_rejected.event_type(), DomainEvent::QUOTE_REJECTED);

        let quote_converted = event_factory::quote_converted(
            "quote-3".to_string(),
            "Q-003".to_string(),
            "client-3".to_string(),
            "task-3".to_string(),
            "T-003".to_string(),
            "user-3".to_string(),
        );
        assert_eq!(quote_converted.event_type(), DomainEvent::QUOTE_CONVERTED);

        let entity_restored = event_factory::entity_restored(
            "entity-1".to_string(),
            "Task".to_string(),
            "user-4".to_string(),
        );
        assert_eq!(entity_restored.event_type(), DomainEvent::ENTITY_RESTORED);

        let entity_hard_deleted = event_factory::entity_hard_deleted(
            "entity-2".to_string(),
            "Quote".to_string(),
            "user-5".to_string(),
        );
        assert_eq!(entity_hard_deleted.event_type(), DomainEvent::ENTITY_HARD_DELETED);
    }

    #[test]
    fn test_quote_accepted_factory_preserves_optional_task_id_and_metadata() {
        let event = event_factory::quote_accepted(
            "quote-1".to_string(),
            "Q-001".to_string(),
            "client-1".to_string(),
            "user-1".to_string(),
            Some("task-1".to_string()),
            Some(serde_json::json!({ "error": "validation" })),
        );

        match event {
            DomainEvent::QuoteAccepted {
                task_id, metadata, ..
            } => {
                assert_eq!(task_id.as_deref(), Some("task-1"));
                assert_eq!(
                    metadata
                        .as_ref()
                        .and_then(|value| value.get("error"))
                        .and_then(|value| value.as_str()),
                    Some("validation")
                );
            }
            other => panic!("expected QuoteAccepted event, got {}", other.event_type()),
        }
    }

    #[test]
    fn test_handler_count() {
        let event_bus = InMemoryEventBus::new();

        assert_eq!(event_bus.handler_count(DomainEvent::TASK_CREATED), 0);

        let handler = TestHandler {
            counter: Arc::new(AtomicUsize::new(0)),
            event_types: vec![DomainEvent::TASK_CREATED],
        };

        event_bus.register_handler(handler);

        assert_eq!(event_bus.handler_count(DomainEvent::TASK_CREATED), 1);
        assert_eq!(event_bus.handler_count(DomainEvent::TASK_UPDATED), 0);
    }

    #[test]
    fn test_event_bus_clone() {
        let event_bus1 = InMemoryEventBus::new();
        let event_bus2 = event_bus1.clone();

        let handler = TestHandler {
            counter: Arc::new(AtomicUsize::new(0)),
            event_types: vec![DomainEvent::TASK_CREATED],
        };

        event_bus1.register_handler(handler);

        // Both event buses should share the same handlers
        assert_eq!(event_bus2.handler_count(DomainEvent::TASK_CREATED), 1);
    }

    #[tokio::test]
    async fn test_event_bus_dispatch_releases_rwlock_before_await() {
        // Verifies that dispatch() drops the read guard from the RwLock
        // before awaiting handler completion.  If the guard were held across
        // the .await, concurrent dispatches on the same bus would still
        // succeed (read locks are shared), but a misplaced *write* guard
        // would deadlock.  Spawning concurrent dispatches exercises both
        // the read-lock-release path and the handler invocation path.
        let bus = Arc::new(InMemoryEventBus::new());
        let counter = Arc::new(AtomicUsize::new(0));

        bus.register_handler(TestHandler {
            counter: counter.clone(),
            event_types: vec![DomainEvent::TASK_CREATED],
        });

        let handles: Vec<_> = (0..4)
            .map(|i| {
                let bus = bus.clone();
                tokio::spawn(async move {
                    let event = event_factory::task_created(
                        format!("task-{}", i),
                        format!("Task {}", i),
                        None,
                    );
                    bus.dispatch(event).await.unwrap();
                })
            })
            .collect();

        for h in handles {
            h.await.unwrap();
        }

        assert_eq!(counter.load(Ordering::SeqCst), 4);
    }
}
