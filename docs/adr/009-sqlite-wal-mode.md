---
title: "ADR-009: SQLite with WAL Mode for Persistence"
summary: "Uses SQLite as the primary database with Write-Ahead Logging (WAL) mode for concurrent read/write access, connection pooling, and optimized pragmas for desktop application performance."
domain: "persistence"
status: "accepted"
read_when:
  - "Designing new features"
  - "Reviewing architectural decisions"
---

# ADR-009: SQLite with WAL Mode for Persistence

## Status

Accepted

## Date

2026-03-13

## Summary

Uses SQLite as the primary database with Write-Ahead Logging (WAL) mode for concurrent read/write access, connection pooling, and optimized pragmas for desktop application performance.

## Context

- Desktop application requiring embedded database
- Need concurrent read access while writes happen
- Connection pooling for multiple async operations
- Data safety with ACID transactions
- Performance optimization for local queries
- Future possibility of encrypted database (SQLCipher)

## Decision

### SQLite Configuration

We use SQLite with the following configuration:

```rust
// src-tauri/src/db/connection.rs
pub fn initialize_pool(
    db_path: &str,
    encryption_key: &str,
) -> Result<Pool<SqliteConnectionManager>, Box<dyn std::error::Error>> {
    let open_flags = OpenFlags::SQLITE_OPEN_READ_WRITE
        | OpenFlags::SQLITE_OPEN_CREATE
        | OpenFlags::SQLITE_OPEN_NO_MUTEX; // CRITICAL: allows concurrent access

    let manager = SqliteConnectionManager::file(db_path)
        .with_flags(open_flags)
        .with_init(move |conn| {
            conn.execute_batch(
                "PRAGMA journal_mode = WAL;
                 PRAGMA synchronous = NORMAL;
                 PRAGMA busy_timeout = 5000;
                 PRAGMA wal_autocheckpoint = 1000;
                 PRAGMA cache_size = 10000;
                 PRAGMA temp_store = MEMORY;
                 PRAGMA foreign_keys = ON;
                 PRAGMA locking_mode = NORMAL;"
            )?;
            Ok(())
        });

    Pool::builder()
        .max_size(10) // SQLite is single-writer; keep pool small
        .min_idle(Some(2))
        .connection_timeout(Duration::from_secs(30))
        .idle_timeout(Some(Duration::from_secs(600)))
        .max_lifetime(Some(Duration::from_secs(3600)))
        .connection_customizer(Box::new(ConnectionCustomizer))
        .build(manager)
}
```

### Key Pragma Settings

| Pragma | Value | Rationale |
|--------|-------|-----------|
| `journal_mode` | WAL | Allows concurrent reads during writes |
| `synchronous` | NORMAL | Balance between safety and performance |
| `busy_timeout` | 5000ms | Wait for locks instead of immediate failure |
| `wal_autocheckpoint` | 1000 | Auto-checkpoint every 1000 pages |
| `cache_size` | 10000 | ~40MB page cache |
| `temp_store` | MEMORY | In-memory temp tables |
| `foreign_keys` | ON | Enforce referential integrity |
| `locking_mode` | NORMAL | Allow multi-process access |

### WAL Mode Benefits

Write-Ahead Logging provides:

1. **Concurrent Reads**: Multiple readers during writes
2. **Better Write Performance**: Sequential WAL writes
3. **Atomic Commits**: Either fully written or not at all
4. **Recovery**: Automatic recovery from crashes

### Connection Pooling

```rust
pub struct PoolConfig {
    pub max_connections: u32,      // Default: 10
    pub min_idle: Option<u32>,     // Default: 2
    pub connection_timeout: Duration, // Default: 30s
    pub idle_timeout: Option<Duration>, // Default: 10min
    pub max_lifetime: Option<Duration>, // Default: 60min
}
```

The pool is sized small because:
- SQLite has a single writer bottleneck
- Desktop app has limited concurrent users (typically 1)
- Too many connections increase contention

### Periodic WAL Checkpoint

```rust
// src-tauri/src/main.rs
async_runtime::spawn(async move {
    let mut interval = time::interval(Duration::from_secs(60));
    loop {
        interval.tick().await;
        let _ = db::checkpoint_wal(db_for_checkpoint.pool());
    }
});
```

Checkpoint every 60 seconds to:
- Prevent WAL file growth
- Free disk space
- Improve read performance

### Shutdown WAL Checkpoint

```rust
// src-tauri/src/main.rs
.on_window_event(|window, event| {
    if let tauri::WindowEvent::CloseRequested { .. } = event {
        // Flush WAL checkpoint with FULL mode on application shutdown
        if let Ok(conn) = app_state.db.get_connection() {
            match conn.execute_batch("PRAGMA wal_checkpoint(FULL);") {
                Ok(_) => info!("SQLite WAL checkpoint flushed successfully"),
                Err(e) => error!("Failed to flush WAL checkpoint: {}", e),
            }
        }
    }
})
```

On application shutdown:
- Execute `PRAGMA wal_checkpoint(FULL)` to flush all WAL data to main database file
- Ensures data integrity and prevents uncommitted changes in WAL
- Clears in-memory session store to prevent dangling sessions on restart
- Logs all shutdown steps for debuggability

### Database Location

```rust
// Platform-specific app data directory
let app_dir = app.path().app_data_dir()?;
let db_path = app_dir.join("rpma.db");
```

### Encryption Support (SQLCipher)

```rust
#[cfg(feature = "sqlcipher")]
if !encryption_key.is_empty() {
    conn.execute("PRAGMA key = ?", [&encryption_key])?;
}
```

Optional SQLCipher feature for encrypted databases.

## Consequences

### Positive

- Zero configuration embedded database
- WAL mode allows concurrent reads during writes
- Small connection pool reduces memory usage
- Periodic checkpoint prevents WAL bloat
- ACID compliance with foreign key enforcement
- Can enable encryption with SQLCipher

### Negative

- Single writer limitation (WAL helps, doesn't eliminate)
- WAL file grows until checkpoint
- Need to handle `SQLITE_BUSY` errors with retries
- Desktop-only (not for server deployments)

## Database Health Checks

```rust
// src-tauri/src/main.rs
if let Ok(conn) = db_instance.get_connection() {
    match conn.query_row("PRAGMA quick_check(1);", [], |row| row.get::<_, String>(0)) {
        Ok(result) if result == "ok" => info!("Database quick_check passed"),
        Ok(result) => {
            error!("Database quick_check failed: {}", result);
            return Err("Database integrity check failed".into());
        }
        Err(e) => {
            error!("Failed to run database quick_check: {}", e);
            return Err(e.into());
        }
    }
}
```

## Migration Strategy

```rust
// Migrations are numbered SQL files
let current_version = db_instance.get_version()?;
let latest_version = db::Database::get_latest_migration_version();

if let Err(e) = db_instance.initialize_or_migrate() {
    error!("Failed during database migrate: {}", e);
    return Err(e.into());
}

info!("Database migrated: {} -> {}", current_version, latest_version);
```

## Related Files

- `src-tauri/src/db/connection.rs` — Connection pool and pragmas
- `src-tauri/src/db/mod.rs` — Database module
- `src-tauri/src/main.rs:274-379` — Database initialization
- `src-tauri/src/main.rs:280-313` — Shutdown hook with WAL checkpoint
- `src-tauri/migrations/` — SQL migration files

## When to Read This ADR

- Configuring database connections
- Adding new pragmas
- Debugging database performance
- Understanding WAL checkpointing
- Adding encryption support
- Writing migration files

## References

- SQLite WAL documentation
- r2d2 connection pool
- AGENTS.md Database section