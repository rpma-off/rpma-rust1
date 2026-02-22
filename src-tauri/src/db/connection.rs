//! Database connection management module
//!
//! This module handles SQLite connection pool initialization, configuration,
//! and connection management utilities.

use r2d2::{Pool, PooledConnection};
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::{Connection, OpenFlags};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tracing::{debug, warn};

/// Connection customizer for pool connections
#[derive(Debug)]
struct ConnectionCustomizer;

impl r2d2::CustomizeConnection<Connection, rusqlite::Error> for ConnectionCustomizer {
    fn on_acquire(&self, conn: &mut Connection) -> Result<(), rusqlite::Error> {
        conn.execute_batch(
            "PRAGMA busy_timeout = 5000;
             PRAGMA temp_store = MEMORY;",
        )?;
        Ok(())
    }

    fn on_release(&self, _conn: Connection) {
        // Cleanup if needed
    }
}

/// Configuration for database connection pool
#[derive(Debug, Clone)]
pub struct PoolConfig {
    pub max_connections: u32,
    pub min_idle: Option<u32>,
    pub connection_timeout: std::time::Duration,
    pub idle_timeout: Option<std::time::Duration>,
    pub max_lifetime: Option<std::time::Duration>,
}

impl Default for PoolConfig {
    fn default() -> Self {
        Self {
            max_connections: 10, // SQLite is single-writer; keep pool small to reduce contention
            min_idle: Some(2),   // Maintain a small idle pool for responsiveness
            connection_timeout: std::time::Duration::from_secs(30),
            idle_timeout: Some(std::time::Duration::from_secs(600)), // 10 minutes
            max_lifetime: Some(std::time::Duration::from_secs(3600)), // 60 minutes
        }
    }
}

/// Initialize database connection pool with optimized settings
pub fn initialize_pool(
    db_path: &str,
    encryption_key: &str,
) -> Result<Pool<SqliteConnectionManager>, Box<dyn std::error::Error>> {
    initialize_pool_with_config(db_path, encryption_key, &PoolConfig::default())
}

/// Initialize database connection pool with custom configuration
pub fn initialize_pool_with_config(
    db_path: &str,
    encryption_key: &str,
    config: &PoolConfig,
) -> Result<Pool<SqliteConnectionManager>, Box<dyn std::error::Error>> {
    let encryption_key_owned = encryption_key.to_string();
    let mut open_flags = OpenFlags::SQLITE_OPEN_READ_WRITE
        | OpenFlags::SQLITE_OPEN_CREATE
        | OpenFlags::SQLITE_OPEN_NO_MUTEX; // CRITICAL: allows concurrent access

    // Allow URI filenames for shared in-memory databases in tests.
    if db_path.starts_with("file:") {
        open_flags |= OpenFlags::SQLITE_OPEN_URI;
    }

    let manager = SqliteConnectionManager::file(db_path)
        .with_flags(open_flags)
        .with_init(move |conn| {
            // Set encryption key if provided and using SQLCipher
            // Note: Standard SQLite doesn't support encryption, so we skip this
            #[cfg(feature = "sqlcipher")]
            if !encryption_key_owned.is_empty() {
                // Use parameterized query to prevent SQL injection
                conn.execute("PRAGMA key = ?", [&encryption_key_owned])
                    .map_err(|e| {
                        rusqlite::Error::SqliteFailure(
                            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
                            Some(format!("Failed to set encryption key: {}", e)),
                        )
                    })?;
            }

            // Configure SQLite for better concurrency
            conn.execute_batch(
                "PRAGMA journal_mode = WAL;
                 PRAGMA synchronous = NORMAL;
                 PRAGMA busy_timeout = 5000;
                 PRAGMA wal_autocheckpoint = 1000;
                 PRAGMA cache_size = 10000;
                 PRAGMA temp_store = MEMORY;
                 PRAGMA foreign_keys = ON;
                 PRAGMA locking_mode = NORMAL;",
            )?;
            Ok(())
        });

    // Optimized pool configuration for SQLite using provided config
    let pool = Pool::builder()
        .max_size(config.max_connections)
        .min_idle(config.min_idle)
        .connection_timeout(config.connection_timeout)
        .idle_timeout(config.idle_timeout)
        .max_lifetime(config.max_lifetime)
        .connection_customizer(Box::new(ConnectionCustomizer))
        .build(manager)?;

    Ok(pool)
}

