---
title: "Architecture and Dataflows"
summary: "Detailed explanation of the four-layer architecture and how data moves through the system."
read_when:
  - "Implementing new IPC commands"
  - "Tracing data from frontend to backend"
  - "Understanding layer boundaries"
---

# 02. ARCHITECTURE AND DATAFLOWS

RPMA v2 follows a strict four-layer architecture (**ADR-001**) to ensure separation of concerns and testability.

## Layered Architecture (Backend)

Each domain in `src-tauri/src/domains/` is structured as:

1. **IPC Layer** (`ipc/`)
   - Thin handlers with `#[tauri::command]`.
   - Must call `resolve_context!` first (**ADR-006**).
   - Delegates to Application layer.

2. **Application Layer** (`application/`)
   - Orchestration, use cases, and transaction boundaries.
   - Enforces RBAC via `RequestContext`.
   - Coordinates services and repositories.

3. **Domain Layer** (`domain/`)
   - Pure business logic, entities, and value objects.
   - **Zero dependencies** on other layers or frameworks.
   - Implementation of domain-specific validation.

4. **Infrastructure Layer** (`infrastructure/`)
   - Repository implementations (**ADR-005**) and external adapters.
   - SQL queries using SQLite.

## Data Flow: Example (Task Creation)

1. **Frontend**: `TaskForm.tsx` collects data.
2. **Frontend IPC**: `taskIpc.create(data)` (in `frontend/src/domains/tasks/ipc/`) calls `invoke`.
3. **Backend IPC**: `tasks::ipc::task::task_crud` resolves context and calls the facade/service.
4. **Backend Application**: `TaskService::create_task` validates and calls the repository.
5. **Backend Infrastructure**: `SqliteTaskRepository` inserts into SQLite.
6. **Backend Event Bus**: `TaskCreated` event published to `EventBus` (**ADR-016**).
7. **Frontend Response**: IPC returns `ApiResponse<Task>`; TanStack Query invalidates 'tasks' pattern.

## Core Communication Patterns

- **Synchronous**: Direct IPC calls from Frontend to Backend.
- **Asynchronous (Cross-Domain)**: In-memory `EventBus` (**ADR-016**) using domain events (**ADR-017**).
- **Correlation IDs**: `correlation_id` passed in every request for tracing (**ADR-020**).

## Dependency Rules

- **Inner layers** cannot depend on **outer layers**.
- **Domain Layer** is the heart and has no dependencies.
- **Cross-domain** calls MUST go through `shared/services/cross_domain.rs` or the `EventBus`.
- Direct imports from another domain's internals are **FORBIDDEN**.
