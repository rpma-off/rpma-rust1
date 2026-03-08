# Architecture & Dataflows

RPMA v2 follows strict 4-Layer Domain-Driven Design (DDD) architecture.

## 5-Layer Backend Architecture (DDD + Facade)

Located under `src-tauri/src/domains/[domain]/`:

| Layer | Responsibility | Example Files |
|-------|----------------|---------------|
| **IPC** (`ipc/`) | Tauri command handlers; thin boundary for auth, correlation context, and mapping | `domains/tasks/ipc/task/facade.rs` |
| **Facade** (`mod.rs`) | Unified entry point; simplifies domain interaction for external callers (main.rs) | `domains/tasks/mod.rs` |
| **Application** (`application/`) | Use cases, transaction boundaries, authorization enforcement, orchestration | `domains/tasks/application/task_service.rs` |
| **Domain** (`domain/`) | Pure Rust structs, business rules, validation, entities, value objects — no I/O | `domains/tasks/domain/models/task.rs` |
| **Infrastructure** (`infrastructure/`) | SQLite repositories, raw SQL, external adapters | `domains/tasks/infrastructure/task_repository.rs` |

Data flow direction: **IPC → Facade → Application → Domain → Infrastructure**

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
- Application: `src-tauri/src/domains/tasks/application/task_service.rs`
- Repository: `src-tauri/src/domains/tasks/infrastructure/task_repository.rs`

### 2. Intervention Workflow (Start/Advance/Complete)

**Entry**: `frontend/src/app/interventions/[id]/page.tsx`

**Flow**:
1. Frontend calls `intervention_start` or `intervention_advance_step`
2. IPC handler validates session via `authenticate!` macro
3. Application service checks RBAC (technician role required)
4. Domain layer validates step prerequisites
5. Repository updates `interventions` table
6. Audit event logged
7. Sync operation enqueued

**Key Files**:
- Frontend: `frontend/src/domains/interventions/ipc/intervention.ipc.ts`
- IPC Start: `src-tauri/src/domains/interventions/ipc/intervention.rs` (`intervention_start`)
- IPC Advance: `src-tauri/src/domains/interventions/ipc/intervention.rs` (`intervention_advance_step`)
- Application: `src-tauri/src/domains/interventions/application/intervention_service.rs`

### 3. Calendar Scheduling Flow

**Entry**: `frontend/src/app/schedule/page.tsx`

**Flow**:
1. Calendar reads tasks via `calendar_get_tasks`
2. Drag-and-drop updates trigger `update_event` or `calendar_schedule_task`
3. Task `scheduled_date` field updated
4. Sync queue receives update operation

**Key Files**:
- Frontend: `frontend/src/domains/calendar/components/Calendar.tsx`
- IPC: `src-tauri/src/domains/calendar/ipc/calendar.rs` (`calendar_schedule_task`)

---

## Offline-First & Sync Architecture

**Primary Storage**: Local SQLite with WAL mode — source of truth always local.

**Sync Domain** (`src-tauri/src/domains/sync/`):

| Component | Purpose | Location |
|-----------|---------|----------|
| `SyncOperation` | Queue item model | `domain/models/sync.rs` |
| `OperationType` | `Create`, `Update`, `Delete` | `domain/models/sync.rs` |
| `EntityType` | `Task`, `Client`, `Intervention`, `Material`, etc. | `domain/models/sync.rs` |
| `SyncStatus` | `Pending`, `Processing`, `Completed`, `Failed`, `Abandoned` | `domain/models/sync.rs` |
| Background Service | Processes queue periodically | `application/sync_service.rs` |
| Queue Management | Enqueue/dequeue operations | `infrastructure/queue.rs` |

**Sync Flow**:
```
Local Change → Enqueue (sync_queue table) → Background Processor → Remote API (if online)
                                    ↓
                              On Failure: Retry with backoff → Max retries → Abandoned
```

**Key IPC Commands**:
- `sync_enqueue` — add operation to queue
- `sync_now` — trigger immediate sync
- `sync_get_status` — check queue status
- `sync_start_background_service` / `sync_stop_background_service`

**Sync Table**: `sync_queue` (created by sync domain infrastructure)

---

## Event Bus

**Location**: `src-tauri/src/shared/event_bus/`

- `bus.rs` — Global event bus with `InMemoryEventBus`
- `events.rs` — Domain events (`InterventionFinalized`, `MaterialConsumed`, etc.)

**Usage**: Cross-domain communication without direct imports. Events flow:
```
Domain Operation → Publish Event → Event Bus → Registered Handlers
```

---

## Database Architecture

**Pool**: `r2d2` with SQLite `rusqlite` driver.

**WAL Mode**: Enabled for high read/write concurrency.

**Key Components**:
- Connection: `src-tauri/src/db/connection.rs`
- Async Wrapper: `src-tauri/src/db/mod.rs` (`AsyncDatabase`)
- Transactions: `with_transaction()` method
- WAL Checkpoint: Manual via `checkpoint_wal` or automatic SQLite threshold

**Pool Stats Available**: `get_database_pool_stats` command.
