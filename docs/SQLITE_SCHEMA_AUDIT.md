# SQLite Schema & Migration Audit

**Date**: 2026-02-12  
**Scope**: SQLite schema (`src-tauri/src/db/schema.sql`), migrations (`src-tauri/migrations/*.sql`), and query paths in repositories/services.  
**Reference Docs**: `docs/agent-pack/07_DATABASE_AND_MIGRATIONS.md`, `docs/agent-pack/DATABASE.md`

## Foreign Keys & Constraint Coverage

- **Foreign keys are enforced** via `PRAGMA foreign_keys = ON` (`src-tauri/src/db/connection.rs`).
- **Status enum checks** are present for tasks/interventions/steps/materials/messaging tables (see `schema.sql`, `027_add_task_constraints.sql`, `023_add_messaging_tables.sql`, `024_add_inventory_management.sql`).

### Notable Gaps
- **`interventions.task_id` has no FK constraint** in `schema.sql` and no migration adds one.  
  _Impact_: orphan interventions if tasks are deleted or missing.
- **`tasks.workflow_id` and `tasks.current_workflow_step_id` FKs are not enforced** in `schema.sql`.  
  `008_add_workflow_constraints.sql` attempts `ALTER TABLE ... ADD CONSTRAINT`, which SQLite does not support directly without table rebuilds.
- **Non‑negative stock constraints are missing** for inventory-related fields:
  - `materials.current_stock`, `materials.minimum_stock`, `materials.maximum_stock`, `materials.reorder_point`
  - `inventory_transactions.quantity`, `inventory_transactions.previous_stock`, `inventory_transactions.new_stock`
  - `material_consumption.quantity_used`, `material_consumption.waste_quantity`

## Index Coverage vs Query Patterns

### Tasks
Query patterns in `src-tauri/src/repositories/task_repository.rs` and `src-tauri/src/services/task_queries.rs` filter by `deleted_at`, `status`, `technician_id`, `client_id`, and sort by `created_at`/`scheduled_date`.  
Indexes from `schema.sql` + `019_enhanced_performance_indexes.sql` cover:
- `status`, `technician_id`, `client_id`, `priority`, `scheduled_date`, `created_at`
- composites like `(status, priority, scheduled_date)` and `(technician_id, status, priority)`

**Gap**: no general partial index for `deleted_at IS NULL` (only `idx_tasks_active_only` for limited statuses).  
_Suggestion_: partial index for active tasks to match common `WHERE deleted_at IS NULL` filters.

### Interventions
Queries in `src-tauri/src/repositories/intervention_repository.rs` use:
`WHERE task_id = ? ORDER BY created_at DESC`, `WHERE task_id = ? AND status IN (...)`.  
Migration `019_enhanced_performance_indexes.sql` adds `idx_interventions_task_created` and `idx_interventions_current_step_status`, which cover these patterns once applied.

### Intervention Steps
Queries in `src-tauri/src/repositories/intervention_repository.rs` use:
`WHERE intervention_id = ?` and `WHERE intervention_id = ? AND step_number = ?`.  
Indexes `idx_steps_intervention` and `idx_steps_intervention_number` cover these.

### Sessions
Queries in `src-tauri/src/repositories/session_repository.rs` use:
`WHERE user_id = ? AND expires_at > datetime('now') ORDER BY last_activity DESC`.  
Existing indexes: `idx_user_sessions_user_id`, `idx_user_sessions_token`, `idx_user_sessions_expires_at`.

**Gap**: no composite index to cover `(user_id, expires_at, last_activity DESC)` ordering.

### Audit Logs
`settings_audit_log` is indexed on `(user_id, timestamp DESC)` and `(setting_type, timestamp DESC)` (`schema.sql` + `019_enhanced_performance_indexes.sql`).  
`audit_logs` currently has basic indexes but no code paths querying it (only inserts in `user_repository.rs`).

## FTS Usage Review

`clients_fts` is defined in `schema.sql` with `content='clients'` and `content_rowid='rowid'`.  
Query paths in `src-tauri/src/services/client_queries.rs` use:

- `id IN (SELECT rowid FROM clients_fts WHERE clients_fts MATCH ?)`
- `INNER JOIN clients_fts fts ON c.id = fts.rowid`

**Issue**: `clients.id` is `TEXT` (UUID), while `rowid` is an internal integer.  
**Impact**: FTS joins may return no results or incorrect matches.

## Missing Constraints/Indexes & Migration Suggestions

| Gap | Evidence | Migration Suggestion |
| --- | --- | --- |
| Non‑negative stock checks | `schema.sql`, `012_add_material_tables.sql`, `024_add_inventory_management.sql` | `029_add_inventory_non_negative_checks.sql` — rebuild `materials`, `inventory_transactions`, `material_consumption` with `CHECK(column >= 0)` |
| FK for `interventions.task_id` | `schema.sql` lacks FK | `030_add_intervention_task_fk.sql` — rebuild `interventions` to add `FOREIGN KEY (task_id) REFERENCES tasks(id)` |
| FK for `tasks.workflow_id` + `current_workflow_step_id` | `schema.sql` lacks FKs; `008_add_workflow_constraints.sql` uses unsupported `ALTER TABLE ADD CONSTRAINT` | `031_add_task_workflow_fks.sql` — rebuild `tasks` with proper FKs |
| Composite index for session activity sorting | `session_repository.rs` uses `ORDER BY last_activity` | `032_add_session_activity_index.sql` — add index on `(user_id, expires_at, last_activity DESC)` |
| Partial index for active tasks by deleted flag | `task_repository.rs` filters `deleted_at IS NULL` | `033_add_tasks_deleted_at_index.sql` — partial index `WHERE deleted_at IS NULL` |

## Data Integrity Risks

- **Orphan interventions** if tasks are removed or missing (`interventions.task_id` has no FK).
- **Workflow references can drift** (`tasks.workflow_id`, `current_workflow_step_id` not enforced).
- **Negative stock values** can be stored if application logic fails (no DB checks).
- **FTS search mismatch** between `clients.id` (TEXT) and FTS `rowid` (INTEGER) can yield missing results.

