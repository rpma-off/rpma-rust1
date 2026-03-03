# ADR-013: Query Performance Monitoring

## Status
Accepted

## Context
Performance issues in SQLite can be difficult to diagnose without visibility into query execution times. The application implements built-in performance monitoring to identify slow queries and connection bottlenecks.

## Decision

### Query Performance Monitor
- `QueryPerformanceMonitor` (`src-tauri/src/db/connection.rs`) tracks all query executions
- Queries exceeding 100ms are logged as slow queries
- Statistics include: query text, duration, rows affected, timestamp

### Slow Query Threshold
- Default threshold: 100ms (`Duration::from_millis(100)`)
- Configurable via `RPMA_DB_METRICS` environment variable
- Long-running transactions (>250ms) are logged with warning level

### Prepared Statement Cache
- `PreparedStatementCache` caches compiled SQLite statements
- Reduces parsing overhead for frequently executed queries
- Cache statistics exposed via `Database::stmt_cache().stats()`

### Streaming Queries
- `ChunkedQuery` enables processing large result sets in chunks
- Useful for exports, reports, and pagination
- Supports optional count query for total results

### Performance Metrics API
- `Database::get_performance_stats()` returns:
  - Total queries executed
  - Slow queries count and details
  - Cache hit/miss statistics
- `Database::clear_performance_stats()` resets all metrics
- `Database::get_pool_health()` returns connection pool utilization

### Async Query Support
- `AsyncDatabase::execute_async()` wraps blocking database operations
- Uses `tokio::task::spawn_blocking` to avoid blocking the async runtime
- Connection wait times are recorded for dynamic pool management

## Consequences
- Slow queries are identified and logged for debugging
- Cache effectiveness can be measured
- Pool utilization is observable via IPC commands
- Performance data aids in capacity planning
- Async database wrapper enables responsive UI during heavy queries

## Related
- ADR-011: Database Connection Pool Architecture
- ADR-007: Logging Correlation
