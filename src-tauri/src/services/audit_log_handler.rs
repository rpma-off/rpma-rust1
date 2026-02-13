//! Audit Log Event Handler
//!
//! Bridges domain events into audit log entries via the AuditService.
//! Registered on the event bus so every published domain event automatically
//! produces an audit trail record.

use crate::services::audit_service::{ActionResult, AuditEvent, AuditEventType, AuditService};
use crate::services::domain_event::DomainEvent;
use crate::services::event_bus::EventHandler;
use async_trait::async_trait;
use std::sync::Arc;

/// Event handler that writes audit log entries for domain events
pub struct AuditLogHandler {
    audit_service: Arc<AuditService>,
}

impl AuditLogHandler {
    /// Create a new audit log handler
    pub fn new(audit_service: Arc<AuditService>) -> Self {
        Self { audit_service }
    }

    /// Convert a domain event into an AuditEvent and persist it
    fn log_domain_event(&self, event: &DomainEvent) -> Result<(), String> {
        let audit_event = self.map_to_audit_event(event);
        self.audit_service
            .log_event(audit_event)
            .map_err(|e| format!("Audit log write failed: {}", e))
    }

    /// Map a domain event to an audit event
    fn map_to_audit_event(&self, event: &DomainEvent) -> AuditEvent {
        match event {
            DomainEvent::TaskCreated {
                id,
                task_id,
                title,
                user_id,
                timestamp,
                ..
            } => AuditEvent {
                id: id.clone(),
                event_type: AuditEventType::TaskCreated,
                user_id: user_id.clone(),
                action: "CREATE_TASK".to_string(),
                resource_id: Some(task_id.clone()),
                resource_type: Some("task".to_string()),
                description: format!("Task created: {}", title),
                ip_address: None,
                user_agent: None,
                result: ActionResult::Success,
                previous_state: None,
                new_state: None,
                timestamp: *timestamp,
                metadata: None,
                session_id: None,
                request_id: None,
            },
            DomainEvent::TaskAssigned {
                id,
                task_id,
                technician_id,
                assigned_by,
                timestamp,
                ..
            } => AuditEvent {
                id: id.clone(),
                event_type: AuditEventType::TaskAssigned,
                user_id: assigned_by.clone(),
                action: "ASSIGN_TASK".to_string(),
                resource_id: Some(task_id.clone()),
                resource_type: Some("task".to_string()),
                description: format!("Task assigned to {}", technician_id),
                ip_address: None,
                user_agent: None,
                result: ActionResult::Success,
                previous_state: None,
                new_state: None,
                timestamp: *timestamp,
                metadata: None,
                session_id: None,
                request_id: None,
            },
            DomainEvent::TaskStatusChanged {
                id,
                task_id,
                old_status,
                new_status,
                user_id,
                timestamp,
                ..
            } => AuditEvent {
                id: id.clone(),
                event_type: AuditEventType::TaskStatusChanged,
                user_id: user_id.clone(),
                action: "CHANGE_TASK_STATUS".to_string(),
                resource_id: Some(task_id.clone()),
                resource_type: Some("task".to_string()),
                description: format!("Status changed from {} to {}", old_status, new_status),
                ip_address: None,
                user_agent: None,
                result: ActionResult::Success,
                previous_state: None,
                new_state: None,
                timestamp: *timestamp,
                metadata: None,
                session_id: None,
                request_id: None,
            },
            DomainEvent::InterventionStarted {
                id,
                intervention_id,
                started_by,
                timestamp,
                ..
            } => AuditEvent {
                id: id.clone(),
                event_type: AuditEventType::InterventionStarted,
                user_id: started_by.clone(),
                action: "START_INTERVENTION".to_string(),
                resource_id: Some(intervention_id.clone()),
                resource_type: Some("intervention".to_string()),
                description: "Intervention started".to_string(),
                ip_address: None,
                user_agent: None,
                result: ActionResult::Success,
                previous_state: None,
                new_state: None,
                timestamp: *timestamp,
                metadata: None,
                session_id: None,
                request_id: None,
            },
            DomainEvent::InterventionCompleted {
                id,
                intervention_id,
                completed_by,
                timestamp,
                ..
            } => AuditEvent {
                id: id.clone(),
                event_type: AuditEventType::InterventionCompleted,
                user_id: completed_by.clone(),
                action: "COMPLETE_INTERVENTION".to_string(),
                resource_id: Some(intervention_id.clone()),
                resource_type: Some("intervention".to_string()),
                description: "Intervention completed".to_string(),
                ip_address: None,
                user_agent: None,
                result: ActionResult::Success,
                previous_state: None,
                new_state: None,
                timestamp: *timestamp,
                metadata: None,
                session_id: None,
                request_id: None,
            },
            DomainEvent::MaterialConsumed {
                id,
                material_id,
                intervention_id,
                quantity,
                unit,
                consumed_by,
                timestamp,
                ..
            } => AuditEvent {
                id: id.clone(),
                event_type: AuditEventType::DataUpdated,
                user_id: consumed_by.clone(),
                action: "CONSUME_MATERIAL".to_string(),
                resource_id: Some(material_id.clone()),
                resource_type: Some("material".to_string()),
                description: format!(
                    "Material consumed: {} {} for intervention {}",
                    quantity, unit, intervention_id
                ),
                ip_address: None,
                user_agent: None,
                result: ActionResult::Success,
                previous_state: None,
                new_state: None,
                timestamp: *timestamp,
                metadata: None,
                session_id: None,
                request_id: None,
            },
            // Fallback for other event types — should not normally trigger
            // since interested_events() limits which events reach this handler.
            _ => {
                let event_type_str = event.event_type();
                AuditEvent {
                    id: uuid::Uuid::new_v4().to_string(),
                    event_type: AuditEventType::DataCreated,
                    user_id: "system".to_string(),
                    action: event_type_str.to_string(),
                    resource_id: None,
                    resource_type: None,
                    description: format!("Domain event: {}", event_type_str),
                    ip_address: None,
                    user_agent: None,
                    result: ActionResult::Success,
                    previous_state: None,
                    new_state: None,
                    timestamp: event.timestamp(),
                    metadata: None,
                    session_id: None,
                    request_id: None,
                }
            }
        }
    }
}

