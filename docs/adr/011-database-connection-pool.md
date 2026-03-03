# ADR-011: Database Connection Pool Architecture

## Status
Accepted

## Context
RPMA v2 is a desktop application using SQLite as the primary data store. SQLite has specific concurrency limitations (single writer) that require careful connection pool design to maximize throughput while ensuring data integrity.

## Decision
The application uses a tiered connection pool architecture with operation-specific pools:

- **Read Pool**: Optimized for SELECT queries with high concurrency (80 max connections, 15 min idle)
- **Write Pool**: Dedicated for INSERT/UPDATE/DELETE operations (30 max connections, 5 min idle, 60s timeout)
- **Report Pool**: Long-running analytical queries (20 max connections, 300s timeout)

The `OperationPool` (`src-tauri/src/db/operation_pool.rs`) manages these tiered pools. Each pool has operation-specific timeouts and connection limits optimized for its workload.

### Connection Management
- Connection retry logic with 3 attempts and exponential backoff (100ms * attempt number)
- `ConnectionCustomizer` sets `busy_timeout = 5000` and `temp_store = MEMORY` on every connection
- `DynamicPoolManager` monitors wait times and can auto-adjust pool size based on load

### Prepared Statement Caching
- `PreparedStatementCache` (`src-tauri/src/db/connection.rs`) caches compiled SQLite statements to reduce parsing overhead
- Cache statistics are exposed via `Database::get_performance_stats()`

### Async Database Support
- `AsyncDatabase` wraps synchronous operations with `tokio::task::spawn_blocking` to prevent blocking the async runtime
- Provides `execute_async`, `with_transaction_async`, and streaming query support

## Consequences
- Write operations have dedicated pool capacity to avoid blocking on read-heavy workloads
- Long-running report queries don't block interactive operations
- Prepared statement cache reduces CPU overhead for repeated queries
- Async wrapper enables integration with Tauri async commands without blocking the runtime
- Pool health metrics are exposed via `Database::get_pool_health()` for monitoring

## Related
- ADR-002: Transaction Boundaries
- ADR-008: Offline-First Strategy
