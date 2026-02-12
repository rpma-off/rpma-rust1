# 04 - Backend Guide

## Backend Structure

The Rust/Tauri backend is organized into distinct layers following clean architecture principles.

```
src-tauri/src/
├── commands/                # IPC command handlers (Layer 1: Entry points)
│   ├── mod.rs               # Re-exports all commands
│   ├── auth.rs              # Authentication commands
│   ├── task/                # Task commands (folder for complex domain)
│   │   ├── create.rs
│   │   ├── update.rs
│   │   └── list.rs
│   ├── client.rs            # Client CRUD commands
│   ├── intervention/        # Intervention workflow commands
│   ├── material.rs          # Material/inventory commands
│   ├── calendar.rs          # Calendar/scheduling commands
│   └── ...
├── services/                # Business logic layer (Layer 2)
│   ├── mod.rs
│   ├── task.rs              # Core task service
│   ├── task_validation.rs   # Task validation logic
│   ├── task_creation.rs     # Task creation workflow
│   ├── intervention.rs
│   ├── intervention_workflow.rs
│   ├── auth.rs              # Authentication service
│   ├── session.rs           # Session management
│   ├── material.rs
│   └── ...
├── repositories/            # Data access layer (Layer 3)
│   ├── mod.rs
│   ├── base.rs              # Repository trait
│   ├── task_repository.rs
│   ├── client_repository.rs
│   ├── intervention_repository.rs
│   ├── user_repository.rs
│   └── ...
├── models/                  # Data models (DTOs, entities)
│   ├── mod.rs
│   ├── task.rs              # Task + related types
│   ├── client.rs
│   ├── intervention.rs
│   ├── auth.rs              # User, Session, UserRole
│   ├── material.rs
│   └── ...
├── db/                      # Database management
│   ├── mod.rs               # Database wrapper
│   ├── connection.rs        # Connection pooling
│   ├── migrations.rs        # Migration runner
│   └── ...
├── sync/                    # Sync queue & background worker
├── logging/                 # Structured logging
├── lib.rs                   # Library entry (for export-types binary)
└── main.rs                  # Application entry point
```

---

##  How to Implement a New IPC Command (End-to-End)

### Example: Add "Archive Task" Feature

We want to add a new IPC command: `task_archive(task_id: String) -> ApiResponse<Task>`

---

#### Step 1: Define Model / Request Types (if needed)

**Location**: `src-tauri/src/models/task.rs`

```rust
// If we need a custom request type:
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ArchiveTaskRequest {
    pub task_id: String,
    pub archive_reason: Option<String>,
}
```

**Note**: For simple operations, we often reuse existing types. Here, we can just pass `task_id` directly.

---

#### Step 2: Add Repository Method

**Location**: `src-tauri/src/repositories/task_repository.rs`

```rust
use crate::db::{Database, RepoResult};
use crate::models::task::Task;

impl TaskRepository {
    /// Archive a task by ID
    pub fn archive_task(&self, task_id: &str) -> RepoResult<Task> {
        let conn = self.db.get_connection()
            .map_err(|e| RepoError::ConnectionError(e.to_string()))?;

        // Update task status to 'archived'
        let updated_count = conn.execute(
            "UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?",
            params!["archived", chrono::Utc::now().timestamp_millis(), task_id],
        ).map_err(|e| RepoError::QueryError(format!("Failed to archive task: {}", e)))?;

        if updated_count == 0 {
            return Err(RepoError::NotFound(format!("Task {} not found", task_id)));
        }

        // Fetch and return updated task
        self.get_by_id(task_id)
    }
}
```

---

#### Step 3: Add Service Method (Business Logic)

**Location**: `src-tauri/src/services/task.rs`

