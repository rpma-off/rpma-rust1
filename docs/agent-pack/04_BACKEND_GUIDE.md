# 04 - Backend Guide

## Key Rust Dependencies

| Crate | Version | Purpose |
|-------|---------|---------|
| `tauri` | 2.1 | Desktop app runtime + IPC |
| `rusqlite` | 0.32 (bundled) | SQLite driver |
| `r2d2` | 0.8 | Connection pool |
| `r2d2_sqlite` | 0.25 | SQLite r2d2 adapter |
| `argon2` | 0.5 | Password hashing |
| `jsonwebtoken` | 9.3 | JWT creation/validation |
| `ts-rs` | 10.1 | Rust → TypeScript type export |
| `uuid` | 1.11 | UUID v4 generation |
| `chrono` | 0.4 | Timestamps |
| `tracing` | 0.1 | Structured logging |
| `tokio` | (via tauri) | Async runtime |

MSRV: **Rust 1.85** (set in workspace `Cargo.toml`)

---

## Backend Structure

The backend is now organized by bounded contexts under `src-tauri/src/domains/`.
Each context follows the same layered shape:

```
src-tauri/src/domains/<context>/
├── mod.rs                   # Single public facade export
├── facade.rs                # Context facade
├── application/             # Orchestration/use-case logic
├── domain/                  # Domain rules/value types/errors
├── infrastructure/          # SQL repositories + infrastructure adapters
├── ipc/                     # Tauri command handlers
└── tests/                   # Unit/integration/validation/permission tests
```

Current backend contexts:
`auth`, `users`, `tasks`, `clients`, `interventions`, `inventory`, `quotes`,
`calendar`, `reports`, `settings`, `sync`, `audit`, `documents`, `analytics`,
`notifications`.

Compatibility layer during migration:
- `src-tauri/src/commands/*` domain files: IPC shim re-exports.
- `src-tauri/src/services/*` domain files: shim re-exports.
- `src-tauri/src/repositories/*` domain files: shim re-exports.

Shared technical infrastructure remains outside domains (by design):
`db/`, `shared/`, transport/websocket/compression utilities, cache/event bus,
and runtime wiring (`service_builder.rs`, `main.rs`).

---

## How to Implement a New IPC Command (End-to-End)

### Example: Add "Archive Task" Feature

#### Step 1: Define Model (if needed)

**Location**: `src-tauri/src/models/task.rs`

```rust
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ArchiveTaskRequest {
    pub task_id: String,
    pub archive_reason: Option<String>,
}
```

#### Step 2: Add Repository Method

**Location**: `src-tauri/src/domains/tasks/infrastructure/task_repository.rs`

```rust
impl TaskRepository {
    pub fn archive_task(&self, task_id: &str) -> RepoResult<Task> {
        let conn = self.db.get_connection()
            .map_err(|e| RepoError::Database(e.to_string()))?;

        conn.execute(
            "UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?",
            params!["archived", chrono::Utc::now().timestamp_millis(), task_id],
        ).map_err(|e| RepoError::Database(e.to_string()))?;

        self.get_by_id(task_id)?.ok_or(RepoError::NotFound(format!("Task {} not found", task_id)))
    }
}
```

#### Step 3: Add Service Method

**Location**: `src-tauri/src/domains/tasks/infrastructure/task.rs`

```rust
impl TaskService {
    pub async fn archive_task(
        &self,
        task_id: &str,
        user_role: &UserRole,
    ) -> Result<Task, AppError> {
        if !matches!(user_role, UserRole::Admin | UserRole::Supervisor) {
            return Err(AppError::Authorization("Only admins and supervisors can archive".into()));
        }

        let task = self.task_repo.get_by_id(task_id)?
            .ok_or(AppError::NotFound("Task not found".into()))?;

        if !matches!(task.status, TaskStatus::Completed | TaskStatus::Cancelled) {
            return Err(AppError::Validation("Only completed/cancelled tasks can be archived".into()));
        }

        self.task_repo.archive_task(task_id)
            .map_err(|e| AppError::Database(e.to_string()))
    }
}
```

#### Step 4: Add Command Handler

**Location**: `src-tauri/src/domains/tasks/ipc/task/facade.rs`

```rust
#[tauri::command]
#[instrument(skip(state))]
pub async fn task_archive(
    session_token: String,
    task_id: String,
    state: State<'_, AppState>,
) -> Result<ApiResponse<Task>, AppError> {
    let session = authenticate!(&session_token, &state);
    
    let task = state.task_service
        .archive_task(&task_id, &session.role)
        .await?;

    Ok(ApiResponse::success(task))
}
```

#### Step 5: Register Command

**Location**: `src-tauri/src/main.rs`

```rust
// In the invoke_handler! macro (lines 71-308)
.invoke_handler(tauri::generate_handler![
    // ... existing commands (212 active commands)
    commands::task::facade::task_archive,  // Add your command here
])
```

#### Step 6: Run Type Sync

```bash
npm run types:sync
```

#### Step 7: Add Frontend IPC Function

**Location**: `frontend/src/lib/ipc/domains/tasks.ts`