#[async_trait]
impl EventHandler for AuditLogHandler {
    async fn handle(&self, event: &DomainEvent) -> Result<(), String> {
        self.log_domain_event(event)
    }

    fn interested_events(&self) -> Vec<&'static str> {
        vec![
            "TaskCreated",
            "TaskAssigned",
            "TaskStatusChanged",
            "InterventionStarted",
            "InterventionCompleted",
            "MaterialConsumed",
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use crate::services::event_bus::{event_factory, InMemoryEventBus};
    use std::sync::atomic::{AtomicUsize, Ordering};

    async fn setup_audit_handler() -> (InMemoryEventBus, Arc<AuditService>) {
        let db = Arc::new(Database::new_in_memory().await.expect("create test db"));
        let audit_service = Arc::new(AuditService::new(db));
        audit_service.init().expect("init audit tables");

        let event_bus = InMemoryEventBus::new();
        let handler = AuditLogHandler::new(audit_service.clone());
        event_bus.register_handler(handler);

        (event_bus, audit_service)
    }

    #[tokio::test]
    async fn test_task_created_produces_audit_entry() {
        let (event_bus, audit_service) = setup_audit_handler().await;

        let event = event_factory::task_created(
            "task-audit-1".to_string(),
            "Audit Test Task".to_string(),
            Some("user-1".to_string()),
        );
        event_bus.publish(event).await.unwrap();

        let history = audit_service
            .get_resource_history("task", "task-audit-1", None)
            .expect("query audit");
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].action, "CREATE_TASK");
    }

    #[tokio::test]
    async fn test_intervention_completed_produces_audit_entry() {
        let (event_bus, audit_service) = setup_audit_handler().await;

        let event = event_factory::intervention_completed("int-audit-1".to_string());
        event_bus.publish(event).await.unwrap();

        let history = audit_service
            .get_resource_history("intervention", "int-audit-1", None)
            .expect("query audit");
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].action, "COMPLETE_INTERVENTION");
    }

    #[tokio::test]
    async fn test_material_consumed_produces_audit_entry() {
        let (event_bus, audit_service) = setup_audit_handler().await;

        let event = event_factory::material_consumed(
            "mat-1".to_string(),
            "int-1".to_string(),
            2.5,
            "m²".to_string(),
        );
        event_bus.publish(event).await.unwrap();

        let history = audit_service
            .get_resource_history("material", "mat-1", None)
            .expect("query audit");
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].action, "CONSUME_MATERIAL");
    }

    /// Verify that a failing handler does not prevent other handlers from running
    #[tokio::test]
    async fn test_handler_error_isolation() {
        let db = Arc::new(Database::new_in_memory().await.expect("create test db"));
        let audit_service = Arc::new(AuditService::new(db));
        audit_service.init().expect("init audit tables");

        let event_bus = InMemoryEventBus::new();

        // Register a handler that always fails
        struct FailingHandler;
        #[async_trait]
        impl EventHandler for FailingHandler {
            async fn handle(&self, _event: &DomainEvent) -> Result<(), String> {
                Err("intentional failure".to_string())
            }
            fn interested_events(&self) -> Vec<&'static str> {
                vec!["TaskCreated"]
            }
        }
        event_bus.register_handler(FailingHandler);

        // Register the audit handler after the failing one
        let handler = AuditLogHandler::new(audit_service.clone());
        event_bus.register_handler(handler);

        let event = event_factory::task_created(
            "task-iso-1".to_string(),
            "Isolation Test".to_string(),
            None,
        );
        // publish should succeed even though FailingHandler errors
        event_bus.publish(event).await.unwrap();

        // AuditLogHandler should still have written its entry
        let history = audit_service
            .get_resource_history("task", "task-iso-1", None)
            .expect("query audit");
        assert_eq!(history.len(), 1);
    }

    /// Verify that a panicking handler does not prevent other handlers from running
    #[tokio::test]
    async fn test_handler_panic_isolation() {
        let counter = Arc::new(AtomicUsize::new(0));
        let event_bus = InMemoryEventBus::new();

        // Register a handler that panics
        struct PanickingHandler;
        #[async_trait]
        impl EventHandler for PanickingHandler {
            async fn handle(&self, _event: &DomainEvent) -> Result<(), String> {
                panic!("intentional panic in handler");
            }
            fn interested_events(&self) -> Vec<&'static str> {
                vec!["TaskCreated"]
            }
        }
        event_bus.register_handler(PanickingHandler);

        // Register a counting handler after the panicking one
        let counter_clone = counter.clone();
        struct CountingHandler {
            counter: Arc<AtomicUsize>,
        }
        #[async_trait]
        impl EventHandler for CountingHandler {
            async fn handle(&self, _event: &DomainEvent) -> Result<(), String> {
                self.counter.fetch_add(1, Ordering::SeqCst);
                Ok(())
            }
            fn interested_events(&self) -> Vec<&'static str> {
                vec!["TaskCreated"]
            }
        }
        event_bus.register_handler(CountingHandler {
            counter: counter_clone,
        });

        let event =
            event_factory::task_created("task-panic-1".to_string(), "Panic Test".to_string(), None);
        // publish should succeed even though PanickingHandler panics
        let result = event_bus.publish(event).await;
        assert!(result.is_ok());

        // CountingHandler should still have been called
        assert_eq!(counter.load(Ordering::SeqCst), 1);
    }
}
