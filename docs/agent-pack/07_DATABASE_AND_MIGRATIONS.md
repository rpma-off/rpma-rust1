# 07 — Database and Migrations

## SQLite Configuration

- **Database path**: OS-specific app data directory, resolved by Tauri at runtime
- **WAL mode** (ADR-009): Enabled via pragmas in `src-tauri/src/db/connection.rs` on every connection. Allows concurrent reads and a single writer without blocking.
- **Connection pool**: r2d2 with max 10 connections, 2 idle minimum (`DynamicPoolManager` can scale to 50 under load)
- **Slow query detection**: queries >50ms logged as warnings (`db/metrics.rs`)
- **Transaction slow warning**: transactions >250ms logged

## DB Module (`src-tauri/src/db/`)

| File | Responsibility |
|------|---------------|
| `mod.rs` | `Database` + `AsyncDatabase` wrappers, `DbResult<T>` type |
| `connection.rs` | r2d2 pool init, WAL pragmas, `DynamicPoolManager`, `PreparedStatementCache`, `ChunkedQuery` streaming |
| `queries.rs` | `execute()`, `query_single()`, `query_multiple()`, `query_as()`, `query_single_value()` |
| `metrics.rs` | Pool stats, slow-query detection, health checks |
| `utils.rs` | `list_tables()`, `count_rows()`, `vacuum()` |
| `schema.sql` | Initial bootstrap schema (applied before numbered migrations) |

## Migration Mechanism (ADR-010)

- **Location**: `src-tauri/migrations/` — 70 SQL files numbered `002` through `070`
- **Applied**: automatically on application startup by the DB bootstrap logic
- **Tracking**: migrations table records applied migration IDs
- **Validation**: `scripts/validate-migration-system.js` enforces:
  - V1: naming format `NNN_snake_case.sql`
  - V2: sequential numbering (documented gaps for Rust-only migrations)
  - V3: no duplicate migration numbers
  - V4: idempotency — `CREATE TABLE/INDEX/TRIGGER/VIEW` must use `IF NOT EXISTS`

### Migration Range Summary
| Range | Notable content |
|-------|----------------|
| 002–010 | Schema renames, client stats triggers, task/user indexes, consent |
| 011–030 | Intervention steps, photos, materials, quotes, calendar, notifications |
| 031–040 | Organizations, settings tables, user preferences |
| 035 | `app_settings` table (global JSON config row — AppSettings persistence) |
| 041–060 | Audit logs, rules, integrations, trash, advanced features |
| 061–070 | Performance indexes (rate limiter, quotes by user, calendar, intervention steps) |

## Schema Patterns

### Soft Delete (ADR-011)
Every main entity has `deleted_at INTEGER` (milliseconds since epoch or NULL):
```sql
-- Create with explicit NULL
INSERT INTO tasks (..., deleted_at) VALUES (..., NULL);

-- Always filter:
SELECT * FROM tasks WHERE deleted_at IS NULL;

-- Soft delete:
UPDATE tasks SET deleted_at = ?1 WHERE id = ?2;
```
Never hard-delete main entities — use `trash` domain to restore or permanently purge.

### Timestamps (ADR-012)
All `*_at` columns are `INTEGER` (i64 milliseconds since epoch):
```rust
// Rust: write
chrono::Utc::now().timestamp_millis()

// Rust: read
chrono::DateTime::from_timestamp_millis(ms).unwrap()
```

### Indexes
Key indexes in place:
- `tasks(client_id, created_at DESC)` — client task list (migration 004)
- `tasks(status)`, `tasks(technician_id)`, `tasks(scheduled_date)` (migration 005)
- `quotes(created_by) WHERE deleted_at IS NULL` partial (migration 067)
- `login_attempts(identifier, locked_until)` (migration 066)
- `calendar_events(technician_id)`, `(task_id)`, date-range partial (migration 068)
- `intervention_steps(intervention_id)`, `(intervention_id, step_number)` (migration 070)

## Adding a Migration Safely

1. Determine next available number: `ls src-tauri/migrations/ | tail -5`
2. Create `src-tauri/migrations/NNN_description.sql`
3. Use `IF NOT EXISTS` for all `CREATE` statements (idempotency rule V4)
4. Use `INTEGER` for all timestamp/datetime columns (ADR-012)
5. Use `TEXT` for UUIDs
6. Test locally: run `npm run dev` or `cargo test` to apply
7. Validate: `npm run backend:validate-migrations`
8. Schema drift check: `npm run backend:detect-schema-drift`

**SQLite constraints:**
- `ALTER TABLE` is limited — cannot drop columns in older SQLite versions
- Add new columns only with `ALTER TABLE ADD COLUMN`
- For complex changes: create new table, migrate data, drop old, rename new

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Migration fails on startup | Syntax error in SQL | Check Rust console logs for exact error |
| "table already exists" | Missing `IF NOT EXISTS` | Add it to the `CREATE` statement |
| Locked database | Uncommitted transaction or WAL not applied | Check `db/connection.rs` pragma application order |
| Schema drift warning | New column or table not in a migration | Create a migration for the missing change |
| Missing data after migration | Data migration needed alongside schema | Add Rust data migration (ADR-010 allows Rust-only migration gaps) |

## Soft-Delete Consistency Check

Run `npm run backend:soft-delete-check` (calls `scripts/check-soft-delete-consistency.js`) to verify all queries that access soft-deletable tables include the `deleted_at IS NULL` filter.
