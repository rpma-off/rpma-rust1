# ADR-016: In-Memory Event Bus for Decoupled Coordination

## Status

Accepted

## Date

2026-03-13

## Summary

Uses an in-memory publish/subscribe event bus for reactive, decoupled coordination between domains. Events are dispatched asynchronously and handlers are isolated from failures.

## Context

- Domains need to react to changes in other domains without direct coupling
- Audit logging needs to record all domain events
- Inventory needs to react to intervention finalization
- Notifications need to trigger on various events
- Direct domain-to-domain imports violate bounded context boundaries

## Decision

### Event Bus Architecture

```rust
// src-tauri/src/shared/services/event_bus.rs
pub struct InMemoryEventBus {
    handlers: Arc<Mutex<HashMap<String, Vec<Arc<dyn EventHandler>>>>>,
}

impl InMemoryEventBus {
    pub fn new() -> Self {
        Self {
            handlers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn register_handler<H>(&self, handler: H)
    where
        H: EventHandler + 'static,
    {
        let handler = Arc::new(handler);
        let mut handlers = self.handlers.lock().unwrap();
        
        for event_type in handler.interested_events() {
            handlers
                .entry(event_type.to_string())
                .or_insert_with(Vec::new)
                .push(handler.clone());
        }
    }

    pub async fn dispatch(&self, event: DomainEvent) -> Result<(), String> {
        let event_type = event.event_type();
        let handlers = {
            let handlers = self.handlers.lock().unwrap();
            handlers.get(event_type).cloned().unwrap_or_default()
        };

        for handler in handlers {
            let handler = handler.clone();
            let event_clone = event.clone();
            let event_type_owned = event_type.to_string();

            // Spawn each handler in its own task for isolation
            let join_result = tokio::spawn(async move {
                handler.handle(&event_clone).await
            }).await;

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
}
```

### Domain Events

```rust
// src-tauri/src/shared/services/domain_event.rs
#[derive(Debug, Clone)]
pub enum DomainEvent {
    TaskCreated {
        id: String,
        task_id: String,
        title: String,
        user_id: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    TaskStatusChanged {
        id: String,
        task_id: String,
        old_status: String,
        new_status: String,
        user_id: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    TaskAssigned {
        id: String,
        task_id: String,
        technician_id: String,
        assigned_by: String,
        assigned_at: DateTime<Utc>,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    InterventionStarted {
        id: String,
        intervention_id: String,
        task_id: String,
        started_by: String,
        started_at: DateTime<Utc>,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    InterventionFinalized {
        id: String,
        intervention_id: String,
        task_id: String,
        technician_id: String,
        completed_at_ms: i64,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    MaterialConsumed {
        id: String,
        material_id: String,
        intervention_id: String,
        quantity: f64,
        unit: String,
        consumed_by: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    AuthenticationSuccess {
        id: String,
        user_id: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    AuthenticationFailed {
        id: String,
        user_id: Option<String>,
        reason: String,
        timestamp: DateTime<Utc>,
        metadata: Option<serde_json::Value>,
    },
    // ... other events
}

impl DomainEvent {
    pub fn event_type(&self) -> &'static str {
        match self {
            DomainEvent::TaskCreated { .. } => "TaskCreated",
            DomainEvent::TaskStatusChanged { .. } => "TaskStatusChanged",
            DomainEvent::TaskAssigned { .. } => "TaskAssigned",
            DomainEvent::InterventionStarted { .. } => "InterventionStarted",
            DomainEvent::InterventionFinalized { .. } => "InterventionFinalized",
            DomainEvent::MaterialConsumed { .. } => "MaterialConsumed",
            DomainEvent::AuthenticationSuccess { .. } => "AuthenticationSuccess",
            DomainEvent::AuthenticationFailed { .. } => "AuthenticationFailed",
        }
    }
}
```

### Event Handler Trait

```rust
// src-tauri/src/shared/services/event_bus.rs
#[async_trait]
pub trait EventHandler: Send + Sync {
    async fn handle(&self, event: &DomainEvent) -> Result<(), String>;
    
    fn interested_events(&self) -> Vec<&'static str>;
}
```

### Handler Implementation Example

