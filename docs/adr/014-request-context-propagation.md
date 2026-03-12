---
title: "Request Context and Correlation ID Propagation"
summary: "Propagate request context (session, correlation ID) from IPC handlers through the service layer using macros and structured logging for traceability."
domain: observability
status: accepted
created: 2026-03-12
---

## Context

Debugging distributed operations requires tracing requests across layers:

- Which user initiated the request?
- What session was active?
- Which related operations were triggered?
- Where did an error originate?

Without context propagation, logs are disconnected and debugging becomes guesswork.

## Decision

**Propagate request context with correlation IDs through all layers using the `resolve_context!` macro.**

### Context Resolution

Defined in `src-tauri/src/shared/context/session_resolver.rs`:

```rust
/// Resolve session, enforce RBAC, and return fully-populated RequestContext.
pub fn resolve_request_context(
    app: &AppContext,
    required_role: Option<UserRole>,
    correlation_id: &Option<String>,
) -> AppResult<RequestContext> {
    // 1. Validate session
    let session: UserSession = app.session_store.get()?;
    
    // 2. RBAC gate
    if let Some(ref required) = required_role {
        if !AuthMiddleware::has_permission(&session.role, required) {
            return Err(AppError::Authorization("Insufficient permissions".into()));
        }
    }
    
    // 3. Initialize correlation context
    let corr_id = init_correlation_context(correlation_id, Some(&session.user_id));
    update_correlation_context_user(&session.user_id);
    
    // 4. Build context
    Ok(RequestContext::new(
        AuthContext::from_session(&session),
        corr_id,
    ))
}
```

### Macro Usage in IPC Handlers

```rust
#[tauri::command]
pub async fn get_task(
    id: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Task>, AppError> {
    // Macro resolves context with role requirement
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Viewer);
    
    // Pass context to service layer
    let task = task_service.get(&ctx, &id)?;
    
    Ok(ApiResponse::success(task).with_correlation_id(Some(ctx.correlation_id)))
}
```

### RequestContext Structure

```rust
// src-tauri/src/shared/context/request_context.rs
#[derive(Debug, Clone)]
pub struct RequestContext {
    pub session: UserSession,
    pub correlation_id: String,
}

// src-tauri/src/shared/ipc/command_context.rs
#[derive(Debug, Clone)]
pub struct CommandContext {
    pub session: UserSession,
    pub correlation_id: String,
}
```

### Correlation ID Generation

```rust
// src-tauri/src/shared/ipc/correlation.rs
pub fn init_correlation_context(
    external_id: &Option<String>,
    user_id: Option<&str>,
) -> String {
    match external_id {
        Some(id) if !id.is_empty() => id.clone(),
        _ => format!("req-{}-{}", Uuid::new_v4(), user_id.unwrap_or("anon")),
    }
}
```

### API Response with Correlation

```rust
// src-tauri/src/shared/ipc/response.rs
#[derive(Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<ApiError>,
    pub correlation_id: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn with_correlation_id(mut self, id: Option<String>) -> Self {
        self.correlation_id = id.or_else(|| Some(generate_correlation_id()));
        self
    }
}
```

### Structured Logging

```rust
#[instrument(skip(state), fields(correlation_id = %correlation_id))]
pub async fn create_task(
    request: CreateTaskRequest,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<Task>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Manager);
    
    tracing::info!(
        task_title = %request.title,
        user_id = %ctx.session.user_id,
        "Creating task"
    );
    
    // ...
}
```

## Consequences

### Positive

- **Traceability**: Every operation linked to correlation ID
- **Debugging**: Logs can be filtered by correlation ID
- **Audit Trail**: User and session info preserved
- **Consistency**: Macro ensures all handlers follow same pattern
- **Error Context**: Failures include correlation ID in response

### Negative

- **Verbosity**: Every handler needs context resolution
- **Macro Magic**: `resolve_context!` hides implementation
- **Thread Safety**: Context must be thread-safe for async
- **Overhead**: Correlation ID passed through all layers

## Related Files

- `src-tauri/src/shared/context/session_resolver.rs` — Context resolution
- `src-tauri/src/shared/context/request_context.rs` — RequestContext struct
- `src-tauri/src/shared/ipc/command_context.rs` — CommandContext struct
- `src-tauri/src/shared/ipc/correlation.rs` — Correlation ID utilities
- `src-tauri/src/shared/ipc/response.rs` — API response with correlation
- `src-tauri/src/shared/logging/correlation.rs` — Logging integration

## Read When

- Adding new IPC commands
- Debugging cross-layer issues
- Understanding error traceability
- Implementing audit logging
- Adding tracing to services
- Investigating session issues
