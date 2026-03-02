# ADR-008: Offline-First Strategy

## Status
Accepted

## Context
RPMA v2 is a desktop application that must work without an internet connection. Local data is the source of truth.

## Decision
- SQLite in WAL mode is the primary data store, ensuring data integrity and concurrent read access.
- All business operations work against the local database with no dependency on remote services.
- Sync is optional and handled by a dedicated `sync` domain that queues changes for later upload via `SyncQueue` and `BackgroundSyncService`, both initialized in `src-tauri/src/service_builder.rs`.
- The event bus is in-memory and does not require network connectivity.
- No online services, payments, or external sync are introduced in the bounded context architecture.
- Database migrations are embedded in the binary using the `include_dir!` macro (`static MIGRATIONS_DIR`). This ensures the correct migration set ships with each application version without runtime file-system access.
- A `schema_version` table tracks the highest applied migration number. `Database::initialize_or_migrate` applies pending migrations on startup in filename-sorted order.
- `Database::ensure_required_views` is called at the end of every startup initialization sequence to recreate SQL views (`client_statistics`, `calendar_tasks`) that may be missing in older schema revisions, providing forward compatibility without a dedicated migration for each view change.
- Periodic WAL checkpointing (`PRAGMA wal_checkpoint(PASSIVE)`) is performed via `Database::checkpoint_wal` and the `OperationPool` to bound WAL file growth.
- Session tokens are UUID strings stored in the local `sessions` table (replacing the former `user_sessions` table in migration 041). Session state is therefore fully offline-capable and requires no network round-trip for validation.

## Consequences
- The application is fully functional offline.
- Data conflicts during sync must be handled by the sync domain (not by individual bounded contexts).
- All domain logic is designed for local-first operation.
- Embedding migrations eliminates deployment-time schema file dependencies and simplifies the release artifact.
- Views are guaranteed to exist at runtime regardless of the migration path taken to reach the current schema version.
