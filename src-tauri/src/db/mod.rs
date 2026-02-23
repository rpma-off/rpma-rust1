//! Database module for SQLite operations
//!
//! This module handles all SQLite database initialization, migrations,
//! and provides the Database connection wrapper.

pub mod connection;
pub mod import;
pub mod metrics;
pub mod migrations;
pub mod operation_pool;
pub mod queries;
pub mod utils;

use r2d2::{Pool, PooledConnection};
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::{Result as SqliteResult, Row};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::time::{Duration, Instant};
use tracing::{debug, warn};

// Re-export connection functions for backward compatibility
pub use connection::{checkpoint_wal, initialize_pool};

// Re-export operation pool for routing database operations
pub use operation_pool::{OperationPoolConfig, OperationPoolManager, OperationType, PoolStats};

/// Trait for types that can be constructed from a SQLite row
pub trait FromSqlRow: Sized {
    fn from_row(row: &Row) -> SqliteResult<Self>;
}

/// NOTE: Repository trait lives in shared::repositories::base
/// Use `use crate::shared::repositories::base::Repository` for repository operations
/// This module retains legacy QueryBuilder for backward compatibility
/// Backward compatibility: Re-export Repository from shared::repositories::base
pub use crate::shared::repositories::base::Repository;

/// Query builder for complex queries
pub struct QueryBuilder {
    sql: String,
    params: Vec<rusqlite::types::Value>,
}

impl QueryBuilder {
    pub fn new(base_sql: &str) -> Self {
        Self {
            sql: base_sql.to_string(),
            params: Vec::new(),
        }
    }

    pub fn where_clause(mut self, condition: &str) -> Self {
        self.sql.push_str(" WHERE ");
        self.sql.push_str(condition);
        self
    }

    pub fn and(mut self, condition: &str) -> Self {
        self.sql.push_str(" AND ");
        self.sql.push_str(condition);
        self
    }

    pub fn param<T>(mut self, value: T) -> Self
    where
        T: rusqlite::ToSql,
        rusqlite::types::Value: From<T>,
    {
        self.params.push(rusqlite::types::Value::from(value));
        self
    }

    pub fn order_by(mut self, column: &str, direction: &str) -> Self {
        self.sql
            .push_str(&format!(" ORDER BY {} {}", column, direction));
        self
    }

    pub fn limit(mut self, limit: i64) -> Self {
        self.sql.push_str(&format!(" LIMIT {}", limit));
        self
    }

    pub fn offset(mut self, offset: i64) -> Self {
        self.sql.push_str(&format!(" OFFSET {}", offset));
        self
    }

    pub fn build(self) -> (String, Vec<rusqlite::types::Value>) {
        (self.sql, self.params)
    }
}

/// Database connection pool wrapper
#[derive(Clone, Debug)]
pub struct Database {
    pool: Pool<SqliteConnectionManager>,
    metrics_enabled: bool,
    query_monitor: std::sync::Arc<connection::QueryPerformanceMonitor>,
    stmt_cache: std::sync::Arc<connection::PreparedStatementCache>,
    dynamic_pool_manager: std::sync::Arc<connection::DynamicPoolManager>,
}

/// Async database wrapper for non-blocking database operations
#[derive(Clone, Debug)]
pub struct AsyncDatabase {
    pool: Pool<SqliteConnectionManager>,
    query_monitor: std::sync::Arc<connection::QueryPerformanceMonitor>,
    stmt_cache: std::sync::Arc<connection::PreparedStatementCache>,
    dynamic_pool_manager: std::sync::Arc<connection::DynamicPoolManager>,
}

/// Database result type - Legacy type using String for errors
/// For new code, use RepoResult<T> from repositories::base which provides structured RepoError
pub type DbResult<T> = Result<T, String>;

// Re-export RepoResult and RepoError for new code
pub use crate::shared::repositories::base::{RepoError, RepoResult};

/// Compatibility: Allow RepoError to be converted to String for legacy DbResult usage
impl From<RepoError> for String {
    fn from(err: RepoError) -> Self {
        err.to_string()
    }
}

