# ADR-020: Correlation IDs for Distributed Tracing

## Status

Accepted

## Date

2026-03-13

## Summary

Every IPC command receives an optional correlation ID that propagates through the entire call stack via thread-local storage, enabling distributed tracing across services.

## Context

- Need to trace requests across multiple services
- Debugging requires following a request from IPC to database
- Logs from the same request must be correlatable
- Thread-local storage avoids passing correlation ID through every function
- Frontend can provide request IDs for end-to-end tracing

## Decision

### Correlation ID Flow

```
Frontend (optional correlation_id)
         ↓
    IPC Handler
         ↓
set_correlation_context!(correlation_id, user_id)
         ↓
Thread-local CORRELATION_CONTEXT
         ↓
    Application Service
         ↓
    Domain Service
         ↓
    Repository (logs include correlation_id)
         ↓
    Database
```

### Thread-Local Context

```rust
// src-tauri/src/shared/logging/correlation.rs
use std::cell::RefCell;

thread_local! {
    static CORRELATION_CONTEXT: RefCell<Option<CorrelationContext>> = RefCell::new(None);
}

#[derive(Debug, Clone)]
pub struct CorrelationContext {
    pub correlation_id: String,
    pub user_id: Option<String>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

pub fn set_correlation_context(ctx: CorrelationContext) {
    CORRELATION_CONTEXT.with(|cell| {
        *cell.borrow_mut() = Some(ctx);
    });
}

pub fn get_correlation_context() -> Option<CorrelationContext> {
    CORRELATION_CONTEXT.with(|cell| cell.borrow().clone())
}

pub fn clear_correlation_context() {
    CORRELATION_CONTEXT.with(|cell| {
        *cell.borrow_mut() = None;
    });
}

pub fn generate_correlation_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

pub fn init_correlation_context(
    correlation_id: &Option<String>,
    user_id: Option<&String>,
) -> String {
    let id = correlation_id.clone().unwrap_or_else(generate_correlation_id);
    let ctx = CorrelationContext {
        correlation_id: id.clone(),
        user_id: user_id.map(String::from),
        timestamp: chrono::Utc::now(),
    };
    set_correlation_context(ctx);
    id
}

pub fn update_correlation_context_user(user_id: &str) {
    CORRELATION_CONTEXT.with(|cell| {
        if let Some(ref mut ctx) = *cell.borrow_mut() {
            ctx.user_id = Some(user_id.to_string());
        }
    });
}
```

### Macro for Setting Context

```rust
// src-tauri/src/shared/auth_middleware.rs
#[macro_export]
macro_rules! set_correlation_context {
    ($correlation_id:expr) => {{
        let correlation_id = $correlation_id
            .as_ref()
            .map(|s| s.to_string())
            .unwrap_or_else(|| $crate::shared::logging::correlation::generate_correlation_id());
        let context = $crate::shared::logging::correlation::CorrelationContext::new(
            correlation_id.clone(),
            None,
        );
        $crate::shared::logging::correlation::set_correlation_context(context);
        correlation_id
    }};
    ($correlation_id:expr, $user_id:expr) => {{
        let correlation_id = $correlation_id
            .as_ref()
            .map(|s| s.to_string())
            .unwrap_or_else(|| $crate::shared::logging::correlation::generate_correlation_id());
        let context = $crate::shared::logging::correlation::CorrelationContext::new(
            correlation_id.clone(),
            Some($user_id.to_string()),
        );
        $crate::shared::logging::correlation::set_correlation_context(context);
        correlation_id
    }};
}
```

### Usage in IPC Handlers

```rust
// src-tauri/src/shared/context/session_resolver.rs
pub fn resolve_request_context(
    app: &AppContext,
    required_role: Option<UserRole>,
    correlation_id: &Option<String>,
) -> AppResult<RequestContext> {
    // 1. Validate token
    let session: UserSession = app.session_store.get()?;

    // 2. RBAC gate
    if let Some(ref required) = required_role {
        if !AuthMiddleware::has_permission(&session.role, required) {
            return Err(AppError::Authorization("Insufficient permissions".into()));
        }
    }

    // 3. Initialize correlation context (sets thread-local)
    let corr_id = init_correlation_context(correlation_id, Some(&session.user_id));

    tracing::debug!(
        user_id = %session.user_id,
        correlation_id = %corr_id,
        "Request context resolved"
    );

    // 4. Build context
    Ok(RequestContext::new(
        AuthContext::from_session(&session),
        corr_id,
    ))
}
```

### Logging with Correlation