/// Get a connection from the pool with timeout and retry logic
pub fn get_connection_with_timeout(
    pool: &Pool<SqliteConnectionManager>,
    timeout_secs: u64,
) -> Result<PooledConnection<SqliteConnectionManager>, String> {
    let start = std::time::Instant::now();

    loop {
        match pool.get() {
            Ok(conn) => return Ok(conn),
            Err(e) => {
                if start.elapsed().as_secs() >= timeout_secs {
                    return Err(format!(
                        "Failed to get database connection after {}s: {}",
                        timeout_secs, e
                    ));
                }
                std::thread::sleep(Duration::from_millis(100));
            }
        }
    }
}

/// Checkpoint WAL to improve performance and reduce disk usage
pub fn checkpoint_wal(pool: &Pool<SqliteConnectionManager>) -> Result<(), String> {
    let conn = pool.get().map_err(|e| e.to_string())?;

    conn.execute_batch("PRAGMA wal_checkpoint(PASSIVE); PRAGMA optimize;")
        .map_err(|e| format!("WAL checkpoint failed: {}", e))?;

    Ok(())
}

/// Query performance monitor for tracking slow queries and optimizing database operations
#[derive(Clone, Debug)]
pub struct QueryPerformanceMonitor {
    slow_query_threshold: Duration,
    query_stats: Arc<Mutex<HashMap<String, QueryStats>>>,
}

#[derive(Debug, Clone)]
pub struct QueryStats {
    pub execution_count: u64,
    pub total_time: Duration,
    pub last_execution: chrono::DateTime<chrono::Utc>,
    pub avg_time: Duration,
}