```typescript
export async function archiveTask(
  sessionToken: string,
  taskId: string
): Promise<ApiResponse<Task>> {
  return await invoke('task_archive', { sessionToken, taskId });
}
```

---

## Error Model & Handling

### AppError Enum (`src-tauri/src/commands/errors.rs`)

```rust
pub enum AppError {
    Authentication(String),
    Authorization(String),
    Validation(String),
    NotFound(String),
    Database(String),
    Internal(String),
    Network(String),
    RateLimit(String),
    Sync(String),
    InterventionAlreadyActive(String),
    InterventionInvalidState(String),
    TaskInvalidTransition(String),
    TaskDuplicateNumber(String),
    // ...
}
```

### Error Handling Best Practices

```rust
// ✅ Return specific error types
if task.status != TaskStatus::Draft {
    return Err(AppError::Validation(
        format!("Cannot edit task in '{}' status", task.status)
    ));
}

// ✅ Use map_err to convert repository errors
task_repo.get_by_id(task_id)
    .map_err(|e| AppError::Database(format!("Failed to fetch task: {}", e)))?;

// ❌ Don't expose internal details
return Err(AppError::Internal(format!("SQL error: {}", e)));  // BAD
return Err(AppError::Database("Failed to fetch task".into())); // GOOD
```

---

## Authentication Middleware

### authenticate! Macro (`src-tauri/src/commands/auth_middleware.rs:27-66`)

```rust
// Basic authentication - validates session token
let session = authenticate!(&session_token, &state);

// With required role - also checks user has specified role
let session = authenticate!(&session_token, &state, UserRole::Admin);

// Permission checks for specific operations
check_task_permission!(&user.role, "delete");      // Task operations
check_client_permission!(&user.role, "update");    // Client operations
check_user_permission!(&user.role, op, target_id, current_id); // User management
```

**Session Fields** (returned by authenticate!):
- `user_id`, `email`, `username`: User identification
- `role`: UserRole enum (Admin, Supervisor, Technician, Viewer)
- `is_active`: Account status
- `two_factor_verified`: 2FA status
- `token`, `refresh_token`: JWT tokens
- `expires_at`, `last_activity`: Session lifecycle

### AuthMiddleware Methods

| Method | Purpose | Location |
|--------|---------|----------|
| `authenticate()` | Validates session token | Line 27-66 |
| `has_permission()` | Checks role hierarchy | Line 76-95 |
| `can_perform_task_operation()` | Task-specific permissions | Line 107-126 |
| `can_perform_client_operation()` | Client permissions | Line 136-155 |
| `can_perform_user_operation()` | User management permissions | Line 150-177 |

---

## Logging & Tracing

```rust
use tracing::{info, warn, error, instrument};

#[instrument(skip(state), fields(task_id = %params.task_id))]
pub async fn task_archive(...) -> Result<ApiResponse<Task>, AppError> {
    info!("Archiving task");

    if let Err(e) = result {
        error!(error = %e, "Failed to archive task");
        return Err(e);
    }

    info!("Task archived successfully");
    Ok(ApiResponse::success(task))
}
```

---

## Key Services Reference

| Service | Purpose | Location |
|---------|---------|----------|
| `AuthService` | Authentication, password hashing | `domains/auth/infrastructure/auth.rs` |
| `SessionService` | Session lifecycle | `domains/auth/infrastructure/session.rs` |
| `TokenService` | JWT generation (2h access, 7d refresh) | `domains/auth/infrastructure/token.rs` |
| `TwoFactorService` | TOTP 2FA (6-digit, 30s window) | `domains/auth/infrastructure/two_factor.rs` |
| `RateLimiterService` | Request limiting (5 attempts, 15m lockout) | `domains/auth/infrastructure/rate_limiter.rs` |
| `SecurityMonitorService` | Security event monitoring | `domains/audit/infrastructure/security_monitor.rs` |
| `TaskService` | Task CRUD, assignment | `domains/tasks/infrastructure/task.rs` |
| `InterventionService` | Workflow management | `domains/interventions/infrastructure/intervention.rs` |
| `MaterialService` | Inventory management | `domains/inventory/infrastructure/material.rs` |
| `CalendarService` | Scheduling | `domains/calendar/infrastructure/calendar.rs` |
| `CacheService` | In-memory caching | `services/cache.rs` |
| `InMemoryEventBus` | Domain events | `services/event_bus.rs` |
| `SyncQueue` | Offline sync queue | `domains/sync/infrastructure/sync/queue.rs` |

---

## Testing Backend Code

```bash
# All tests
cd src-tauri && cargo test --lib

# Specific test
cd src-tauri && cargo test test_create_task

# Migration tests
cd src-tauri && cargo test migration

# Performance tests
cd src-tauri && cargo test performance
```

---

## Next Steps

- **IPC API reference**: [05_IPC_API_AND_CONTRACTS.md](./05_IPC_API_AND_CONTRACTS.md)
- **Security & RBAC**: [06_SECURITY_AND_RBAC.md](./06_SECURITY_AND_RBAC.md)
- **Database & migrations**: [07_DATABASE_AND_MIGRATIONS.md](./07_DATABASE_AND_MIGRATIONS.md)