```rust
// src-tauri/src/shared/logging/mod.rs
use tracing_subscriber::fmt::format::FmtContext;
use tracing_subscriber::fmt::FormatFields;

pub fn format_with_correlation(
    ctx: &FmtContext<'_, impl FormatFields<'_>>,
    writer: &mut impl std::io::Write,
) -> std::fmt::Result {
    let correlation = get_correlation_context();
    
    write!(
        writer,
        "[{}] ",
        correlation
            .map(|c| c.correlation_id)
            .unwrap_or_else(|| "no-correlation".to_string())
    )?;
    
    ctx.format_fields(writer)
}

// In tracing setup:
tracing_subscriber::registry()
    .with(fmt::layer().with_writer(std::io::stdout))
    .init();
```

### Repository Logging

```rust
// src-tauri/src/domains/tasks/infrastructure/task_repository.rs
impl TaskRepository for SqliteTaskRepository {
    fn save(&self, task: &Task) -> Result<(), RepositoryError> {
        let correlation_id = get_correlation_context()
            .map(|c| c.correlation_id)
            .unwrap_or_default();
        
        tracing::debug!(
            correlation_id = %correlation_id,
            task_id = %task.id,
            "Saving task to database"
        );
        
        let conn = self.db.get_connection()?;
        conn.execute(
            "INSERT INTO tasks (id, title, ...) VALUES (?, ?, ...)",
            params![task.id, task.title, ...]
        )?;
        
        tracing::debug!(
            correlation_id = %correlation_id,
            task_id = %task.id,
            "Task saved successfully"
        );
        
        Ok(())
    }
}
```

### RequestContext Carries Correlation

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
}
```

### Frontend Providing Correlation ID

```typescript
// frontend/src/lib/ipc.ts
let correlationCounter = 0;

function generateCorrelationId(): string {
  return `web-${Date.now()}-${++correlationCounter}`;
}

export async function invoke<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  const correlationId = generateCorrelationId();
  
  console.log(`[${correlationId}] Invoking ${command}`);
  
  try {
    const result = await tauriInvoke<T>(command, {
      ...args,
      correlation_id: correlationId,
    });
    
    console.log(`[${correlationId}] ${command} completed`);
    return result;
  } catch (error) {
    console.error(`[${correlationId}] ${command} failed:`, error);
    throw error;
  }
}
```

### Log Output Example

```
2024-01-15T10:30:45.123Z [web-1705315845123-1] INFO Request context resolved user_id="user-123"
2024-01-15T10:30:45.125Z [web-1705315845123-1] DEBUG Saving task to database task_id="task-456"
2024-01-15T10:30:45.130Z [web-1705315845123-1] DEBUG Task saved successfully task_id="task-456"
2024-01-15T10:30:45.132Z [web-1705315845123-1] INFO Request completed user_id="user-123" duration=9ms
```

### Clearing Context

```rust
// After request completes, clear thread-local context
pub fn clear_request_context() {
    clear_correlation_context();
}

// In Tauri, this happens automatically when the thread returns
// For async code, context may persist across await points if on same thread
```

## Consequences

### Positive

- All logs from same request are correlatable
- No need to pass correlation ID through every function
- Works with existing tracing infrastructure
- Frontend can provide IDs for end-to-end tracing
- Easy to grep logs by correlation ID

### Negative

- Thread-local storage doesn't work across async boundaries without care
- Context must be set at IPC boundary
- Context persists if not cleared (Tauri handles this)
- Adds overhead to every log line

## Async Considerations

```rust
// Note: Thread-local context may not survive async boundaries
// In Tauri with tokio::spawn, each task may run on different threads

// If you need correlation across async tasks:
pub async fn background_operation(correlation_id: String) {
    // Re-set context in new async context
    set_correlation_context(CorrelationContext::new(correlation_id, None));
    
    // Now logs will have correlation_id
    
    clear_correlation_context();
}
```

## Related Files

- `src-tauri/src/shared/logging/correlation.rs` — Thread-local context
- `src-tauri/src/shared/context/request_context.rs` — RequestContext
- `src-tauri/src/shared/context/session_resolver.rs` — Context initialization
- `src-tauri/src/shared/auth_middleware.rs` — Macros
- `frontend/src/lib/ipc.ts` — Frontend correlation ID

## When to Read This ADR

- Adding logging to services
- Debugging request flows
- Setting up tracing infrastructure
- Understanding how requests are tracked
- Implementing audit logs

## References

- tracing crate documentation
- Thread-local storage patterns
- Distributed tracing concepts