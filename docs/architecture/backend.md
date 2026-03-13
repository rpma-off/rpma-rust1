---
title: "Backend Architecture (Rust)"
summary: "Detailed overview of the Rust backend, including domain structure, data access, and core patterns."
read_when:
  - "Working on backend domain code"
  - "Creating new Rust modules"
  - "Understanding data persistence"
---

# Backend Architecture (Rust)

The backend is built with Rust and Tauri. It is organized into multiple domains, each representing a bounded context in the business.

## Layered Domain Structure (ADR-001)

Every domain in `src-tauri/src/domains/` follows a strict four-layer architecture:

### 1. IPC Layer (`domains/*/ipc/`)
- Entry point for Tauri commands (`#[tauri::command]`).
- Thin adapters that translate IPC payloads into domain types.
- **Mandate**: Every command MUST call `resolve_context!` as its first line (ADR-006).
- *Reference*: `src-tauri/src/domains/tasks/ipc/task/facade.rs`

### 2. Application Layer (`domains/*/application/`)
- Orchestrates business use cases.
- Enforces RBAC rules using the `RequestContext`.
- Calls domain services and infrastructure repositories.
- *Reference*: `src-tauri/src/domains/tasks/application/services/task_command_service.rs`

### 3. Domain Layer (`domains/*/domain/`)
- Pure business logic and rules.
- Contains entities, value objects, and domain events.
- **Zero dependencies** on any other layer or external libraries (except standard types).
- *Reference*: `src-tauri/src/domains/tasks/domain/models/task.rs`

### 4. Infrastructure Layer (`domains/*/infrastructure/`)
- Implements repositories defined in the application or domain layers.
- Handles SQL queries (ADR-005) and external API integrations.
- *Reference*: `src-tauri/src/domains/tasks/infrastructure/task_repository.rs`

## Shared Infrastructure

### Database and Migrations (ADR-009, ADR-010)
- SQLite with WAL mode for concurrent access.
- Embedded migrations in `src-tauri/migrations/`.
- Repositories use a shared connection pool from `AppState`.

### Error Handling (ADR-019)
- Domains use `thiserror` for specific domain errors.
- IPC boundary uses `AppError` (anyhow-based) to sanitize and wrap errors for the frontend.
- *Reference*: `src-tauri/src/commands/error.rs`

### Event Bus (ADR-016)
- Decentralized communication via an in-memory event bus.
- Domains publish events (e.g., `TaskCreated`, `InterventionStarted`).
- Side effects like audit logging or notifications are handled by subscribers.
- *Reference*: `src-tauri/src/shared/services/event_bus.rs`

## Key Patterns

- **Newtypes**: Used extensively for IDs and specific status types to avoid "stringly-typed" code.
- **Service Builder**: Centralized wiring of services and dependencies during startup.
  - *Reference*: `src-tauri/src/service_builder.rs`
- **Request Context**: `RequestContext` contains user authentication and correlation ID for tracing (ADR-020).
