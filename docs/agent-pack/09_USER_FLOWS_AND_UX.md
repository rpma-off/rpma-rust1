# 09 - User Flows and UX

## 1) Authentication and bootstrap

- Entry routes: `/login`, `/signup`, `/bootstrap-admin`
- Route shell behavior: `frontend/src/app/RootClientLayout.tsx` and `frontend/src/app/page.tsx`
- Core commands: `auth_login`, `auth_create_account`, `has_admins`, `bootstrap_first_admin`, `auth_validate_session`, `auth_logout`
- Backend handlers: `src-tauri/src/domains/auth/ipc/auth.rs`, `src-tauri/src/domains/users/ipc/user.rs`
- Key UI states: loading, authenticated redirect, bootstrap redirect, auth error toast

## 2) Task management

- Entry routes: `/tasks`, `/tasks/new`, `/tasks/[id]`, `/tasks/edit/[id]`, `/tasks/[id]/completed`
- UI modules: `frontend/src/domains/tasks/components/*`, hooks in `frontend/src/domains/tasks/hooks/*`
- Commands: `task_crud`, `edit_task`, `add_task_note`, `send_task_message`, `delay_task`, `report_task_issue`, assignment validation commands, `task_transition_status`
- Backend handlers: `src-tauri/src/domains/tasks/ipc/task/*.rs`, `src-tauri/src/domains/tasks/ipc/status.rs`
- Validations/errors: CreateTaskRequest::validate (`src-tauri/src/domains/tasks/domain/models/task.rs`), assignment checks in `task/validation.rs`

## 3) Intervention execution workflow

- Entry routes: `/interventions`, `/tasks/[id]/workflow/*`
- UI modules: `frontend/src/domains/interventions/*`, `frontend/src/domains/workflow/*`
- Commands: `intervention_workflow`, `intervention_progress`, `intervention_management`, `intervention_get_latest_by_task`, document/photo commands (`document_*`)
- Backend handlers: `src-tauri/src/domains/interventions/ipc/intervention/*`, `src-tauri/src/domains/documents/ipc/document.rs`
- Key states: pending/in-progress/paused/completed, step-level validation, photo requirements

## 4) Calendar and scheduling

- Entry route: `/schedule`
- UI modules: `frontend/src/domains/calendar/components/*`
- Commands: `get_events`, `get_event_by_id`, `create_event`, `update_event`, `delete_event`, `calendar_check_conflicts`, `calendar_schedule_task`, `calendar_get_tasks`
- Backend handler: `src-tauri/src/domains/calendar/ipc/calendar.rs`
- Key states: overlap/conflict warnings, schedule update feedback

## 5) Clients

- Entry routes: `/clients`, `/clients/new`, `/clients/[id]`, `/clients/[id]/edit`
- UI modules: `frontend/src/domains/clients/components/*`
- Commands: `client_crud`
- Backend handler: `src-tauri/src/domains/clients/ipc/client.rs`
- Key validations: required identity/contact fields and duplicate handling from client services/repo constraints

## 6) Inventory and materials

- Entry route: `/inventory`
- UI modules: `frontend/src/domains/inventory/components/*`
- Commands: `material_create`, `material_list`, `material_update`, `material_update_stock`, `material_adjust_stock`, `material_record_consumption`, `material_get_transaction_history`, `material_get_stats`, `inventory_get_stats`
- Backend handler: `src-tauri/src/domains/inventory/ipc/material.rs`
- Key states: low stock, consumption history, movement summaries

## 7) Quotes

- Entry routes: `/quotes`, `/quotes/new`, `/quotes/[id]`
- UI modules: `frontend/src/domains/quotes/*`
- Commands: `quote_create`, `quote_list`, `quote_get`, `quote_update`, `quote_mark_sent`, `quote_mark_accepted`, `quote_export_pdf`
- Backend handler: `src-tauri/src/domains/quotes/ipc/quote.rs`

## 8) Reporting and analytics

- Entry routes: `/reports`, `/analytics`, `/dashboard/operational-intelligence`, `/dashboard/interventions`
- UI modules: `frontend/src/domains/reports/*`, `frontend/src/domains/analytics/*`
- Commands: report commands under reports IPC + `analytics_get_summary` + `dashboard_get_stats`
- Backend handlers: `src-tauri/src/domains/reports/ipc/reports/*`, `src-tauri/src/domains/analytics/ipc/analytics.rs`, `src-tauri/src/domains/analytics/ipc/dashboard.rs`, `src-tauri/src/commands/ui.rs`

## 9) Admin, users, settings, audit, messages

- Entry routes: `/admin`, `/users`, `/settings`, `/audit`, `/configuration`, `/messages`
- Commands: `user_crud`, settings commands (`get_app_settings`, `update_*_settings`, `get_user_settings`, `update_user_*`), audit/security commands, messaging commands (`message_*`)
- Backend handlers:
- `src-tauri/src/domains/users/ipc/user.rs`
- `src-tauri/src/domains/settings/ipc/settings/*`
- `src-tauri/src/domains/audit/ipc/security.rs`
- `src-tauri/src/domains/notifications/ipc/message.rs`

## 10) Offline/sync UX

- UI modules: `frontend/src/domains/sync/components/*`, hooks in `frontend/src/domains/sync/hooks/*`
- Commands: `sync_start_background_service`, `sync_stop_background_service`, `sync_now`, `sync_get_status`, `sync_get_operations_for_entity`, queue commands (`sync_enqueue`, `sync_dequeue_batch`, `sync_mark_completed`, `sync_mark_failed`)
- Backend handlers: `src-tauri/src/domains/sync/ipc/sync.rs`, `src-tauri/src/domains/sync/ipc/queue.rs`
- UX states: online/offline, pending operations, failed operation visibility

## Design system guardrails

- Tokens and theming: `frontend/src/app/globals.css`
- Shared primitives: `frontend/src/shared/ui/*`, `frontend/src/components/ui/*`
- Prefer domain components + shared UI primitives over one-off styles.

## Error and validation surfaces across flows

- Frontend normalization: `frontend/src/lib/ipc/utils.ts`
- Backend error contract: `src-tauri/src/shared/ipc/errors.rs`
- Correlation-aware troubleshooting: `correlation_id` support in frontend and backend IPC layers.
