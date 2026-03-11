# Architecture & Dataflows

RPMA v2 follows strict 4-Layer Domain-Driven Design (DDD) architecture.

## 4-Layer Backend Architecture (DDD)

Located under `src-tauri/src/domains/[domain]/`:

| Layer | Responsibility | Example Files |
|-------|----------------|---------------|
| **IPC** (`ipc/`) | Tauri command handlers; thin boundary for auth, correlation context, and mapping | `domains/tasks/ipc/task.rs`, `domains/interventions/ipc/intervention.rs` |
| **Application** (`application/`) | Use cases, transaction boundaries, authorization enforcement, orchestration | `domains/tasks/application/` |
| **Domain** (`domain/`) | Pure Rust structs, business rules, validation, entities, value objects — no I/O | `domains/tasks/domain/models/task.rs` |
| **Infrastructure** (`infrastructure/`) | SQLite repositories, raw SQL, external adapters | `domains/tasks/infrastructure/` |

Data flow direction: **IPC → Application → Domain → Infrastructure**

---

## Data Flow Diagrams

### 1. Task Creation Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│  Frontend   │────▶│  IPC Client  │────▶│ Tauri Cmd    │────▶│  App Service │────▶│  Repository  │────▶│   SQLite    │
│    Form     │     │  (lib/ipc)   │     │ (task_crud)  │     │ (application)│     │(infrastructure)│    │    WAL      │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └─────────────┘
                                                                                            │
                                                                                            ▼
                                                                                     ┌──────────────┐
                                                                                     │ audit_events │
                                                                                     └──────────────┘
```

**Key Files**:
- Frontend: `frontend/src/domains/tasks/ipc/task.ipc.ts`
- IPC Handler: `src-tauri/src/domains/tasks/ipc/task.rs` (`task_crud`)
- Application: `src-tauri/src/domains/tasks/application/`
- Repository: `src-tauri/src/domains/tasks/infrastructure/`

### 2. Intervention Workflow (Start/Advance/Complete)

**Entry**: `frontend/src/app/tasks/[id]/workflow/ppf/page.tsx`

**Flow**:
1. Frontend calls `intervention_start` or `intervention_advance_step`
2. IPC handler validates session via `AuthMiddleware`
3. Application service checks RBAC (technician role required)
4. Domain layer validates step prerequisites
5. Repository updates `interventions` table
6. Audit event logged
7. Sync operation enqueued

**Key Files**:
- Frontend: `frontend/src/domains/interventions/ipc/intervention.ipc.ts`
- IPC Start: `src-tauri/src/domains/interventions/ipc/intervention.rs` (`intervention_start`)
- IPC Advance: `src-tauri/src/domains/interventions/ipc/intervention.rs` (`intervention_advance_step`)
- Infrastructure: `src-tauri/src/domains/interventions/infrastructure/`

### 3. Calendar Scheduling Flow

**Entry**: `frontend/src/app/schedule/page.tsx`

**Flow**:
1. Calendar reads tasks via `calendar_get_tasks`
2. Drag-and-drop updates trigger `update_event` or `calendar_schedule_task`
3. Task `scheduled_date` field updated
4. Sync queue receives update operation

**Key Files**:
- Frontend: `frontend/src/domains/calendar/`
- IPC: `src-tauri/src/domains/calendar/ipc/calendar.rs` (`calendar_schedule_task`)

---

## Offline-First & Sync Architecture

**Primary Storage**: Local SQLite with WAL mode — source of truth always local.

**Sync Domain** (`src-tauri/src/domains/sync/`):

| Component | Purpose | Location |
|-----------|---------|----------|
| `SyncOperation` | Queue item model | `domain/models/sync.rs` |
| `OperationType` | `Create`, `Update`, `Delete` | `domain/models/sync.rs` |
| `EntityType` | `Task`, `Client`, `Intervention`, `Step`, `Photo`, `User` | `domain/models/sync.rs` |
| `SyncStatus` | `Pending`, `Processing`, `Completed`, `Failed`, `Abandoned` | `domain/models/sync.rs` |
| Background Service | Processes queue periodically | `infrastructure/sync/background.rs` |
| Queue Management | Enqueue/dequeue operations | `infrastructure/sync/queue.rs` |

**Sync Flow**:
```
Local Change → Enqueue (sync_queue table) → Background Processor → Remote API (if online)
                                    ↓
                              On Failure: Retry with backoff → Max retries → Abandoned
```

**Key IPC Commands**:
- `sync_enqueue` — add operation to queue
- `sync_now` — trigger immediate sync
- `sync_get_metrics` — check queue metrics
- `sync_start_background_service` / `sync_stop_background_service`

**Sync Table**: `sync_queue` (managed by sync domain infrastructure)

---

## Event Bus

**Location**: `src-tauri/src/shared/event_bus/`

- `bus.rs` — Global event bus implementation
- `events.rs` — Domain events definitions

**Usage**: Cross-domain communication without direct imports. Events flow:
```
Domain Operation → Publish Event → Event Bus → Registered Handlers
```

**Related**: `src-tauri/src/shared/services/event_system.rs`, `src-tauri/src/shared/services/domain_event.rs`

---

## Database Architecture

**Pool**: `r2d2` with SQLite `rusqlite` driver.

**WAL Mode**: Enabled for high read/write concurrency.

**Key Components**:
- Connection: `src-tauri/src/db/connection.rs`
- Database Wrapper: `src-tauri/src/db/mod.rs`
- Transactions: Available via `with_transaction()` pattern
- WAL Checkpoint: Manual via `checkpoint_wal` or automatic SQLite threshold

**Performance Monitoring**:
- `QueryPerformanceMonitor` in `connection.rs` tracks all query executions
- Slow query threshold: 100ms
- Prepared statement cache for frequently executed queries
- Pool stats available via `get_database_pool_stats` command

**Pool Stats Available**: `get_database_pool_stats`, `get_database_pool_health` commands.

**SQLite Pragmas** (set in `connection.rs`):
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
PRAGMA temp_store = MEMORY;
PRAGMA foreign_keys = ON;
```
