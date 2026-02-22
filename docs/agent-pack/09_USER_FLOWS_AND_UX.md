# 09 - User Flows and UX

## 1) Authentication and bootstrap

- Entry routes: `/login`, `/signup`, `/bootstrap-admin`
- Route shell behavior: `frontend/src/app/RootClientLayout.tsx`
- Core commands: `auth_login`, `auth_create_account`, `has_admins`, `bootstrap_first_admin`, `auth_validate_session`
- Backend handlers: `src-tauri/src/domains/auth/ipc/auth.rs`, `src-tauri/src/domains/users/ipc/user.rs`
- Key UI states: loading, authenticated redirect, bootstrap redirect, auth error toast

## 2) Task management

- Entry routes: `/tasks`, `/tasks/new`, `/tasks/[id]`
- UI modules: `frontend/src/domains/tasks/components/*`, hooks in `.../tasks/hooks/*`
- Commands: `task_crud`, `edit_task`, `task_transition_status`, assignment validation commands
- Backend handlers: `src-tauri/src/domains/tasks/ipc/task/facade.rs`, `.../tasks/ipc/status.rs`, `.../tasks/ipc/task/validation.rs`
- Validation/errors: status transition and assignment conflicts, surfaced from `AppError` codes/messages

## 3) Intervention execution workflow

- Entry route: `/interventions` (+ workflow UI in interventions/workflow domains)
- UI modules: `frontend/src/domains/interventions/*`, `frontend/src/domains/workflow/*`
- Commands: `intervention_start`, `intervention_advance_step`, `intervention_save_step_progress`, `intervention_finalize`, read/progress commands
- Backend handlers: `src-tauri/src/domains/interventions/ipc/intervention/*`
- Key states: pending/in-progress/paused/completed, step-level validation, photo/document integration

## 4) Calendar and scheduling

- Entry route: `/schedule`
- UI modules: `frontend/src/domains/calendar/components/*`
- Commands: `get_events`, `create_event`, `update_event`, `delete_event`, `calendar_schedule_task`, conflict checks
- Backend handler: `src-tauri/src/domains/calendar/ipc/calendar.rs`
- Key states: overlap/conflict warnings, schedule update feedback

## 5) Clients

- Entry routes: `/clients`, `/clients/new`, `/clients/[id]`
- UI modules: `frontend/src/domains/clients/components/*`
- Commands: `client_crud`
- Backend handler: `src-tauri/src/domains/clients/ipc/client.rs`
- Key validations: required identity/contact fields and duplicate handling from client services/repo constraints

## 6) Inventory and materials

- Entry route: `/inventory`
- UI modules: `frontend/src/domains/inventory/components/*`
- Commands: `material_create`, `material_list`, stock/consumption/transaction commands
- Backend handler: `src-tauri/src/domains/inventory/ipc/material.rs`
- Key states: low stock, consumption history, movement summaries

## 7) Quotes

- Entry routes: `/quotes`, `/quotes/new`, `/quotes/[id]`
- UI modules: `frontend/src/domains/quotes/*`
- Commands: `quote_create`, `quote_list`, `quote_update`, `quote_mark_sent`, `quote_mark_accepted`, `quote_export_pdf`
- Backend handler: `src-tauri/src/domains/quotes/ipc/quote.rs`

## 8) Reporting and analytics

- Entry routes: `/reports`, `/analytics`, `/dashboard/operational-intelligence`
- UI modules: `frontend/src/domains/reports/*`, `frontend/src/domains/analytics/*`
- Commands: reporting commands under reports IPC + `analytics_get_summary`
- Backend handlers: `src-tauri/src/domains/reports/ipc/reports/*`, `src-tauri/src/domains/analytics/ipc/analytics.rs`

## 9) Admin, users, settings, security

- Entry routes: `/admin`, `/users`, `/settings`, `/audit`
- Commands: user CRUD/status commands, settings commands, audit/security session commands
- Backend handlers:
  - `src-tauri/src/domains/users/ipc/user.rs`
  - `src-tauri/src/domains/settings/ipc/settings/*`
  - `src-tauri/src/domains/audit/ipc/security.rs`

## 10) Offline/sync UX

- UI modules: `frontend/src/domains/sync/components/*`, hooks in `frontend/src/domains/sync/hooks/*`
- Commands: `sync_start_background_service`, `sync_stop_background_service`, `sync_now`, `sync_get_status`, queue commands
- Backend handlers: `src-tauri/src/domains/sync/ipc/sync.rs`, `src-tauri/src/domains/sync/ipc/queue.rs`
- UX states: online/offline, pending operations, failed operation visibility

## Design system guardrails

- Tokens and theming: `frontend/src/app/globals.css`
- Shared primitives: `frontend/src/components/ui/*`
- Prefer domain components + shared UI primitives over one-off styles.
- Keep state and validation in domain hooks/services; keep page components orchestration-focused.

## Error and validation surfaces across flows

- Frontend normalization: `frontend/src/lib/ipc/utils.ts`
- Backend error contract: `src-tauri/src/shared/ipc/errors.rs`
- Correlation-aware troubleshooting: `correlation_id` support in frontend and backend IPC layers.
