# 02 - Architecture and Data Flows

## Layered Architecture Overview

RPMA v2 follows a strict **four-layer architecture** that separates concerns and ensures maintainability.

```
┌───────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                         │
│   Next.js 14 (App Router) + React + TypeScript           │
│   - UI Components (shadcn/ui + Tailwind)                 │
│   - State Management (React Query + Zustand)             │
│   - IPC Client (frontend/src/lib/ipc/client.ts)          │
└───────────────────────────────────────────────────────────┘
                          │
                          │ Tauri IPC (invoke)
                          ↓
┌───────────────────────────────────────────────────────────┐
│                    COMMAND LAYER                          │
│   Tauri IPC Commands (src-tauri/src/commands/)            │
│   - Request validation                                    │
│   - Authorization checks (AuthMiddleware)                 │
│   - Session token validation (authenticate! macro)        │
│   - Response serialization (ApiResponse<T>)               │
└───────────────────────────────────────────────────────────┘
                          │
                          │ Function calls
                          ↓
┌───────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                          │
│   Business Logic (src-tauri/src/services/)                │
│   - Domain validation                                     │
│   - Workflow orchestration                                │
│   - Business rule enforcement                             │
│   - Event publishing (InMemoryEventBus)                   │
└───────────────────────────────────────────────────────────┘
                          │
                          │ Repository calls
                          ↓
┌───────────────────────────────────────────────────────────┐
│                  REPOSITORY LAYER                         │
│   Data Access (src-tauri/src/repositories/)               │
│   - SQL query construction                                │
│   - Transaction management                                │
│   - CRUD operations                                       │
└───────────────────────────────────────────────────────────┘
                          │
                          │ SQLite driver (rusqlite + r2d2 pool)
                          ↓
┌───────────────────────────────────────────────────────────┐
│                   DATABASE LAYER                          │
│   SQLite (WAL mode)                                       │
│   - Persistent storage                                    │
│   - ACID transactions                                     │
│   - Indexes for performance                               │
└───────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Purpose | Examples | Never Do |
|-------|---------|----------|----------|
| **Frontend** | User interaction & display | Render forms, call IPC via `ipcClient` | Direct database access, business logic |
| **Command** | IPC entry point, auth | `authenticate!` macro, check permissions | Complex business logic, direct DB queries |
| **Service** | Business logic | Enforce workflow rules, publish events | Direct SQL, UI concerns |
| **Repository** | Data access | CRUD operations, queries | Business rules, authorization |
| **Database** | Persistence | Store data, enforce FK constraints | Application logic |

---

## Data Flow Diagrams

### Flow 1: Task Creation

```
┌─────────────┐
│   Frontend  │  User fills out "Create Task" form
└──────┬──────┘
       │ IPC: task_crud { action: Create { data } }
       ↓
┌──────────────────────────────────────────┐
│  Command: task_crud                       │  1. authenticate!(session_token, state)
│  (src-tauri/src/commands/task/facade.rs) │  2. Match action → TaskAction::Create
└──────┬───────────────────────────────────┘
       │ task_service.create_task(data)
       ↓
┌────────────────────────────────────────────┐
│  Service: TaskCreationService::create_task │  1. Validate business rules
│  (src-tauri/src/services/task_creation.rs) │  2. Generate task_number
└──────┬─────────────────────────────────────┘  3. Set timestamps
       │ task_repo.create(task)                 4. Publish TaskCreated event
       ↓
┌──────────────────────────────────────────────┐
│  Repository: TaskRepository::create          │  1. Build INSERT query
│  (src-tauri/src/repositories/task_repository)│  2. Execute in transaction
└──────┬───────────────────────────────────────┘  3. Return created task
       │ INSERT INTO tasks ...
       ↓
┌─────────────┐
│   SQLite    │  Task row inserted
└─────────────┘
```

**Key Validations**:
- Command layer: Session valid, user has `Admin` or `Supervisor` role
- Service layer: `title` not empty, valid status transition
- Repository layer: Unique constraint on `task_number`

---

### Flow 2: Start Intervention Workflow

```
┌─────────────┐
│  Frontend   │  Technician clicks "Start Intervention"
└──────┬──────┘
       │ IPC: intervention_start { task_id, request }
       ↓
┌───────────────────────────────────────────┐
│  Command: intervention_start               │  1. authenticate!(session_token, state)
│  (src-tauri/src/commands/intervention/     │  2. Verify user assigned to task
│   workflow.rs)                             │
└──────┬────────────────────────────────────┘
       │ intervention_service.start_intervention(...)
       ↓
