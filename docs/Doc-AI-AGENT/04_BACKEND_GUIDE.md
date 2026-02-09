# RPMA v2 Backend Guide

## Backend Structure Overview

The RPMA v2 backend is implemented in Rust using the Tauri framework. It follows a clean architecture with clear separation between IPC handlers, business logic, data access, and domain models.

```
src-tauri/src/
├── main.rs                 # Application entry point
├── lib.rs                  # Library root
├── commands/               # IPC command handlers
│   ├── mod.rs             # Command module exports
│   ├── auth.rs            # Authentication commands
│   ├── task/              # Task management commands
│   │   ├── mod.rs
│   │   ├── create_task.rs
│   │   ├── update_task.rs
│   │   └── list_tasks.rs
│   ├── intervention.rs    # Intervention workflow commands
│   ├── client.rs          # Client management commands
│   ├── material.rs        # Material/inventory commands
│   ├── reports.rs         # Report generation commands
│   ├── settings.rs        # Application settings
│   └── ...                # Other domain commands
├── services/               # Business logic layer
│   ├── mod.rs
│   ├── auth.rs            # Authentication service
│   ├── task.rs            # Task business logic
│   ├── intervention_workflow.rs # PPF workflow management
│   ├── inventory.rs       # Inventory management
│   ├── photo_processing.rs # Photo validation and processing
│   └── ...                # Other domain services
├── repositories/          # Data access layer
│   ├── mod.rs
│   ├── task_repository.rs # Task data access
│   ├── client_repository.rs # Client data access
│   ├── intervention_repository.rs # Intervention data access
│   ├── user_repository.rs # User data access
│   └── ...                # Other repositories
├── models/                # Domain entities
│   ├── mod.rs
│   ├── task.rs            # Task model
│   ├── intervention.rs    # Intervention model
│   ├── client.rs          # Client model
│   ├── user.rs            # User model
│   ├── material.rs        # Material model
│   └── ...                # Other domain models
├── db/                    # Database management
│   ├── mod.rs             # Database connection and pool
│   ├── migrations.rs      # Migration management
│   └── schema.sql         # Database schema definition
├── sync/                  # Offline-first synchronization
│   ├── mod.rs
│   ├── queue.rs           # Sync queue implementation
│   └── processor.rs       # Sync processing logic
├── events/                # Event system
│   ├── mod.rs
│   └── handlers.rs        # Event handlers
├── error.rs               # Error types and handling
├── logging.rs             # Logging configuration
└── utils/                 # Utility functions
```

## Command Implementation Pattern

### Command Handler Structure
All IPC commands follow a consistent pattern for authentication, validation, business logic execution, and response formatting.

```rust
// src-tauri/src/commands/task/create_task.rs
use crate::error::AppError;
use crate::models::task::{CreateTaskRequest, Task};
use crate::services::task::TaskService;
use crate::commands::auth::authenticate;
use tauri::{State, command};
use std::sync::Arc;

#[command]
pub async fn create_task(
    task_data: CreateTaskRequest,
    session_token: String,
    app_state: State<'_, Arc<AppState>>,
) -> Result<Task, AppError> {
    // 1. Authenticate user
    let user = authenticate(&session_token, &app_state.db)?;
    
    // 2. Validate input data (validation happens in the request type)
    let validated_data = task_data.validate()?;
    
    // 3. Authorize operation
    if !user.can_create_tasks() {
        return Err(AppError::Authorization("Insufficient permissions".to_string()));
    }
    
    // 4. Execute business logic
    let task = TaskService::create_task(&app_state.db, validated_data, &user)?;
    
    // 5. Return successful response
    Ok(task)
}
```

### Authentication Middleware
```rust
// src-tauri/src/commands/auth.rs
use crate::models::user::User;
use crate::repositories::user_repository::UserRepository;
use crate::error::AppError;

pub fn authenticate(session_token: &str, db: &DbPool) -> Result<User, AppError> {
    // Validate session token format
    if session_token.is_empty() {
        return Err(AppError::Authentication("Invalid session token".to_string()));
    }
    
    // Look up session in database
    let session = UserRepository::find_session_by_token(db, session_token)?;
    
    // Check if session is expired
    if session.is_expired() {
        return Err(AppError::Authentication("Session expired".to_string()));
    }
    
    // Get user from session
    let user = UserRepository::get_by_id(db, &session.user_id)?;
    
    // Check if user is active
    if !user.is_active {
        return Err(AppError::Authentication("User account is inactive".to_string()));
    }
    
    // Update last activity
    UserRepository::update_last_activity(db, &user.id)?;
    
    Ok(user)
}
```

