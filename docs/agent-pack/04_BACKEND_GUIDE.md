---
title: "Backend Guide"
summary: "Rust development standards, domain patterns, and system architecture."
read_when:
  - "Implementing new backend features"
  - "Writing Rust services or repositories"
  - "Adding new IPC commands"
---

# 04. BACKEND GUIDE

The backend is a **Rust** application managed by **Tauri**, located in `src-tauri/`.

## Architecture: The Four-Layer Rule

Every domain in `src-tauri/src/domains/` MUST follow (**ADR-001**):
`IPC → Application → Domain ← Infrastructure`

### Compliance Matrix

| Domain | IPC | Application | Domain | Infrastructure | Notes |
|--------|:---:|:-----------:|:------:|:--------------:|-------|
| auth | ✓ | ✓ | ✓ | ✓ | Full compliance |
| interventions | ✓ | ✓ | ✓ | ✓ | Full compliance |
| inventory | ✓ | ✓ | ✓ | ✓ | Full compliance |
| quotes | ✓ | ✓ | ✓ | ✓ | Full compliance |
| tasks | ✓ | ✓ | ✓ | ✓ | Full compliance |
| trash | ✓ | ✓ | ✓ | ✓ | Full compliance |
| users | ✓ | ✓ | ✓ | ✓ | Full compliance |
| calendar | ✓ | — | — | — | Handler-based |
| clients | ✓ | — | — | — | Handler-based |
| documents | ✓ | — | — | — | Flat structure |
| notifications | ✓ | — | — | — | Handler-based |
| settings | ✓ | — | — | — | Flat structure |

## Layer Details

### 1. IPC Layer (`ipc/`)
Entry points for Tauri commands (**ADR-018**).

```rust
#[tauri::command]
pub async fn material_create(
    state: AppState<'_>,
    request: CreateMaterialRequest,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Material>, AppError> {
    // 1. Resolve request context (auth + RBAC)
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Technician);

    // 2. Get service
    let service = state.material_service.clone();

    // 3. Call application service
    match service.create_material(request, Some(ctx.user_id().to_string())) {
        Ok(material) => Ok(ApiResponse::success(material)
            .with_correlation_id(Some(ctx.correlation_id.clone()))),
        Err(e) => Err(e.into_app_error()),
    }
}
```

### 2. Application Layer (`application/`)
- **Orchestration** and use cases.
- **RBAC enforcement** via `RequestContext`.
- **Coordinates** services and repositories.

### 3. Domain Layer (`domain/`)
- **Pure logic** — no SQL, no IPC, no frameworks.
- **Entities** and business rules only.
- **Zero external dependencies**.

### 4. Infrastructure Layer (`infrastructure/`)
- **Repository implementations** (**ADR-005**).
- **SQL queries** using SQLite via `rusqlite`.

## Facade Pattern

Domains expose a simplified public API via a Facade:

```rust
// domains/tasks/application/facade.rs
pub struct TasksFacade {
    task_service: Arc<TaskService>,
    event_bus: Arc<dyn DomainEventBus>,
}

impl TasksFacade {
    pub async fn create_task(&self, request: CreateTaskRequest, ctx: &RequestContext) -> AppResult<Task> {
        // Simplified public API
    }
}
```

Facades are used for cross-domain access via `shared/services/cross_domain.rs`.

## Service Builder (**ADR-004**)

All services are wired in `src-tauri/src/service_builder.rs`:

```rust
pub struct Services {
    pub auth: Arc<AuthService>,
    pub tasks: Arc<TaskService>,
    pub clients: Arc<ClientService>,
    pub interventions: Arc<InterventionService>,
    pub inventory: Arc<MaterialService>,
    pub quotes: Arc<QuoteService>,
    pub users: Arc<UserService>,
    // ...
}

pub fn build_services(db: Arc<Database>, event_bus: Arc<dyn DomainEventBus>) -> Services {
    // Repositories first
    let task_repo = Arc::new(SqliteTaskRepository::new(db.clone()));

    // Services in dependency order
    let task_service = Arc::new(TaskService::new(task_repo, event_bus.clone()));

    Services { tasks: task_service, ... }
}
```

## Error Handling (**ADR-019**)

```rust
// Use AppError for all expected failures
pub enum AppError {
    Authentication(String),
    Authorization(String),
    Validation(String),
    NotFound(String),
    Database(String),    // Sanitized for frontend
    Internal(String),    // Sanitized for frontend
    // Domain-specific...
}

// At IPC boundary
impl From<AppError> for ApiResponse<Value> {
    fn from(error: AppError) -> Self {
        ApiResponse::error(error)  // Sanitizes internals
    }
}
```

## Security & Auth

- **Centralized Auth**: `resolve_context!` macro handles session validation and RBAC.
- **RequestContext**: Flows through the system; raw tokens never leave the IPC layer.
- **Location**: `src-tauri/src/shared/auth/request_context.rs`

## Database & Persistence

| Aspect | Details |
|--------|---------|
| Migrations | Numbered SQL files in `src-tauri/migrations/` (**ADR-010**) |
| WAL Mode | Enabled by default for performance (**ADR-009**) |
| Repository Pattern | Abstract data access (**ADR-005**) |
| Soft Delete | `deleted_at` timestamp (**ADR-011**) |
| Timestamps | i64 Unix milliseconds (**ADR-012**) |

## Cross-Domain Coordination

| Mechanism | Location | Use Case |
|-----------|----------|----------|
| Event Bus | `shared/event_bus/` | Async cross-domain reactions |
| Facade Pattern | `domains/*/application/facade.rs` | Controlled cross-domain access |
| Cross-Domain Re-exports | `shared/services/cross_domain.rs` | Sync service access |

## Command Registration

Commands are registered in `src-tauri/src/main.rs`:

```rust
.invoke_handler(tauri::generate_handler![
    domains::auth::ipc::auth::auth_login,
    domains::auth::ipc::auth::auth_create_account,
    domains::tasks::ipc::task::task_crud,
    domains::inventory::ipc::material::material_create,
    // ...
])
```

## Coding Standards

- Use **Newtypes** (e.g., `TaskId(String)`) for type safety.
- All IPC request/response types must derive `#[derive(TS)]` and `#[ts(export)]`.
- Run `npm run types:sync` after changing `#[derive(TS)]` types.
- Follow `clippy` and `rustfmt` rules.
- No `unwrap()` or `expect()` in production code.