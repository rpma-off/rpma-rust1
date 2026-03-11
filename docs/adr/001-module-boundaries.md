# ADR-001: Module Boundaries and Layering Strategy

## Status
Accepted

## Context
RPMA v2 uses a bounded-context architecture to ensure domain isolation and maintainability. Each domain must be decoupled and follow a consistent internal structure to prevent logic leakage and circular dependencies.

## Decision

### Domain Isolation
- Each domain is isolated into its own module under `src-tauri/src/domains/`.
- Shared infrastructure and cross-cutting concerns live under `src-tauri/src/shared/`.
- Cross-domain communication occurs exclusively through the in-memory event bus (`src-tauri/src/shared/event_bus/*`), never by importing another domain's internal modules.
- Each domain exposes a single public facade via `pub(crate) use` in its `mod.rs`.

### Internal Layering (DDD)
Each domain follows a strict hierarchical layering pattern: `ipc -> application -> domain -> infrastructure`.

- **IPC Layer (`ipc/`)**: Thin command boundary responsible for serialization, initial authentication entry checks, command routing, and error mapping.
- **Application Layer (`application/`)**: Orchestrates use cases, manages database transaction boundaries, and enforces fine-grained authorization rules. It must not execute raw SQL.
- **Domain Layer (`domain/`)**: Contains pure business rules, entities, value objects, and domain-specific validation. It must not perform any I/O operations (filesystem or database).
- **Infrastructure Layer (`infrastructure/`)**: Implements persistence via repositories, manages raw SQL/SQLite interactions, and handles external adapters.

### Enforcement
- `scripts/architecture-check.js` and `scripts/anti-spaghetti-guards.js` validate module boundaries in CI.
- `scripts/enforce-backend-module-boundaries.js` prevents illegal cross-domain imports.
- `scripts/detect-cross-domain-imports.js` identifies unintended coupling.

## Consequences
- Domains are independently testable and can evolve without side effects.
- Business logic is concentrated in the domain layer, isolated from infrastructure and transport details.
- Transactional integrity is guaranteed at the application level.
- Circular dependencies are prevented by the strict layer hierarchy.