## Service Layer Implementation

### Service Pattern
Services contain the business logic and coordinate between repositories. They handle validation, business rules, and transactions.

```rust
// src-tauri/src/services/task.rs
use crate::error::AppError;
use crate::models::task::{Task, CreateTaskRequest, UpdateTaskRequest, TaskStatus};
use crate::repositories::task_repository::TaskRepository;
use crate::repositories::client_repository::ClientRepository;
use std::sync::Arc;

pub struct TaskService;

impl TaskService {
    pub fn create_task(
        db: &DbPool,
        task_data: CreateTaskRequest,
        user: &User,
    ) -> Result<Task, AppError> {
        // Start database transaction
        let conn = db.get()?;
        let tx = conn.transaction()?;
        
        // Validate business rules
        Self::validate_task_creation(&task_data, &tx)?;
        
        // Check if client exists
        ClientRepository::exists(&tx, &task_data.client_id)?;
        
        // Create task
        let mut task = Task::new(task_data, user.id);
        
        // Set initial status
        task.status = TaskStatus::Draft;
        
        // Save to database
        TaskRepository::create(&tx, &mut task)?;
        
        // Create audit log
        Self::create_audit_log(&tx, &task, "created", user.id)?;
        
        // Commit transaction
        tx.commit()?;
        
        Ok(task)
    }
    
    pub fn update_task_status(
        task_id: &str,
        new_status: TaskStatus,
        user: &User,
        db: &DbPool,
    ) -> Result<Task, AppError> {
        let conn = db.get()?;
        let tx = conn.transaction()?;
        
        // Get current task
        let mut task = TaskRepository::get_by_id(&tx, task_id)?;
        
        // Validate status transition
        Self::validate_status_transition(task.status, new_status)?;
        
        // Update status
        task.status = new_status;
        task.updated_by = Some(user.id.clone());
        
        // Save changes
        TaskRepository::update(&tx, &task)?;
        
        // Create audit log
        Self::create_audit_log(&tx, &task, "status_changed", user.id)?;
        
        // Trigger events
        crate::events::emit_task_status_changed(&task)?;
        
        // Commit transaction
        tx.commit()?;
        
        Ok(task)
    }
    
    fn validate_task_creation(task_data: &CreateTaskRequest, tx: &Transaction) -> Result<(), AppError> {
        // Business rule: Can't create tasks for inactive clients
        let client = ClientRepository::get_by_id(tx, &task_data.client_id)?;
        if !client.is_active {
            return Err(AppError::Validation("Cannot create tasks for inactive clients".to_string()));
        }
        
        // Business rule: Scheduled date must be in the future
        if let Some(scheduled_date) = task_data.scheduled_date {
            if scheduled_date <= chrono::Utc::now() {
                return Err(AppError::Validation("Scheduled date must be in the future".to_string()));
            }
        }
        
        Ok(())
    }
    
    fn validate_status_transition(
        current: TaskStatus,
        new: TaskStatus,
    ) -> Result<(), AppError> {
        // Define valid transitions
        let valid_transitions = match current {
            TaskStatus::Draft => vec![TaskStatus::Scheduled, TaskStatus::Cancelled],
            TaskStatus::Scheduled => vec![TaskStatus::InProgress, TaskStatus::Cancelled],
            TaskStatus::InProgress => vec![TaskStatus::Completed, TaskStatus::OnHold, TaskStatus::Cancelled],
            TaskStatus::OnHold => vec![TaskStatus::InProgress, TaskStatus::Cancelled],
            TaskStatus::Completed => vec![],
            TaskStatus::Cancelled => vec![TaskStatus::Draft],
        };
        
        if !valid_transitions.contains(&new) {
            return Err(AppError::Validation(
                format!("Invalid status transition from {:?} to {:?}", current, new)
            ));
        }
        
        Ok(())
    }
}
```

## Repository Pattern Implementation

### Repository Structure
Repositories handle the data access logic, providing a clean abstraction over database operations.

