# 04 - Backend Guide

## Backend Structure

The Rust/Tauri backend is organized into distinct layers following clean architecture principles.

```
src-tauri/src/
├── commands/                # IPC command handlers (Layer 1)
│   ├── mod.rs               # Exports ApiResponse, AppState
│   ├── errors.rs            # AppError enum
│   ├── auth_middleware.rs   # authenticate! macro, permission checks
│   ├── auth.rs              # Authentication commands
│   ├── client.rs            # Client CRUD (client_crud)
│   ├── material.rs          # Material/inventory commands
│   ├── calendar.rs          # Calendar/scheduling
│   ├── user.rs              # User management
│   ├── analytics.rs         # Analytics
│   ├── notification.rs      # Notifications
│   ├── performance.rs       # Performance metrics
│   ├── system.rs            # System info, health checks
│   ├── task/                # Task commands submodule
│   │   ├── mod.rs
│   │   ├── facade.rs        # task_crud, edit_task, delay_task, etc.
│   │   ├── queries.rs       # get_tasks_with_clients, statistics
│   │   ├── validation.rs    # check_task_availability, assignment
│   │   └── statistics.rs
│   ├── intervention/        # Intervention workflow submodule
│   │   ├── mod.rs
│   │   ├── workflow.rs      # intervention_start, advance_step, finalize
│   │   ├── queries.rs       # get, get_active_by_task, progress
│   │   └── data_access.rs   # update, get_step
│   ├── reports/             # Reports submodule
│   │   ├── mod.rs           # export_report_data, save_intervention_report
│   │   ├── core.rs
│   │   ├── search.rs
│   │   ├── generation/
│   │   └── export/
│   └── settings/            # Settings submodule
│       ├── mod.rs
│       ├── core.rs
│       ├── profile.rs
│       ├── preferences.rs
│       └── security.rs
├── services/                # Business logic (Layer 2) - ~80 files
│   ├── mod.rs
│   ├── auth.rs              # AuthService: login, password hashing (Argon2)
│   ├── session.rs           # SessionService: lifecycle management
│   ├── token.rs             # TokenService: JWT generation/validation
│   ├── two_factor.rs        # TwoFactorService: TOTP setup/verification
│   ├── rate_limiter.rs      # RateLimiterService: request limiting
│   ├── security_monitor.rs  # SecurityMonitorService: event monitoring
│   ├── user.rs              # UserService
│   ├── client.rs            # ClientService
│   ├── client_validation.rs
│   ├── client_statistics.rs
│   ├── task.rs              # TaskService
│   ├── task_creation.rs     # TaskCreationService
│   ├── task_update.rs
│   ├── task_deletion.rs
│   ├── task_validation.rs
│   ├── task_queries.rs
│   ├── task_statistics.rs
│   ├── intervention.rs      # InterventionService
│   ├── intervention_workflow.rs
│   ├── intervention_validation.rs
│   ├── material.rs          # MaterialService
│   ├── calendar.rs          # CalendarService
│   ├── calendar_event_service.rs
│   ├── dashboard.rs         # DashboardService
│   ├── analytics.rs         # AnalyticsService
│   ├── cache.rs             # CacheService
│   ├── event_bus.rs         # InMemoryEventBus
│   ├── event_system.rs      # Domain event definitions
│   ├── domain_event.rs      # EventEnvelope, EventMetadata
│   ├── audit_service.rs     # AuditService
│   ├── validation.rs        # ValidationService
│   ├── photo/               # Photo services
│   ├── reports/             # Report generation
│   └── ...
├── repositories/            # Data access (Layer 3) - ~18 files
│   ├── mod.rs
│   ├── base.rs              # Repository trait, RepoError, RepoResult
│   ├── factory.rs           # Repositories container
│   ├── cache.rs             # In-memory cache
│   ├── user_repository.rs
│   ├── client_repository.rs
│   ├── task_repository.rs
│   ├── task_history_repository.rs
│   ├── task_repository_streaming.rs
│   ├── intervention_repository.rs
│   ├── material_repository.rs
│   ├── photo_repository.rs
│   ├── session_repository.rs
│   ├── calendar_event_repository.rs
│   ├── audit_repository.rs
│   └── ...
├── models/                  # Data models with ts-rs exports
│   ├── mod.rs
│   ├── task.rs              # Task, TaskStatus, TaskPriority, CreateTaskRequest
│   ├── client.rs            # Client, CustomerType, ClientQuery
│   ├── intervention.rs      # Intervention, InterventionStatus
│   ├── step.rs              # InterventionStep, StepStatus
│   ├── auth.rs              # UserSession, UserRole, UserAccount, DeviceInfo
│   ├── user.rs              # UserRole
│   ├── material.rs          # Material, MaterialType, InventoryTransaction
│   ├── photo.rs             # Photo
│   ├── calendar.rs          # CalendarEvent
│   ├── calendar_event.rs
│   ├── settings.rs          # Settings types
│   ├── sync.rs              # SyncOperation, SyncStatus
│   └── ...
├── db/                      # Database management
│   ├── mod.rs               # Database, AsyncDatabase wrappers
│   ├── connection.rs        # PoolConfig, QueryPerformanceMonitor
│   ├── migrations.rs        # Migration runner (versions 1-33+)
│   ├── schema.sql           # Base schema
│   └── utils.rs
├── sync/                    # Sync queue
│   ├── queue.rs             # SyncQueue service
│   └── background.rs        # BackgroundSyncService
├── logging/                 # Structured logging
├── lib.rs                   # Module exports
└── bin/
    └── export-types.rs      # Type export binary for ts-rs
```

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

**Location**: `src-tauri/src/repositories/task_repository.rs`

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

**Location**: `src-tauri/src/services/task.rs`

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

**Location**: `src-tauri/src/commands/task/facade.rs`

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
// In the invoke_handler! macro (lines 69-250)
.invoke_handler(tauri::generate_handler![
    // ... existing commands (~260+ commands)
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
| `AuthService` | Authentication, password hashing | `services/auth.rs` |
| `SessionService` | Session lifecycle | `services/session.rs` |
| `TokenService` | JWT generation (2h access, 7d refresh) | `services/token.rs` |
| `TwoFactorService` | TOTP 2FA (6-digit, 30s window) | `services/two_factor.rs` |
| `RateLimiterService` | Request limiting (5 attempts, 15m lockout) | `services/rate_limiter.rs` |
| `SecurityMonitorService` | Security event monitoring | `services/security_monitor.rs` |
| `TaskService` | Task CRUD, assignment | `services/task.rs` |
| `InterventionService` | Workflow management | `services/intervention.rs` |
| `MaterialService` | Inventory management | `services/material.rs` |
| `CalendarService` | Scheduling | `services/calendar.rs` |
| `CacheService` | In-memory caching | `services/cache.rs` |
| `InMemoryEventBus` | Domain events | `services/event_bus.rs` |
| `SyncQueue` | Offline sync queue | `sync/queue.rs` |

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