/// Error types for intervention operations
#[derive(Debug, thiserror::Error)]
pub enum InterventionError {
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Business rule violation: {0}")]
    BusinessRule(String),
    #[error("Workflow error: {0}")]
    Workflow(String),
    #[error("Resource not found: {0}")]
    NotFound(String),
    #[error("Database error: {0}")]
    Database(String),
}

/// Result type alias for intervention operations
pub type InterventionResult<T> = Result<T, InterventionError>;

impl From<rusqlite::Error> for InterventionError {
    fn from(err: rusqlite::Error) -> Self {
        InterventionError::Database(err.to_string())
    }
}

// Convert InterventionError to AppError for IPC compatibility
impl From<InterventionError> for crate::commands::AppError {
    fn from(error: InterventionError) -> Self {
        match error {
            InterventionError::Validation(msg) => {
                // Map specific validation messages to more specific errors
                if msg.contains("already active") || msg.contains("already exists") {
                    crate::commands::AppError::InterventionAlreadyActive(msg)
                } else if msg.contains("already completed") || msg.contains("invalid state") {
                    crate::commands::AppError::InterventionInvalidState(msg)
                } else if msg.contains("not found") && msg.contains("step") {
                    crate::commands::AppError::InterventionStepNotFound(msg)
                } else if msg.contains("out of order") {
                    crate::commands::AppError::InterventionStepOutOfOrder(msg)
                } else {
                    crate::commands::AppError::InterventionValidationFailed(msg)
                }
            }
            InterventionError::BusinessRule(msg) => {
                // Business rule violations are typically validation issues
                if msg.contains("concurrent") || msg.contains("modified") {
                    crate::commands::AppError::InterventionConcurrentModification(msg)
                } else {
                    crate::commands::AppError::InterventionValidationFailed(msg)
                }
            }
            InterventionError::Workflow(msg) => {
                // Workflow errors are typically state-related
                crate::commands::AppError::InterventionInvalidState(msg)
            }
            InterventionError::NotFound(msg) => crate::commands::AppError::NotFound(msg),
            InterventionError::Database(msg) => {
                if msg.contains("timeout") || msg.contains("locked") {
                    crate::commands::AppError::InterventionTimeout(msg)
                } else {
                    crate::commands::AppError::db_sanitized("intervention", &msg)
                }
            }
        }
    }
}

/// Convert String to InterventionError
impl From<String> for InterventionError {
    fn from(error: String) -> Self {
        InterventionError::Database(error)
    }
}

/// Type alias for pooled connection
pub type PooledConn = PooledConnection<SqliteConnectionManager>;

/// Connection pool health metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolHealth {
    pub connections_active: u32,
    pub connections_idle: u32,
    pub connections_pending: u32,
    pub avg_wait_time_ms: f64,
    pub max_connections: u32,
    pub utilization_percentage: f64,
}

/// Query performance metrics
#[derive(Debug, Clone)]
pub struct QueryMetrics {
    pub query: String,
    pub duration_ms: u64,
    pub rows_affected: Option<usize>,
    pub _timestamp: std::time::SystemTime,
}

impl QueryMetrics {
    pub fn new(query: String, duration_ms: u64, rows_affected: Option<usize>) -> Self {
        Self {
            query,
            duration_ms,
            rows_affected,
            _timestamp: std::time::SystemTime::now(),
        }
    }
}

#[allow(dead_code)]
impl Database {
    /// Create new database connection pool
    ///
    /// # Arguments
    /// * `path` - Path to SQLite database file
    /// * `encryption_key` - Encryption key for database (empty string for no encryption)
    ///
    /// # Returns
    /// * `DbResult<Self>` - Database instance or error
    pub fn new<P: AsRef<Path>>(path: P, encryption_key: &str) -> DbResult<Self> {
        let path_str = path.as_ref().to_string_lossy();
        let pool = initialize_pool(&path_str, encryption_key).map_err(|e| e.to_string())?;

        // Initialize performance monitoring components
        let query_monitor = std::sync::Arc::new(connection::QueryPerformanceMonitor::new(
            Duration::from_millis(100), // 100ms threshold for slow queries
        ));
        let stmt_cache = std::sync::Arc::new(connection::PreparedStatementCache::new());
        let dynamic_pool_manager = std::sync::Arc::new(connection::DynamicPoolManager::new());

        Ok(Database {
            pool,
            metrics_enabled: std::env::var("RPMA_DB_METRICS").is_ok(),
            query_monitor,
            stmt_cache,
            dynamic_pool_manager,
        })
    }

