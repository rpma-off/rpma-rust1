# 02 - Architecture and Data Flows

## Layered Architecture Overview

RPMA v2 follows a strict **four-layer architecture** that separates concerns and ensures maintainability.

```
┌───────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                         │
│   Next.js 14 (App Router) + React + TypeScript           │
│   - UI Components                                         │
│   - State Management (React Query + Zustand)              │
│   - Client-side validation                                │
└───────────────────────────────────────────────────────────┘
                          │
                          │ Tauri IPC (JSON over WebSocket-like)
                          ↓
┌───────────────────────────────────────────────────────────┐
│                    COMMAND LAYER                          │
│   Tauri IPC Commands (Rust)                               │
│   - Request validation                                    │
│   - Authorization checks (RBAC)                           │
│   - Session token validation                              │
│   - Response serialization                                │
└───────────────────────────────────────────────────────────┘
                          │
                          │ Function calls
                          ↓
┌───────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                          │
│   Business Logic (Rust)                                   │
│   - Domain validation                                     │
│   - Workflow orchestration                                │
│   - Business rule enforcement                             │
│   - Event publishing                                      │
└───────────────────────────────────────────────────────────┘
                          │
                          │ Repository calls
                          ↓
┌───────────────────────────────────────────────────────────┐
│                  REPOSITORY LAYER                         │
│   Data Access (Rust)                                      │
│   - SQL query construction                                │
│   - Transaction management                                │
│   - ORM-like operations                                   │
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
| **Frontend** | User interaction & display | Render forms, validate input, call IPC | Direct database access, business logic |
| **Command** | IPC entry point, auth | Validate session token, check permissions | Complex business logic, direct DB queries |
| **Service** | Business logic | Enforce workflow rules, calculate totals | Direct SQL, UI concerns |
| **Repository** | Data access | CRUD operations, queries | Business rules, authorization |
| **Database** | Persistence | Store data, enforce FK constraints | Application logic |

### Key Principles

1. **One-way dependencies**: Each layer only depends on the layer directly below it
2. **No layer skipping**: Frontend → Command → Service → Repository → Database
3. **Type safety across the boundary**: Rust models export TypeScript types via `ts-rs`

---

## Data Flow Diagrams

### Flow 1: Task Creation

```
┌─────────────┐
│   Frontend  │  User fills out "Create Task" form
└──────┬──────┘
       │ IPC: task_create { data: CreateTaskRequest }
       ↓
┌──────────────────────────┐
│  Command: task_create    │  1. Validate session token
│  (task/create.rs)        │  2. Check RBAC (Admin/Supervisor only)
└──────┬───────────────────┘
       │ task_service.create_task(data)
       ↓
┌────────────────────────────────────┐
│  Service: TaskService::create_task │  1. Validate business rules
│  (services/task_creation.rs)       │     - Required fields present
└──────┬─────────────────────────────┘     - Valid status transitions
       │                                    2. Generate task_number
       │ task_repo.create(task)             3. Set timestamps
       ↓
┌──────────────────────────────────────┐
│  Repository: TaskRepository::create  │  1. Build INSERT query
│  (repositories/task_repository.rs)   │  2. Execute in transaction
└──────┬───────────────────────────────┘  3. Return created task
       │ INSERT INTO tasks ...
       ↓
┌─────────────┐
│   SQLite    │  Task row inserted
└──────┬──────┘
       │ Return Task entity
       ↓
       │ Propagate back up the stack
       ↓
┌─────────────┐
│  Frontend   │  Receive ApiResponse<Task>
└─────────────┘  Update UI with new task
```

**Code Paths**:
- Frontend: `frontend/src/app/tasks/new/page.tsx` → `frontend/src/lib/ipc/domains/tasks.ts`
- Command: `src-tauri/src/commands/task/facade.rs` (handled via `task_crud` command with `TaskAction::Create`)
- Service: `src-tauri/src/services/task_creation.rs`
- Repository: `src-tauri/src/repositories/task_repository.rs`

**Key Validations**:
- Command layer: Session valid, user has `Admin` or `Supervisor` role
- Service layer: `title` not empty, `client_id` exists (if provided), `status` is `draft`
- Repository layer: Unique constraint on `task_number`

---

### Flow 2: Start Intervention Workflow

```
┌─────────────┐
│  Frontend   │  Technician clicks "Start Intervention" on task T-123
└──────┬──────┘
       │ IPC: intervention_start { task_id, task_number }
       ↓
