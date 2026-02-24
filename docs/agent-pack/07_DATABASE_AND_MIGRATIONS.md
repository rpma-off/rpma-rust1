# 07 - Database and Migrations

## SQLite setup

Runtime DB setup is in `src-tauri/src/main.rs`:
- App data directory from Tauri path API
- DB file: `<app_data_dir>/rpma.db`
- `Database::new(...)` from `src-tauri/src/db/mod.rs`
- Startup health check, schema init, and migration application

WAL behavior:
- Initial checkpoint on startup
- periodic checkpoint task (`PRAGMA wal_checkpoint(TRUNCATE)`) in background

Connection/pool config source:
- `src-tauri/src/db/connection.rs`

## Schema and migration sources

- Base schema: `src-tauri/src/db/schema.sql`
- Embedded migrations: `src-tauri/migrations/*.sql` (currently 002-040, compiled via `include_dir!` in `src-tauri/src/db/migrations.rs`)
- Root migration folder also exists: `migrations/*.sql` (used by repo scripts/audits)

## Migration apply mechanism

Main implementation: `src-tauri/src/db/migrations.rs`

Flow:
1. check initialization (`is_initialized`)
2. if fresh DB: execute `schema.sql`
3. determine current and latest migration versions (`schema_version` table + embedded files)
4. apply sequential migrations with `migrate(target_version)`
5. ensure required views (`client_statistics`, `calendar_tasks`)

## How to add a migration safely

1. Add SQL file in `src-tauri/migrations/` with numeric prefix (e.g., `041_new_feature.sql`).
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
- **Version drift**: compare `schema_version` to latest file prefix.
- **Missing table/view on upgraded DB**: verify `ensure_required_views` and migration content.
- **Lock contention**: inspect WAL/checkpoint behavior and long-running write operations.

## Key tables (base schema pointers)

- `interventions`, `intervention_steps`
- `tasks`, `clients`, `users`, `user_sessions`
- `sync_queue`, `messages`, `calendar_events`, `materials`

All defined in `src-tauri/src/db/schema.sql` plus evolution in `src-tauri/migrations`.

## DOC vs CODE mismatch

- Some historical docs/scripts reference migration helper files that are no longer present; treat `src-tauri/src/db/migrations.rs` + `src-tauri/migrations/*.sql` as authoritative.
