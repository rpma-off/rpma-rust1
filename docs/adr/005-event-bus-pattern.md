---
title: "In-Memory Event Bus for Cross-Domain Communication"
summary: "Use a publish/subscribe event bus to enable loose coupling between domains, allowing reactive updates without direct dependencies."
domain: events
status: accepted
created: 2026-03-12
---

## Context

Domain-driven design isolates bounded contexts, but some operations require cross-domain coordination:

- Task completion should trigger inventory consumption
- Intervention finalization should update task status
- Authentication failures should trigger security monitoring
- Material consumption should update analytics

Direct domain-to-domain calls create tight coupling and violate isolation principles.

## Decision

**Implement an in-memory publish/subscribe event bus for cross-domain communication.**

### Implementation

Defined in `src-tauri/src/shared/services/event_bus.rs`:

```rust
pub struct InMemoryEventBus {
    handlers: Arc<Mutex<HashMap<String, Vec<Arc<dyn EventHandler>>>>>,
}

#[async_trait]
pub trait EventHandler: Send + Sync {
    async fn handle(&self, event: &DomainEvent) -> Result<(), String>;
    fn interested_events(&self) -> Vec<&'static str>;
}
```

### Event Types

Domain events are defined in `domain_event.rs`:

```rust
pub enum DomainEvent {
    TaskCreated { task_id, title, user_id, ... },
    TaskUpdated { task_id, changed_fields, ... },
    TaskStatusChanged { task_id, old_status, new_status, ... },
    TaskAssigned { task_id, technician_id, ... },
    InterventionStarted { intervention_id, task_id, ... },
    InterventionCompleted { intervention_id, ... },
    InterventionFinalized { intervention_id, task_id, ... },
    MaterialConsumed { material_id, intervention_id, quantity, ... },
    AuthenticationFailed { user_id, reason, ... },
    AuthenticationSuccess { user_id, ... },
}
```

### Event Factory

Helper functions in `event_bus.rs`:

```rust
pub mod event_factory {
    pub fn task_created(task_id: String, title: String, ...) -> DomainEvent;
    pub fn intervention_completed(intervention_id: String) -> DomainEvent;
    pub fn material_consumed(material_id: String, ...) -> DomainEvent;
}
```

### Failure Isolation

Handlers are spawned in separate tasks to prevent panics from affecting others:

```rust
let join_result = tokio::spawn(async move { 
    handler.handle(&event_clone).await 
}).await;

match join_result {
    Ok(Ok(())) => { /* success */ },
    Ok(Err(e)) => { tracing::error!("Handler failed: {}", e); },
    Err(_) => { tracing::error!("Handler panicked, isolating failure"); },
}
```

## Consequences

### Positive

- **Loose Coupling**: Domains communicate without direct imports
- **Extensibility**: New handlers can subscribe without modifying publishers
- **Failure Isolation**: One handler's failure doesn't affect others
- **Testability**: Event flow can be tested independently
- **Audit Trail**: Events provide history of domain interactions

### Negative

- **Debugging Complexity**: Event flow is implicit, harder to trace
- **Eventual Consistency**: Handlers execute asynchronously
- **No Return Values**: Publishers can't get results from handlers
- **Memory Overhead**: All handlers kept in memory

## Related Files

- `src-tauri/src/shared/services/event_bus.rs` — Event bus implementation
- `src-tauri/src/shared/services/domain_event.rs` — Event type definitions
- `src-tauri/src/shared/services/mod.rs` — Service module index
- `src-tauri/src/shared/services/cross_domain.rs` — Cross-domain coordination

## Read When

- Adding new cross-domain behaviors
- Implementing reactive updates between domains
- Debugging why domain B didn't react to domain A's change
- Adding new domain event types
- Testing event handler registration
- Investigating event-related performance issues