┌───────────────────────────────────┐
│  Command: intervention_start      │  1. Validate session token
│  (intervention/start.rs)          │  2. Check RBAC (Technician+ can start)
└──────┬────────────────────────────┘  3. Verify user assigned to task
       │ intervention_service.start_intervention(task_id, user_id)
       ↓
┌─────────────────────────────────────────────────────┐
│  Service: InterventionService::start_intervention   │  1. Check: no active intervention exists for task
│  (services/intervention_workflow.rs)                │  2. Load task details
└──────┬──────────────────────────────────────────────┘  3. Create intervention entity
       │                                                   4. Create workflow steps from template
       │ with_transaction:                                5. Set task.status = "in_progress"
       │   intervention_repo.create(intervention)         6. Publish "InterventionStarted" event
       │   step_repo.create_batch(steps)
       │   task_repo.update_status(task_id, "in_progress")
       ↓
┌──────────────────────────────────────────────┐
│  Repository: InterventionRepository::create  │  BEGIN TRANSACTION
│  (repositories/intervention_repository.rs)   │    INSERT INTO interventions ...
└──────┬───────────────────────────────────────┘    INSERT INTO intervention_steps ... (batch)
       │                                              UPDATE tasks SET status = 'in_progress' ...
       │                                              COMMIT
       ↓
┌─────────────┐
│   SQLite    │  Intervention + Steps created, Task updated
└──────┬──────┘
       │ Return Intervention with Steps
       ↓
       │ intervention_service publishes event
       ↓
┌──────────────────┐
│   Event Bus      │  Trigger side effects:
│  (event_bus)     │  - Create notification for supervisor
└──────┬───────────┘  - Update dashboard stats cache
       │
       ↓
┌─────────────┐
│  Frontend   │  Receive ApiResponse<Intervention>
└─────────────┘  Navigate to intervention execution screen
```

**Code Paths**:
- Frontend: `frontend/src/components/tasks/TaskDetailView.tsx` → `frontend/src/lib/ipc/domains/intervention.ts`
- Command: `src-tauri/src/commands/intervention/workflow.rs` (handled via `intervention_start` or `intervention_workflow` commands)
- Service: `src-tauri/src/services/intervention_workflow.rs`
- Repository: `src-tauri/src/repositories/intervention_repository.rs`

**Business Rules Enforced**:
- Task must be in `assigned` or `draft` status
- User must be the assigned technician OR have `Supervisor`/`Admin` role
- No other intervention can be `in_progress` for this task
- Workflow steps are created from predefined template (TODO: verify template location)

---

### Flow 3: Advance Intervention Step → Complete → Upload Photo

```
┌─────────────┐
│  Frontend   │  Technician marks step 1 as "Complete" and uploads photo
└──────┬──────┘
       │ IPC: intervention_advance_step { 
       │   intervention_id, 
       │   step_id, 
       │   photo_file: base64_string,
       │   notes: "Applied film to hood"
       │ }
       ↓
┌────────────────────────────────────────┐
│  Command: intervention_advance_step    │  1. Validate session + RBAC
│  (intervention/advance_step.rs)        │  2. Decode photo from base64
└──────┬─────────────────────────────────┘  3. Validate file size/format
       │ intervention_service.advance_step(intervention_id, step_id, photo, notes)
       ↓
┌──────────────────────────────────────────────────────┐
│  Service: InterventionWorkflow::advance_step         │  1. Load intervention + step
│  (services/intervention_workflow.rs)                 │  2. Validate step order (must advance sequentially)
└──────┬───────────────────────────────────────────────┘  3. Save photo to disk
       │                                                    4. Mark step as "completed"
       │ with_transaction:                                 5. Check if all steps done → mark intervention complete
       │   photo_service.save_photo(file_data, intervention_id, step_id)
       │   step_repo.update_status(step_id, "completed")
       │   if all_steps_done: intervention_repo.mark_complete(intervention_id)
       ↓
┌──────────────────────────────────────┐
│  Photo Service: save_photo           │  1. Generate UUID filename
│  (services/photo/save.rs)            │  2. Write to app_data_dir/photos/
└──────┬───────────────────────────────┘  3. Create photo DB record
       │
       ↓
┌─────────────────────────────────────────┐
│  Repository: PhotoRepository::create    │  INSERT INTO photos (id, file_path, ...)
└──────┬──────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────┐
│  Repository: StepRepository::update      │  UPDATE intervention_steps 
└──────┬───────────────────────────────────┘    SET status='completed', completed_at=...
       │
       ↓
