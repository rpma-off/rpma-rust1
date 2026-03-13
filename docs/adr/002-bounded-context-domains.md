# ADR-002: Bounded Context Domains

## Status

Accepted

## Date

2026-03-13

## Summary

Organizes code into domain modules (auth, users, tasks, interventions, clients, quotes, inventory, etc.) with explicit boundaries and no direct cross-domain imports.

## Context

- Complex business domain with multiple interrelated entities (Tasks, Interventions, Clients, Materials, Quotes)
- Need to prevent monolithic coupling as application grows
- Team needs clear ownership boundaries between features
- Frontend mirrors backend domain structure
- Multiple developers working on different features simultaneously

## Decision

We organize all backend code into bounded context domains under `src-tauri/src/domains/<name>/`.

### Current Domains

| Domain | Responsibility |
|--------|---------------|
| `auth` | Authentication, sessions, login/logout |
| `users` | User management, profiles, roles |
| `tasks` | Task CRUD, assignment, status transitions |
| `interventions` | PPF workflow, step progression, material consumption |
| `clients` | Customer management, statistics |
| `quotes` | Devis/quotes, items, approval workflow |
| `inventory` | Materials, suppliers, stock management |
| `calendar` | Scheduling, events, technician availability |
| `notifications` | Messaging, push notifications, preferences |
| `documents` | Photos, reports, file storage |
| `settings` | Application and user preferences |

### Domain Structure

Each domain follows the same structure:

```
domains/<name>/
├── mod.rs           # Public exports
├── facade.rs        # Domain facade for cross-domain access
├── application/     # Use cases, orchestration
├── domain/          # Pure business logic, entities
├── infrastructure/  # Repositories, adapters
├── ipc/             # Tauri command handlers
└── tests/           # Domain-specific tests
    ├── unit_*.rs
    ├── integration_*.rs
    ├── validation_*.rs
    └── permission_*.rs
```

### Boundary Rules

1. **No direct imports** from another domain's `application/`, `domain/`, or `infrastructure/`
2. **Shared types** go in `shared/contracts/`
3. **Cross-domain services** use `shared/services/cross_domain.rs`
4. **Reactive coordination** uses `shared/services/event_bus.rs`

### Frontend Mirror

```
frontend/src/domains/<name>/
├── api/            # React Query public API
├── components/     # Domain UI components
├── hooks/          # Domain custom hooks
├── ipc/            # IPC client wrappers
├── services/       # Frontend business logic
└── stores/         # Zustand stores (when needed)
```

## Consequences

### Positive

- Clear module boundaries enable parallel development
- Domains can be extracted to microservices if needed
- Each domain tested in isolation with domain-specific test suites
- New developers can focus on one domain at a time
- Frontend structure matches backend for easier navigation

### Negative

- Shared types require coordination through `shared/contracts/`
- Cross-domain features need event bus or facade pattern
- May seem over-organized for small features
- Requires discipline to maintain boundaries

## Code Examples

### Domain Module Export

```rust
// src-tauri/src/domains/tasks/mod.rs
mod facade;
pub(crate) use facade::TasksFacade;
pub(crate) mod application;
#[cfg(feature = "export-types")]
pub mod domain;
#[cfg(not(feature = "export-types"))]
pub(crate) mod domain;
pub(crate) mod infrastructure;
pub(crate) mod ipc;
#[cfg(test)]
pub(crate) mod tests;
```

### Forbidden Cross-Domain Import

```rust
// ❌ WRONG: Direct import from another domain
use crate::domains::clients::infrastructure::client_repository::ClientRepository;

// ✅ CORRECT: Use shared contracts
use crate::shared::contracts::client::Client;

// ✅ CORRECT: Use cross-domain service
use crate::shared::services::cross_domain::ClientService;
```

### Frontend Domain Structure

```typescript
// frontend/src/domains/users/services/user.service.ts
import { ipcClient } from '@/lib/ipc';
import type { CreateUserRequest } from '@/lib/backend';

export class UserService {
  static async getUsers(params?: { search?: string; role?: string }) {
    const result = await ipcClient.users.list(params);
    return result?.data;
  }
}
```

## Related Files

- `src-tauri/src/domains/` - All domain modules
- `src-tauri/src/shared/contracts/` - Shared type definitions
- `src-tauri/src/shared/services/cross_domain.rs` - Cross-domain service re-exports
- `frontend/src/domains/` - Frontend domain mirror
- `AGENTS.md` - Project structure reference

## When to Read This ADR

- Adding a new domain/feature area
- Importing types from another domain
- Understanding module organization
- Creating new bounded context
- Planning feature work across domains

## References

- Domain-Driven Design by Eric Evans (Bounded Contexts)
- AGENTS.md Project Structure section
- `src-tauri/src/domains/*/mod.rs` for domain boundaries