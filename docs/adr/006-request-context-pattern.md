# ADR-006: RequestContext Pattern for Authentication Flow

## Status

Accepted

## Date

2026-03-13

## Summary

Session tokens never reach services or repositories. All authentication and authorization happens at the IPC boundary via `resolve_context!` macro, returning a `RequestContext` that flows through the application and domain layers.

## Context

- Need to prevent session token leakage into business logic
- Distributed tracing requires correlation IDs throughout call stack
- RBAC decisions need user context without raw tokens
- Thread-local storage needed for logging correlation
- Session validation must happen in one place

## Decision

### The Rule

**No raw session token may ever reach a service or repository.**

The session token is resolved to a `RequestContext` exactly once, at the IPC boundary.

### Pattern Flow

```
Frontend (session_token)
         ↓
    IPC Handler
         ↓
resolve_context!(&state, &correlation_id)  ← ONLY PLACE
         ↓
  RequestContext { auth, correlation_id }
         ↓
    Application Layer
         ↓
     Domain Layer
         ↘ (no tokens, only context)
      Infrastructure Layer
```

### Implementation

#### RequestContext

```rust
// src-tauri/src/shared/context/request_context.rs
#[derive(Debug, Clone)]
pub struct RequestContext {
    pub auth: AuthContext,
    pub correlation_id: String,
}

impl RequestContext {
    pub fn new(auth: AuthContext, correlation_id: String) -> Self {
        Self { auth, correlation_id }
    }

    pub fn user_id(&self) -> &str {
        &self.auth.user_id
    }

    pub fn role(&self) -> &UserRole {
        &self.auth.role
    }
}
```

#### resolve_context! Macro

```rust
// src-tauri/src/shared/context/session_resolver.rs
#[macro_export]
macro_rules! resolve_context {
    // Authenticate any logged-in user
    ($state:expr, $correlation_id:expr) => {
        $crate::shared::context::session_resolver::resolve_request_context(
            $state,
            None,
            $correlation_id,
        )?
    };
    // Authenticate with a minimum role
    ($state:expr, $correlation_id:expr, $required_role:expr) => {
        $crate::shared::context::session_resolver::resolve_request_context(
            $state,
            Some($required_role),
            $correlation_id,
        )?
    };
}
```

#### IPC Handler Usage

```rust
// src-tauri/src/domains/tasks/ipc/task.rs
#[tauri::command]
pub async fn task_crud(
    operation: String,
    payload: Option<serde_json::Value>,
    state: State<'_, AppStateType>,
    correlation_id: Option<String>,
) -> AppResult<serde_json::Value> {
    // FIRST LINE: Resolve context
    let ctx = resolve_context!(&state, &correlation_id);
    
    // Now pass ctx to service, never session_token
    let facade = TasksFacade::new(/* ... */);
    facade.handle_crud(operation, payload, &ctx).await
}

#[tauri::command]
pub async fn delete_user(
    id: String,
    state: State<'_, AppStateType>,
    correlation_id: Option<String>,
) -> AppResult<()> {
    // Role-gated: only Admin can delete users
    let ctx = resolve_context!(&state, &correlation_id, UserRole::Admin);
    
    let service = UserService::new(/* ... */);
    service.delete_user(&id, &ctx).await
}
```

#### Service Usage

```rust
// Application layer receives RequestContext, never token
pub async fn create_task(
    &self,
    request: CreateTaskRequest,
    ctx: &RequestContext,  // ← Context, not token
) -> AppResult<Task> {
    // RBAC check using context
    if !ctx.auth.role.can_create_tasks() {
        return Err(AppError::Authorization("Insufficient permissions".into()));
    }
    
    // Pass correlation_id to repository for logging
    self.repository.save(&task, &ctx.correlation_id).await?;
    
    Ok(task)
}
```

### Session Resolution

```rust
// src-tauri/src/shared/context/session_resolver.rs
pub fn resolve_request_context(
    app: &AppContext,
    required_role: Option<UserRole>,
    correlation_id: &Option<String>,
) -> AppResult<RequestContext> {
    // 1. Validate token from session store
    let session: UserSession = app.session_store.get().map_err(|e| {
        warn!("Session resolution failed: {}", e);
        e
    })?;

    // 2. RBAC gate
    if let Some(ref required) = required_role {
        if !AuthMiddleware::has_permission(&session.role, required) {
            return Err(AppError::Authorization("Insufficient permissions".into()));
        }
    }

    // 3. Initialize correlation context for logging
    let corr_id = init_correlation_context(correlation_id, Some(&session.user_id));
    
    // 4. Build and return context
    Ok(RequestContext::new(
        AuthContext::from_session(&session),
        corr_id,
    ))
}
```

## Consequences

### Positive

- Session tokens never exposed to business logic
- Single place for session validation
- Correlation ID available everywhere via context
- RBAC enforced consistently at boundary
- Easy to add context fields (tenant, locale, etc.)

### Negative

- Every IPC handler must call `resolve_context!`
- Services must accept `RequestContext` parameter
- Slightly more verbose than passing token

## Related Files

- `src-tauri/src/shared/context/request_context.rs` - Context definition
- `src-tauri/src/shared/context/session_resolver.rs` - Resolution logic
- `src-tauri/src/shared/context/auth_context.rs` - Auth context
- `src-tauri/src/shared/ipc/auth_guard.rs` - AuthGuard helper
- `AGENTS.md` - Authentication rules

## When to Read This ADR

- Writing new IPC command handlers
- Adding RBAC requirements
- Implementing audit logging
- Understanding authentication flow
- Adding context fields
- Debugging authorization errors

## References

- AGENTS.md "No raw session token may ever reach a service or repository"
- `resolve_context!` macro documentation
- Session management in auth domain