```rust
// src-tauri/src/repositories/task_repository.rs
use crate::error::AppError;
use crate::models::task::Task;
use rusqlite::{Connection, Transaction, params, Row};
use std::sync::Arc;

pub struct TaskRepository;

impl TaskRepository {
    pub fn create(tx: &Transaction, task: &Task) -> Result<(), AppError> {
        tx.execute(
            r#"
            INSERT INTO tasks (
                id, title, description, status, priority, 
                client_id, vehicle_plate, vehicle_make, vehicle_model,
                technician_id, scheduled_date, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            params![
                task.id,
                task.title,
                task.description,
                task.status.to_string(),
                task.priority.to_string(),
                task.client_id,
                task.vehicle_plate,
                task.vehicle_make,
                task.vehicle_model,
                task.technician_id,
                task.scheduled_date,
                task.created_by,
                task.created_at,
                task.updated_at,
            ],
        )?;
        
        Ok(())
    }
    
    pub fn get_by_id(tx: &Transaction, id: &str) -> Result<Task, AppError> {
        let mut stmt = tx.prepare(
            r#"
            SELECT 
                id, title, description, status, priority,
                client_id, vehicle_plate, vehicle_make, vehicle_model,
                technician_id, scheduled_date, created_by, created_at, updated_at
            FROM tasks
            WHERE id = ? AND deleted_at IS NULL
            "#
        )?;
        
        let task = stmt.query_row(params![id], |row| {
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                status: TaskStatus::from_str(row.get::<_, String>(3)?).unwrap(),
                priority: TaskPriority::from_str(row.get::<_, String>(4)?).unwrap(),
                client_id: row.get(5)?,
                vehicle_plate: row.get(6)?,
                vehicle_make: row.get(7)?,
                vehicle_model: row.get(8)?,
                technician_id: row.get(9)?,
                scheduled_date: row.get(10)?,
                created_by: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        })?;
        
        Ok(task)
    }
    
    pub fn list(
        tx: &Transaction,
        filters: &TaskFilters,
    ) -> Result<Vec<Task>, AppError> {
        let mut query = String::from(
            r#"
            SELECT 
                id, title, description, status, priority,
                client_id, vehicle_plate, vehicle_make, vehicle_model,
                technician_id, scheduled_date, created_by, created_at, updated_at
            FROM tasks
            WHERE deleted_at IS NULL
            "#
        );
        
        let mut params = Vec::new();
        let mut param_index = 1;
        
        // Add filters
        if let Some(status) = &filters.status {
            query.push_str(&format!(" AND status = ?{}", param_index));
            params.push(status.to_string());
            param_index += 1;
        }
        
        if let Some(technician_id) = &filters.technician_id {
            query.push_str(&format!(" AND technician_id = ?{}", param_index));
            params.push(technician_id.clone());
            param_index += 1;
        }
        
        if let Some(date_from) = &filters.date_from {
            query.push_str(&format!(" AND scheduled_date >= ?{}", param_index));
            params.push(date_from.to_rfc3339());
            param_index += 1;
        }
        
        query.push_str(" ORDER BY created_at DESC");
        
        // Add pagination
        if let Some(limit) = filters.limit {
            query.push_str(&format!(" LIMIT {}", limit));
            
            if let Some(offset) = filters.offset {
                query.push_str(&format!(" OFFSET {}", offset));
            }
        }
        
        let mut stmt = tx.prepare(&query)?;
        
        let rows = stmt.query_map(params_from_iter(params), |row| {
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                status: TaskStatus::from_str(row.get::<_, String>(3)?).unwrap(),
                priority: TaskPriority::from_str(row.get::<_, String>(4)?).unwrap(),
                client_id: row.get(5)?,
                vehicle_plate: row.get(6)?,
                vehicle_make: row.get(7)?,
                vehicle_model: row.get(8)?,
                technician_id: row.get(9)?,
                scheduled_date: row.get(10)?,
                created_by: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        })?;
        
        let tasks: Result<Vec<Task>, _> = rows.collect();
        tasks.map_err(|e| AppError::Database(e.to_string()))
    }
}
```

## Error Handling

### Error Types
The backend uses a standardized error type that maps cleanly to frontend responses.