┌─────────────┐
│   SQLite    │  Photo + Step updated, possibly Intervention completed
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Frontend   │  Receive success response, show next step
└─────────────┘
```

**Code Paths**:
- Frontend: `frontend/src/components/workflow/ppf/` components
- Command: `src-tauri/src/commands/intervention/workflow.rs`
- Service: `src-tauri/src/services/intervention_workflow.rs`, `src-tauri/src/services/photo/` (upload.rs, storage.rs, processing.rs)
- Repository: `src-tauri/src/repositories/photo_repository.rs`

**Business Rules**:
- Steps must be completed in sequential order (step 1 before step 2)
- Required steps cannot be skipped
- Photo is optional or required based on step configuration
- If intervention completes, task status updates to `completed`

---

### Flow 4: Calendar Scheduling with Conflict Detection

```
┌─────────────┐
│  Frontend   │  User schedules task T-456 for 2026-02-15 10:00-12:00, assigns to Tech Alice
└──────┬──────┘
       │ IPC: calendar_schedule_task { task_id, start_time, end_time, technician_id }
       ↓
┌────────────────────────────────────────┐
│  Command: calendar_schedule_task       │  1. Validate session + RBAC
│  (calendar/schedule.rs)                │  2. Parse timestamps
└──────┬─────────────────────────────────┘
       │ calendar_service.schedule_task(task_id, start, end, tech_id)
       ↓
┌──────────────────────────────────────────────────────────┐
│  Service: CalendarService::schedule_task                 │  1. Check conflicts (parallel tasks for same tech)
│  (services/calendar.rs)                                  │  2. If conflict: return error
└──────┬───────────────────────────────────────────────────┘  3. Create calendar event
       │                                                        4. Update task with scheduled date
       │ calendar_repo.check_conflicts(tech_id, start, end)
       │ if conflicts.is_empty():
       │   with_transaction:
       │     calendar_repo.create_event(event)
       │     task_repo.update_scheduled_date(task_id, start)
       ↓
┌──────────────────────────────────────────────┐
│  Repository: CalendarEventRepository         │  SELECT conflicts:
│  (repositories/calendar_event_repository.rs) │    WHERE technician_id = ? 
└──────┬───────────────────────────────────────┘      AND (start_time < ? AND end_time > ?)
       │ (no conflicts)
       ↓
┌──────────────────────────────────────────────┐
│  Repository: Create event + Update task      │  INSERT INTO calendar_events ...
│                                              │  UPDATE tasks SET scheduled_date=?
└──────┬───────────────────────────────────────┘
       │
       ↓
┌─────────────┐
│   SQLite    │  Event and Task updated
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Frontend   │  Calendar UI updated, event visible
└─────────────┘
```

**Code Paths**:
- Frontend: `frontend/src/app/schedule/page.tsx` → `frontend/src/lib/ipc/domains/calendar.ts`
- Command: `src-tauri/src/commands/calendar.rs`
- Service: `src-tauri/src/services/calendar.rs`, `src-tauri/src/services/calendar_event_service.rs`
- Repository: `src-tauri/src/repositories/calendar_event_repository.rs`

**Business Rules**:
- A technician cannot have overlapping appointments
- Scheduling requires `Supervisor` or `Admin` role
- Task scheduled date syncs with calendar event

---

## Offline-First + Sync Queue Architecture

### Current State (v2.0)

RPMA v2 is **fully offline**. All operations execute against the local SQLite database. No network calls are made.

### Future Sync Design (TODO: not yet implemented)

```
┌─────────────────────────────────────────────────────────────┐
│  Service Layer (any mutation operation)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ After successful DB write
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Sync Queue Service                                         │
│  - Enqueue operation: { type, entity, payload, timestamp }  │
│  - Store in sync_queue table                                │
└──────────────────────────┬──────────────────────────────────┘
                           │ Background worker polls queue
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Background Sync Service                                    │
│  - Check network connectivity                               │
│  - Batch pending operations                                 │
│  - Send to central server via HTTP                          │
│  - Handle conflicts (last-write-wins or manual resolution)  │
│  - Mark operations as synced                                │
└─────────────────────────────────────────────────────────────┘
```

**Implementation References**:
- Sync Queue model: `src-tauri/src/models/sync.rs`
- Sync service: `src-tauri/src/sync/` (partially implemented)
- Background worker: `src-tauri/src/sync/background_sync.rs`

---

## Event Bus for Side Effects

RPMA v2 uses an **in-memory event bus** to decouple domain events from their side effects.

### Architecture

```
┌──────────────────────────────┐
│  Service Layer               │  Example: InterventionService::start_intervention()
└──────────────┬───────────────┘
               │ 1. Execute business logic
               │ 2. Persist to DB
               │ 3. Publish event: InterventionStarted { intervention_id, task_id, user_id }
               ↓