```rust
use crate::repositories::TaskRepository;
use crate::commands::AppError;
use crate::models::Task;

pub struct TaskService {
    task_repo: Arc<TaskRepository>,
}

impl TaskService {
    /// Archive a task
    /// 
    /// Business rules:
    /// - Task must be in 'completed' or 'cancelled' status
    /// - User must have Admin or Supervisor role
    pub async fn archive_task(
        &self,
        task_id: &str,
        user_id: &str,
        user_role: &UserRole,
    ) -> Result<Task, AppError> {
        // 1. Authorization check
        if !matches!(user_role, UserRole::Admin | UserRole::Supervisor) {
            return Err(AppError::Authorization(
                "Only admins and supervisors can archive tasks".into()
            ));
        }

        // 2. Load task to validate status
        let task = self.task_repo.get_by_id(task_id)
            .map_err(|e| AppError::Database(format!("Failed to load task: {}", e)))?
            .ok_or_else(|| AppError::NotFound(format!("Task {} not found", task_id)))?;

        // 3. Validate business rule
        if !matches!(task.status, TaskStatus::Completed | TaskStatus::Cancelled) {
            return Err(AppError::Validation(
                "Only completed or cancelled tasks can be archived".into()
            ));
        }

        // 4. Archive the task
        let archived_task = self.task_repo.archive_task(task_id)
            .map_err(|e| AppError::Database(format!("Failed to archive task: {}", e)))?;

        // 5. Optional: Publish domain event
        // self.event_bus.publish(TaskArchived { task_id: task_id.to_string() });

        Ok(archived_task)
    }
}
```

---

#### Step 4: Add Command Handler

**Location**: `src-tauri/src/commands/task/archive.rs`

```rust
use crate::commands::{AppError, ApiResponse, AppState};
use crate::models::Task;
use serde::{Deserialize, Serialize};
use tauri::State;
use tracing::instrument;

#[derive(Debug, Deserialize)]
pub struct ArchiveTaskParams {
    pub task_id: String,
    pub session_token: String,
}

/// Archive a task
#[tauri::command]
#[instrument(skip(state))]
pub async fn task_archive(
    params: ArchiveTaskParams,
    state: AppState<'_>,
) -> Result<ApiResponse<Task>, AppError> {
    // 1. Authenticate
    let session = state.auth_service
        .validate_session(&params.session_token)
        .await?
        .ok_or(AppError::Authentication("Invalid session".into()))?;

    // 2. Execute service method
    let task = state.task_service
        .archive_task(&params.task_id, &session.user_id, &session.user_role)
        .await?;

    // 3. Return success response
    Ok(ApiResponse::success(task))
}
```

---

#### Step 5: Register Command in `main.rs`

**Location**: `src-tauri/src/main.rs`

