# ADR-011: Database Connection Pool Architecture

## Status
Accepted

## Context
SQLite's single-writer limitation requires a specialized connection pool design to prevent write-heavy operations from blocking interactive read requests and background analytical queries.

## Decision

### Tiered Pool Strategy
The `OperationPool` (`src-tauri/src/db/operation_pool.rs`) manages three dedicated pools with workload-specific configurations:

- **Read Pool**: 80 connections, 15 minimum idle. Optimized for concurrent SELECT operations.
- **Write Pool**: 30 connections, 60s timeout. Dedicated for INSERT/UPDATE/DELETE to prevent writer starvation.
- **Report Pool**: 20 connections, 300s timeout. Isolated for long-running, CPU-intensive analytical queries.

### Connection Resilience
- Automatic retry logic with exponential backoff (up to 3 attempts) is used for connection acquisition.
- A `busy_timeout` of 5 seconds is applied to all connections to handle transient locks.

### Dynamic Management
- `DynamicPoolManager` monitors connection wait times and can auto-adjust pool size (between 10 and 50 connections) based on load.

## Consequences
- System responsiveness is maintained even during heavy batch processing or report generation.
- Connection management is centralized and transparent to the application layer.
- Thread exhaustion is prevented by bounding database-specific threads.