```rust
// src-tauri/src/error.rs
use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug, Serialize)]
pub enum AppError {
    #[error("Authentication error: {0}")]
    Authentication(String),
    
    #[error("Authorization error: {0}")]
    Authorization(String),
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Not found: {0}")]
    NotFound(String),
    
    #[error("Database error: {0}")]
    Database(String),
    
    #[error("Internal error: {0}")]
    Internal(String),
    
    #[error("IO error: {0}")]
    Io(String),
}

impl AppError {
    pub fn error_code(&self) -> u16 {
        match self {
            AppError::Authentication(_) => 401,
            AppError::Authorization(_) => 403,
            AppError::NotFound(_) => 404,
            AppError::Validation(_) => 400,
            _ => 500,
        }
    }
}

// Convert from common error types
impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::Database(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Internal(err.to_string())
    }
}
```

### Error Response Format
Commands return structured error responses that the frontend can handle consistently.

```rust
// In command handlers
#[command]
pub async fn get_task(
    task_id: String,
    session_token: String,
    app_state: State<'_, Arc<AppState>>,
) -> Result<Task, ApiResponse<Task>> {
    match process_get_task(&task_id, &session_token, &app_state) {
        Ok(task) => Ok(ApiResponse::success(task)),
        Err(err) => Ok(ApiResponse::error(err)),
    }
}

// Or use automatic conversion if using the Result<T, AppError> pattern
```

## Database Interaction Patterns

### Connection Pool
The application uses r2d2 for connection pooling with SQLite in WAL mode.

```rust
// src-tauri/src/db/mod.rs
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use std::sync::Arc;

pub type DbPool = Arc<Pool<SqliteConnectionManager>>;

pub fn init_pool(database_path: &str) -> Result<DbPool, AppError> {
    let manager = SqliteConnectionManager::file(database_path);
    let pool = r2d2::Pool::new(manager)
        .map_err(|e| AppError::Database(format!("Failed to create connection pool: {}", e)))?;
    
    // Configure SQLite
    let conn = pool.get()?;
    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA cache_size = -64000;  -- 64MB cache
        PRAGMA temp_store = memory;
        "#
    )?;
    
    Ok(Arc::new(pool))
}
```

### Transaction Management
Complex operations use transactions to ensure data consistency.

```rust
// Example of transaction usage
pub fn transfer_material(
    from_location: &str,
    to_location: &str,
    material_id: &str,
    quantity: i32,
    user_id: &str,
    db: &DbPool,
) -> Result<(), AppError> {
    let conn = db.get()?;
    let tx = conn.transaction()?;
    
    // Check availability
    let available = MaterialRepository::get_quantity(&tx, material_id, from_location)?;
    if available < quantity {
        return Err(AppError::Validation("Insufficient material quantity".to_string()));
    }
    
    // Create transfer transaction
    let transaction = MaterialTransaction::new_transfer(
        material_id,
        quantity,
        from_location,
        to_location,
        user_id,
    );
    
    // Update quantities
    MaterialRepository::update_quantity(&tx, material_id, from_location, -quantity)?;
    MaterialRepository::update_quantity(&tx, material_id, to_location, quantity)?;
    
    // Record transaction
    MaterialTransactionRepository::create(&tx, &transaction)?;
    
    // Commit everything
    tx.commit()?;
    
    // Emit event for real-time updates
    crate::events::emit_material_transferred(&transaction)?;
    
    Ok(())
}
```

## Logging and Monitoring

### Structured Logging
The application uses structured logging with correlation IDs for request tracking.

```rust
// src-tauri/src/logging.rs
use log::{info, warn, error, debug};
use uuid::Uuid;

pub fn setup_logging() -> Result<(), Box<dyn std::error::Error>> {
    // Configure logging output
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .init();
    
    Ok(())
}

// In command handlers
#[command]
pub async fn process_intervention_step(
    intervention_id: String,
    step_id: String,
    data: ProcessStepData,
    session_token: String,
    app_state: State<'_, Arc<AppState>>,
) -> Result<InterventionStep, AppError> {
    let correlation_id = Uuid::new_v4().to_string();
    
    info!(
        "[{}] Processing step {} for intervention {} by user {}",
        correlation_id,
        step_id,
        intervention_id,
        session_token.chars().take(8).collect::<String>()
    );
    
    let result = InterventionService::process_step(
        &intervention_id,
        &step_id,
        data,
        &session_token,
        &app_state,
        &correlation_id,
    );
    
    match &result {
        Ok(step) => info!("[{}] Step processed successfully: {}", correlation_id, step.id),
        Err(err) => error!("[{}] Step processing failed: {}", correlation_id, err),
    }
    
    result
}
```

