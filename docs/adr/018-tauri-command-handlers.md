# ADR-018: Tauri Command Handlers (Thin IPC Layer)

## Status

Accepted

## Date

2026-03-13

## Summary

All Tauri command handlers (`#[tauri::command]`) are thin wrappers that authenticate via `resolve_context!`, delegate to application services, and never contain business logic.

## Context

- Need consistent authentication and authorization at IPC boundary
- Business logic must not leak into IPC handlers
- Error handling must be consistent across all commands
- Response types must be serializable for IPC
- Handler code should be readable and minimal

## Decision

### The Pattern

Every IPC command follows this pattern:

```rust
#[tauri::command]
pub async fn command_name(
    param: Type,
    state: State<'_, AppStateType>,
    correlation_id: Option<String>,
) -> AppResult<ResponseType> {
    // 1. Authenticate (always first line)
    let ctx = resolve_context!(&state, &correlation_id);
    
    // 2. Delegate to application service
    let service = Service::new(/* dependencies */);
    service.method(param, &ctx).await
}
```

### Handler Structure

```rust
// src-tauri/src/domains/tasks/ipc/task.rs
#[tauri::command]
pub async fn task_crud(
    operation: String,
    payload: Option<serde_json::Value>,
    state: State<'_, AppStateType>,
    correlation_id: Option<String>,
) -> AppResult<serde_json::Value> {
    let ctx = resolve_context!(&state, &correlation_id);
    let facade = TasksFacade::new(/* ... */);
    facade.handle_crud(operation, payload, &ctx).await
}

#[tauri::command]
pub async fn create_task(
    request: CreateTaskRequest,
    state: State<'_, AppStateType>,
    correlation_id: Option<String>,
) -> AppResult<Task> {
    let ctx = resolve_context!(&state, &correlation_id);
    let service = TaskService::new(state.db.clone());
    service.create(request, &ctx).await
}

#[tauri::command]
pub async fn get_task(
    id: String,
    state: State<'_, AppStateType>,
    correlation_id: Option<String>,
) -> AppResult<Task> {
    let ctx = resolve_context!(&state, &correlation_id);
    let service = TaskService::new(state.db.clone());
    service.get(&id).await
}

#[tauri::command]
pub async fn delete_task(
    id: String,
    state: State<'_, AppStateType>,
    correlation_id: Option<String>,
) -> AppResult<()> {
    // Role-gated: only Admin can delete
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    let service = TaskService::new(state.db.clone());
    service.delete(&id, &ctx).await
}
```

### Role-Gated Commands

```rust
#[tauri::command]
pub async fn delete_user(
    id: String,
    state: State<'_, AppStateType>,
    correlation_id: Option<String>,
) -> AppResult<()> {
    // Only Admin can delete users
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    let service = UserService::new(state.repositories.user.clone());
    service.delete(&id, &ctx).await
}

#[tauri::command]
pub async fn get_system_stats(
    state: State<'_, AppStateType>,
    correlation_id: Option<String>,
) -> AppResult<SystemStats> {
    // Supervisor and above can view stats
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Supervisor);
    let service = SystemService::new(state.db.clone());
    service.get_stats().await
}
```

### Error Handling at Boundary

```rust
// src-tauri/src/shared/ipc/errors.rs
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Authentication: {0}")]
    Authentication(String),
    
    #[error("Authorization: {0}")]
    Authorization(String),
    
    #[error("Validation: {0}")]
    Validation(String),
    
    #[error("NotFound: {0}")]
    NotFound(String),
    
    #[error("Conflict: {0}")]
    Conflict(String),
    
    #[error("Internal: {0}")]
    Internal(String),
}

// Domain errors are converted to AppError at the IPC boundary
impl From<DomainError> for AppError {
    fn from(err: DomainError) -> Self {
        match err {
            DomainError::NotFound(id) => AppError::NotFound(id),
            DomainError::InvalidInput(msg) => AppError::Validation(msg),
            DomainError::Conflict(msg) => AppError::Conflict(msg),
            DomainError::Internal(msg) => AppError::Internal(msg),
        }
    }
}
```

### CRUD Pattern

Many domains use a unified CRUD handler:

