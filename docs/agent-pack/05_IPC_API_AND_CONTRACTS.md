# 05 - IPC API and Contracts

## Contract rules

1. Protected commands require `session_token` and validate it server-side.
2. `correlation_id` is supported and propagated for tracing.
3. Frontend uses `safeInvoke` (`frontend/src/lib/ipc/utils.ts`) to normalize calls and auto-inject tokens for protected commands.
4. Most commands return `ApiResponse<T>` (`src-tauri/src/shared/ipc/response.rs`), but some commands return raw JSON values or direct structs.

Code pointers:
- Frontend IPC entry: `frontend/src/lib/ipc/utils.ts`, `frontend/src/lib/ipc/commands.ts`
- Frontend domain IPC wrappers: `frontend/src/domains/*/ipc/*.ts`
- Backend command registry: `src-tauri/src/main.rs`
- Backend response/errors: `src-tauri/src/shared/ipc/response.rs`, `src-tauri/src/shared/ipc/errors.rs`

## Top 30 important commands

| Command | Purpose | Key params | Permissions | Rust impl | Frontend consumer |
|---|---|---|---|---|---|
| `auth_login` | Login | `request: { email, password, correlation_id? }` | Public | `src-tauri/src/domains/auth/ipc/auth.rs` | `frontend/src/domains/auth/ipc/auth.ipc.ts` |
| `auth_create_account` | Create account | `request: SignupRequest` | Public | `src-tauri/src/domains/auth/ipc/auth.rs` | `frontend/src/domains/auth/ipc/auth.ipc.ts` |
| `auth_validate_session` | Validate session | `session_token`, `correlation_id?` | Public token check | `src-tauri/src/domains/auth/ipc/auth.rs` | `frontend/src/domains/auth/ipc/auth.ipc.ts` |
| `auth_logout` | Logout | `token`, `correlation_id?` | Authenticated | `src-tauri/src/domains/auth/ipc/auth.rs` | `frontend/src/domains/auth/ipc/auth.ipc.ts` |
| `has_admins` | Check if admin exists | `correlation_id?` | Public | `src-tauri/src/domains/users/ipc/user.rs` | `frontend/src/domains/bootstrap/ipc/bootstrap.ipc.ts` |
| `bootstrap_first_admin` | Promote first admin | `request: { user_id, session_token }` | Authenticated + bootstrap rules | `src-tauri/src/domains/users/ipc/user.rs` | `frontend/src/domains/bootstrap/ipc/bootstrap.ipc.ts` |
| `user_crud` | User CRUD/list | `request: { action, session_token }` | Authenticated + RBAC | `src-tauri/src/domains/users/ipc/user.rs` | `frontend/src/domains/users/ipc/users.ipc.ts` |
| `task_crud` | Task CRUD/list | `request: { action, session_token }` | Authenticated + RBAC | `src-tauri/src/domains/tasks/ipc/task/facade.rs` | `frontend/src/domains/tasks/ipc/task.ipc.ts` |
| `edit_task` | Task edit path | `request: { task_id, data, session_token }` | Authenticated + RBAC | `src-tauri/src/domains/tasks/ipc/task/facade.rs` | `frontend/src/domains/tasks/ipc/task.ipc.ts` |
| `add_task_note` | Add task note | `request: { task_id, note, session_token }` | Authenticated + RBAC | `src-tauri/src/domains/tasks/ipc/task/facade.rs` | `frontend/src/domains/tasks/ipc/task.ipc.ts` |
| `send_task_message` | Task messaging | `request: { task_id, message, message_type, session_token }` | Authenticated + RBAC | `src-tauri/src/domains/tasks/ipc/task/facade.rs` | `frontend/src/domains/tasks/ipc/task.ipc.ts` |
| `check_task_assignment` | Validate assignment | `request: { task_id, user_id, session_token }` | Authenticated | `src-tauri/src/domains/tasks/ipc/task/validation.rs` | `frontend/src/domains/tasks/ipc/task.ipc.ts` |
| `check_task_availability` | Validate availability | `request: { task_id, session_token }` | Authenticated | `src-tauri/src/domains/tasks/ipc/task/validation.rs` | `frontend/src/domains/tasks/ipc/task.ipc.ts` |
| `validate_task_assignment_change` | Validate assignment change | `request: { task_id, old_user_id, new_user_id, session_token }` | Authenticated | `src-tauri/src/domains/tasks/ipc/task/validation.rs` | `frontend/src/domains/tasks/ipc/task.ipc.ts` |
| `task_transition_status` | Task status transition | `request: StatusTransitionRequest` | Authenticated + RBAC | `src-tauri/src/domains/tasks/ipc/status.rs` | `frontend/src/lib/ipc/status.ts` |
| `client_crud` | Client CRUD/list | `request: { action, session_token }` | Authenticated + RBAC | `src-tauri/src/domains/clients/ipc/client.rs` | `frontend/src/domains/clients/ipc/client.ipc.ts` |
| `intervention_workflow` | Start/update/finalize workflow | `action` + `sessionToken` | Authenticated (technician for workflow actions) | `src-tauri/src/domains/interventions/ipc/intervention/workflow.rs` | `frontend/src/domains/interventions/ipc/interventions.ipc.ts` |
| `intervention_progress` | Step progress/actions | `action` + `sessionToken` | Authenticated (technician for step actions) | `src-tauri/src/domains/interventions/ipc/intervention/queries.rs` | `frontend/src/domains/interventions/ipc/interventions.ipc.ts` |
| `intervention_management` | List/relationships | `action` + `session_token` | Authenticated + RBAC | `src-tauri/src/domains/interventions/ipc/intervention/relationships.rs` | `frontend/src/domains/interventions/ipc/interventions.ipc.ts` |
| `intervention_get_latest_by_task` | Latest intervention for task | `taskId`, `sessionToken` | Authenticated | `src-tauri/src/domains/interventions/ipc/intervention/data_access.rs` | `frontend/src/domains/interventions/ipc/interventions.ipc.ts` |
| `material_list` | List materials | query + `session_token` | Authenticated (viewer restricted) | `src-tauri/src/domains/inventory/ipc/material.rs` | `frontend/src/domains/inventory/ipc/inventory.ipc.ts` |
| `material_create` | Create material | `request: { ... , session_token }` | Authenticated | `src-tauri/src/domains/inventory/ipc/material.rs` | `frontend/src/domains/inventory/ipc/inventory.ipc.ts` |
| `material_update_stock` | Update stock | `request: { material_id, quantity, operation, session_token }` | Authenticated | `src-tauri/src/domains/inventory/ipc/material.rs` | `frontend/src/domains/inventory/ipc/inventory.ipc.ts` |
| `material_record_consumption` | Record consumption | `request: { material_id, intervention_id, quantity, session_token }` | Authenticated | `src-tauri/src/domains/inventory/ipc/material.rs` | `frontend/src/domains/inventory/ipc/inventory.ipc.ts` |
| `quote_create` | Create quote | `request: { session_token, data }` | Authenticated (viewer cannot modify) | `src-tauri/src/domains/quotes/ipc/quote.rs` | `frontend/src/domains/quotes/ipc/quotes.ipc.ts` |
| `quote_list` | List quotes | `request: { session_token, filters }` | Authenticated | `src-tauri/src/domains/quotes/ipc/quote.rs` | `frontend/src/domains/quotes/ipc/quotes.ipc.ts` |
| `get_events` | Read calendar events | `start_date`, `end_date`, `technician_id?`, `session_token` | Authenticated | `src-tauri/src/domains/calendar/ipc/calendar.rs` | `frontend/src/domains/calendar/ipc/calendar.ts` |
| `calendar_schedule_task` | Schedule a task | `request: ScheduleTaskRequest` | Authenticated | `src-tauri/src/domains/calendar/ipc/calendar.rs` | `frontend/src/domains/calendar/ipc/calendar.ts` |
| `sync_get_status` | Sync status | `session_token` | Authenticated | `src-tauri/src/domains/sync/ipc/sync.rs` | `frontend/src/domains/sync/ipc/sync.ipc.ts` |
| `sync_now` | Trigger sync | `session_token` | Authenticated | `src-tauri/src/domains/sync/ipc/sync.rs` | `frontend/src/domains/sync/ipc/sync.ipc.ts` |

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

- Frontend IPC registry includes `auth_refresh_token` and 2FA commands (`enable_2fa`, `verify_2fa_setup`, `disable_2fa`, `regenerate_backup_codes`, `is_2fa_enabled`) but no backend commands are registered for them in `src-tauri/src/main.rs`.
- Frontend IPC registry includes `photo_crud` and IP blocklist commands (`block_ip_address`, `unblock_ip_address`, `get_blocked_ips`) that are not registered in `src-tauri/src/main.rs`.
