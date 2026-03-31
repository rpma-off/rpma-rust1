# 04 — Backend Guide

## Backend Structure (`src-tauri/src/`)

```
src-tauri/src/
├── main.rs                     # Tauri bootstrap + 100+ command registration
├── lib.rs                      # Library entry point
├── service_builder.rs          # Centralized 26-step service initialization
├── shared/
│   ├── app_state.rs            # AppStateType — all Arc<T> service handles
│   ├── auth_middleware.rs      # has_permission() RBAC matrix
│   ├── context/
│   │   ├── request_context.rs  # RequestContext { auth, correlation_id }
│   │   └── session_resolver.rs # resolve_request_context(), resolve_context! macro
│   ├── contracts/              # Cross-domain shared enums/traits
│   ├── error/app_error.rs      # AppError variants + sanitization
│   ├── event_bus/bus.rs        # InMemoryEventBus (global singleton)
│   └── services/               # CacheService, PerformanceMonitor, etc.
├── commands/                   # Cross-domain/system command modules
├── db/
│   ├── mod.rs                  # Database + AsyncDatabase wrappers
│   ├── connection.rs           # r2d2 pool, WAL pragmas, DynamicPoolManager
│   ├── queries.rs              # execute(), query_single(), query_multiple(), etc.
│   └── metrics.rs              # Slow-query detection (>50ms), pool health
└── domains/
    └── <domain>/
        ├── ipc/                # Tauri command handlers (thin adapters)
        ├── application/        # Use-case services, validation
        ├── domain/             # Entities, errors, business rules
        ├── infrastructure/     # SQL repositories
        ├── facade.rs           # Domain entry point (accessed via AppStateType)
        └── tests/
```

## AppStateType (`shared/app_state.rs`)

Every service is `Arc<T>` on `AppState<'_, AppStateType>`. Key fields:
```rust
pub struct AppStateType {
    pub db: Arc<Database>,
    pub async_db: Arc<AsyncDatabase>,
    pub repositories: Arc<Repositories>,      // client, user, quote, message
    pub task_service: Arc<TaskService>,
    pub client_service: Arc<ClientService>,
    pub intervention_service: Arc<InterventionService>,
    pub material_service: Arc<MaterialService>,
    pub inventory_service: Arc<InventoryFacade>,
    pub quote_service: Arc<QuoteService>,
    pub auth_service: Arc<AuthService>,
    pub session_service: Arc<SessionService>,
    pub session_store: Arc<SessionStore>,
    pub settings_service: Arc<SettingsService>,
    pub settings_repository: Arc<SettingsRepository>,
    pub user_service: Arc<UserService>,
    pub rules_service: Arc<RulesService>,
    pub integrations_service: Arc<IntegrationsService>,
    pub event_bus: Arc<InMemoryEventBus>,
    pub trash_service: Arc<TrashService>,
    pub audit_service: Arc<AuditService>,
    pub global_search_service: Arc<GlobalSearchService>,
    // ... + cache_service, photo_service, message_service, etc.
}
```

## Implementing a New Command (End-to-End)

### Step 1 — Domain Model (`domain/models.rs`)
```rust
#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct CreateFooRequest {
    pub name: String,
    pub correlation_id: Option<String>,  // required for tracing
}
```
Run `npm run types:sync` after adding/changing `#[derive(TS)]` structs.

### Step 2 — Repository (`infrastructure/foo_repository.rs`)
```rust
impl FooRepository {
    pub fn create(&self, ctx: &RequestContext, req: &CreateFooRequest) -> Result<Foo, AppError> {
        self.db.with_transaction(|conn| {
            conn.execute("INSERT INTO foos (id, name, ...) VALUES (?1, ?2, ...)", params![...])?;
            // query back + return
        })
    }
}
```
SQL only in infrastructure layer. Use `db.query_single()`, `db.query_multiple()`, `db.execute()`.

### Step 3 — Application Service (`application/foo_service.rs`)
```rust
impl FooService {
    pub fn create_foo(&self, ctx: &RequestContext, req: &CreateFooRequest) -> Result<Foo, AppError> {
        // validate inputs (ADR-008: centralized or inline validation)
        // call repository
        let foo = self.repo.create(ctx, req)?;
        // emit domain event if needed
        publish_event(DomainEvent::FooCreated { id: foo.id.clone() });
        Ok(foo)
    }
}
```

### Step 4 — IPC Handler (`ipc/facade.rs`)
```rust
#[tauri::command]
#[instrument(skip(state, request))]
pub async fn create_foo(
    request: CreateFooRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<Foo>, AppError> {
    // 1. Resolve auth context (enforces role, extracts correlation_id)
    let ctx = resolve_context!(&state, &request.correlation_id, UserRole::Admin);
    // 2. Delegate to application service
    let result = state.foo_service.create_foo(&ctx, &request)?;
    // 3. Wrap in ApiResponse with correlation ID
    Ok(ApiResponse::success(result).with_correlation_id(Some(ctx.correlation_id)))
}
```

### Step 5 — Register Command (`main.rs`)
Add `create_foo` to the `.invoke_handler(tauri::generate_handler![...])` list.

## Error Model (ADR-019)

File: `shared/error/app_error.rs`

```rust
pub enum AppError {
    Authentication(String),   // 401 → "AUTH_INVALID"
    Authorization(String),    // 403 → "AUTH_FORBIDDEN"
    Validation(String),       // 400 → "VALIDATION_ERROR"
    NotFound(String),         // 404 → "NOT_FOUND"
    Database(String),         // 500 → sanitized "A database error occurred"
    Internal(String),         // 500 → sanitized
    RateLimit(String),        // 429 → "RATE_LIMIT"
    // Domain-specific:
    InterventionAlreadyActive(String),
    InterventionInvalidState(String),
    TaskInvalidTransition(String),
    // ...
}
```

**Sanitization rule**: `Database`, `Internal`, `Io`, `Network`, `Configuration` errors are sanitized before reaching the frontend — raw details are logged, generic message returned.

**Convenience macros**:
```rust
validation_error!("vehicle_plate is required")
not_found_error!("Task {} not found", id)
auth_error!("Invalid credentials")
authz_error!("Insufficient role")
internal_error!("Unexpected state: {}", msg)
```

## Validation (ADR-008)
- Validate in the **application layer** (never in IPC).
- Use the centralized validation service or inline validation in application service methods.
- Domain layer enforces invariants on model construction.

## Logging and Tracing (ADR-020)
```rust
use tracing::{info, debug, warn, error, instrument};

#[instrument(skip(state))]
pub async fn some_command(state: AppState<'_>) -> ... {
    info!(task_id = %id, "Processing task");
}
```
Correlation ID from `RequestContext` is automatically included in span context. Use `tracing::Span::current().record("correlation_id", &ctx.correlation_id)` for explicit attachment.

## Database Access Patterns (`src-tauri/src/db/`)

```rust
// Single row
let task: Task = db.query_single("SELECT * FROM tasks WHERE id = ?1", params![id])?;

// Multiple rows
let tasks: Vec<Task> = db.query_multiple("SELECT * FROM tasks WHERE status = ?1", params![status])?;

// Execute (INSERT/UPDATE/DELETE)
db.execute("UPDATE tasks SET status = ?1 WHERE id = ?2", params![status, id])?;

// Transaction
db.with_transaction(|conn| {
    conn.execute("INSERT INTO tasks ...", params![...])?;
    conn.execute("UPDATE client_stats ...", params![...])?;
    Ok(task)
})?;
```

All `*_at` columns store `i64` milliseconds (`chrono::Utc::now().timestamp_millis()`).
