# ADR-014: SQLite Pragma Configuration

## Status
Accepted

## Context
SQLite behavior is heavily influenced by PRAGMA settings. The application configures specific pragmas at connection time to optimize for desktop application workloads with concurrent read access.

## Decision
The following PRAGMA settings are applied when initializing every database connection:

| PRAGMA | Value | Purpose |
|--------|-------|---------|
| `journal_mode` | WAL | Write-Ahead Logging enables concurrent reads while writing |
| `synchronous` | NORMAL | Balanced durability/performance (fsync on checkpoint) |
| `busy_timeout` | 5000 | Wait up to 5 seconds when database is locked |
| `wal_autocheckpoint` | 1000 | Checkpoint every 1000 pages (~1MB), bounds WAL file size |
| `temp_store` | MEMORY | Store temporary tables and indices in RAM |
| `foreign_keys` | ON | Enforce referential integrity constraints |

### Connection Initialization
Pragmas are set in `connection.rs` via `SqliteConnectionManager::with_init()`:
```rust
conn.execute_batch(
    "PRAGMA journal_mode = WAL;
     PRAGMA synchronous = NORMAL;
     PRAGMA busy_timeout = 5000;
     PRAGMA wal_autocheckpoint = 1000;
     PRAGMA foreign_keys = ON;
     PRAGMA temp_store = MEMORY;"
)?;
```

### WAL Mode Benefits
- Multiple readers can access the database while a write is in progress
- Writes are serialized (SQLite limitation) but don't block readers
- Checkpoint operations can run in the background

### Checkpoint Strategy
- `Database::checkpoint_wal()` performs passive WAL checkpoint via `PRAGMA wal_checkpoint(PASSIVE)`
- Called periodically via `OperationPool` to bound WAL file growth
- `PRAGMA optimize` runs automatically after checkpoints

## Consequences
- Concurrent read access doesn't block during writes
- WAL file size is bounded to prevent disk space issues
- Foreign key constraints prevent orphaned records
- Temporary data stays in memory for better performance
- Lock timeouts prevent immediate failures under contention

## Related
- ADR-011: Database Connection Pool Architecture
- ADR-008: Offline-First Strategy
