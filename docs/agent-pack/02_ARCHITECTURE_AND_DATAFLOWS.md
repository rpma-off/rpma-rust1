# 02 - Architecture and Data Flows

## Layered runtime architecture

```text
Frontend (Next.js app routes/components/hooks)
  -> IPC wrapper (safeInvoke / domain ipc)
    -> Tauri command handlers (domains/*/ipc or commands/*)
      -> Domain services/application + repositories
        -> SQLite (schema + migrations, WAL)
```

Key pointers:
- Frontend entry: `frontend/src/app/layout.tsx`, `frontend/src/app/RootClientLayout.tsx`
- IPC wrapper: `frontend/src/lib/ipc/utils.ts`, `frontend/src/lib/ipc/commands.ts`
- Command registration: `src-tauri/src/main.rs`
- Command implementations: `src-tauri/src/domains/*/ipc/**/*.rs`, `src-tauri/src/commands/*.rs`
- DB init/migrate: `src-tauri/src/main.rs`, `src-tauri/src/db/migrations.rs`

## Flow: task creation

```text
/tasks/new page (frontend/src/app/tasks/new/page.tsx)
  -> TaskForm (frontend/src/domains/tasks/components/TaskForm/*)
    -> taskIpc.create (frontend/src/domains/tasks/ipc/task.ipc.ts)
      -> task_crud command (src-tauri/src/domains/tasks/ipc/task/facade.rs)
        -> TaskService (src-tauri/src/domains/tasks/infrastructure/task.rs)
          -> INSERT into tasks (schema/migrations)
```

Checks performed across layers:
- session token validation (`authenticate!` macro)
- RBAC checks (`AuthMiddleware`)
- domain validation (CreateTaskRequest::validate)
- DB constraints (CHECKs, unique indexes)

## Flow: intervention step advance / complete

```text
workflow UI (/tasks/[id]/workflow/*)
  -> interventionsIpc.advanceStep/saveStepProgress/finalize
     (frontend/src/domains/interventions/ipc/interventions.ipc.ts)
    -> intervention_progress / intervention_workflow commands
       (src-tauri/src/domains/interventions/ipc/intervention/queries.rs + workflow.rs)
      -> intervention services/repos
        -> update intervention_steps/interventions (+ photos via documents domain)
```

## Flow: calendar updates

```text
/schedule page (frontend/src/app/schedule/page.tsx)
  -> calendar IPC wrapper (frontend/src/domains/calendar/ipc/calendar.ts)
    -> get_events / create_event / update_event / calendar_schedule_task
       (src-tauri/src/domains/calendar/ipc/calendar.rs)
      -> CalendarEventService / CalendarService
        -> calendar_events table (+ task scheduling updates)
```

## Offline-first: sync queue + event bus

### Sync queue
- IPC: `src-tauri/src/domains/sync/ipc/queue.rs`, `src-tauri/src/domains/sync/ipc/sync.rs`
- Domain model/infra: `src-tauri/src/domains/sync/domain/models/sync.rs`, `src-tauri/src/domains/sync/infrastructure/sync/*`
- Storage: `sync_queue` table (`src-tauri/src/db/schema.sql`)

### Event bus
- Shared bus implementation: `src-tauri/src/shared/services/event_bus.rs`
- App-level event bus in state: `src-tauri/src/shared/app_state.rs`
- Startup wiring via service builder: `src-tauri/src/service_builder.rs`

## Correlation and tracing in dataflow

- Frontend injects `correlation_id` in `safeInvoke` by default (`frontend/src/lib/ipc/utils.ts`).
- Backend command helpers initialize/update correlation context (`src-tauri/src/shared/ipc/correlation.rs`).
- Response envelopes can carry `correlation_id` (`src-tauri/src/shared/ipc/response.rs`).
