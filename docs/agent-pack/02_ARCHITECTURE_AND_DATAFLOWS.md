# 02 - Architecture and Data Flows

## Layered runtime architecture

```text
Frontend (Next.js app routes/components/hooks)
  -> IPC wrapper (safeInvoke / domain ipc)
    -> Tauri command handlers (domains/*/ipc)
      -> Domain services/application + repositories (domains/*/infrastructure)
        -> SQLite (db/schema + migrations, WAL)
```

Key pointers:
- Frontend entry: `frontend/src/app/layout.tsx`, `frontend/src/app/RootClientLayout.tsx`
- IPC wrapper: `frontend/src/lib/ipc/utils.ts`, `frontend/src/lib/ipc/client.ts`
- Command registration: `src-tauri/src/main.rs` (135+ commands)
- Command implementations: `src-tauri/src/domains/*/ipc/**/*.rs`
- DB init/migrate: `src-tauri/src/main.rs`, `src-tauri/src/db/migrations.rs`

## Flow: task creation

```text
/tasks/new page (frontend/src/app/tasks/new/page.tsx)
  -> frontend task IPC (frontend/src/domains/tasks/ipc/task.ipc.ts)
    -> task_crud command (src-tauri/src/domains/tasks/ipc/task/facade.rs)
      -> task service/repo (src-tauri/src/domains/tasks/infrastructure/*)
        -> INSERT into tasks (schema/migrations)
```

Checks performed across layers:
- session/token validation
- role/operation permission checks
- domain validation + DB constraints

## Flow: intervention step advance / complete

```text
intervention/workflow UI (frontend/src/domains/interventions/*)
  -> interventions IPC wrapper (frontend/src/domains/interventions/ipc/interventions.ipc.ts)
    -> intervention_advance_step / intervention_save_step_progress / intervention_finalize
       (src-tauri/src/domains/interventions/ipc/intervention/queries.rs + workflow.rs)
      -> intervention workflow services/repos
        -> update intervention_steps/interventions + optional photo/doc updates
```

## Flow: calendar updates

```text
schedule page (frontend/src/app/schedule/page.tsx)
  -> calendar IPC wrapper (frontend/src/domains/calendar/ipc/calendar.ts)
    -> get_events / create_event / update_event / calendar_schedule_task
       (src-tauri/src/domains/calendar/ipc/calendar.rs)
      -> calendar infra services/repos
        -> calendar_events + related task scheduling updates
```

## Offline-first: sync queue + event bus

### Sync queue
- IPC: `src-tauri/src/domains/sync/ipc/queue.rs`, `src-tauri/src/domains/sync/ipc/sync.rs`
- Domain model/infra: `src-tauri/src/domains/sync/domain/models/sync.rs`, `src-tauri/src/domains/sync/infrastructure/sync/*`
- Storage: `sync_queue` table (`src-tauri/src/db/schema.sql`)

### Event bus
- Shared bus implementation: `src-tauri/src/shared/services/event_bus.rs`
- App-level event bus service in state: `src-tauri/src/shared/app_state.rs` (`event_bus`)
- Startup wiring via service builder: `src-tauri/src/service_builder.rs`

## Correlation and tracing in dataflow

- Frontend injects `correlation_id` in `safeInvoke` by default (`frontend/src/lib/ipc/utils.ts`).
- Backend command helpers initialize/update correlation context (`src-tauri/src/shared/ipc/correlation.rs`).
- Response envelopes can carry `correlation_id` (`src-tauri/src/shared/ipc/response.rs`).
