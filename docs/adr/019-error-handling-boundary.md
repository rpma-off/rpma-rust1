# ADR-019: Error Handling at Boundary with thiserror and anyhow

## Status

Accepted

## Date

2026-03-13

## Summary

Domain and infrastructure layers use typed errors with `thiserror`. The IPC boundary converts to `AppError` using `anyhow` for flexible error messages. Services never panic.

## Context

- Need structured error types for domain logic
- IPC requires serializable error messages for frontend
- Business errors (NotFound, Validation) need different handling than system errors
- Error messages should not expose internal implementation details
- Rust's `?` operator requires compatible error types

## Decision

### Error Type Hierarchy

```
Domain/Infrastructure Layer: thiserror (typed errors)
         ↓
Application Service: Convert domain errors to AppError
         ↓
IPC Boundary: AppError (serializable for frontend)
         ↓
Frontend: Parsed error response
```

### Domain Error Types

```rust
// src-tauri/src/domains/tasks/domain/errors.rs
use thiserror::Error;

#[derive(Debug, Error)]
pub enum TaskError {
    #[error("Task not found: {0}")]
    NotFound(String),
    
    #[error("Invalid task status transition: from {from} to {to}")]
    InvalidStatusTransition { from: String, to: String },
    
    #[error("Task validation failed: {0}")]
    Validation(String),
    
    #[error("Task already assigned: {0}")]
    AlreadyAssigned(String),
    
    #[error("Task cannot be deleted: {0}")]
    CannotDelete(String),
    
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
}
```

### AppError at Boundary

```rust
// src-tauri/src/shared/ipc/errors.rs
use thiserror::Error;

#[derive(Debug, Error)]
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

// Type alias for convenience
pub type AppResult<T> = Result<T, AppError>;
```

### Error Conversion

```rust
// src-tauri/src/domains/tasks/infrastructure/task.rs
impl TaskService {
    pub async fn get(&self, id: &str) -> AppResult<Task> {
        self.repository
            .find_by_id(id)
            .map_err(|e| match e {
                RepositoryError::NotFound => AppError::NotFound(format!("Task not found: {}", id)),
                RepositoryError::Database(msg) => AppError::Internal(msg),
            })?
            .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", id)))
    }
}

// Application layer converts domain errors
impl From<TaskError> for AppError {
    fn from(err: TaskError) -> Self {
        match err {
            TaskError::NotFound(id) => AppError::NotFound(id),
            TaskError::InvalidStatusTransition { from, to } => 
                AppError::Validation(format!("Cannot transition from {} to {}", from, to)),
            TaskError::Validation(msg) => AppError::Validation(msg),
            TaskError::AlreadyAssigned(id) => 
                AppError::Conflict(format!("Task {} is already assigned", id)),
            TaskError::CannotDelete(msg) => AppError::Conflict(msg),
            TaskError::Database(e) => AppError::Internal(e.to_string()),
        }
    }
}
```

### Never Panic

```rust
// ✅ CORRECT: Return Result
pub async fn create(&self, request: CreateTaskRequest, ctx: &RequestContext) -> AppResult<Task> {
    let task = self.task_factory.create(request)?;
    self.repository.save(&task).await?;
    Ok(task)
}

// ❌ WRONG: panic! or unwrap in production
pub async fn create(&self, request: CreateTaskRequest, ctx: &RequestContext) -> AppResult<Task> {
    let task = self.task_factory.create(request).unwrap(); // WRONG!
    self.repository.save(&task).await.expect("save failed"); // WRONG!
    Ok(task)
}

// ✅ CORRECT: Use ? with error conversion
pub async fn create(&self, request: CreateTaskRequest, ctx: &RequestContext) -> AppResult<Task> {
    let task = self.task_factory.create(request)?; // Propagates error
    self.repository.save(&task).await.map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(task)
}
```

### Testing: panic is OK

```rust
// Unwrap in tests is acceptable
#[cfg(test)]
mod tests {
    #[test]
    fn test_task_creation() {
        let task = create_task(/* ... */).unwrap(); // OK in tests
        assert_eq!(task.status, TaskStatus::Pending);
    }
    
    #[test]
    fn test_task_not_found() {
        let result = get_task("nonexistent".into());
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::NotFound(msg) => assert!(msg.contains("nonexistent")),
            _ => panic!("Expected NotFound error"),
        }
    }
}
```