    #[cfg(test)]
    pub async fn new_in_memory() -> DbResult<Self> {
        // Use a shared in-memory database so multiple pooled connections see the same schema/data.
        let db_name = format!(
            "file:rpma_test_{}?mode=memory&cache=shared",
            uuid::Uuid::new_v4()
        );

        let mut config = connection::PoolConfig::default();
        config.max_connections = 8;
        config.min_idle = Some(1);

        let pool = connection::initialize_pool_with_config(
            &db_name,
            "test_encryption_key_32_bytes_long!",
            &config,
        )
        .map_err(|e| e.to_string())?;

        let db = Database {
            pool,
            metrics_enabled: std::env::var("RPMA_DB_METRICS").is_ok(),
            query_monitor: std::sync::Arc::new(connection::QueryPerformanceMonitor::new(
                Duration::from_millis(100),
            )),
            stmt_cache: std::sync::Arc::new(connection::PreparedStatementCache::new()),
            dynamic_pool_manager: std::sync::Arc::new(connection::DynamicPoolManager::new()),
        };

        db.init()?;
        let latest_version = Database::get_latest_migration_version();
        db.migrate(latest_version)?;
        Ok(db)
    }

    /// Get a connection from the pool with retry logic and timing
    pub fn get_connection(&self) -> DbResult<PooledConn> {
        let start_time = Instant::now();
        let mut attempts = 0;
        let max_attempts = 3;

        loop {
            let attempt_start = Instant::now();
            match self.pool.get() {
                Ok(conn) => {
                    let duration = attempt_start.elapsed();
                    // Record wait time for dynamic pool management
                    self.dynamic_pool_manager.record_connection_wait(duration);

                    if duration > Duration::from_millis(100) {
                        // Log slow connection acquisition
                        warn!(
                            connection_acquisition_ms = duration.as_millis(),
                            attempt = attempts + 1,
                            "Slow database connection acquisition"
                        );
                    }
                    return Ok(conn);
                }
                Err(e) => {
                    let duration = attempt_start.elapsed();
                    attempts += 1;

                    warn!(
                        attempt = attempts,
                        duration_ms = duration.as_millis(),
                        error = %e,
                        "Database connection acquisition failed"
                    );

                    if attempts >= max_attempts {
                        let total_duration = start_time.elapsed().as_millis() as u64;
                        return Err(format!(
                            "Failed to get database connection after {} attempts ({}ms total): {}",
                            max_attempts, total_duration, e
                        ));
                    }
                    // Wait briefly before retrying
                    std::thread::sleep(std::time::Duration::from_millis(100 * attempts as u64));
                    debug!(
                        "Retrying database connection (attempt {}/{})",
                        attempts, max_attempts
                    );
                }
            }
        }
    }

    /// Get connection pool (for complex queries)
    pub fn pool(&self) -> &Pool<SqliteConnectionManager> {
        &self.pool
    }

    /// Get connection pool statistics
    pub fn pool_stats(&self) -> r2d2::State {
        self.pool.state()
    }

    /// Execute a function within a database transaction
    ///
    /// This method provides transactional semantics for database operations.
    /// If the function returns an error, the transaction is rolled back.
    /// If the function succeeds, the transaction is committed.
    pub fn with_transaction<F, T>(&self, f: F) -> DbResult<T>
    where
        F: FnOnce(&rusqlite::Transaction) -> DbResult<T>,
    {
        let mut conn = self
            .get_connection()
            .map_err(|e| format!("Failed to get connection for transaction: {}", e))?;
        let tx = conn
            .transaction()
            .map_err(|e| format!("Failed to start transaction: {}", e))?;
        let started_at = Instant::now();

        match f(&tx) {
            Ok(result) => {
                tx.commit()
                    .map_err(|e| format!("Failed to commit transaction: {}", e))?;
                let duration = started_at.elapsed();
                if duration > Duration::from_millis(250) {
                    warn!(
                        duration_ms = duration.as_millis(),
                        "Long-running database transaction detected"
                    );
                }
                Ok(result)
            }
            Err(e) => {
                // Transaction will be automatically rolled back when dropped
                Err(e)
            }
        }
    }

