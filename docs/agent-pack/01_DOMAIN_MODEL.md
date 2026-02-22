# 01 - Domain Model

## Core entities and relationships

```text
Client 1---* Task 1---* Intervention 1---* InterventionStep
                    \                 \
                     \                 *---* Photo (documents)
                      \
                       *---1 Assigned User (technician)

User 1---* UserSession
Task 1---* CalendarEvent
Task 1---* Quote
Material 1---* InventoryTransaction
Domain changes ---* SyncQueue (offline sync)
```

Primary model sources:
- Tasks: `src-tauri/src/domains/tasks/domain/models/task.rs`
- Clients: `src-tauri/src/domains/clients/domain/models/client.rs`
- Interventions: `src-tauri/src/domains/interventions/domain/models/intervention.rs`
- Steps: `src-tauri/src/domains/interventions/domain/models/step.rs`
- Auth/session/roles: `src-tauri/src/domains/auth/domain/models/auth.rs`
- Sync ops: `src-tauri/src/domains/sync/domain/models/sync.rs`

## Key entities (practical)

### Task
- Identity: `id`, `task_number`
- Lifecycle fields: `status`, `priority`, assignment/scheduling fields, workflow references
- Relationship fields: `client_id`, `technician_id`
- Rich metadata: vehicle, PPF zones, notes, durations
- Storage: `tasks` table in `src-tauri/src/db/schema.sql`

Task statuses in code include:
`draft`, `scheduled`, `in_progress`, `completed`, `cancelled`, `on_hold`, `pending`, `invalid`, `archived`, `failed`, `overdue`, `assigned`, `paused`.

### Client
- Supports `individual` and `business`
- Stores contact/address/business metadata and aggregated task stats
- Storage: `clients` table (+ `client_statistics` view)

### Intervention
- Bound to a task (`task_id`)
- Tracks execution state (`pending`, `in_progress`, `paused`, `completed`, `cancelled`), progress %, timing, QC and environmental data
- Storage: `interventions` table

### InterventionStep
- Ordered steps (`step_number`) with step status and optional quality/photo requirements
- Step statuses include `pending`, `in_progress`, `paused`, `completed`, `failed`, `skipped`, `rework`
- Storage: `intervention_steps` table

### User and Session
- Roles: `admin`, `supervisor`, `technician`, `viewer`
- Session model includes access token, refresh token, expiry/activity, and 2FA state
- Storage: `users`, `user_sessions`

### Inventory
- Core: materials + stock movement/consumption
- Storage includes `materials`, `inventory_transactions`, plus related category/supplier tables from migrations in `src-tauri/migrations`

### Calendar
- Events tied to tasks/technicians
- Storage: `calendar_events`

### Quotes
- Quote and quote items lifecycle (created/sent/accepted/rejected) in quote domain IPC/infrastructure
- Storage comes from migration `src-tauri/migrations/037_quotes.sql`

### Sync queue
- Durable offline queue of operations for later background sync
- Storage: `sync_queue`

## Domain invariants (implemented or enforced through service+db)

- Task number uniqueness (`tasks.task_number` unique in schema/migrations).
- One active intervention per task (constraint/migration logic around duplicate interventions).
- Role/session validation required for protected writes (IPC auth checks in domain handlers).
- Status transitions validated in task/intervention services and task status IPC.
- Soft-delete patterns exist on major entities (`deleted_at`, `deleted_by`) and are filtered in queries.

## Storage map (where to verify)

- Base schema: `src-tauri/src/db/schema.sql`
- Incremental schema changes: `src-tauri/migrations/*.sql`
- Root migration audit set: `migrations/*.sql`

## DOC vs CODE mismatch

- ADR 006 mentions `Manager`; runtime role enum and RBAC helpers use `Supervisor`.
- Historical docs may reference models under `src-tauri/src/models/*`; active domain models are mostly in `src-tauri/src/domains/*/domain/models/*`.
