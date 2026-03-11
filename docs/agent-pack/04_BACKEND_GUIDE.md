# Backend Guide

The backend is built in Rust using the Tauri framework with strict Domain-Driven Design (DDD) layering.

## Directory Structure (`src-tauri/src/`)

| Directory | Purpose |
|-----------|---------|
| `main.rs` | Tauri builder, command registration (~131 commands) |
| `commands/` | Cross-domain/system IPC handlers |
| `db/` | Connection pooling, migrations, queries |
| `domains/` | Bounded contexts (DDD) |
| `shared/` | Utilities, errors, auth middleware, event bus |
| `bin/export-types.rs` | TypeScript generation binary |

### Commands Directory (`src-tauri/src/commands/`)

| File | Purpose |
|------|---------|
| `mod.rs` | AppError re-exports, shared command logic |
| `system.rs` | `health_check`, `diagnose_database`, `get_database_stats`, `get_app_info`, `get_device_info` |
| `ui.rs` | Window controls, dashboard stats, entity counts |
| `performance.rs` | Performance metrics and cache management |
| `ipc_optimization.rs` | Compression and streaming for IPC |
| `websocket_commands.rs` | WebSocket broadcasting and management |
| `navigation.rs` | Backend-driven navigation and shortcuts |
| `log.rs` | Logging utilities for frontend communication |
| `error_utils.rs` | Error handling helpers |
| `correlation_helpers.rs` | Correlation ID utilities |

### Domains Structure (`src-tauri/src/domains/[domain]/`)

Each domain follows strict layering:

```
domains/[domain]/
├── ipc/              # Tauri command handlers (thin)
├── application/      # Use cases, orchestration
├── domain/           # Entities, value objects, rules
│   └── models/
│   └── services/     # Domain services (e.g., state machines)
│   └── policy.rs     # Domain policies
└── infrastructure/   # Repositories, SQL, adapters
└── tests/            # Domain tests (unit, integration, permission, validation)
└── mod.rs            # Module exports
```

**Backend DDD Domains** (16): `auth`, `users`, `tasks`, `interventions`, `clients`, `inventory`, `quotes`, `calendar`, `reports`, `settings`, `audit`, `sync`, `documents`, `notifications`, `organizations`

**Command Modules** (in `commands/`): `system`, `ui`, `performance`, `navigation`, `ipc_optimization`, `websocket`, `log`

---

## Command Registration

**Location**: `src-tauri/src/main.rs`

Commands registered via `tauri::generate_handler![]`:

```rust
.invoke_handler(tauri::generate_handler![
    // System / Database
    commands::system::health_check,
    commands::system::diagnose_database,
    commands::system::get_database_stats,
    commands::system::get_app_info,
    commands::system::get_device_info,
    // Auth
    domains::auth::ipc::auth::auth_login,
    domains::auth::ipc::auth::auth_create_account,
    // ... ~131 commands total
])
```

---

## Implementing a New Feature End-to-End

### Step 1: Domain Model
**Location**: `src-tauri/src/domains/[domain]/domain/models/[entity].rs`
- Add `#[derive(TS)]` and `#[ts(export)]` for type generation.
- Ensure validation logic resides in `impl` blocks here.

### Step 2: Repository (Infrastructure)
**Location**: `src-tauri/src/domains/[domain]/infrastructure/[entity]_repository.rs`
- Handle raw SQL and SQLite interactions using `rusqlite`.
- Use the shared connection pool.

### Step 3: Application Service
**Location**: `src-tauri/src/domains/[domain]/application/`
- Orchestrate domain logic, handle transaction boundaries, and enforce authorization.

### Step 4: IPC Handler
**Location**: `src-tauri/src/domains/[domain]/ipc/[entity].rs`
- Use `AuthMiddleware::authenticate_command` to validate sessions.
- Delegate all execution to application services.
- Map results to `ApiResponse`.

### Step 5: Register Command
**Location**: `src-tauri/src/main.rs`
- Add the handler to `tauri::generate_handler![]`.

### Step 6: Generate Types & Frontend Wrapper
```bash
npm run types:sync
```
- Update `frontend/src/domains/[domain]/ipc/[entity].ipc.ts` using `safeInvoke`.

---

## Error Handling

**Location**: `src-tauri/src/shared/ipc/errors.rs`

`AppError` enum variants:
- `Authentication(String)` — 401
- `Authorization(String)` — 403
- `Validation(String)` — 400
- `NotFound(String)` — 404
- `Database(String)` — 500 (sanitized)
- `Internal(String)` — 500 (sanitized)
- `Network(String)` — 500
- `Io(String)` — 500 (sanitized)
- `Configuration(String)` — 500
- `RateLimit(String)` — 429
- `Sync(String)` — 500 (sanitized)
- `InterventionAlreadyActive(String)` — 400
- `InterventionInvalidState(String)` — 400
- `InterventionStepNotFound(String)` — 400
- `InterventionValidationFailed(String)` — 400
- `InterventionConcurrentModification(String)` — 400
- `InterventionTimeout(String)` — 408
- `InterventionStepOutOfOrder(String)` — 400
- `TaskInvalidTransition(String)` — 409
- `TaskDuplicateNumber(String)` — 409
- `TaskAssignmentConflict(String)` — 409
- `NotImplemented(String)` — 501

**Sanitization**: Database, Internal, Io, Network, Sync, and Configuration errors are sanitized before being sent to frontend to prevent leaking internal details.

**Macros**:
- `validation_error!`
- `auth_error!`
- `authz_error!`
- `not_found_error!`
- `internal_error!`

---

## Logging & Tracing

**Crate**: `tracing`

**Correlation**: Use `correlation_id` from frontend to trace requests across layers.
- `init_correlation_context` in `src-tauri/src/shared/ipc/correlation.rs`
- `set_correlation_context` macros in handlers

**Structured Logging**: All commands use `#[instrument]` attribute for automatic tracing.

---

## Event Bus

**Location**: `src-tauri/src/shared/event_bus/`

Used for cross-domain communication without direct coupling. Entities publish events; other domains subscribe to them.

**Related Files**:
- `src-tauri/src/shared/services/event_system.rs`
- `src-tauri/src/shared/services/domain_event.rs`

---

## Testing

Each domain has a `tests/` directory with:
- `unit_*.rs` — Unit tests for domain logic
- `integration_*.rs` — Integration tests for repository/service
- `permission_*.rs` — Permission/RBAC tests
- `validation_*.rs` — Input validation tests

**Run Tests**:
```bash
make test
# or
cd src-tauri && cargo test
```
