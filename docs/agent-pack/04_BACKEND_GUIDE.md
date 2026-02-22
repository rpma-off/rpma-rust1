# 04 - Backend Guide

## Backend structure (current)

- App entry and command registration: `src-tauri/src/main.rs`
- Shared app state: `src-tauri/src/shared/app_state.rs`
- DB infra: `src-tauri/src/db/*`
- Bounded contexts: `src-tauri/src/domains/*`

Each bounded context typically contains:
- `application/`
- `domain/`
- `infrastructure/`
- `ipc/`
- `tests/`

## Implementing a command end-to-end

Example reference: tasks domain.

1. **Domain/application/infrastructure**
   - models/rules: `src-tauri/src/domains/tasks/domain/*`
   - service/repository logic: `src-tauri/src/domains/tasks/infrastructure/*`
2. **IPC handler**
   - implement command in `src-tauri/src/domains/tasks/ipc/task/*.rs`
3. **Register command**
   - add to `tauri::generate_handler![...]` in `src-tauri/src/main.rs`
4. **Frontend caller**
   - use/update wrapper in `frontend/src/domains/tasks/ipc/task.ipc.ts`
5. **Type sync (if exported types changed)**
   - `npm run types:sync`

## Canonical command examples

- Auth: `src-tauri/src/domains/auth/ipc/auth.rs`
- Tasks: `src-tauri/src/domains/tasks/ipc/task/facade.rs`
- Clients: `src-tauri/src/domains/clients/ipc/client.rs`
- Interventions: `src-tauri/src/domains/interventions/ipc/intervention/*`
- Inventory: `src-tauri/src/domains/inventory/ipc/material.rs`
- Calendar: `src-tauri/src/domains/calendar/ipc/calendar.rs`
- Reports: `src-tauri/src/domains/reports/ipc/reports/*`

## Error model

Primary shared error contract:
- `src-tauri/src/shared/ipc/errors.rs` (`AppError`)

Primary response envelope:
- `src-tauri/src/shared/ipc/response.rs` (`ApiResponse<T>`, `CompressedApiResponse`)

Sanitization rule:
- Internal/database/network/io/config errors are sanitized before frontend exposure (`sanitize_for_frontend`).

## Logging and correlation

- Tracing setup: `src-tauri/src/main.rs` (`init_tracing`)
- Correlation helpers: `src-tauri/src/shared/ipc/correlation.rs`
- Frontend propagation: `frontend/src/lib/ipc/utils.ts`

## Where SQL should live

- SQL belongs in infrastructure/repository layers and DB modules (`src-tauri/src/domains/*/infrastructure`, `src-tauri/src/db`).
- Avoid business logic inside IPC handlers; handlers should authenticate/validate/delegate.

## DOC vs CODE mismatch

- Legacy references to `src-tauri/src/commands/*` as primary implementations are often compatibility surfaces; active handlers are in `src-tauri/src/domains/*/ipc/*` and registered directly in `main.rs`.
