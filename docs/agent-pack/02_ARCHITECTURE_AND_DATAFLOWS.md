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

Each domain in `src-tauri/src/domains/` follows this structure:

### 1. IPC Layer (`ipc/`)
- **Entry points** for Tauri commands with `#[tauri::command]`.
- **Thin handlers** — must call `resolve_context!` first (**ADR-006**, **ADR-018**).
- **Delegates** to Application layer; never contains business logic.
- **Location**: `domains/*/ipc/`

```rust
#[tauri::command]
pub async fn task_crud(
    state: AppState<'_>,
    request: TaskCrudRequest,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Task>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);// Auth + RBAC
    let service = state.task_service.clone();
    service.handle_crud(request, ctx).await
}
```

### 2. Application Layer (`application/`)
- **Orchestration** and use cases.
- **RBAC enforcement** via `RequestContext`.
- **Coordinates** services and repositories.
- **Location**: `domains/*/application/`

### 3. Domain Layer (`domain/`)
- **Pure business logic**, entities, value objects.
- **Zero dependencies** on other layers or frameworks.
- **Implementation** of domain-specific validation.
- **Location**: `domains/*/domain/`

### 4. Infrastructure Layer (`infrastructure/`)
- **Repository implementations** (**ADR-005**).
- **SQL queries** using SQLite.
- **Location**: `domains/*/infrastructure/`

## Layer Compliance Exceptions

| Domain | Structure | Notes |
|--------|-----------|-------|
| calendar | `calendar_handler/`, `models.rs` | Flat handler pattern |
| clients | `client_handler/` | Minimal structure |
| documents | Flat `.rs` files | Handlers at root |
| notifications | `notification_handler/` | Handler pattern |
| settings | Flat `.rs` files | Handlers at root |

## Service Builder Pattern (**ADR-004**)

All services are wired centrally in `src-tauri/src/service_builder.rs`:

```rust
pub fn build_services(db: Arc<Database>, event_bus: Arc<dyn DomainEventBus>) -> Services {
    // Repositories
    let task_repo = Arc::new(SqliteTaskRepository::new(db.clone()));
    // ...other repos

    // Services (dependency order matters)
    let task_service = Arc::new(TaskService::new(task_repo.clone(), event_bus.clone()));
    // ...other services

    Services { task_service, ... }
}
```

## Facade Pattern

Domains expose a simplified public API via a Facade:

```rust
pub struct TasksFacade {
    task_service: Arc<TaskService>,
    event_bus: Arc<dyn DomainEventBus>,
}
// Facade public methods wrap internal service calls
```

## Data Flow: Task Creation Example

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND                                                                     │
│ TaskForm.tsx → taskIpc.create(data) → invoke('task_crud', {...})           │
└────────────────────────────────────┬────────────────────────────────────────┘│                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ IPC LAYER                                                                    │
│ resolve_context!() → validates session, checks RBAC → RequestContext       │
│ task_crud() delegates to TaskService                                        │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ APPLICATION LAYER                                                            │
│ TaskService.handle_crud(request, ctx)                                        │
│   → validates business rules                                                │
│   → calls repository                                                        │
│   → publishes TaskCreated event                                              │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE LAYER                                                         │
│ SqliteTaskRepository.insert(task) → INSERT INTO tasks (...)                 │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ EVENT BUS                                                                    │
│ DomainEvent::TaskCreated → subscribers (audit, notifications)                │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Communication Patterns

| Pattern | Mechanism | Use Case |
|---------|-----------|----------|
| Synchronous | Direct IPC via `invoke()` | CRUD operations, queries |
| Asynchronous | In-memory `EventBus` | Cross-domain reactions (e.g., inventory deduction on intervention finalize) |
| Tracing | `correlation_id` per request | Debugging, audit trails(**ADR-020**) |

## Dependency Rules

- **Inner layers cannot depend on outer layers.**
- **Domain Layer** has zero dependencies.
- **Cross-domain calls** MUST go through:
  - `shared/services/cross_domain.rs` (synchronous)
  - `shared/event_bus/` (asynchronous)
- Direct imports from another domain's internals are **FORBIDDEN**.

## Key Files

| File | Purpose |
|------|---------|
| `src-tauri/src/main.rs` | Command registration via `tauri::generate_handler![]` |
| `src-tauri/src/service_builder.rs` | Service wiring (ADR-004) |
| `src-tauri/src/shared/event_bus/bus.rs` | EventBus implementation |
| `src-tauri/src/shared/services/domain_event.rs` | DomainEvent enum |
| `src-tauri/src/shared/services/cross_domain.rs` | Cross-domain service access |