    /// Validate connection pool configuration
    pub fn validate_pool_config(&self) -> DbResult<()> {
        let stats = self.pool_stats();

        // Check minimum requirements
        if stats.connections < 1 {
            return Err("No connections available in pool".to_string());
        }

        if stats.idle_connections == 0 && stats.connections > 5 {
            warn!(
                "Pool has {} connections but 0 idle - possible connection leak",
                stats.connections
            );
        }

        Ok(())
    }

    /// Get the query performance monitor
    pub fn query_monitor(&self) -> &std::sync::Arc<connection::QueryPerformanceMonitor> {
        &self.query_monitor
    }

    /// Get the prepared statement cache
    pub fn stmt_cache(&self) -> &std::sync::Arc<connection::PreparedStatementCache> {
        &self.stmt_cache
    }

    /// Get database performance statistics
    pub fn get_performance_stats(&self) -> connection::QueryStatsSummary {
        let slow_queries = self.query_monitor.get_slow_queries();
        let all_stats = self.query_monitor.get_stats();

        connection::QueryStatsSummary {
            total_queries: all_stats.len() as u64,
            slow_queries_count: slow_queries.len() as u64,
            slow_queries,
            cache_stats: self.stmt_cache.stats(),
        }
    }

    /// Clear performance statistics
    pub fn clear_performance_stats(&self) {
        self.query_monitor.clear_stats();
        self.stmt_cache.clear();
    }

    /// Create an async database wrapper from this database instance
    pub fn as_async(&self) -> AsyncDatabase {
        AsyncDatabase {
            pool: self.pool.clone(),
            query_monitor: self.query_monitor.clone(),
            stmt_cache: self.stmt_cache.clone(),
            dynamic_pool_manager: self.dynamic_pool_manager.clone(),
        }
    }

    /// Get connection pool health metrics
    pub fn get_pool_health(&self) -> PoolHealth {
        let state = self.pool.state();
        let config = self.dynamic_pool_manager.get_config();
        let load_stats = self.dynamic_pool_manager.get_load_stats();

        PoolHealth {
            connections_active: state.connections,
            connections_idle: state.idle_connections,
            connections_pending: 0, // r2d2 doesn't expose pending connections
            avg_wait_time_ms: load_stats
                .average_wait_time
                .map(|d| d.as_millis() as f64)
                .unwrap_or(0.0),
            max_connections: config.max_connections,
            utilization_percentage: (state.connections as f64 / config.max_connections as f64)
                * 100.0,
        }
    }

    /// Get dynamic pool manager for advanced pool management
    pub fn dynamic_pool_manager(&self) -> &std::sync::Arc<connection::DynamicPoolManager> {
        &self.dynamic_pool_manager
    }

    /// Attempt to adjust pool size based on current load
    pub fn adjust_pool_size(&self) -> Option<connection::PoolConfig> {
        self.dynamic_pool_manager.adjust_pool_size()
    }

    /// Create a streaming query for large result sets
    pub fn create_streaming_query<T, F>(
        &self,
        query: &str,
        params: Vec<rusqlite::types::Value>,
        row_mapper: F,
    ) -> connection::ChunkedQuery<T, F>
    where
        F: Fn(&rusqlite::Row) -> Result<T, rusqlite::Error>,
    {
        connection::ChunkedQuery::new(query.to_string(), params, row_mapper, self.pool.clone())
    }

    /// Execute a streaming query with total count
    pub fn execute_streaming_query<T, F>(
        &self,
        query: &str,
        count_query: Option<&str>,
        params: Vec<rusqlite::types::Value>,
        row_mapper: F,
    ) -> DbResult<connection::ChunkedQuery<T, F>>
    where
        F: Fn(&rusqlite::Row) -> Result<T, rusqlite::Error>,
    {
        let mut streaming_query = self.create_streaming_query(query, params, row_mapper);

        // If count query provided, execute it to get total
        if let Some(count_sql) = count_query {
            let conn = self.get_connection()?;
            let count: i64 = conn
                .query_row(count_sql, [], |row| row.get(0))
                .map_err(|e| format!("Failed to execute count query: {}", e))?;
            streaming_query = streaming_query.with_total_count(count as usize);
        }

        Ok(streaming_query)
    }
}