```rust
// Import the new command
use commands::task::task_archive;

// Register in invoke_handler
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // ... existing commands
            task_create,
            task_update,
            task_archive,  // ← Add this line
            // ... more commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

#### Step 6: Run Type Sync

**This regenerates TypeScript types for the frontend.**

```bash
npm run types:sync
```

This will:
1. Run `cargo run --bin export-types` (exports Rust types to JSON)
2. Parse JSON and generate `frontend/src/types/*.ts`

---

#### Step 7: Add Frontend IPC Function

**Location**: `frontend/src/lib/ipc/domains/task.ts`

```typescript
import { invoke } from '@tauri-apps/api/core';
import type { ApiResponse, Task } from '@/types';

export async function archiveTask(
  sessionToken: string,
  taskId: string
): Promise<ApiResponse<Task>> {
  return await invoke('task_archive', {
    params: { task_id: taskId, session_token: sessionToken }
  });
}
```

---

#### Step 8: Use in Frontend

```typescript
import { archiveTask } from '@/lib/ipc/domains/task';

const handleArchive = async (taskId: string) => {
  const result = await archiveTask(sessionToken, taskId);
  if (result.success) {
    toast.success('Task archived!');
  } else {
    toast.error(result.error?.message || 'Failed to archive task');
  }
};
```

---

## Error Model & Handling

### AppError Enum

**Location**: `src-tauri/src/commands/errors.rs`

```rust
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    // Authentication errors
    Authentication(String),
    Authorization(String),
    
    // Validation errors
    Validation(String),
    NotFound(String),
    
    // Database errors
    Database(String),
    
    // Business logic errors
    InterventionAlreadyActive(String),
    InterventionInvalidState(String),
    InterventionStepNotFound(String),
    InterventionStepOutOfOrder(String),
    
    // Internal errors
    Internal(String),
}

impl AppError {
    pub fn code(&self) -> &str {
        match self {
            AppError::Authentication(_) => "AUTH_ERROR",
            AppError::Authorization(_) => "AUTHORIZATION_ERROR",
            AppError::Validation(_) => "VALIDATION_ERROR",
            AppError::NotFound(_) => "NOT_FOUND",
            AppError::Database(_) => "DATABASE_ERROR",
            AppError::InterventionAlreadyActive(_) => "INTERVENTION_ALREADY_ACTIVE",
            AppError::Internal(_) => "INTERNAL_ERROR",
            _ => "UNKNOWN_ERROR",
        }
    }
}
```

### Error Handling Best Practices

**✅ Do**:
```rust
// Return specific error types
if task.status != TaskStatus::Draft {
    return Err(AppError::Validation(
        format!("Cannot edit task in '{}' status", task.status)
    ));
}

// Use map_err to convert repository errors
task_repo.get_by_id(task_id)
    .map_err(|e| AppError::Database(format!("Failed to fetch task: {}", e)))?;
```

**❌ Don't**:
```rust
// Too generic
return Err(AppError::Internal("Something went wrong".into()));

// Exposing internal details to frontend
return Err(AppError::Internal(format!("SQL error: {}", e)));
```

---

##  Validation Patterns

### Input Validation (Command Layer)

```rust
#[tauri::command]
pub async fn task_create(
    params: CreateTaskParams,
    state: AppState<'_>,
) -> Result<ApiResponse<Task>, AppError> {
    // 1. Validate session token
    let session = authenticate!(&params.session_token, &state);

    // 2. Validate input data
    if params.data.title.trim().is_empty() {
        return Err(AppError::Validation("Title cannot be empty".into()));
    }

    if params.data.priority.is_none() {
        return Err(AppError::Validation("Priority is required".into()));
    }

    // 3. Delegate to service
    let task = state.task_service.create_task(params.data, &session.user_id).await?;
    Ok(ApiResponse::success(task))
}
```

### Business Validation (Service Layer)

```rust
impl InterventionService {
    pub async fn start_intervention(&self, task_id: &str, user_id: &str) -> Result<Intervention, AppError> {
        // 1. Load task
        let task = self.task_repo.get_by_id(task_id)?
            .ok_or(AppError::NotFound("Task not found".into()))?;

        // 2. Business rules
        if task.status != TaskStatus::Assigned {
            return Err(AppError::Validation(
                format!("Cannot start intervention: task is in '{}' status", task.status)
            ));
        }

        // 3. Check for active interventions
        if let Some(active) = self.intervention_repo.get_active_by_task(task_id)? {
            return Err(AppError::InterventionAlreadyActive(
                format!("Intervention {} is already active for this task", active.id)
            ));
        }

        // 4. Create intervention
        // ...
    }
}
```

---

##  Logging & Tracing

RPMA uses **tracing** for structured logging.

### Adding Instrumentation

```rust
use tracing::{info, warn, error, instrument};

#[instrument(skip(state), fields(task_id = %params.task_id))]
pub async fn task_archive(
    params: ArchiveTaskParams,
    state: AppState<'_>,
) -> Result<ApiResponse<Task>, AppError> {
    info!("Archiving task");

    // Business logic...

    if let Err(e) = result {
        error!(error = %e, "Failed to archive task");
        return Err(e);
    }

    info!("Task archived successfully");
    Ok(ApiResponse::success(task))
}
```

**Logging Levels**:
- `trace!()` - Very detailed (disabled in production)
- `debug!()` - Development debugging
- `info!()` - Normal operation events
- `warn!()` - Recoverable issues
- `error!()` - Unrecoverable errors

**Structured Fields**:
```rust
info!(
    task_id = %task_id,
    user_id = %user_id,
    status = %task.status,
    "Task created"
);
```

---

##  Performance Best Practices

### 1. Use Async Database Wrapper for Non-Blocking Operations

```rust
// ❌ Blocks async runtime
let result = db.execute_sync(query);

// ✅ Non-blocking
let result = async_db.execute_async(query).await;
```

### 2. Batch Operations

```rust
// ❌ N+1 query problem
for material_id in material_ids {
    material_repo.get_by_id(material_id)?;
}

// ✅ Batch query
let materials = material_repo.get_by_ids(&material_ids)?;
```

### 3. Use Transactions for Multi-Step Operations

```rust
db.with_transaction(|tx| {
    // All operations within the same transaction
    intervention_repo.create(tx, intervention)?;
    step_repo.create_batch(tx, steps)?;
    task_repo.update_status(tx, task_id, TaskStatus::InProgress)?;
    Ok(intervention)
})?;
```

### 4. Cache Expensive Queries

```rust
// Use CacheService for frequently accessed data
let stats = cache_service.get_or_insert(
    "dashboard_stats",
    Duration::from_secs(300), // 5 min TTL
    || dashboard_service.compute_stats()
).await?;
```

---

##  Testing Backend Code

### Unit Tests

**Location**: `src-tauri/src/services/task_validation.rs`

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_task_title() {
        let result = validate_title("");
        assert!(result.is_err());

        let result = validate_title("Valid Title");
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_create_task() {
        let db = Database::new_in_memory().await.unwrap();
        let task_repo = TaskRepository::new(db.clone());
        let task_service = TaskService::new(task_repo);

        let request = CreateTaskRequest {
            title: "Test Task".into(),
            priority: Some(TaskPriority::Medium),
            ..Default::default()
        };

        let result = task_service.create_task(request, "user_123").await;
        assert!(result.is_ok());
    }
}
```

### Integration Tests

**Location**: `src-tauri/tests/intervention_workflow_test.rs`

```rust
#[tokio::test]
async fn test_full_intervention_workflow() {
    // 1. Setup test database
    let db = Database::new_in_memory().await.unwrap();

    // 2. Create task
    let task = create_test_task(&db).await;

    // 3. Start intervention
    let intervention = start_intervention(&db, &task.id).await;
    assert_eq!(intervention.status, InterventionStatus::InProgress);

    // 4. Complete steps
    for step in intervention.steps {
        complete_step(&db, &step.id).await;
    }

    // 5. Verify intervention completed
    let intervention = load_intervention(&db, &intervention.id).await;
    assert_eq!(intervention.status, InterventionStatus::Completed);
}
```

**Run Tests**:
```bash
cd src-tauri
cargo test
```

---

##  Code Patterns & Macros

### Authentication Macro

**Usage**:
```rust
use crate::authenticate;

#[tauri::command]
pub async fn protected_command(
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<Data>, AppError> {
    // Validates session and extracts user
    let current_user = authenticate!(&session_token, &state);

    // current_user is a Session struct with user_id, user_role, etc.
    // ...
}
```

**Definition**: `src-tauri/src/commands/auth_middleware.rs`

---

##  Repository Trait

**Location**: `src-tauri/src/repositories/base.rs`

```rust
pub trait Repository<T, ID> {
    fn create(&self, entity: &T) -> RepoResult<T>;
    fn get_by_id(&self, id: ID) -> RepoResult<Option<T>>;
    fn update(&self, entity: &T) -> RepoResult<T>;
    fn delete(&self, id: ID) -> RepoResult<()>;
    fn list(&self, filters: Option<QueryFilters>) -> RepoResult<Vec<T>>;
}
```

**Example Implementation**:
```rust
impl Repository<Task, String> for TaskRepository {
    fn create(&self, task: &Task) -> RepoResult<Task> {
        // Implementation
    }
    // ...
}
```

---

##  Key Services Reference

| Service | Purpose | Location |
|---------|---------|----------|
| `AuthService` | User authentication, session management | `services/auth.rs` |
| `TaskService` | Task CRUD, assignment, validation | `services/task.rs` |
| `InterventionService` | Intervention workflow, step progression | `services/intervention.rs` |
| `MaterialService` | Inventory management, stock tracking | `services/material.rs` |
| `CacheService` | In-memory caching | `services/cache.rs` |
| `EventBus` | Domain event publishing | `services/event_bus.rs` |

---

##  Next Steps

- **IPC API reference**: [05_IPC_API_AND_CONTRACTS.md](./05_IPC_API_AND_CONTRACTS.md)
- **Security & RBAC**: [06_SECURITY_AND_RBAC.md](./06_SECURITY_AND_RBAC.md)
- **Database & migrations**: [07_DATABASE_AND_MIGRATIONS.md](./07_DATABASE_AND_MIGRATIONS.md)
