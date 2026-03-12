---
title: "SQLite as Local-First Data Store with WAL Mode"
summary: "Use SQLite with Write-Ahead Logging (WAL) as the primary local data store, enabling offline-first operation without network dependency."
domain: persistence
status: accepted
created: 2026-03-12
---

## Context

The application must operate reliably in environments with intermittent or no network connectivity. Users need to continue working on tasks, interventions, and inventory management without disruption. The system must provide:

- Full functionality without internet access
- Fast local read/write performance
- Data durability and crash recovery
- Concurrent read access from multiple connections

Traditional client-server architectures require network connectivity for database operations, making them unsuitable for offline-first requirements.

## Decision

**Use SQLite with Write-Ahead Logging (WAL) as the system of record.**

The database configuration is defined in `src-tauri/src/db/connection.rs:98-107`:

```rust
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
PRAGMA wal_autocheckpoint = 1000;
PRAGMA cache_size = 10000;
PRAGMA temp_store = MEMORY;
PRAGMA foreign_keys = ON;
PRAGMA locking_mode = NORMAL;
```

Key configuration choices:

1. **WAL Mode**: Enables concurrent readers with a single writer, improving read performance during writes
2. **Synchronous NORMAL**: Reduces disk I/O while maintaining durability
3. **Busy Timeout (5000ms)**: Prevents "database is locked" errors under contention
4. **WAL Autocheckpoint (1000 pages)**: Balances WAL file size against checkpoint overhead
5. **Foreign Keys ON**: Enforces referential integrity at the database level

Connection pool configuration (`connection.rs:45-55`):

```rust
max_connections: 10,  // SQLite is single-writer; keep pool small
min_idle: Some(2),    // Maintain small idle pool for responsiveness
connection_timeout: 30s,
idle_timeout: Some(600s),   // 10 minutes
max_lifetime: Some(3600s),  // 60 minutes
```

## Consequences

### Positive

- **True Offline Operation**: All data operations work without network
- **Performance**: Sub-millisecond read latency for cached queries
- **Simplicity**: No database server infrastructure required
- **Reliability**: WAL mode provides crash recovery
- **Concurrency**: Multiple readers can access data simultaneously
- **Portability**: Single file database can be backed up or moved easily

### Negative

- **Single Writer**: Only one write transaction at a time (mitigated by short transactions)
- **Local-Only**: No automatic multi-device sync (sync domain removed per `frontend/src/domains/sync/services/sync.service.ts`)
- **Storage Limits**: Limited by local disk space
- **No Real-Time Collaboration**: Changes are not propagated to other devices

## Related Files

- `src-tauri/src/db/connection.rs` — Pool initialization and WAL configuration
- `src-tauri/src/db/mod.rs` — Database wrapper with transaction support
- `src-tauri/src/db/migrations/mod.rs` — Schema versioning
- `src-tauri/src/db/schema.sql` — Initial schema definition
- `AGENTS.md` — Section on offline-first behavior

## Read When

- Adding new database tables or indexes
- Investigating database performance issues
- Understanding transaction isolation behavior
- Configuring connection pool sizing
- Implementing data export/import features
- Troubleshooting "database is locked" errors