impl QueryPerformanceMonitor {
    pub fn new(slow_query_threshold: Duration) -> Self {
        Self {
            slow_query_threshold,
            query_stats: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Monitor a query execution and record performance statistics
    pub fn monitor_query<F, T>(&self, query: &str, operation: F) -> Result<T, rusqlite::Error>
    where
        F: FnOnce() -> Result<T, rusqlite::Error>,
    {
        let start = Instant::now();
        let result = operation();
        let duration = start.elapsed();

        if duration > self.slow_query_threshold {
            warn!("Slow query detected: {} took {:?}", query, duration);
        }

        // Record stats
        let mut stats = self.query_stats.lock().unwrap();
        let query_stats = stats.entry(query.to_string()).or_insert(QueryStats {
            execution_count: 0,
            total_time: Duration::from_secs(0),
            last_execution: chrono::Utc::now(),
            avg_time: Duration::from_secs(0),
        });

        query_stats.execution_count += 1;
        query_stats.total_time += duration;
        query_stats.last_execution = chrono::Utc::now();
        query_stats.avg_time = query_stats.total_time / query_stats.execution_count as u32;

        debug!("Query executed in {:?}: {}", duration, query);

        result
    }

    /// Get performance statistics for all queries
    pub fn get_stats(&self) -> HashMap<String, QueryStats> {
        self.query_stats.lock().unwrap().clone()
    }

    /// Get slow queries (above threshold)
    pub fn get_slow_queries(&self) -> Vec<(String, QueryStats)> {
        self.query_stats
            .lock()
            .unwrap()
            .iter()
            .filter(|(_, stats)| stats.avg_time > self.slow_query_threshold)
            .map(|(query, stats)| (query.clone(), stats.clone()))
            .collect()
    }

    /// Clear all statistics
    pub fn clear_stats(&self) {
        self.query_stats.lock().unwrap().clear();
    }
}

impl Default for QueryStats {
    fn default() -> Self {
        Self {
            execution_count: 0,
            total_time: Duration::from_secs(0),
            last_execution: chrono::Utc::now(),
            avg_time: Duration::from_secs(0),
        }
    }
}

/// Prepared statement cache statistics (rusqlite handles caching internally)
#[derive(Clone, Debug)]
pub struct PreparedStatementCache {
    // Since rusqlite handles prepared statement caching internally via prepare_cached(),
    // we just track usage statistics here
    stats: Arc<Mutex<HashMap<String, usize>>>,
}

impl PreparedStatementCache {
    pub fn new() -> Self {
        Self {
            stats: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Record usage of a prepared statement
    pub fn record_usage(&self, sql: &str) {
        let mut stats = self.stats.lock().unwrap();
        *stats.entry(sql.to_string()).or_insert(0) += 1;
    }

    /// Clear all statistics
    pub fn clear(&self) {
        self.stats.lock().unwrap().clear();
    }

    /// Get cache statistics
    pub fn stats(&self) -> HashMap<String, usize> {
        self.stats.lock().unwrap().clone()
    }
}

impl Default for PreparedStatementCache {
    fn default() -> Self {
        Self::new()
    }
}

/// Dynamic pool manager that adjusts connection pool size based on load
#[derive(Debug)]
pub struct DynamicPoolManager {
    current_config: std::sync::Mutex<PoolConfig>,
    load_monitor: std::sync::Arc<LoadMonitor>,
}

#[derive(Debug)]
struct LoadMonitor {
    connection_wait_times: std::sync::Mutex<Vec<std::time::Duration>>,
    max_samples: usize,
}

impl LoadMonitor {
    fn new(max_samples: usize) -> Self {
        Self {
            connection_wait_times: std::sync::Mutex::new(Vec::new()),
            max_samples,
        }
    }

    fn record_wait_time(&self, duration: std::time::Duration) {
        let mut times = self.connection_wait_times.lock().unwrap();
        times.push(duration);
        if times.len() > self.max_samples {
            times.remove(0); // Remove oldest sample
        }
    }

    fn get_average_wait_time(&self) -> Option<std::time::Duration> {
        let times = self.connection_wait_times.lock().unwrap();
        if times.is_empty() {
            return None;
        }
        let total: std::time::Duration = times.iter().sum();
        Some(total / times.len() as u32)
    }

    fn should_increase_pool(&self) -> bool {
        if let Some(avg_wait) = self.get_average_wait_time() {
            avg_wait > std::time::Duration::from_millis(100) // High wait time threshold
        } else {
            false
        }
    }

    fn should_decrease_pool(&self) -> bool {
        if let Some(avg_wait) = self.get_average_wait_time() {
            avg_wait < std::time::Duration::from_millis(10) // Very low wait time
        } else {
            false
        }
    }
}

impl DynamicPoolManager {
    pub fn new() -> Self {
        Self {
            current_config: std::sync::Mutex::new(PoolConfig::default()),
            load_monitor: std::sync::Arc::new(LoadMonitor::new(100)), // Keep last 100 samples
        }
    }

    pub fn get_config(&self) -> PoolConfig {
        self.current_config.lock().unwrap().clone()
    }

    pub fn record_connection_wait(&self, duration: std::time::Duration) {
        self.load_monitor.record_wait_time(duration);
    }

    pub fn adjust_pool_size(&self) -> Option<PoolConfig> {
        let mut config = self.current_config.lock().unwrap();

        if self.load_monitor.should_increase_pool() && config.max_connections < 50 {
            // Increase pool size gradually
            let new_max = (config.max_connections as f64 * 1.5).min(50.0) as u32;
            if new_max != config.max_connections {
                config.max_connections = new_max;
                config.min_idle = Some((new_max / 4).max(2));
                tracing::info!("Increasing connection pool size to {}", new_max);
                return Some(config.clone());
            }
        } else if self.load_monitor.should_decrease_pool() && config.max_connections > 10 {
            // Decrease pool size if consistently low load
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

    pub fn get_load_stats(&self) -> LoadStats {
        LoadStats {
            average_wait_time: self.load_monitor.get_average_wait_time(),
            sample_count: self
                .load_monitor
                .connection_wait_times
                .lock()
                .unwrap()
                .len(),
            current_config: self.get_config(),
        }
    }
}

impl Default for DynamicPoolManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Load statistics for monitoring pool performance
#[derive(Debug, Clone)]
pub struct LoadStats {
    pub average_wait_time: Option<std::time::Duration>,
    pub sample_count: usize,
    pub current_config: PoolConfig,
}

/// Streaming query interface for handling large result sets
pub trait StreamingQuery<T> {
    /// Get the next chunk of results
    fn next_chunk(&mut self, chunk_size: usize) -> Result<Option<Vec<T>>, rusqlite::Error>;

    /// Check if there are more results available
    fn has_more(&self) -> bool;

    /// Get total count of results (if known)
    fn total_count(&self) -> Option<usize> {
        None
    }
}

/// Streaming query implementation for paginated results
pub struct ChunkedQuery<T, F>
where
    F: Fn(&rusqlite::Row) -> Result<T, rusqlite::Error>,
{
    query: String,
    params: Vec<rusqlite::types::Value>,
    row_mapper: F,
    pool: Pool<SqliteConnectionManager>,
    offset: usize,
    total_count: Option<usize>,
    exhausted: bool,
}

impl<T, F> ChunkedQuery<T, F>
where
    F: Fn(&rusqlite::Row) -> Result<T, rusqlite::Error>,
{
    pub fn new(
        query: String,
        params: Vec<rusqlite::types::Value>,
        row_mapper: F,
        pool: Pool<SqliteConnectionManager>,
    ) -> Self {
        Self {
            query,
            params,
            row_mapper,
            pool,
            offset: 0,
            total_count: None,
            exhausted: false,
        }
    }

    pub fn with_total_count(mut self, count: usize) -> Self {
        self.total_count = Some(count);
        self
    }
}

impl<T, F> StreamingQuery<T> for ChunkedQuery<T, F>
where
    F: Fn(&rusqlite::Row) -> Result<T, rusqlite::Error>,
{
    fn next_chunk(&mut self, chunk_size: usize) -> Result<Option<Vec<T>>, rusqlite::Error> {
        if self.exhausted {
            return Ok(None);
        }

        let conn = self.pool.get().map_err(|e| {
            rusqlite::Error::FromSqlConversionFailure(
                0,
                rusqlite::types::Type::Text,
                Box::new(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("Pool error: {}", e),
                )),
            )
        })?;
        let mut stmt = conn.prepare(&format!("{} LIMIT ? OFFSET ?", self.query))?;

        // Bind parameters
        for (i, param) in self.params.iter().enumerate() {
            stmt.raw_bind_parameter(i + 1, param)?;
        }

        // Bind LIMIT and OFFSET
        stmt.raw_bind_parameter(self.params.len() + 1, &chunk_size)?;
        stmt.raw_bind_parameter(self.params.len() + 2, &self.offset)?;

        let rows = stmt.query_map([], |row| (self.row_mapper)(row))?;
        let mut results = Vec::new();

        for row_result in rows {
            results.push(row_result?);
        }

        if results.len() < chunk_size {
            self.exhausted = true;
        }

        self.offset += results.len();

        if results.is_empty() {
            Ok(None)
        } else {
            Ok(Some(results))
        }
    }

    fn has_more(&self) -> bool {
        !self.exhausted
    }

    fn total_count(&self) -> Option<usize> {
        self.total_count
    }
}

/// Stream-based interface for processing large datasets
pub use futures::stream::{Stream, StreamExt};

/// Convert a streaming query into an async stream
pub fn into_stream<T, F>(
    mut query: ChunkedQuery<T, F>,
    chunk_size: usize,
) -> impl Stream<Item = Result<Vec<T>, rusqlite::Error>>
where
    F: Fn(&rusqlite::Row) -> Result<T, rusqlite::Error> + Send + 'static,
    T: Send + 'static,
{
    async_stream::stream! {
        while query.has_more() {
            match query.next_chunk(chunk_size) {
                Ok(Some(chunk)) => yield Ok(chunk),
                Ok(None) => break,
                Err(e) => {
                    yield Err(e);
                    break;
                }
            }
        }
    }
}

/// Summary of database performance statistics
#[derive(Debug, Clone)]
pub struct QueryStatsSummary {
    pub total_queries: u64,
    pub slow_queries_count: u64,
    pub slow_queries: Vec<(String, QueryStats)>,
    pub cache_stats: std::collections::HashMap<String, usize>,
}