impl AsyncDatabase {
    /// Execute a database operation asynchronously without blocking the async runtime
    ///
    /// This method uses tokio::task::spawn_blocking to run the database operation
    /// on a blocking thread pool, preventing it from blocking the async runtime.
    pub async fn execute_async<F, T>(&self, operation: F) -> DbResult<T>
    where
        F: FnOnce(&mut rusqlite::Connection) -> DbResult<T> + Send + 'static,
        T: Send + 'static,
    {
        let pool = self.pool.clone();
        let _monitor = self.query_monitor.clone();
        let _cache = self.stmt_cache.clone();

        let _monitor_clone = self.query_monitor.clone();
        let pool_manager_clone = self.dynamic_pool_manager.clone();

        tokio::task::spawn_blocking(move || {
            // Get connection from pool
            let conn_start = std::time::Instant::now();
            let mut conn = pool
                .get()
                .map_err(|e| format!("Failed to get database connection: {}", e))?;
            let conn_duration = conn_start.elapsed();

            // Record connection wait time for dynamic pool management
            pool_manager_clone.record_connection_wait(conn_duration);

            // Monitor query performance if enabled
            let start = std::time::Instant::now();
            let result = operation(&mut conn);
            let duration = start.elapsed();

            // Log slow queries
            if duration > std::time::Duration::from_millis(100) {
                tracing::warn!(
                    query_duration_ms = duration.as_millis(),
                    "Slow database operation detected"
                );
            }

            result
        })
        .await
        .map_err(|e| format!("Database operation panicked: {:?}", e))?
    }

    /// Execute a transaction asynchronously
    ///
    /// This method runs the entire transaction on a blocking thread to maintain
    /// transactional semantics while not blocking the async runtime.
    pub async fn with_transaction_async<F, T>(&self, operation: F) -> DbResult<T>
    where
        F: FnOnce(&rusqlite::Transaction) -> DbResult<T> + Send + 'static,
        T: Send + 'static,
    {
        let pool = self.pool.clone();

        tokio::task::spawn_blocking(move || {
            let mut conn = pool
                .get()
                .map_err(|e| format!("Failed to get database connection: {}", e))?;
            let tx = conn
                .transaction()
                .map_err(|e| format!("Failed to start transaction: {}", e))?;
            let started_at = std::time::Instant::now();

            match operation(&tx) {
                Ok(result) => {
                    tx.commit()
                        .map_err(|e| format!("Failed to commit transaction: {}", e))?;
                    let duration = started_at.elapsed();
                    if duration > std::time::Duration::from_millis(250) {
                        tracing::warn!(
                            duration_ms = duration.as_millis(),
                            "Long-running async database transaction detected"
                        );
                    }
                    Ok(result)
                }
                Err(e) => {
                    // Transaction will be automatically rolled back when dropped
                    Err(e)
                }
            }
        })
        .await
        .map_err(|e| format!("Transaction operation panicked: {:?}", e))?
    }

    /// Execute a read-only operation asynchronously
    ///
    /// Optimized for read operations that don't require transactions
    pub async fn execute_read_async<F, T>(&self, operation: F) -> DbResult<T>
    where
        F: FnOnce(&mut rusqlite::Connection) -> DbResult<T> + Send + 'static,
        T: Send + 'static,
    {
        self.execute_async(operation).await
    }

    /// Get database connection pool statistics asynchronously
    pub async fn get_pool_stats_async(&self) -> DbResult<r2d2::State> {
        let pool = self.pool.clone();
        tokio::task::spawn_blocking(move || Ok(pool.state()))
            .await
            .map_err(|e| format!("Failed to get pool stats: {:?}", e))?
    }

    /// Vacuum database asynchronously
    pub async fn vacuum_async(&self) -> DbResult<()> {
        self.execute_async(|conn| {
            conn.execute_batch("VACUUM;")
                .map_err(|e| format!("Failed to vacuum database: {}", e))?;
            Ok(())
        })
        .await
    }

