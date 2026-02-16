# Correlation ID Tracing Guide

## Overview

This guide explains how to implement end-to-end correlated error tracing in RPMA v2. A correlation_id links every request from the frontend through IPC calls, Rust commands, services, repositories, and database operations back to the response.

## What is a Correlation ID?

A **correlation_id** is a unique identifier that tracks a single request through the entire system:

- **Frontend format**: `req-{timestamp}-{counter}-{random}` (e.g., `req-1234567890-0001-abc123`)
- **Backend format**: `ipc-{timestamp}-{random}` (e.g., `ipc-1234567890-5678`)

## Architecture Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ Frontend (Next.js/React/TypeScript)                              │
│  └─ safeInvoke() wrapper                                         │
│     - Generates/accepts correlation_id                           │
│     - Injects into IPC call                                      │
│     - Logs request/response with correlation_id                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │ IPC (Tauri)
┌────────────────────────────▼─────────────────────────────────────┐
│ Backend Command Layer (Rust)                                     │
│  └─ init_correlation_context()                                   │
│     - Extracts/generates correlation_id                          │
│     - Sets thread-local correlation context                      │
│     - Updates with user_id after auth                            │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│ Service Layer (Rust)                                             │
│  └─ ServiceLogger                                                │
│     - Reads correlation_id from context                          │
│     - Logs operations with correlation_id                        │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│ Repository Layer (Rust)                                          │
│  └─ RepositoryLogger                                             │
│     - Reads correlation_id from context                          │
│     - Logs DB operations with correlation_id                     │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│ Database (SQLite)                                                │
│  └─ Operations logged with correlation_id                        │
└──────────────────────────────────────────────────────────────────┘
```

## Frontend Implementation

### Using safeInvoke

All IPC calls **MUST** go through `safeInvoke` which automatically handles correlation_id:

```typescript
import { safeInvoke } from '@/lib/ipc/utils';

// Example: Simple call (correlation_id auto-generated)
const result = await safeInvoke<MyResponse>(
  'my_command',
  { 
    session_token: token,
    // correlation_id is automatically added
    param1: value1 
  }
);

// Example: With explicit correlation_id (for correlated requests)
const correlationId = CorrelationContext.generateNew();
const result1 = await safeInvoke<Response1>(
  'command1',
  { session_token: token, correlation_id: correlationId, data: data1 }
);
const result2 = await safeInvoke<Response2>(
  'command2',
  { session_token: token, correlation_id: correlationId, data: data2 }
);
```

### Correlation Context API

```typescript
import { CorrelationContext } from '@/lib/logging/types';

// Generate a new correlation_id
const correlationId = CorrelationContext.generateNew();

// Set current correlation context
CorrelationContext.set({ correlation_id: correlationId, user_id: userId });

// Get current correlation_id
const currentId = CorrelationContext.getCurrentId();

// Clear context (usually not needed - auto-managed)
CorrelationContext.clear();
```

### Logging with Correlation ID

```typescript
import { logger, LogDomain } from '@/lib/logging';

// Logs automatically include correlation_id from context
logger.info(LogDomain.API, 'Operation completed', {
  operation_id: '123',
  duration_ms: 150,
  // correlation_id automatically added from context
});
```

## Backend Implementation

### Command Layer

Every Tauri command should initialize correlation context at the start:

```rust
use crate::commands::{ApiResponse, AppError, AppState};
use crate::commands::{init_correlation_context, update_correlation_context_user};
use tracing::{info, error, instrument};

#[derive(Deserialize)]
pub struct MyRequest {
    pub session_token: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
    pub data: String,
}

