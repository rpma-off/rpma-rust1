# Backend Guide

The backend is built in Rust using the Tauri framework with strict Domain-Driven Design (DDD) layering.

## Directory Structure (`src-tauri/src/`)

| Directory | Purpose |
|-----------|---------|
| `main.rs` | Tauri builder, command registration |
| `commands/` | Cross-domain/system IPC handlers |
| `db/` | Connection pooling, migrations, queries |
| `domains/` | Bounded contexts (DDD) |
| `shared/` | Utilities, errors, auth middleware, event bus |
| `bin/export-types.rs` | TypeScript generation binary |

### Commands Directory (`src-tauri/src/commands/`)

| File | Purpose |
|------|---------|
| `mod.rs` | AppError definition, shared command logic |
| `system.rs` | `health_check`, `diagnose_database`, `get_database_stats` |
| `ui.rs` | Window controls, dashboard stats, entity counts |
| `performance.rs` | Performance metrics and cache management |
| `ipc_optimization.rs` | Compression and streaming for IPC |
| `websocket_commands.rs` | WebSocket broadcasting and management |

### Domains Structure (`src-tauri/src/domains/[domain]/`)

Each domain follows strict layering:

```
domains/[domain]/
├── ipc/              # Tauri command handlers (thin)
├── application/      # Use cases, orchestration
├── domain/           # Entities, value objects, rules
│   └── models/
└── infrastructure/   # Repositories, SQL, adapters
```

**Domains** (18): `auth`, `users`, `tasks`, `interventions`, `clients`, `inventory`, `quotes`, `calendar`, `reports`, `settings`, `audit`, `sync`, `documents`, `notifications`, `performance`, `navigation`, `status`, `message`

---

## Command Registration

**Location**: `src-tauri/src/main.rs` lines 66-312

Commands registered via `tauri::generate_handler![]`:

```rust
.invoke_handler(tauri::generate_handler![
    commands::system::health_check,
    domains::tasks::ipc::task::task_crud,
    domains::auth::ipc::auth::auth_login,
    // ... ~170 commands
])
```

---

## Implementing a New Feature End-to-End

### Step 1: Domain Model
**Location**: `src-tauri/src/domains/[domain]/domain/models/[entity].rs`

Add `#[derive(TS)]` and `#[ts(export)]` for type generation.

### Step 2: Repository (Infrastructure)
**Location**: `src-tauri/src/domains/[domain]/infrastructure/[entity]_repository.rs`

Handle raw SQL and SQLite interactions using `rusqlite`.

### Step 3: Application Service
**Location**: `src-tauri/src/domains/[domain]/application/[entity]_service.rs`

Orchestrate domain logic, transactions, and audit logging.

### Step 4: IPC Handler
**Location**: `src-tauri/src/domains/[domain]/ipc/[entity].rs`

Use `authenticate!` macro to validate session and roles. Delegate to application services.

### Step 5: Register Command
**Location**: `src-tauri/src/main.rs`

Add to `tauri::generate_handler![]`.

### Step 6: Generate Types
```bash
npm run types:sync
```

### Step 7: Frontend IPC Wrapper
**Location**: `frontend/src/domains/[domain]/ipc/[entity].ipc.ts`

---

## Error Handling

**Location**: `src-tauri/src/shared/ipc/mod.rs` (AppError)

`AppError` enum variants:
- `Authentication(String)`
- `Authorization(String)`
- `Validation(String)`
- `NotFound(String)`
- `Database(String)` (Sanitized)
- `Internal(String)` (Sanitized)
- `Sync(String)`

**Macros**:
- `validation_error!`
- `auth_error!`
- `authz_error!`
- `not_found_error!`

---

## Logging & Tracing

**Crate**: `tracing`

**Correlation**: Use `correlation_id` from frontend to trace requests across layers.
Use `instrument!` macro or `set_correlation_context!` macro in handlers.

---

## Event Bus

**Location**: `src-tauri/src/shared/event_bus/`

Used for cross-domain communication without direct coupling. Entities publish events; other domains subscribe to them.