```rust
#[tauri::command]
pub async fn client_crud(
    operation: String,
    payload: Option<serde_json::Value>,
    state: State<'_, AppStateType>,
    correlation_id: Option<String>,
) -> AppResult<serde_json::Value> {
    let ctx = resolve_context!(&state, &correlation_id);
    
    let service = ClientService::new(state.repositories.client.clone());
    
    match operation.as_str() {
        "create" => {
            let request: CreateClientRequest = payload
                .ok_or_else(|| AppError::Validation("Payload required".into()))
                .and_then(|p| serde_json::from_value(p).map_err(AppError::from))?;
            let client = service.create(request, &ctx).await?;
            Ok(serde_json::to_value(client)?)
        }
        "get" => {
            let id = payload
                .and_then(|p| p.get("id").and_then(|v| v.as_str().map(String::from)))
                .ok_or_else(|| AppError::Validation("ID required".into()))?;
            let client = service.get(&id).await?;
            Ok(serde_json::to_value(client)?)
        }
        "update" => {
            let request: UpdateClientRequest = payload
                .ok_or_else(|| AppError::Validation("Payload required".into()))
                .and_then(|p| serde_json::from_value(p).map_err(AppError::from))?;
            let client = service.update(request, &ctx).await?;
            Ok(serde_json::to_value(client)?)
        }
        "delete" => {
            let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
            let id = payload
                .and_then(|p| p.get("id").and_then(|v| v.as_str().map(String::from)))
                .ok_or_else(|| AppError::Validation("ID required".into()))?;
            service.delete(&id, &ctx).await?;
            Ok(serde_json::json!({"success": true}))
        }
        "list" => {
            let filters: ListFilters = payload
                .and_then(|p| serde_json::from_value(p).ok())
                .unwrap_or_default();
            let clients = service.list(filters).await?;
            Ok(serde_json::to_value(clients)?)
        }
        _ => Err(AppError::Validation(format!("Unknown operation: {}", operation))),
    }
}
```

### Registration in main.rs

```rust
// src-tauri/src/main.rs
.invoke_handler(tauri::generate_handler![
    // - System
    commands::system::health_check,
    commands::system::get_app_info,
    
    // - Auth
    domains::auth::ipc::auth::auth_login,
    domains::auth::ipc::auth::auth_logout,
    
    // - Tasks
    domains::tasks::ipc::task::task_crud,
    domains::tasks::ipc::task::create_task,
    domains::tasks::ipc::task::get_task,
    domains::tasks::ipc::task::delete_task,
    
    // - ... other domains
]);
```

## What Goes Where

| Code Location | Purpose |
|--------------|---------|
| `domains/*/ipc/` | Thin handlers, auth, delegation |
| `domains/*/application/` | Use cases, orchestration, auth enforcement |
| `domains/*/domain/` | Pure business rules, validation |
| `domains/*/infrastructure/` | Repositories, adapters |

## Anti-Patterns to Avoid

```rust
// ❌ WRONG: Business logic in handler
#[tauri::command]
pub async fn create_task(request: CreateTaskRequest, state: State<'_, AppStateType>) -> AppResult<Task> {
    // Don't validate here
    if request.title.len() < 3 {
        return Err(AppError::Validation("Title too short".into()));
    }
    
    // Don't compute here
    let task_number = format!("TASK-{}", state.db.get_next_number());
    
    // Don't access DB directly
    let conn = state.db.get_connection();
    conn.execute("INSERT INTO tasks ...", []);
    
    // ...
}

// ✅ CORRECT: Delegate to service
#[tauri::command]
pub async fn create_task(request: CreateTaskRequest, state: State<'_, AppStateType>, correlation_id: Option<String>) -> AppResult<Task> {
    let ctx = resolve_context!(&state, &correlation_id);
    let service = TaskService::new(state.db.clone());
    service.create(request, &ctx).await
}
```

## Consequences

### Positive

- Consistent authentication across all commands
- Business logic stays in services
- Handlers are minimal and readable
- Easy to audit security at boundary
- Testable: services can be tested without IPC

### Negative

- More boilerplate for simple CRUD
- Service must handle all business logic
- Error conversion needed at boundary

## Related Files

- `src-tauri/src/domains/*/ipc/` — IPC handlers per domain
- `src-tauri/src/shared/context/session_resolver.rs` — resolve_context! macro
- `src-tauri/src/shared/ipc/errors.rs` — AppError type
- `src-tauri/src/main.rs` — Handler registration

## When to Read This ADR

- Adding new IPC commands
- Writing Tauri command handlers
- Understanding authentication flow
- Debugging IPC errors
- Reviewing handler code

## References

- AGENTS.md "Every IPC command must call resolve_context!"
- ADR-006: RequestContext Pattern
- ADR-007: RBAC Hierarchy