#[tauri::command]
#[instrument(skip(state))]
pub async fn my_command(
    request: MyRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<MyResponse>, AppError> {
    // STEP 1: Initialize correlation context at command start
    let correlation_id = init_correlation_context(&request.correlation_id, None);
    
    info!(
        correlation_id = %correlation_id,
        "my_command started"
    );
    
    // STEP 2: Authenticate user
    let user = authenticate!(&request.session_token, &state);
    
    // STEP 3: Update context with user_id after authentication
    update_correlation_context_user(&user.user_id);
    
    // STEP 4: Execute business logic
    let service = state.my_service.clone();
    let result = service.do_something(&request.data)
        .await
        .map_err(|e| {
            error!(
                correlation_id = %correlation_id,
                user_id = %user.user_id,
                error = %e,
                "Operation failed"
            );
            AppError::Internal(e)
        })?;
    
    info!(
        correlation_id = %correlation_id,
        user_id = %user.user_id,
        "my_command completed"
    );
    
    // STEP 5: Return response with correlation_id
    Ok(ApiResponse::success(result).with_correlation_id(Some(correlation_id)))
}
```

### Helper Functions

The `correlation_helpers` module provides utilities:

```rust
use crate::commands::correlation_helpers::*;

// Initialize context with optional correlation_id and user_id
let correlation_id = init_correlation_context(&request.correlation_id, None);

// Update context with user_id after authentication
update_correlation_context_user(&user.user_id);

// Ensure response has correlation_id (rarely needed, with_correlation_id preferred)
let response = ensure_correlation_id(ApiResponse::success(data));

// Return error with correlation_id from context
error_with_correlation::<MyType>(AppError::Internal("Something went wrong".into()))?;
```

### Service Layer

Services should use `ServiceLogger` for consistent correlation tracking:

```rust
use crate::logging::{LogDomain, ServiceLogger};
use std::collections::HashMap;
use serde_json::json;

pub struct MyService {
    // ... fields
}

impl MyService {
    pub async fn do_something(&self, data: &str) -> Result<MyResponse, String> {
        // Create service logger (reads correlation context from thread-local)
        let logger = ServiceLogger::new(LogDomain::Task);
        
        logger.info("Operation started", Some({
            let mut context = HashMap::new();
            context.insert("data_length".to_string(), json!(data.len()));
            context
        }));
        
        // ... business logic ...
        
        match result {
            Ok(value) => {
                logger.info("Operation completed", Some({
                    let mut context = HashMap::new();
                    context.insert("result_id".to_string(), json!(value.id));
                    context
                }));
                Ok(value)
            }
            Err(e) => {
                logger.error("Operation failed", Some(&e), Some({
                    let mut context = HashMap::new();
                    context.insert("error_type".to_string(), json!("database"));
                    context
                }));
                Err(e.to_string())
            }
        }
    }
}
```

### Repository Layer

Repositories should use `RepositoryLogger` for database operation tracking:

```rust
use crate::logging::RepositoryLogger;
use crate::repositories::base::{RepoError, RepoResult};
use std::collections::HashMap;
use serde_json::json;

pub struct MyRepository {
    // ... fields
}

impl MyRepository {
    pub async fn save(&self, entity: &MyEntity) -> RepoResult<()> {
        // Create repository logger (reads correlation context from thread-local)
        let logger = RepositoryLogger::new();
        
        logger.debug("Saving entity", Some({
            let mut context = HashMap::new();
            context.insert("entity_id".to_string(), json!(entity.id));
            context.insert("entity_type".to_string(), json!("MyEntity"));
            context
        }));
        
        let result = self.db.execute(|conn| {
            // ... database operations ...
            Ok(())
        }).await;
        
        match &result {
            Ok(_) => {
                logger.info("Entity saved successfully", Some({
                    let mut context = HashMap::new();
                    context.insert("entity_id".to_string(), json!(entity.id));
                    context
                }));
            }
            Err(e) => {
                logger.error("Failed to save entity", Some(e), Some({
                    let mut context = HashMap::new();
                    context.insert("entity_id".to_string(), json!(entity.id));
                    context.insert("error".to_string(), json!(e.to_string()));
                    context
                }));
            }
        }
        
        result
    }
}
```

## Logging Best Practices

### DO ✅

1. **Always include correlation_id in command logs**:
   ```rust
   info!(correlation_id = %correlation_id, "Operation started");
   ```

2. **Update context with user_id after authentication**:
   ```rust
   update_correlation_context_user(&user.user_id);
   ```

3. **Use structured logging fields**:
   ```rust
   info!(
       correlation_id = %correlation_id,
       user_id = %user.user_id,
       task_id = %task.id,
       "Task created"
   );
   ```

4. **Log errors with full context**:
   ```rust
   error!(
       correlation_id = %correlation_id,
       user_id = %user.user_id,
       error = %e,
       "Operation failed"
   );
   ```

5. **Return correlation_id in all responses**:
   ```rust
   Ok(ApiResponse::success(data).with_correlation_id(Some(correlation_id)))
   ```

### DON'T ❌

1. **Never log sensitive data**:
   ```rust
   // ❌ BAD
   info!("User logged in with password: {}", password);
   
   // ✅ GOOD
   info!(
       correlation_id = %correlation_id,
       user_id = %user.user_id,
       "User logged in successfully"
   );
   ```

2. **Don't forget to initialize context**:
   ```rust
   // ❌ BAD - missing context initialization
   #[tauri::command]
   pub async fn my_command(request: MyRequest) -> Result<ApiResponse<T>, AppError> {
       let user = authenticate!(&request.session_token, &state);
       // ... rest of code
   }
   
   // ✅ GOOD
   #[tauri::command]
   pub async fn my_command(request: MyRequest) -> Result<ApiResponse<T>, AppError> {
       let correlation_id = init_correlation_context(&request.correlation_id, None);
       let user = authenticate!(&request.session_token, &state);
       update_correlation_context_user(&user.user_id);
       // ... rest of code
   }
   ```

3. **Don't pass correlation_id manually everywhere** (use thread-local context):
   ```rust
   // ❌ BAD - passing correlation_id as parameter everywhere
   fn service_method(&self, data: &str, correlation_id: &str) { ... }
   
   // ✅ GOOD - use ServiceLogger which reads from context
   fn service_method(&self, data: &str) {
       let logger = ServiceLogger::new(LogDomain::Task);
       logger.info("Operation started", None);
       // correlation_id is automatically included
   }
   ```

## Tracing Requests

### Finding All Logs for a Request

Once correlation_id is properly implemented, you can trace a complete request flow:

1. **Get correlation_id from error message or frontend logs**
2. **Search backend logs**:
   ```bash
   grep "req-1234567890-0001-abc123" logs/rpma.log
   ```

3. **Expected log flow**:
   ```
   [INFO] correlation_id=req-1234567890-0001-abc123 IPC call started: my_command
   [INFO] correlation_id=req-1234567890-0001-abc123 my_command started
   [DEBUG] correlation_id=req-1234567890-0001-abc123 Authentication successful
   [INFO] correlation_id=req-1234567890-0001-abc123 user_id=user-456 Operation started
   [DEBUG] correlation_id=req-1234567890-0001-abc123 user_id=user-456 Saving entity
   [INFO] correlation_id=req-1234567890-0001-abc123 user_id=user-456 Entity saved
   [INFO] correlation_id=req-1234567890-0001-abc123 user_id=user-456 my_command completed
   [INFO] correlation_id=req-1234567890-0001-abc123 IPC call completed
   ```

### Troubleshooting with Correlation IDs

When debugging issues:

1. **Frontend**: Check browser console for correlation_id in error messages
2. **Backend**: Search logs using the correlation_id
3. **Database**: Check if operation was attempted and what happened
4. **Timing**: Compare timestamps across layers to identify bottlenecks

## Testing Correlation Tracing

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::logging::correlation;

    #[test]
    fn test_correlation_context() {
        let test_id = "test-correlation-id";
        let correlation_id = init_correlation_context(&Some(test_id.to_string()), None);
        
        assert_eq!(correlation_id, test_id);
        
        let context = correlation::get_correlation_context().unwrap();
        assert_eq!(context.get_correlation_id(), test_id);
        
        // Clean up
        correlation::clear_correlation_context();
    }
}
```

### Integration Tests

```typescript
import { safeInvoke } from '@/lib/ipc/utils';
import { CorrelationContext } from '@/lib/logging/types';

describe('Correlation Tracing', () => {
  it('should propagate correlation_id through request', async () => {
    const correlationId = CorrelationContext.generateNew();
    
    const response = await safeInvoke('my_command', {
      session_token: 'test-token',
      correlation_id: correlationId,
      data: 'test',
    });
    
    // Response should include the same correlation_id
    expect(response.correlation_id).toBe(correlationId);
  });
});
```

## Migration Checklist

For commands that don't yet use correlation tracing:

- [ ] Add `correlation_id: Option<String>` to request struct
- [ ] Call `init_correlation_context()` at command start
- [ ] Call `update_correlation_context_user()` after authentication
- [ ] Include `correlation_id = %correlation_id` in all log statements
- [ ] Return response with `.with_correlation_id(Some(correlation_id))`
- [ ] Update services to use `ServiceLogger`
- [ ] Update repositories to use `RepositoryLogger`
- [ ] Test end-to-end flow
- [ ] Verify logs show complete trace

## Additional Resources

- **Correlation Context Module**: `src-tauri/src/logging/correlation.rs`
- **Helper Functions**: `src-tauri/src/commands/correlation_helpers.rs`
- **Frontend Utilities**: `frontend/src/lib/ipc/utils.ts`
- **Logging Types**: `frontend/src/lib/logging/types.ts`
- **Example Commands**: 
  - `src-tauri/src/commands/auth.rs`
  - `src-tauri/src/commands/client.rs`