    /// Checkpoint WAL asynchronously
    pub async fn checkpoint_wal_async(&self) -> DbResult<()> {
        self.execute_async(|conn| {
            conn.execute_batch("PRAGMA wal_checkpoint(PASSIVE); PRAGMA optimize;")
                .map_err(|e| format!("Failed to checkpoint WAL: {}", e))?;
            Ok(())
        })
        .await
    }

    /// Execute a streaming query asynchronously
    pub async fn execute_streaming_query_async<T, F>(
        &self,
        query: &str,
        count_query: Option<&str>,
        params: Vec<rusqlite::types::Value>,
        row_mapper: F,
    ) -> DbResult<connection::ChunkedQuery<T, F>>
    where
        T: Send + 'static,
        F: Fn(&rusqlite::Row) -> Result<T, rusqlite::Error> + Send + 'static,
    {
        let query_clone = query.to_string();
        let count_query_clone = count_query.map(|s| s.to_string());
        let pool_clone = self.pool.clone();

        tokio::task::spawn_blocking(move || {
            let mut streaming_query =
                connection::ChunkedQuery::new(query_clone, params, row_mapper, pool_clone.clone());

            // If count query provided, execute it to get total
            if let Some(count_sql) = count_query_clone {
                let conn = pool_clone
                    .get()
                    .map_err(|e| format!("Failed to get connection for count: {}", e))?;
                let count: i64 = conn
                    .query_row(&count_sql, [], |row| row.get(0))
                    .map_err(|e| format!("Failed to execute count query: {}", e))?;
                streaming_query = streaming_query.with_total_count(count as usize);
            }

            Ok(streaming_query)
        })
        .await
        .map_err(|e| format!("Streaming query setup panicked: {:?}", e))?
    }

    /// Convert streaming query to async stream
    pub fn streaming_query_to_stream<T, F>(
        query: connection::ChunkedQuery<T, F>,
        chunk_size: usize,
    ) -> impl futures::Stream<Item = Result<Vec<T>, rusqlite::Error>> + Send
    where
        F: Fn(&rusqlite::Row) -> Result<T, rusqlite::Error> + Send + 'static,
        T: Send + 'static,
    {
        connection::into_stream(query, chunk_size)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn test_database_creation() {
        let temp_file = NamedTempFile::new().expect("Failed to create temp file");
        let db = Database::new(temp_file.path(), "").expect("Failed to create database");

        assert!(!db.is_initialized().expect("Failed to check initialization"));
    }

    #[test]
    fn test_database_initialization() {
        let temp_file = NamedTempFile::new().expect("Failed to create temp file");
        let db = Database::new(temp_file.path(), "").expect("Failed to create database");

        db.init().expect("Failed to initialize database");

        assert!(db.is_initialized().expect("Failed to check initialization"));

        let tables = db.list_tables().expect("Failed to list tables");
        assert!(tables.contains(&"interventions".to_string()));
        assert!(tables.contains(&"intervention_steps".to_string()));
        assert!(tables.contains(&"photos".to_string()));
        assert!(tables.contains(&"tasks".to_string()));
        assert!(tables.contains(&"clients".to_string()));
        assert!(tables.contains(&"users".to_string()));
        assert!(tables.contains(&"sync_queue".to_string()));
    }

    #[test]
    fn test_pragma_settings() {
        let temp_file = NamedTempFile::new().expect("Failed to create temp file");
        let db = Database::new(temp_file.path(), "").expect("Failed to create database");

        let conn = db.pool.get().expect("Failed to get connection");

        // Check WAL mode
        let journal_mode: String = conn
            .query_row("PRAGMA journal_mode", [], |row| row.get(0))
            .expect("Failed to query journal_mode");
        assert_eq!(journal_mode, "wal");

        // Check foreign keys enabled
        let fk_enabled: i32 = conn
            .query_row("PRAGMA foreign_keys", [], |row| row.get(0))
            .expect("Failed to query foreign_keys");
        assert_eq!(fk_enabled, 1);

        let wal_autocheckpoint: i32 = conn
            .query_row("PRAGMA wal_autocheckpoint", [], |row| row.get(0))
            .expect("Failed to query wal_autocheckpoint");
        assert_eq!(wal_autocheckpoint, 1000);
    }
}
