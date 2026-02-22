# 05 - IPC API and Contracts

## Contract rules

1. Protected commands require `session_token` and validate it server-side.
2. `correlation_id` is supported and propagated for tracing.
3. Frontend uses `safeInvoke` (`frontend/src/lib/ipc/utils.ts`) to normalize calls.
4. Backend returns structured envelope types (`ApiResponse<T>`) in shared IPC module.

Code pointers:
- Frontend IPC entry: `frontend/src/lib/ipc/client.ts`
- Frontend command constants: `frontend/src/lib/ipc/commands.ts`
- Backend command registry: `src-tauri/src/main.rs`
- Backend response/errors: `src-tauri/src/shared/ipc/response.rs`, `src-tauri/src/shared/ipc/errors.rs`

## Top 30 important commands

| Command | Purpose | Key params | Permissions | Rust impl | Frontend consumer |
|---|---|---|---|---|---|
| `auth_login` | Login | `email`, `password`, `correlation_id?` | Public | `src-tauri/src/domains/auth/ipc/auth.rs` | `frontend/src/domains/auth/ipc/auth.ipc.ts` |
| `auth_create_account` | Create account | account payload | Public/bootstrap flow | `.../auth/ipc/auth.rs` | `.../auth/ipc/auth.ipc.ts` |
| `auth_validate_session` | Validate token | `session_token` | Authenticated token check | `.../auth/ipc/auth.rs` | `.../auth/ipc/auth.ipc.ts` |
| `auth_refresh_token` | Refresh token | `refresh_token` | Public with valid refresh token | `.../auth/ipc/auth.rs` | `.../auth/ipc/auth.ipc.ts` |
| `auth_logout` | Logout | `session_token` | Authenticated | `.../auth/ipc/auth.rs` | `.../auth/ipc/auth.ipc.ts` |
| `enable_2fa` | Start TOTP setup | `session_token` | Authenticated | `.../auth/ipc/auth.rs` | `.../auth/ipc/auth.ipc.ts` |
| `verify_2fa_setup` | Confirm TOTP setup | `session_token`, `code` | Authenticated | `.../auth/ipc/auth.rs` | `.../auth/ipc/auth.ipc.ts` |
| `disable_2fa` | Disable 2FA | `session_token`, `password` | Authenticated | `.../auth/ipc/auth.rs` | `.../auth/ipc/auth.ipc.ts` |
| `task_crud` | Task CRUD/list | `action`, `session_token` | Authenticated + role checks | `src-tauri/src/domains/tasks/ipc/task/facade.rs` | `frontend/src/domains/tasks/ipc/task.ipc.ts` |
| `edit_task` | Task update path | task update payload | Authenticated + role/ownership checks | `.../tasks/ipc/task/facade.rs` | `.../tasks/ipc/task.ipc.ts` |
| `check_task_assignment` | Assignment validation | task/tech args | Authenticated | `.../tasks/ipc/task/validation.rs` | `.../tasks/ipc/task.ipc.ts` |
| `check_task_availability` | Availability validation | date/time/tech args | Authenticated | `.../tasks/ipc/task/validation.rs` | `.../tasks/ipc/task.ipc.ts` |
| `validate_task_assignment_change` | Assignment diff validation | change payload | Authenticated | `.../tasks/ipc/task/validation.rs` | `.../tasks/ipc/task.ipc.ts` |
| `task_transition_status` | Status transition | transition payload | Authenticated + RBAC | `src-tauri/src/domains/tasks/ipc/status.rs` | `frontend/src/domains/tasks/ipc/task.ipc.ts` |
| `client_crud` | Client CRUD/list | `action`, `session_token` | Authenticated + role checks | `src-tauri/src/domains/clients/ipc/client.rs` | `frontend/src/domains/clients/ipc/client.ipc.ts` |
| `intervention_start` | Start intervention | request + `session_token` | Authenticated + assignment checks | `src-tauri/src/domains/interventions/ipc/intervention/workflow.rs` | `frontend/src/domains/interventions/ipc/interventions.ipc.ts` |
| `intervention_get` | Read intervention | ids + token | Authenticated | `.../interventions/ipc/intervention/data_access.rs` | `.../interventions/ipc/interventions.ipc.ts` |
| `intervention_advance_step` | Advance step | step payload + token | Authenticated + workflow rules | `.../interventions/ipc/intervention/queries.rs` | `.../interventions/ipc/interventions.ipc.ts` |
| `intervention_finalize` | Finalize intervention | finalize payload + token | Authenticated + workflow rules | `.../interventions/ipc/intervention/workflow.rs` | `.../interventions/ipc/interventions.ipc.ts` |
| `intervention_get_progress` | Progress read | ids + token | Authenticated | `.../interventions/ipc/intervention/queries.rs` | `.../interventions/ipc/interventions.ipc.ts` |
| `material_create` | Create material | material payload + token | Authenticated | `src-tauri/src/domains/inventory/ipc/material.rs` | `frontend/src/domains/inventory/ipc/inventory.ipc.ts` |
| `material_list` | List materials | pagination/filter + token | Authenticated | `.../inventory/ipc/material.rs` | `.../inventory/ipc/inventory.ipc.ts` |
| `material_update_stock` | Update stock | stock payload + token | Authenticated | `.../inventory/ipc/material.rs` | `.../inventory/ipc/inventory.ipc.ts` |
| `material_record_consumption` | Record consumption | consumption payload + token | Authenticated | `.../inventory/ipc/material.rs` | `.../inventory/ipc/inventory.ipc.ts` |
| `quote_create` | Create quote | quote payload + token | Authenticated | `src-tauri/src/domains/quotes/ipc/quote.rs` | `frontend/src/domains/quotes/ipc/quotes.ipc.ts` |
| `quote_list` | List quotes | filters + token | Authenticated | `.../quotes/ipc/quote.rs` | `.../quotes/ipc/quotes.ipc.ts` |
| `calendar_get_tasks` | Task calendar feed | range/filter + token | Authenticated | `src-tauri/src/domains/calendar/ipc/calendar.rs` | `frontend/src/domains/calendar/ipc/calendar.ts` |
| `calendar_schedule_task` | Create task schedule | scheduling payload + token | Authenticated + RBAC checks | `.../calendar/ipc/calendar.rs` | `.../calendar/ipc/calendar.ts` |
| `get_events` | Read events | range/filter + token | Authenticated | `.../calendar/ipc/calendar.rs` | `.../calendar/ipc/calendar.ts` |
| `sync_get_status` | Sync runtime status | `session_token` | Authenticated | `src-tauri/src/domains/sync/ipc/sync.rs` | `frontend/src/domains/sync/ipc/sync.ipc.ts` |

## Type sync mechanism

- Rust export binary: `src-tauri/src/bin/export-types.rs`
- Writer script: `scripts/write-types.js`
- Generated output: `frontend/src/lib/backend.ts`

Commands:
```bash
npm run types:sync
npm run types:validate
npm run types:drift-check
```

## DOC vs CODE mismatch

- Older docs may mention `src-tauri/src/commands/*` as canonical command files; command registration in `main.rs` points mostly to `src-tauri/src/domains/*/ipc/*`.