┌──────────────────────────────────────────────────────────┐
│  Event Bus (InMemoryEventBus)                            │
│  - Maintain list of subscribers                          │
│  - Dispatch events to all registered handlers            │
└──────────────┬───────────────────────────────────────────┘
               │
               ├─→ [Notification Handler] → Create notification for supervisor
               ├─→ [Cache Handler] → Invalidate dashboard cache
               ├─→ [Audit Handler] → Log event to audit_logs table
               └─→ [Sync Handler] → Add to sync queue (future)
```

**Code Path**: `src-tauri/src/services/event_bus.rs`

### Example Events

**Task Events:**
- `TaskCreated { task_id, task_number, title, user_id }`
- `TaskAssigned { task_id, technician_id, assigned_by }`
- `TaskUpdated { task_id, changed_fields }`
- `TaskStatusChanged { task_id, old_status, new_status }`
- `TaskCompleted { task_id }`

**Intervention Events:**
- `InterventionStarted { intervention_id, task_id, started_by }`
- `InterventionStepStarted { intervention_id, step_id }`
- `InterventionStepCompleted { intervention_id, step_id }`
- `InterventionCompleted { intervention_id, completed_by, quality_score }`
- `InterventionCancelled { intervention_id, reason }`

**Authentication Events:**
- `AuthenticationSuccess { user_id }`
- `AuthenticationFailed { user_id, reason }`

**System Events:**
- `SystemError { error_code, message }`
- `PerformanceAlert { metric, threshold, current_value }`

**Benefits**:
- Decouples core logic from side effects
- Enables async processing (notifications, analytics)
- Easy to add new listeners without modifying core services

---

## Transaction Boundaries

### When to Use Transactions

✅ **Always use transactions for**:
- Multi-table updates (e.g., creating intervention + steps)
- Ensuring consistency (e.g., decrement stock + record consumption)
- Complex workflows with rollback needs

❌ **Don't use transactions for**:
- Single row read queries
- Simple single-table inserts/updates
- Read-only operations

### Transaction Helpers

**Sync API**:
```rust
// In Repository or Service
db.with_transaction(|tx| {
    // Execute multiple operations
    tx.execute("INSERT INTO ...", params)?;
    tx.execute("UPDATE ...", params)?;
    Ok(result)
})?;
// Transaction auto-commits on Ok, rolls back on Err
```

**Async API**:
```rust
async_db.with_transaction_async(move |tx| {
    // Same as sync but wrapped in spawn_blocking
    Ok(result)
}).await?;
```

---

## Performance Optimizations

### 1. Connection Pooling
- **Pool**: r2d2 with 8-16 connections (configurable via `PoolConfig`)
- **WAL mode**: Allows concurrent reads while writing
- **Monitoring**: `DynamicPoolManager` tracks wait times and adjusts pool size

### 2. Query Performance Monitoring
- Slow queries (>100ms) automatically logged
- `QueryPerformanceMonitor` tracks all queries
- Access stats: `db.get_performance_stats()`

### 3. Prepared Statement Caching
- `PreparedStatementCache` tracks prepared statement usage statistics
- rusqlite handles caching internally via `prepare_cached()`
- Cache stats: `db.stmt_cache().stats()`

### 4. Streaming Large Result Sets
- `ChunkedQuery` in `src-tauri/src/db/connection.rs` provides paginated streaming
- `StreamingTaskRepository` in `src-tauri/src/repositories/task_repository_streaming.rs`
- `StreamingConfig` with configurable chunk_size (default 1000) and streaming_threshold (default 5000)
- Example: Task list with 10,000+ tasks

---

## Next Steps

- **Frontend patterns**: [03_FRONTEND_GUIDE.md](./03_FRONTEND_GUIDE.md)
- **Backend patterns**: [04_BACKEND_GUIDE.md](./04_BACKEND_GUIDE.md)
- **IPC API reference**: [05_IPC_API_AND_CONTRACTS.md](./05_IPC_API_AND_CONTRACTS.md)
