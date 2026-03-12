---
title: "Multi-Level Cache Architecture"
summary: "Implement a cache manager supporting memory, disk, and Redis backends with namespace-based keys, TTL policies, and compression for large payloads."
domain: caching
status: accepted
created: 2026-03-12
---

## Context

Frequently accessed data benefits from caching to:

- Reduce database query latency
- Improve UI responsiveness
- Lower computational overhead for expensive queries
- Support offline operation with stale-while-revalidate patterns

Different data types have different caching requirements:

- Query results: Short TTL, frequent invalidation
- Image thumbnails: Large size, long TTL
- Analytics: Expensive computation, moderate TTL
- API responses: Variable size, domain-specific TTL

## Decision

**Implement a multi-level cache manager with pluggable backends and type-based namespacing.**

### Cache Types

Defined in `src-tauri/src/shared/services/cache.rs`:

```rust
pub enum CacheType {
    QueryResult,        // query:{key}
    ImageThumbnail,     // thumbnail:{key}
    ComputedAnalytics,  // analytics:{key}
    ApiResponse,        // api:{key}
}
```

### Backend Hierarchy

```rust
pub enum CacheBackend {
    Memory,              // L1: Fast, volatile
    Disk(PathBuf),       // L2: Persistent, slower
    Redis(String),       // L3: Shared, networked (optional)
}
```

### Cache Manager

```rust
pub struct CacheManager {
    backend: CacheBackend,
    redis_client: Option<Client>,
    config: CacheConfig,
    stats: Arc<Mutex<CacheStats>>,
    memory_cache: Arc<Mutex<HashMap<String, (CacheEntry, Vec<u8>)>>>,
    disk_cache_path: Option<PathBuf>,
}
```

### Configuration

```rust
pub struct CacheConfig {
    pub max_memory_mb: usize,           // Default: 512MB
    pub default_ttl: Duration,          // Default: 1 hour
    pub enable_disk_cache: bool,
    pub disk_cache_path: Option<PathBuf>,
    pub redis_url: Option<String>,
    pub compression_threshold: usize,   // Default: 1KB
}
```

### Key Generation

```rust
pub fn generate_key(&self, cache_type: CacheType, key: &str) -> String {
    match cache_type {
        CacheType::QueryResult => format!("query:{}", key),
        CacheType::ImageThumbnail => format!("thumbnail:{}", key),
        CacheType::ComputedAnalytics => format!("analytics:{}", key),
        CacheType::ApiResponse => format!("api:{}", key),
    }
}
```

### Compression

Large payloads are automatically compressed:

```rust
fn compress_data(&self, data: &str) -> Result<String, AppError> {
    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(data.as_bytes())?;
    let compressed = encoder.finish()?;
    
    let mut result = b"COMPRESSED:".to_vec();
    result.extend(compressed);
    Ok(general_purpose::STANDARD.encode(&result))
}
```

### Frontend Integration

Frontend IPC layer has its own cache (`frontend/src/lib/ipc/cache.ts`):

```typescript
export function cachedInvoke<T>(
    key: string,
    command: string,
    args: object,
    validator: (data: unknown) => T
): Promise<T>
```

## Consequences

### Positive

- **Flexibility**: Multiple backends for different use cases
- **Performance**: Memory cache for hot data, disk for persistence
- **Compression**: Reduces memory/disk usage for large payloads
- **Statistics**: Monitoring for hit rates and memory usage
- **Namespace Isolation**: Type-based keys prevent collisions

### Negative

- **Complexity**: Three backends to configure and monitor
- **Consistency**: No automatic invalidation across backends
- **Redis Dependency**: Optional Redis adds deployment complexity
- **Memory Pressure**: Large caches can cause memory issues

## Related Files

- `src-tauri/src/shared/services/cache.rs` — Cache manager implementation
- `frontend/src/lib/ipc/cache.ts` — Frontend IPC cache
- `src-tauri/src/shared/repositories/cache.rs` — Repository cache integration
- `src-tauri/src/shared/services/mod.rs` — Service exports

## Read When

- Adding caching to new operations
- Investigating cache performance issues
- Configuring cache TTL policies
- Understanding cache invalidation
- Debugging stale data issues
- Setting up Redis integration
