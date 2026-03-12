---
title: "Domain-Driven Design with Four-Layer Architecture"
summary: "Organize backend code into bounded contexts with strict four-layer separation: IPC → Application → Domain → Infrastructure."
domain: architecture
status: accepted
created: 2026-03-12
---

## Context

The application manages multiple complex business domains: tasks, interventions, inventory, clients, quotes, calendar, and authentication. Without clear architectural boundaries:

- Business logic becomes scattered across handlers and database code
- Cross-domain dependencies create tight coupling
- Testing becomes difficult due to mixed concerns
- New developers struggle to understand where code belongs
- Changes in one area unexpectedly break others

## Decision

**Adopt Domain-Driven Design (DDD) with strict four-layer architecture per bounded context.**

Each domain follows the structure defined in `src-tauri/src/domains/mod.rs:22-26`:

```
Commands (IPC handlers) → Services (business logic) → Repositories (data access) → Models (types)
```

### Directory Structure

```
src-tauri/src/domains/
├── auth/
│   ├── ipc/           # Layer 1: Tauri command handlers (thin)
│   ├── application/   # Layer 2: Use cases, orchestration
│   ├── domain/        # Layer 3: Entities, value objects, validation
│   ├── infrastructure/# Layer 4: Repositories, SQL, adapters
│   └── tests/         # Domain-specific tests
├── tasks/
│   ├── ipc/
│   ├── application/
│   ├── domain/
│   ├── infrastructure/
│   └── tests/
├── clients/
├── interventions/
├── inventory/
├── quotes/
├── calendar/
├── reports/
├── settings/
├── documents/
├── notifications/
└── users/
```

### Layer Responsibilities

| Layer | Responsibility | Allowed Dependencies |
|-------|---------------|---------------------|
| **IPC** | Authenticate, map inputs/outputs, delegate | Application, Shared |
| **Application** | Orchestrate use cases, enforce auth | Domain, Infrastructure |
| **Domain** | Pure business rules, entities, validation | None (pure) |
| **Infrastructure** | SQL, repositories, external adapters | Domain |

### Enforcement

Domain isolation is enforced via `src-tauri/src/shared/services/cross_domain.rs`, which provides an audited entry point for cross-domain service access:

```rust
//! Cross-domain service re-exports for shared access.
//! Prefer importing domain-owned traits from `shared::contracts`
//! when only the contract surface is needed.
```

## Consequences

### Positive

- **Clear Ownership**: Every feature has a natural home
- **Testability**: Domain layer can be unit tested without database
- **Maintainability**: Changes are localized to specific domains
- **Onboarding**: Directory structure guides developers
- **Enforcement**: Architecture tests verify layer boundaries (`boundary_tests.rs`)

### Negative

- **Verbosity**: More files and boilerplate for simple operations
- **Learning Curve**: Developers must understand DDD concepts
- **Overhead**: Cross-domain coordination requires explicit interfaces
- **Indirection**: Tracing code flow requires navigating multiple layers

## Related Files

- `src-tauri/src/domains/mod.rs` — Domain index and documentation
- `src-tauri/src/shared/services/cross_domain.rs` — Cross-domain access point
- `src-tauri/src/shared/contracts/` — Shared interfaces between domains
- `src-tauri/src/boundary_tests.rs` — Architecture boundary enforcement
- `AGENTS.md` — DDD and layer boundary rules

## Read When

- Creating a new domain or feature
- Unsure where to place new code
- Reviewing PRs for architectural compliance
- Investigating circular dependencies
- Adding cross-domain functionality
- Writing domain-specific tests
