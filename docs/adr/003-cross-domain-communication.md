---
title: "ADR-003: Cross-Domain Communication Channels"
summary: "Uses exactly three channels for cross-domain communication: shared contracts (types), cross_domain services (composition layer), and event bus (reactive coordination)."
domain: "architecture"
status: "accepted"
read_when:
  - "Designing new features"
  - "Reviewing architectural decisions"
---

# ADR-003: Cross-Domain Communication Channels

## Status

Accepted

## Date

2026-03-13

## Summary

Uses exactly three channels for cross-domain communication: shared contracts (types), cross_domain services (composition layer), and event bus (reactive coordination).

## Context

- Domains need to communicate for features like audit logging, inventory updates, and notifications
- Direct imports between domains violate bounded context boundaries
- Some cross-domain operations are synchronous (data sharing), others reactive (events)
- Need to maintain loose coupling while enabling coordination
- Audit trail required for cross-domain operations

## Decision

We implement exactly three channels for cross-domain communication:

### 1. Shared Contracts (`shared/contracts/`)

**Purpose**: Type-only definitions shared across domains

```
shared/contracts/
├── mod.rs
├── auth.rs         # UserRole, UserSession
├── notification.rs # Notification types
├── task_assignment.rs
├── user_account.rs
└── common.rs       # Shared enums, base types
```

**Rules**:
- Only type definitions, no implementations
- Must not depend on any domain
- Used by both domain and application layers

**Example**:
```rust
// shared/contracts/auth.rs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum UserRole {
    Admin,
    Supervisor,
    Technician,
    Viewer,
}

pub struct UserSession {
    pub user_id: String,
    pub username: String,
    pub role: UserRole,
    // ...
}
```

### 2. Cross-Domain Services (`shared/services/cross_domain.rs`)

**Purpose**: Concrete service re-exports at composition layer

```rust
// shared/services/cross_domain.rs
//! Cross-domain service re-exports for shared access.
//! Import domain-owned traits from `shared::contracts` when only the
//! contract surface is needed. Use this module when a concrete
//! infrastructure service or domain model is required at the
//! wiring / composition layer.

// Intervention domain
pub use crate::domains::interventions::infrastructure::intervention::InterventionService;

// Client domain
pub use crate::domains::clients::client_handler::ClientService;

// Tasks domain
pub use crate::domains::tasks::infrastructure::task::TaskService;

// ... other services
```

**Rules**:
- Only used at composition layer (ServiceBuilder, IPC coordination)
- Domains must not import from cross_domain directly
- Services are re-exports, not new implementations

### 3. Event Bus (`shared/services/event_bus.rs`)

**Purpose**: Pub/sub for decoupled reactive coordination

```rust
// Domain event types
pub enum DomainEvent {
    TaskCreated { task_id: String, ... },
    TaskStatusChanged { task_id: String, old_status: String, new_status: String, ... },
    InterventionStarted { intervention_id: String, ... },
    InterventionFinalized { intervention_id: String, ... },
    MaterialConsumed { material_id: String, ... },
    AuthenticationFailed { user_id: Option<String>, reason: String, ... },
    // ...
}
```

**Registration** (in `service_builder.rs`):
```rust
// Register handlers after event bus initialization
event_bus.register_handler(audit_log_handler);
register_handler(inventory_service.intervention_finalized_handler());
register_handler(Arc::new(quote_accepted_handler));
register_handler(Arc::new(quote_converted_handler));
```

**Handler Implementation**:
```rust
impl EventHandler for AuditLogHandler {
    async fn handle(&self, event: &DomainEvent) -> Result<(), String> {
        match event {
            DomainEvent::TaskCreated { .. } => { /* log */ },
            DomainEvent::InterventionFinalized { .. } => { /* log */ },
            // ...
        }
        Ok(())
    }

    fn interested_events(&self) -> Vec<&'static str> {
        vec!["TaskCreated", "InterventionStarted", "InterventionFinalized"]
    }
}
```

**Rules**:
- Events are fire-and-forget (async dispatch)
- Handlers cannot affect the initiating operation's result
- Handler errors are logged, not surfaced to caller
- Use for side effects (audit, notifications, cache invalidation)

## Communication Matrix

| Need | Channel | Example |
|------|---------|---------|
| Share types | `shared/contracts/` | `UserRole`, `UserSession` |
| Access service at composition | `cross_domain.rs` | `TaskService` in `ServiceBuilder` |
| Reactive side effect | Event Bus | Audit logging on `TaskCreated` |
| Cross-domain data | Facade + Service | `Intervention` needs `Task` data |

## Consequences

### Positive

- Clear audit trail for cross-domain dependencies
- Event bus enables loose coupling for notifications
- Contracts remain pure types without service coupling
- Testable: each channel has different testing strategies
- Compilation enforces boundaries (except event bus)

### Negative

- Event handlers must be explicitly registered in `service_builder.rs`
- Debugging event-driven flows requires distributed tracing
- Event bus is fire-and-forget, no response/acknowledgment
- Adding new events requires updates to multiple handlers

## Related Files

- `src-tauri/src/shared/contracts/` - Shared type definitions
- `src-tauri/src/shared/services/cross_domain.rs` - Service re-exports
- `src-tauri/src/shared/services/event_bus.rs` - Event bus implementation
- `src-tauri/src/shared/services/domain_event.rs` - Event type definitions
- `src-tauri/src/service_builder.rs:291-304` - Handler registration
- `src-tauri/src/shared/logging/audit_log_handler.rs` - Example handler

## When to Read This ADR

- Adding cross-domain features
- Creating new domain events
- Importing services from other domains
- Understanding how domains communicate
- Implementing reactive features (notifications, audit)
- Debugging cross-domain issues

## References

- AGENTS.md Architecture - Cross-Domain Communication section
- Domain-Driven Design (Strategic Design)
- Event-Driven Architecture patterns