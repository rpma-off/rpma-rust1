---
title: "Database and Migrations"
summary: "SQLite configuration, migration system, and data access patterns."
read_when:
  - "Adding new database tables or columns"
  - "Troubleshooting database performance"
  - "Writing SQL migrations"
---

# 07. DATABASE AND MIGRATIONS

RPMA v2 uses **SQLite** as its primary data store, optimized for reliability and desktop performance.

## SQLite Configuration (**ADR-009**)
- **WAL Mode**: Enabled for concurrent reads and writes.
- **Foreign Keys**: Enforced (`PRAGMA foreign_keys = ON`).
- **Busy Timeout**: Set to 5000ms to handle locks gracefully.
- **Journaling**: `journal_size_limit` applied to prevent disk bloat.

## Migration System (**ADR-010**)
Migrations are numbered SQL files in `src-tauri/migrations/`.
Example: `001_initial_schema.sql`, `002_add_clients.sql`.

### Rules for Migrations
- **Numbered**: Must follow a strict sequential prefix.
- **Idempotent**: Use `IF NOT EXISTS` where possible.
- **Embedded**: Migrations are compiled into the binary and applied on startup.

## Repository Pattern (**ADR-005**)
All database access MUST go through the Infrastructure layer repositories.
- **Trait Definition**: In `domain/repositories/` (or `infrastructure/mod.rs`).
- **Implementation**: In `infrastructure/sqlite_<name>.rs`.

## Common Tasks

### Adding a Migration
1. Create `src-tauri/migrations/NNN_description.sql`.
2. Run `npm run backend:migration:fresh-db-test`.
3. Verify schema with `node scripts/detect-schema-drift.js`.

### Handling Soft Deletes (**ADR-011**)
Repositories must filter for `deleted_at IS NULL` by default unless explicitly requested otherwise.

### Timestamp Standard (**ADR-012**)
All timestamps must be stored as **Unix Milliseconds** (BigInt/i64).
Use `chrono::Utc::now().timestamp_millis()`.

## Constraints
- No raw SQL in Application or Domain layers.
- Avoid complex joins; prefer domain logic or simple queries.
- Large BLOBs should be stored in the filesystem, with paths in DB.
