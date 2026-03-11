# ADR-014: SQLite Pragma and Reliability Configuration

## Status
Accepted

## Context
SQLite behavior is controlled by PRAGMA settings that must be tuned to optimize for concurrent desktop workloads and ensure durability in case of crashes.

## Decision

### Performance and Concurrency
The following PRAGMAs are applied to every connection during initialization:
- `journal_mode = WAL`: Enables Write-Ahead Logging for concurrent read-write access.
- `synchronous = NORMAL`: Optimizes performance while maintaining data integrity on standard hardware.
- `temp_store = MEMORY`: Ensures temporary tables and indices are stored in RAM.
- `wal_autocheckpoint = 1000`: Bounds the size of the WAL file to approximately 4MB before checkpointing.

### Integrity and Safety
- `foreign_keys = ON`: Mandatory enforcement of referential integrity constraints.
- `busy_timeout = 5000`: Configures the engine to wait up to 5 seconds before failing on a database lock.

### Maintenance
- `PRAGMA optimize` is executed periodically (via the `OperationPool` during checkpoints) to update query planner statistics and optimize indexes.

## Consequences
- Data integrity is guaranteed via strict foreign key enforcement.
- Application throughput is maximized through WAL mode and memory-based temporary storage.
- Storage footprint is controlled via automatic checkpointing.
