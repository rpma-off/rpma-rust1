# ADR-013: Query Performance and Observability

## Status
Accepted

## Context
Maintaining performance in an offline SQLite-based application requires visibility into execution times and connection pool health to identify bottlenecks.

## Decision

### Performance Monitoring
- `QueryPerformanceMonitor` tracks every SQL execution.
- **Slow Query Logging**: Queries exceeding 100ms are logged with a warning level and associated `correlation_id`.
- **Long Transactions**: Transactions active for more than 250ms are flagged as potential performance risks.

### Statement Optimization
- `PreparedStatementCache` caches compiled SQLite statements to eliminate redundant parsing overhead.
- Cache hit/miss ratios are tracked and exposed via performance metrics.

### Observability API
- `Database::get_performance_stats()` provides a centralized view of query counts, slow queries, and cache statistics.
- `Database::get_pool_health()` exposes real-time utilization metrics for the read, write, and report pools.
- These metrics are accessible to the frontend via the `system` command set for diagnostic purposes.

## Consequences
- Performance regression is easily detected during development and testing.
- Database bottlenecks are surfaced with sufficient context (SQL text and correlation ID) for immediate remediation.
- The system provides built-in tools for analyzing real-world usage patterns.
