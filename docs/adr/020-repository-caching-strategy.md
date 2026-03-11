# ADR-020: Repository Caching and Performance Optimization

## Status
Accepted

## Context
Frequent database queries for stable entities (e.g., categories, users, settings) can impact responsiveness. An in-memory caching layer is required to minimize database I/O for read-heavy workloads.

## Decision

### Cache Implementation
- A centralized, thread-safe `Cache` utility (`src-tauri/src/shared/repositories/cache.rs`) provides in-memory storage with LRU eviction.
- Caching is applied at the **Infrastructure Layer** (Repositories).

### TTL and Invalidation Policy
- **TTL Tiers**: `SHORT` (1m), `MEDIUM` (5m), `LONG` (15m).
- **Invalidation**: Any write operation (`save`, `delete_by_id`) in a repository must invalidate the affected cache keys or clear the domain's cache.
- **Key Structure**: Uses `CacheKeyBuilder` with domain-prefixed keys (e.g., `audit:query:user:123`).

### Usage Constraints
- Caching is reserved for read-only or low-frequency update entities.
- Dynamic search results with complex filters are cached with `SHORT` TTL.
- Caching must not be applied to highly volatile state (e.g., active intervention steps) where stale data would break business rules.

## Consequences
- Reduced CPU and I/O overhead for frequent UI refresh cycles.
- Improved responsiveness for dashboard and list views.
- Cache consistency is maintained through explicit invalidation on writes.
