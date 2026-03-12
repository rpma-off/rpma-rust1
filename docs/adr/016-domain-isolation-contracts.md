---
title: "Domain Isolation via Shared Contracts"
summary: "Enforce domain boundaries by requiring cross-domain communication through shared contract interfaces, preventing direct domain-to-domain imports."
domain: boundaries
status: accepted
created: 2026-03-12
---

## Context

In a domain-driven architecture, bounded contexts must remain isolated. Direct imports between domains create:

- Tight coupling that breaks independently deployable units
- Hidden dependencies that complicate refactoring
- Unclear ownership of shared logic
- Circular dependency risks

However, some cross-domain coordination is necessary (e.g., tasks referencing clients, interventions consuming inventory).

## Decision

**Enforce domain isolation through shared contract interfaces in `shared/contracts/`, with `cross_domain.rs` as the only audited entry point for cross-domain service access.**

### Shared Contracts Location

```
src-tauri/src/shared/
├── contracts/
│   ├── auth.rs        # UserRole, UserSession, UserAccount
│   ├── common.rs      # GpsLocation, FilmType, WorkLocation
│   └── prediction.rs  # CompletionTimePrediction
└── services/
    └── cross_domain.rs  # Audited cross-domain re-exports
```

### Contract Pattern

Domains define their contracts in `shared/contracts/` rather than exposing internals:

```rust
// src-tauri/src/shared/contracts/auth.rs
//! Shared authentication contracts used across bounded contexts.
//! These types originate in the `auth` domain but are re-exported here
//! so that other domains can reference them without creating a
//! cross-domain dependency on `auth::domain`.

pub use crate::domains::auth::domain::models::auth::{
    SessionTimeoutConfig, UserAccount, UserRole, UserSession,
};
```

### Cross-Domain Service Access

`cross_domain.rs` provides the single audited entry point:

```rust
//! Cross-domain service re-exports for shared access.
//!
//! **Prefer** importing domain-owned traits from `shared::contracts`
//! when only the contract surface is needed. Use this module only
//! when a concrete infrastructure service or domain model is required
//! at the wiring / composition layer.

// Services
pub use crate::domains::interventions::infrastructure::intervention::InterventionService;
pub use crate::domains::clients::infrastructure::client::ClientService;
pub use crate::domains::tasks::infrastructure::task::TaskService;
pub use crate::domains::auth::infrastructure::auth::AuthService;

// Types (for cross-domain coordination only)
pub use crate::domains::clients::domain::models::client::Client;
pub use crate::domains::tasks::domain::models::task::{Task, TaskStatus};
pub use crate::domains::interventions::domain::models::intervention::Intervention;
```

### Import Rules

```rust
// ✅ Good: Import contract from shared
use crate::shared::contracts::auth::UserRole;

// ✅ Good: Import service from cross_domain (composition layer only)
use crate::shared::services::cross_domain::TaskService;

// ❌ Bad: Direct import from another domain
use crate::domains::auth::domain::models::auth::UserSession;

// ❌ Bad: Importing another domain's internals
use crate::domains::tasks::infrastructure::task::TaskRepository;
```

### Event-Based Coordination

For reactive cross-domain behavior, use the event bus:

```rust
// Task domain publishes event
event_bus.dispatch(DomainEvent::TaskCompleted { task_id, ... });

// Inventory domain subscribes
impl EventHandler for InventoryHandler {
    fn interested_events(&self) -> Vec<&'static str> {
        vec!["TaskCompleted"]
    }
    
    async fn handle(&self, event: &DomainEvent) -> Result<(), String> {
        // React without direct task domain dependency
    }
}
```

### Boundary Tests

Architecture boundaries are enforced by tests:

```rust
// src-tauri/src/boundary_tests.rs
#[test]
fn domains_dont_import_other_domain_internals() {
    // Verify no direct domain-to-domain imports
}
```

## Consequences

### Positive

- **Clear Boundaries**: Domains can evolve independently
- **Audited Access**: Cross-domain imports are visible in one file
- **Testable Isolation**: Boundary tests catch violations
- **Event-Driven**: Event bus enables reactive coordination
- **Explicit Dependencies**: `cross_domain.rs` documents all cross-cuts

### Negative

- **Indirection**: Extra layer for accessing shared types
- **Boilerplate**: Must add types to contracts explicitly
- **Eventual Consistency**: Event-based coordination is async
- **Review Overhead**: Changes to `cross_domain.rs` need scrutiny

## Related Files

- `src-tauri/src/shared/contracts/auth.rs` — Auth contracts
- `src-tauri/src/shared/contracts/common.rs` — Common types
- `src-tauri/src/shared/services/cross_domain.rs` — Cross-domain access
- `src-tauri/src/shared/services/event_bus.rs` — Event-based coordination
- `src-tauri/src/boundary_tests.rs` — Boundary enforcement
- `AGENTS.md` — Domain isolation rules

## Read When

- Adding new shared types between domains
- Creating cross-domain service calls
- Implementing event-based coordination
- Reviewing architecture boundary violations
- Adding new domains
- Understanding why direct domain imports are forbidden
