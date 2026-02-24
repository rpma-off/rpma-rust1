# 01 - Domain Model

## Core entities and relationships

```text
Client 1---* Task 1---* Intervention 1---* InterventionStep
                    \                 \
                     \                 *---* Photo (documents)
                      \
                       *---1 Assigned User (technician)

User 1---* Session (sessions table)
Task 1---* CalendarEvent
Task 1---* Quote 1---* QuoteItem
Material 1---* InventoryTransaction
Material 1---* MaterialConsumption (per intervention/step)
Domain changes ---* SyncQueue
User 1---1 NotificationPreference
User 1---* Message (notifications)
```

Primary model sources:
- Tasks: `src-tauri/src/domains/tasks/domain/models/task.rs`
- Clients: `src-tauri/src/domains/clients/domain/models/client.rs`
- Interventions: `src-tauri/src/domains/interventions/domain/models/intervention.rs`
- Steps: `src-tauri/src/domains/interventions/domain/models/step.rs`
- Auth/session/roles: `src-tauri/src/domains/auth/domain/models/auth.rs`
- Sync ops: `src-tauri/src/domains/sync/domain/models/sync.rs`
- Quotes: `src-tauri/src/domains/quotes/domain/models/*`
- Inventory: `src-tauri/src/domains/inventory/domain/models/*`

## Key entities (practical)

### Task
- Identity: `id`, `task_number`
- Status enum: `draft`, `scheduled`, `in_progress`, `completed`, `cancelled`, `on_hold`, `pending`, `invalid`, `archived`, `failed`, `overdue`, `assigned`, `paused`
- Priority enum: `low`, `medium`, `high`, `urgent`
- Relationships: `client_id`, `technician_id`, `workflow_id`, `current_workflow_step_id`
- Storage: `tasks` table (`src-tauri/src/db/schema.sql`)

### Client
- Customer type: `individual` or `business`
- Computed stats from `client_statistics` view
- Storage: `clients` table + `client_statistics` view

### Intervention
- Bound to a task (`task_id`)
- Status enum: `pending`, `in_progress`, `paused`, `completed`, `cancelled`
- Type enum: `ppf`, `ceramic`, `detailing`, `other`
- Storage: `interventions` table

### InterventionStep
- Ordered steps (`step_number`) with strict type/status enums
- Step status enum: `pending`, `in_progress`, `paused`, `completed`, `failed`, `skipped`, `rework`
- Step type enum: `inspection`, `preparation`, `installation`, `finalization`
- Storage: `intervention_steps` table

### Photo/Document
- Photo metadata and storage pointers, linked to interventions and steps
- Storage: `photos` table
- IPC surface: `src-tauri/src/domains/documents/ipc/document.rs`

### User and Session
- Roles: `admin`, `supervisor`, `technician`, `viewer`
- Sessions are UUID tokens stored in `sessions` (migration 041)
- Session TTL is fixed at 8 hours (see `SessionService`)
- Storage: `users` + `sessions` tables

### Inventory
- Materials and stock movement
- Storage: `materials`, `material_categories`, `suppliers`, `inventory_transactions`, `material_consumption`

### Quotes
- Quote status enum: `draft`, `sent`, `accepted`, `rejected`, `expired`
- Storage: `quotes`, `quote_items`

### Calendar
- Event types: `meeting`, `appointment`, `task`, `reminder`, `other`
- Event status: `confirmed`, `tentative`, `cancelled`
- Storage: `calendar_events` table and `calendar_tasks` view

### Notifications/Messages
- Messaging and notification preferences
- Storage: `messages`, `notification_preferences`

### Sync queue
- Durable offline queue of operations for later sync
- Storage: `sync_queue` table

## Domain invariants (implemented or enforced through service + db)

- `tasks.task_number` is unique (unique constraint).
- Task status and priority are constrained by CHECKs in `tasks`.
- Intervention status, step status/type, and event types are constrained by CHECKs.
- One step number per intervention (`UNIQUE (intervention_id, step_number)`).
- Sessions enforce valid role values via trigger (migration 041).
- Soft-delete fields (`deleted_at`, `deleted_by`) are present on major entities and filtered in queries.

## Storage map (where to verify)

- Base schema: `src-tauri/src/db/schema.sql`
- Embedded migrations: `src-tauri/migrations/*.sql` (latest version currently 041)
- Root migration audit set: `migrations/*.sql`

## DOC vs CODE mismatch

- `schema.sql` still defines `user_sessions`; migration `041_replace_user_sessions_with_sessions.sql` replaces it with `sessions` at runtime.