┌─────────────────────────────────────────────────────────┐
│  Service: InterventionWorkflowService::start_intervention│  1. Check: no active intervention
│  (src-tauri/src/services/intervention_workflow.rs)       │  2. Load task details
└──────┬───────────────────────────────────────────────────┘  3. Create intervention
       │                                                        4. Create workflow steps
       │ with_transaction:                                     5. Set task.status = "in_progress"
       │   intervention_repo.create(intervention)             6. Publish InterventionStarted
       │   step_repo.create_batch(steps)
       │   task_repo.update_status(task_id, "in_progress")
       ↓
┌──────────────────────────────────────────────┐
│  Repository: InterventionRepository::create  │  BEGIN TRANSACTION
└──────┬───────────────────────────────────────┘    INSERT INTO interventions ...
       │                                            INSERT INTO intervention_steps ...
       │                                            UPDATE tasks SET status = 'in_progress'
       │                                          COMMIT
       ↓
┌─────────────┐
│   SQLite    │  Intervention + Steps created, Task updated
└─────────────┘
```

**Business Rules Enforced**:
- Task must be in `assigned` or `draft` status
- User must be the assigned technician OR have `Supervisor`/`Admin` role
- No other intervention can be `in_progress` for this task

---

### Flow 3: Advance Intervention Step

```
┌─────────────┐
│  Frontend   │  Technician marks step as "Complete"
└──────┬──────┘
       │ IPC: intervention_advance_step { intervention_id, step_id, data }
       ↓
┌────────────────────────────────────────┐
│  Command: intervention_advance_step     │  1. authenticate!(session_token, state)
│  (src-tauri/src/commands/intervention/  │  2. Validate step ownership
│   workflow.rs)                          │
└──────┬─────────────────────────────────┘
       │ intervention_service.advance_step(...)
       ↓
┌──────────────────────────────────────────────────────┐
│  Service: InterventionWorkflow::advance_step         │  1. Load intervention + step
│  (src-tauri/src/services/intervention_workflow.rs)   │  2. Validate step order
└──────┬───────────────────────────────────────────────┘  3. Save photo (if any)
       │                                                    4. Mark step as "completed"
       │ with_transaction:                                 5. Check if all steps done
       │   photo_service.save_photo(file_data, ...)       6. If done → finalize intervention
       │   step_repo.update_status(step_id, "completed")
       │   if all_steps_done: intervention_repo.mark_complete(id)
       ↓
┌─────────────┐
│   SQLite    │  Photo + Step updated, possibly Intervention completed
└─────────────┘
```

---

### Flow 4: Calendar Scheduling with Conflict Detection

```
┌─────────────┐
│  Frontend   │  User schedules task for date/time, assigns technician
└──────┬──────┘
       │ IPC: calendar_schedule_task { task_id, start, end, technician_id }
       ↓
┌────────────────────────────────────────┐
│  Command: calendar_schedule_task       │  1. authenticate!(session_token, state)
│  (src-tauri/src/commands/calendar.rs)  │  2. Check RBAC (Supervisor/Admin)
└──────┬─────────────────────────────────┘
       │ calendar_service.schedule_task(...)
       ↓
┌──────────────────────────────────────────────────────────┐
│  Service: CalendarService::schedule_task                 │  1. Check conflicts
│  (src-tauri/src/services/calendar.rs)                    │  2. If conflict: return error
└──────┬───────────────────────────────────────────────────┘  3. Create calendar event
       │                                                        4. Update task scheduled_date
       │ calendar_repo.check_conflicts(tech_id, start, end)
       │ if conflicts.is_empty():
       │   with_transaction:
       │     calendar_repo.create_event(event)
       │     task_repo.update_scheduled_date(task_id, start)
       ↓
┌─────────────┐
│   SQLite    │  Event and Task updated
└─────────────┘
```

**Conflict Query**:
```sql
SELECT * FROM calendar_tasks 
WHERE technician_id = ? 
  AND (start_datetime < ? AND end_datetime > ?)
