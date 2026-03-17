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

| Setting | Value | Purpose |
|---------|-------|---------|
| WAL Mode | Enabled | Concurrent reads and writes |
| Foreign Keys | `ON` | Referential integrity |
| Busy Timeout | 5000ms | Handle locks gracefully |
| Journal Size Limit | Applied | Prevent disk bloat |

```rust
// src-tauri/src/db/mod.rs
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

## Migration System (**ADR-010**)

### Location
`src-tauri/migrations/`

### Naming Convention
Numbered SQL files: `NNN_description.sql`

| Range | Examples |
|-------|----------|
| 002-010 | Core schema modifications |
| 011-027 | Feature additions |
| 028-058 | Enhancements, indexes, fixes |

**Note**: No `001_initial_schema.sql` — schema bootstrapped historically.
**Gap**: Migrations 029-030 are missing (sequencing continues from 031).

### Migration Lifecycle

1. **Create**: Add `NNN_description.sql` to `migrations/`
2. **Embed**: Migrations compiled into binary
3. **Apply**: Executed on app startup in order
4. **Verify**: Run `npm run backend:migration:fresh-db-test`

### Current Migrations (002-058)

| Category | Migrations |
|----------|------------|
| Core Tables |002-010 (renames, indexes, constraints) |
| Inventory |012-013, 024, 031, 038, 050 |
| Auth & Sessions| 015, 028, 041, 057 |
| Notifications |044 |
| Quotes |037, 047-049, 051 |
| Reports |052 |
| Settings |018, 026, 045-046, 054-056 |
| Performance |019, 036, 053 |
| Soft Delete |035, 050-051, 058 |

## Repository Pattern (**ADR-005**)

All database access MUST go through Infrastructure layer repositories.

| Layer | Location |
|-------|----------|
| Trait Definition | `domains/*/infrastructure/` or `domain/repositories/` |
| Implementation | `domains/*/infrastructure/` |

```rust
pub trait TaskRepository: Send + Sync {
    fn find_by_id(&self, id: &str) -> AppResult<Option<Task>>;
    fn save(&self, task: &Task) -> AppResult<()>;
    fn delete(&self, id: &str) -> AppResult<()>;
}

pub struct SqliteTaskRepository {
    db: Arc<Database>,
}
```

## Common Tasks

### Adding a Migration

```bash
# 1. Create migration file
echo "-- Migration: Add new column" > src-tauri/migrations/059_add_column.sql

# 2. Test on fresh DB
npm run backend:migration:fresh-db-test

# 3. Verify schema
node scripts/detect-schema-drift.js
```

### Soft Deletes (**ADR-011**)

```sql
-- Tables include deleted_at column
ALTER TABLE tasks ADD COLUMN deleted_at INTEGER;

-- Repositories filter by default
SELECT * FROM tasks WHERE deleted_at IS NULL;

-- Explicit hard delete (admin only)
UPDATE tasks SET deleted_at = strftime('%s','now') * 1000 WHERE id = ?;
```

### Timestamp Standard (**ADR-012**)

All timestamps stored as **Unix Milliseconds** (BigInt/i64):

```rust
chrono::Utc::now().timestamp_millis()
```

## Database Initialization

```rust
// src-tauri/src/db/mod.rs
pub fn initialize_database(path: &Path) -> AppResult<Database> {
    let conn = Connection::open(path)?;
    apply_pragmas(&conn)?;
    run_migrations(&conn)?;
    Ok(Database::new(conn))
}
```

## Constraints

| Constraint | Reason |
|------------|--------|
| No raw SQL in Application/Domain layers | Use repositories |
| Avoid complex joins | Prefer domain logic or simple queries |
| Large BLOBs in filesystem | Store paths in DB, files on disk |
| In-memory DB for tests | WAL mode incompatible with in-memory |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Database locked | Restart dev process; check orphaned processes |
| Migration fails | Check SQL syntax; verify NNN sequencing |
| Type mismatch | Ensure Rust structs match DB schema |
| Schema drift detected | Run `node scripts/detect-schema-drift.js` |

## Key Files

| File | Purpose |
|------|---------|
| `src-tauri/src/db/mod.rs` | Database initialization |
| `src-tauri/migrations/` | Migration SQL files |
| `scripts/detect-schema-drift.js` | Schema drift detection |
| `scripts/validate-migration-system.js` | Migration validation |