### Performance Monitoring
Database query performance is monitored with execution time tracking.

```rust
// In repository methods
pub fn get_active_tasks_for_technician(
    tx: &Transaction,
    technician_id: &str,
) -> Result<Vec<Task>, AppError> {
    let start = std::time::Instant::now();
    
    let mut stmt = tx.prepare(
        "SELECT * FROM tasks WHERE technician_id = ? AND status = 'in_progress'"
    )?;
    
    let rows = stmt.query_map(params![technician_id], |row| {
        // Map to Task
    })?;
    
    let tasks: Result<Vec<Task>, _> = rows.collect();
    
    let duration = start.elapsed();
    debug!(
        "Query get_active_tasks_for_technician completed in {:?}ms",
        duration.as_millis()
    );
    
    tasks.map_err(|e| AppError::Database(e.to_string()))
}
```

## Adding New Backend Features

### 1. Create Model
```rust
// src-tauri/src/models/new_feature.rs
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct NewFeature {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize, TS)]
#[ts(export)]
pub struct CreateNewFeatureRequest {
    pub name: String,
    pub description: Option<String>,
}
```

### 2. Implement Repository
```rust
// src-tauri/src/repositories/new_feature_repository.rs
use crate::error::AppError;
use crate::models::new_feature::{NewFeature, CreateNewFeatureRequest};

pub struct NewFeatureRepository;

impl NewFeatureRepository {
    pub fn create(
        tx: &rusqlite::Transaction,
        feature: &mut NewFeature,
    ) -> Result<(), AppError> {
        tx.execute(
            "INSERT INTO new_features (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            params![
                feature.id,
                feature.name,
                feature.description,
                feature.created_at,
                feature.updated_at,
            ],
        )?;
        
        Ok(())
    }
    
    pub fn get_by_id(
        tx: &rusqlite::Transaction,
        id: &str,
    ) -> Result<NewFeature, AppError> {
        let mut stmt = tx.prepare(
            "SELECT id, name, description, created_at, updated_at FROM new_features WHERE id = ?"
        )?;
        
        let feature = stmt.query_row(params![id], |row| {
            Ok(NewFeature {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?;
        
        Ok(feature)
    }
}
```

### 3. Create Service
```rust
// src-tauri/src/services/new_feature.rs
use crate::error::AppError;
use crate::models::new_feature::{NewFeature, CreateNewFeatureRequest};
use crate::repositories::new_feature_repository::NewFeatureRepository;

pub struct NewFeatureService;

impl NewFeatureService {
    pub fn create_feature(
        db: &DbPool,
        request: CreateNewFeatureRequest,
        user: &User,
    ) -> Result<NewFeature, AppError> {
        let conn = db.get()?;
        let tx = conn.transaction()?;
        
        let mut feature = NewFeature {
            id: uuid::Uuid::new_v4().to_string(),
            name: request.name,
            description: request.description,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };
        
        NewFeatureRepository::create(&tx, &mut feature)?;
        
        tx.commit()?;
        
        Ok(feature)
    }
}
```

### 4. Implement Command
```rust
// src-tauri/src/commands/new_feature.rs
use crate::commands::auth::authenticate;
use crate::error::AppError;
use crate::models::new_feature::{NewFeature, CreateNewFeatureRequest};
use crate::services::new_feature::NewFeatureService;
use tauri::{command, State};

#[command]
pub async fn create_new_feature(
    request: CreateNewFeatureRequest,
    session_token: String,
    app_state: State<'_, Arc<AppState>>,
) -> Result<NewFeature, AppError> {
    let user = authenticate(&session_token, &app_state.db)?;
    
    if !user.can_manage_features() {
        return Err(AppError::Authorization("Insufficient permissions".to_string()));
    }
    
    NewFeatureService::create_feature(&app_state.db, request, &user)
}
```

### 5. Register Command
```rust
// src-tauri/src/main.rs
.invoke_handler(|_app| {
    // ... existing commands
    new_feature::create_new_feature
})
```