### Frontend Error Handling

```rust
// Error response is serialized for IPC
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut map = serializer.serialize_map(Some(2))?;
        map.serialize_entry("type", self.error_type())?;
        map.serialize_entry("message", &self.to_string())?;
        map.end()
    }
}
```

```typescript
// frontend/src/lib/utils/errorHandling.ts
interface AppError {
  type: 'auth' | 'forbidden' | 'validation' | 'not_found' | 'conflict' | 'internal';
  message: string;
}

export function parseIpcError(error: unknown): AppError {
  if (error instanceof Error) {
    const message = error.message;
    
    if (message.startsWith('Authentication:')) {
      return { type: 'auth', message: 'Please log in again.' };
    }
    if (message.startsWith('Authorization:')) {
      return { type: 'forbidden', message: 'You do not have permission.' };
    }
    if (message.startsWith('Validation:')) {
      return { type: 'validation', message: message.replace('Validation: ', '') };
    }
    if (message.startsWith('NotFound:')) {
      return { type: 'not_found', message: message.replace('NotFound: ', '') };
    }
    if (message.startsWith('Conflict:')) {
      return { type: 'conflict', message: message.replace('Conflict: ', '') };
    }
    
    return { type: 'internal', message: 'An unexpected error occurred.' };
  }
  
  return { type: 'internal', message: 'An unexpected error occurred.' };
}
```

### Context in Errors

```rust
// Using anyhow for context in application layer
use anyhow::{Context, Result};

pub async fn finalize_intervention(&self, id: &str, ctx: &RequestContext) -> AppResult<Intervention> {
    let intervention = self.repository.find_by_id(id)
        .await
        .context(format!("Failed to find intervention {}", id))?
        .ok_or_else(|| AppError::NotFound(format!("Intervention not found: {}", id)))?;
    
    // Context adds debugging info to internal errors
    self.do_finalize(intervention, ctx)
        .await
        .context("Failed to finalize intervention")
        .map_err(|e| AppError::Internal(e.to_string()))?;
    
    Ok(intervention)
}
```

### Error Logging

```rust
// Log internal errors, convert to safe messages for frontend
pub async fn create(&self, request: CreateTaskRequest, ctx: &RequestContext) -> AppResult<Task> {
    let result = self.do_create(request, ctx).await;
    
    if let Err(ref e) = result {
        match e {
            AppError::Internal(msg) => {
                tracing::error!(
                    error = %msg,
                    user_id = %ctx.user_id(),
                    correlation_id = %ctx.correlation_id,
                    "Internal error creating task"
                );
            }
            _ => {
                tracing::warn!(
                    error = %e,
                    user_id = %ctx.user_id(),
                    "Client error creating task"
                );
            }
        }
    }
    
    result
}
```

## Error Categories

| Error Type | HTTP Equivalent | Example |
|-----------|-----------------|---------|
| Authentication | 401 | Invalid session token |
| Authorization | 403 | Insufficient permissions |
| Validation | 400 | Invalid email format |
| NotFound | 404 | User not found |
| Conflict | 409 | Email already exists |
| Internal | 500 | Database connection failed |

## Consequences

### Positive

- Typed errors are self-documenting
- clear error flow from domain to IPC
- Safe error messages for frontend
- No panics in production code
- Easy to add new error types

### Negative

- Error conversion boilerplate at boundaries
- anyhow adds runtime overhead for context
- Error type proliferation in large codebases

## Related Files

- `src-tauri/src/shared/ipc/errors.rs` — AppError types
- `src-tauri/src/domains/*/domain/errors.rs` — Domain error types
- `src-tauri/src/shared/ipc/response.rs` — Response types
- `frontend/src/lib/utils/errorHandling.ts` — Frontend error parsing

## When to Read This ADR

- Creating new error types
- Handling errors in services
- Converting errors at boundaries
- Adding error context
- Debugging IPC error messages

## References

- AGENTS.md "Never use unwrap()/expect()/panic! in production"
- thiserror crate documentation
- anyhow crate documentation