```rust
// src-tauri/src/shared/logging/audit_log_handler.rs
pub struct AuditLogHandler {
    audit_service: Arc<AuditService>,
}

impl AuditLogHandler {
    pub fn new(audit_service: Arc<AuditService>) -> Self {
        Self { audit_service }
    }
}

#[async_trait]
impl EventHandler for AuditLogHandler {
    async fn handle(&self, event: &DomainEvent) -> Result<(), String> {
        match event {
            DomainEvent::TaskCreated { task_id, user_id, timestamp, .. } => {
                self.audit_service.log_action(
                    user_id,
                    AuditEventType::TaskCreated,
                    Some(task_id),
                    ActionResult::Success,
                    None,
                ).await
            }
            DomainEvent::InterventionFinalized { intervention_id, technician_id, .. } => {
                self.audit_service.log_action(
                    technician_id,
                    AuditEventType::InterventionCompleted,
                    Some(intervention_id),
                    ActionResult::Success,
                    None,
                ).await
            }
            _ => Ok(()),
        }
    }

    fn interested_events(&self) -> Vec<&'static str> {
        vec![
            "TaskCreated",
            "TaskStatusChanged",
            "InterventionStarted",
            "InterventionFinalized",
            "MaterialConsumed",
            "AuthenticationSuccess",
            "AuthenticationFailed",
        ]
    }
}
```

### Registration in ServiceBuilder

```rust
// src-tauri/src/service_builder.rs
pub fn build(self) -> Result<AppStateType, Box<dyn std::error::Error>> {
    // ... service initialization ...

    // Create event bus
    let event_bus = Arc::new(InMemoryEventBus::new());
    set_global_event_bus(event_bus.clone());

    // Create handlers
    let audit_log_handler = AuditLogHandler::new(audit_service.clone());
    
    // Register handlers
    event_bus.register_handler(audit_log_handler);
    register_handler(inventory_service.intervention_finalized_handler());
    
    // Register cross-domain handlers
    let quote_accepted_handler = QuoteAcceptedHandler::new(intervention_workflow_service.clone());
    register_handler(Arc::new(quote_accepted_handler));

    // ...
}
```

### Publishing Events

```rust
// src-tauri/src/shared/services/event_bus.rs
pub mod event_factory {
    use super::*;
    use uuid::Uuid;

    pub fn task_created(
        task_id: String,
        title: String,
        assigned_to: Option<String>,
    ) -> DomainEvent {
        DomainEvent::TaskCreated {
            id: Uuid::new_v4().to_string(),
            task_id: task_id.clone(),
            title,
            user_id: assigned_to.unwrap_or_else(|| "system".to_string()),
            timestamp: Utc::now(),
            metadata: None,
        }
    }

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
}

// Usage in service layer
impl InterventionService {
    pub async fn finalize(&self, id: &str, ctx: &RequestContext) -> AppResult<Intervention> {
        // ... finalize logic ...
        
        // Publish event
        let event = event_factory::intervention_finalized(
            intervention.id.clone(),
            intervention.task_id.clone(),
            ctx.user_id().to_string(),
            Utc::now().timestamp_millis(),
        );
        self.event_bus.publish(event)?;
        
        Ok(intervention)
    }
}
```

## Consequences

### Positive

- Domains remain decoupled
- Handlers are isolated (panics don't crash caller)
- Easy to add new handlers without modifying publishers
- Async dispatch doesn't block caller
- Centralized registration in ServiceBuilder

### Negative

- Fire-and-forget: no response from handlers
- Debugging requires tracing across handlers
- Order of handler execution not guaranteed
- No built-in event persistence

## When to Use Events

| Use Case | Use Events? | Alternative |
|----------|------------|-------------|
| Audit logging | Yes | - |
| Inventory updates on intervention | Yes | - |
| Notifications | Yes | - |
| Returning data to caller | No | Direct call |
| Synchronous validation | No | Direct call |
| Transaction rollback | No | Direct call |

## Related Files

- `src-tauri/src/shared/services/event_bus.rs` — Event bus implementation
- `src-tauri/src/shared/services/domain_event.rs` — Event definitions
- `src-tauri/src/shared/logging/audit_log_handler.rs` — Example handler
- `src-tauri/src/service_builder.rs` — Handler registration
- `src-tauri/src/domains/interventions/application/quote_event_handlers.rs` — Cross-domain handlers

## When to Read This ADR

- Adding new domain events
- Creating event handlers
- Understanding cross-domain communication
- Implementing audit logging
- Adding notification triggers
- Debugging event flow

## References

- ADR-003: Cross-Domain Communication
- AGENTS.md Event Bus section
- `event_factory` module for event creation