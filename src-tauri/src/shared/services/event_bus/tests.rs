use async_trait::async_trait;
use chrono::Utc;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

use crate::shared::services::domain_event::DomainEvent;

use super::{event_factory, EventHandler, InMemoryEventBus};

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

    let event = event_factory::task_created("task-123".to_string(), "Test Task".to_string(), None);

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

    let event = event_factory::task_created("task-123".to_string(), "Test Task".to_string(), None);

    event_bus.dispatch(event).await.unwrap();

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

    let event = event_factory::authentication_success("user-123".to_string());
    event_bus.dispatch(event).await.unwrap();

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
    let task_created = event_factory::task_created("task-123".to_string(), "Test".to_string(), None);
    assert_eq!(task_created.event_type(), DomainEvent::TASK_CREATED);

    let auth_success = event_factory::authentication_success("user-123".to_string());
    assert_eq!(auth_success.event_type(), DomainEvent::AUTHENTICATION_SUCCESS);

    let intervention_started =
        event_factory::intervention_started("int-123".to_string(), "task-123".to_string());
    assert_eq!(
        intervention_started.event_type(),
        DomainEvent::INTERVENTION_STARTED
    );

    let intervention_finalized = event_factory::intervention_finalized(
        "int-999".to_string(),
        "task-999".to_string(),
        "tech-1".to_string(),
        Utc::now().timestamp_millis(),
    );
    assert_eq!(
        intervention_finalized.event_type(),
        DomainEvent::INTERVENTION_FINALIZED
    );

    let material_consumed =
        event_factory::material_consumed("mat-1".to_string(), "int-1".to_string(), 1.5, "m²".to_string());
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
    assert_eq!(
        entity_hard_deleted.event_type(),
        DomainEvent::ENTITY_HARD_DELETED
    );
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

    assert_eq!(event_bus2.handler_count(DomainEvent::TASK_CREATED), 1);
}

#[tokio::test]
async fn test_event_bus_dispatch_releases_rwlock_before_await() {
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
                let event =
                    event_factory::task_created(format!("task-{}", i), format!("Task {}", i), None);
                bus.dispatch(event).await.unwrap();
            })
        })
        .collect();

    for h in handles {
        h.await.unwrap();
    }

    assert_eq!(counter.load(Ordering::SeqCst), 4);
}
