# 07 - Database and Migrations

## SQLite setup

Runtime DB setup is in `src-tauri/src/main.rs`:
- App data directory from Tauri path API
- DB file: `<app_data_dir>/rpma.db`
- `Database::new(...)` from `src-tauri/src/db/mod.rs`
- Startup health check, schema init, and migration application

WAL behavior:
- Initial checkpoint on startup (`PRAGMA wal_checkpoint(PASSIVE); PRAGMA optimize;`)
- Periodic checkpoint task in background (`src-tauri/src/db/connection.rs`, `src-tauri/src/main.rs`)

Connection/pool config source:
- `src-tauri/src/db/connection.rs`

## Schema and migration sources

- Base schema: `src-tauri/src/db/schema.sql`
- Embedded migrations: `src-tauri/migrations/*.sql` (latest is 041, embedded via `include_dir!` in `src-tauri/src/db/migrations.rs`)
- Root migration folder: `migrations/*.sql` (used by repo scripts/audits)

## Migration apply mechanism

Main implementation: `src-tauri/src/db/migrations.rs`

Flow:
1. Check initialization (`is_initialized`).
2. If fresh DB: execute `schema.sql`.
3. Determine current and latest migration versions (`schema_version` table + embedded files).
4. Apply sequential migrations with `migrate(target_version)`.
5. Ensure required views (`client_statistics`, `calendar_tasks`).

Note: `schema.sql` initializes schema_version up to 39; migrations 040+ are applied after init.

## How to add a migration safely

1. Add SQL file in `src-tauri/migrations/` with numeric prefix (e.g., `042_new_feature.sql`).
2. Make SQL idempotent where possible (`IF EXISTS` / `IF NOT EXISTS`).
3. If schema affects exported types/contracts, run `npm run types:sync`.
4. Run migration checks:
- `node scripts/validate-migration-system.js`
- `npm run migration:audit`
5. Run targeted tests for impacted domain.

## Validation and troubleshooting

Useful scripts:
- `scripts/validate-migration-system.js`
- `scripts/bounded-context-migration-audit.js`
- `scripts/detect-schema-drift.js`
- `scripts/check_db_schema.js`

Typical issues:
- Version drift: compare `schema_version` to the latest migration prefix.
- Missing table/view on upgraded DB: verify `ensure_required_views` and migration content.
- Lock contention: inspect WAL/checkpoint behavior and long-running write operations.

## Key tables (base schema pointers)

- `tasks`, `task_history`
- `clients`, `client_statistics` (view)
- `interventions`, `intervention_steps`, `photos`
- `quotes`, `quote_items`
- `materials`, `material_categories`, `suppliers`, `inventory_transactions`, `material_consumption`
- `calendar_events`, `calendar_tasks` (view)
- `messages`, `notification_preferences`
- `sync_queue`
- `audit_logs`, `audit_events`, `settings_audit_log`
- `sessions` (added by migration 041; replaces `user_sessions`)

## DOC vs CODE mismatch

- `schema.sql` still defines `user_sessions`; migration 041 replaces it with `sessions` and drops the old table at runtime.
