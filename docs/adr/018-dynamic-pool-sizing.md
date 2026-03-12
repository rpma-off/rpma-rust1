---
title: "Dynamic Connection Pool Sizing"
summary: "Implement dynamic pool size adjustment based on observed connection wait times, scaling up under load and down during idle periods."
domain: performance
status: accepted
created: 2026-03-12
---

## Context

SQLite connection pools need to balance:

- **Responsiveness**: Enough connections to avoid wait times
- **Resource Usage**: Not too many idle connections
- **Contention**: SQLite is single-writer, too many connections cause lock contention

Static pool sizing cannot adapt to varying load patterns:

- Morning peak: Many users starting tasks
- Midday lull: Users in interventions
- End of day: Report generation spike

## Decision

**Implement dynamic pool sizing based on connection wait time metrics.**

### Pool Configuration

Default configuration in `src-tauri/src/db/connection.rs`:

```rust
pub struct PoolConfig {
    pub max_connections: u32,         // Default: 10
    pub min_idle: Option<u32>,        // Default: 2
    pub connection_timeout: Duration, // Default: 30s
    pub idle_timeout: Option<Duration>,   // Default: 10 min
    pub max_lifetime: Option<Duration>,   // Default: 60 min
}

impl Default for PoolConfig {
    fn default() -> Self {
        Self {
            max_connections: 10,  // SQLite is single-writer
            min_idle: Some(2),    // Small idle pool for responsiveness
            connection_timeout: Duration::from_secs(30),
            idle_timeout: Some(Duration::from_secs(600)),
            max_lifetime: Some(Duration::from_secs(3600)),
        }
    }
}
```

### Dynamic Pool Manager

```rust
pub struct DynamicPoolManager {
    current_config: Mutex<PoolConfig>,
    load_monitor: Arc<LoadMonitor>,
}

struct LoadMonitor {
    connection_wait_times: Mutex<VecDeque<Duration>>,
    max_samples: usize,  // Default: 100
}
```

### Load Monitoring

```rust
impl LoadMonitor {
    fn record_wait_time(&self, duration: Duration) {
        let mut times = self.connection_wait_times.lock().unwrap();
        times.push_back(duration);
        if times.len() > self.max_samples {
            times.pop_front();
        }
    }
    
    fn get_average_wait_time(&self) -> Option<Duration> {
        let times = self.connection_wait_times.lock().unwrap();
        if times.is_empty() {
            return None;
        }
        let total: Duration = times.iter().sum();
        Some(total / times.len() as u32)
    }
    
    fn should_increase_pool(&self) -> bool {
        self.get_average_wait_time()
            .map(|avg| avg > Duration::from_millis(100))
            .unwrap_or(false)
    }
    
    fn should_decrease_pool(&self) -> bool {
        self.get_average_wait_time()
            .map(|avg| avg < Duration::from_millis(10))
            .unwrap_or(false)
    }
}
```

### Pool Adjustment

```rust
impl DynamicPoolManager {
    pub fn adjust_pool_size(&self) -> Option<PoolConfig> {
        let mut config = self.current_config.lock().unwrap();
        
        if self.load_monitor.should_increase_pool() && config.max_connections < 50 {
            let new_max = (config.max_connections as f64 * 1.5).min(50.0) as u32;
            if new_max != config.max_connections {
                config.max_connections = new_max;
                config.min_idle = Some((new_max / 4).max(2));
                tracing::info!("Increasing connection pool size to {}", new_max);
                return Some(config.clone());
            }
        } else if self.load_monitor.should_decrease_pool() && config.max_connections > 10 {
            let new_max = (config.max_connections as f64 * 0.8).max(10.0) as u32;
            if new_max != config.max_connections {
                config.max_connections = new_max;
                config.min_idle = Some((new_max / 4).max(2));
                tracing::info!("Decreasing connection pool size to {}", new_max);
                return Some(config.clone());
            }
        }
        
        None
    }
}
```

### Connection Wait Recording

```rust
impl Database {
    pub fn get_connection(&self) -> DbResult<PooledConn> {
        let attempt_start = Instant::now();
        let conn = self.pool.get()?;
        let duration = attempt_start.elapsed();
        
        // Record for dynamic pool management
        self.dynamic_pool_manager.record_connection_wait(duration);
        
        if duration > Duration::from_millis(100) {
            warn!(
                connection_acquisition_ms = duration.as_millis(),
                "Slow database connection acquisition"
            );
        }
        
        Ok(conn)
    }
}
```

### Pool Health Metrics

```rust
pub struct PoolHealth {
    pub connections_active: u32,
    pub connections_idle: u32,
    pub connections_pending: u32,
    pub avg_wait_time_ms: f64,
    pub max_connections: u32,
    pub utilization_percentage: f64,
}

impl Database {
    pub fn get_pool_health(&self) -> PoolHealth {
        let state = self.pool.state();
        let config = self.dynamic_pool_manager.get_config();
        let load_stats = self.dynamic_pool_manager.get_load_stats();
        
        PoolHealth {
            connections_active: state.connections,
            connections_idle: state.idle_connections,
            connections_pending: 0,
            avg_wait_time_ms: load_stats.average_wait_time
                .map(|d| d.as_millis() as f64)
                .unwrap_or(0.0),
            max_connections: config.max_connections,
            utilization_percentage: (state.connections as f64 / config.max_connections as f64) * 100.0,
        }
    }
}
```

### Warning Thresholds

```rust
// Warn when utilization exceeds 80%
if health.utilization_percentage > 80.0 {
    warn!(
        "High database connection pool utilization: {:.1}% (active: {}, max: {})",
        health.utilization_percentage, 
        health.connections_active, 
        health.max_connections
    );
}
```

## Consequences

### Positive

- **Adaptive**: Responds to actual load patterns
- **Resource Efficient**: Releases connections when idle
- **Observable**: Pool health exposed via API
- **Preventive**: Warns before pool exhaustion

### Negative

- **Hysteresis**: Scaling happens gradually, not instantly
- **Warm-up**: New connections have initialization cost
- **SQLite Limits**: Single-writer limits benefit of large pools
- **Tuning Required**: Thresholds may need adjustment

## Related Files

- `src-tauri/src/db/connection.rs` — DynamicPoolManager, PoolConfig
- `src-tauri/src/db/mod.rs` — Database wrapper, PoolHealth
- `src-tauri/src/commands/mod.rs` — `get_database_pool_health` command

## Read When

- Investigating "database is locked" errors
- Tuning pool configuration
- Monitoring database performance
- Understanding connection wait times
- Implementing health checks
- Debugging pool exhaustion