```

---

## Offline-First + Sync Queue Architecture

### Current Implementation

RPMA v2 is **fully offline** with sync queue for future server synchronization.

```
┌─────────────────────────────────────────────────────────────┐
│  Service Layer (any mutation operation)                     │
│  - Sets entity.synced = false                               │
│  - Sets entity.last_synced_at = None                        │
└──────────────────────────┬──────────────────────────────────┘
                           │ After successful DB write
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Sync Queue Service (src-tauri/src/sync/queue.rs)           │
│  - enqueue(operation): Add to sync_queue table              │
│  - dequeue_batch(limit): Get pending operations             │
│  - mark_completed(id) / mark_failed(id, error)              │
└──────────────────────────┬──────────────────────────────────┘
                           │ Background worker (30s interval)
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Background Sync Service (src-tauri/src/sync/background.rs) │
│  - Check network connectivity                               │
│  - Process pending operations                               │
│  - Handle conflicts (LastWriteWins, ClientWins, ServerWins) │
│  - Update entity.synced = true on success                   │
└─────────────────────────────────────────────────────────────┘
```

**Frontend Offline Hooks**:
- `useOfflineSync` - Main offline/online detection and queue management
- `useOfflineQueue` - Full-featured offline queue with localStorage persistence
- `useSyncStatus` - Backend sync status polling (5s interval)
- `useEntitySyncStatus` - Check sync status for specific entity
- `useConnectionStatus` - Simple online/offline detection

**Sync Queue Table** (`sync_queue`):
- `operation_type`: Create, Update, Delete
- `entity_type`: Task, Client, Intervention, Step, Photo, User
- `status`: Pending, Processing, Completed, Failed, Abandoned
- `dependencies`: JSON array for dependency-aware processing

---

## Event Bus for Side Effects

RPMA v2 uses an **in-memory event bus** to decouple domain events from their side effects.

**Location**: `src-tauri/src/services/event_bus.rs`

```
┌──────────────────────────────┐
│  Service Layer               │  InterventionService::start_intervention()
└──────────────┬───────────────┘
               │ 1. Execute business logic
               │ 2. Persist to DB
               │ 3. event_bus.publish(InterventionStarted { ... })
               ↓
┌──────────────────────────────────────────────────────────┐
│  Event Bus (InMemoryEventBus)                            │
│  - handlers: HashMap<event_type, Vec<EventHandler>>      │
│  - register_handler(handler)                             │
│  - publish(event) → dispatches to all handlers           │
└───────────────────────────────────────────────────────────┘
               │
               ├─→ [Notification Handler] → Create notification
               ├─→ [Cache Handler] → Invalidate cache
               ├─→ [Audit Handler] → Log to audit_events
               └─→ [Sync Handler] → Add to sync_queue
```

**Domain Event Types** (`src-tauri/src/services/event_system.rs`):
- Task: `TaskCreated`, `TaskUpdated`, `TaskAssigned`, `TaskStatusChanged`, `TaskCompleted`
- Intervention: `InterventionStarted`, `InterventionStepStarted`, `InterventionStepCompleted`, `InterventionCompleted`
- Auth: `AuthenticationSuccess`, `AuthenticationFailed`
- Material: `MaterialConsumed`

---

## Transaction Boundaries

### When to Use Transactions

✅ **Always use transactions for**:
- Multi-table updates (e.g., creating intervention + steps)
- Ensuring consistency (e.g., decrement stock + record consumption)
- Complex workflows with rollback needs

### Transaction Helpers

```rust
// Sync API
db.with_transaction(|tx| {
    tx.execute("INSERT INTO ...", params)?;
    tx.execute("UPDATE ...", params)?;
    Ok(result)
})?;

// Async API
async_db.with_transaction_async(move |tx| {
    Ok(result)
}).await?;
```

---

## Performance Optimizations

### 1. Connection Pooling
- **Pool**: r2d2 with max 10 connections, min 2 idle
- **WAL mode**: Allows concurrent reads while writing
- **DynamicPoolManager**: Adjusts pool size based on load

### 2. Query Performance Monitoring
- `QueryPerformanceMonitor` tracks slow queries (>100ms)
- `PreparedStatementCache` tracks statement usage

### 3. Streaming Large Result Sets
- `ChunkedQuery` in `src-tauri/src/db/connection.rs`
- `StreamingTaskRepository` for large task lists
- Configurable chunk_size (default 1000)

### 4. Caching
- `CacheService` with TTL support
- IPC response caching via `cachedInvoke` in `frontend/src/lib/ipc/cache.ts`
- `cache_metadata` table for persistent cache

---

## Next Steps

- **Frontend patterns**: [03_FRONTEND_GUIDE.md](./03_FRONTEND_GUIDE.md)
- **Backend patterns**: [04_BACKEND_GUIDE.md](./04_BACKEND_GUIDE.md)
- **IPC API reference**: [05_IPC_API_AND_CONTRACTS.md](./05_IPC_API_AND_CONTRACTS.md)
