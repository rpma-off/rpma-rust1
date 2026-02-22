//! Operation-based connection pooling for database scalability
//!
//! This module provides separate connection pools optimized for different
//! database operation types: read-heavy, write-heavy, and report generation.

use r2d2::{Pool, PooledConnection};
use r2d2_sqlite::SqliteConnectionManager;
use std::time::Duration;
use tracing::{debug, info};

use crate::db::connection::{initialize_pool_with_config, PoolConfig};

/// Configuration for operation-based pooling
#[derive(Debug, Clone)]
pub struct OperationPoolConfig {
    /// Read pool configuration - optimized for SELECT queries
    pub read_config: PoolConfig,
    /// Write pool configuration - optimized for INSERT/UPDATE/DELETE
    pub write_config: PoolConfig,
    /// Report pool configuration - optimized for long-running analytical queries
    pub report_config: PoolConfig,
}

impl Default for OperationPoolConfig {
    fn default() -> Self {
        // Read pool - high concurrency, optimized for frequent reads
        let read_config = PoolConfig {
            max_connections: 80,
            min_idle: Some(15),
            connection_timeout: Duration::from_secs(30),
            idle_timeout: Some(Duration::from_secs(600)),
            max_lifetime: Some(Duration::from_secs(3600)),
        };

        // Write pool - smaller but dedicated for writes to avoid contention
        let write_config = PoolConfig {
            max_connections: 30,
            min_idle: Some(5),
            connection_timeout: Duration::from_secs(60), // Longer timeout for writes
            idle_timeout: Some(Duration::from_secs(300)),
            max_lifetime: Some(Duration::from_secs(1800)),
        };

        // Report pool - larger timeout for long-running queries
        let report_config = PoolConfig {
            max_connections: 20,
            min_idle: Some(3),
            connection_timeout: Duration::from_secs(300), // 5 minutes for complex reports
            idle_timeout: Some(Duration::from_secs(900)), // 15 minutes
            max_lifetime: Some(Duration::from_secs(7200)), // 2 hours
        };

        Self {
            read_config,
            write_config,
            report_config,
        }
    }
}

/// Database operation types for pool selection
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum OperationType {
    /// Read operations (SELECT queries)
    Read,
    /// Write operations (INSERT, UPDATE, DELETE)
    Write,
    /// Report generation (long-running analytical queries)
    Report,
}

/// Operation-based connection pool manager
#[derive(Debug)]
pub struct OperationPoolManager {
    read_pool: Pool<SqliteConnectionManager>,
    write_pool: Pool<SqliteConnectionManager>,
    report_pool: Pool<SqliteConnectionManager>,
    config: OperationPoolConfig,
}

impl OperationPoolManager {
    /// Initialize operation-based pools with the given database path
    pub fn new(
        db_path: &str,
        encryption_key: &str,
        config: OperationPoolConfig,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        info!("Initializing operation-based connection pools");

        let read_pool = initialize_pool_with_config(db_path, encryption_key, &config.read_config)?;
        let write_pool =
            initialize_pool_with_config(db_path, encryption_key, &config.write_config)?;
        let report_pool =
            initialize_pool_with_config(db_path, encryption_key, &config.report_config)?;

        info!(
            "Pools initialized - Read: {} max, Write: {} max, Report: {} max",
            config.read_config.max_connections,
            config.write_config.max_connections,
            config.report_config.max_connections
        );

        Ok(Self {
            read_pool,
            write_pool,
            report_pool,
            config,
        })
    }

    /// Get a connection from the appropriate pool based on operation type
    pub fn get_connection(
        &self,
        operation_type: OperationType,
    ) -> Result<PooledConnection<SqliteConnectionManager>, String> {
        let pool = match operation_type {
            OperationType::Read => &self.read_pool,
            OperationType::Write => &self.write_pool,
            OperationType::Report => &self.report_pool,
        };

        pool.get()
            .map_err(|e| format!("Failed to get connection: {}", e))
    }

    /// Get connection with timeout from the appropriate pool
    pub fn get_connection_with_timeout(
        &self,
        operation_type: OperationType,
        timeout_secs: u64,
    ) -> Result<PooledConnection<SqliteConnectionManager>, String> {
        let start = std::time::Instant::now();
        let pool = match operation_type {
            OperationType::Read => &self.read_pool,
            OperationType::Write => &self.write_pool,
            OperationType::Report => &self.report_pool,
        };

        loop {
            match pool.get() {
                Ok(conn) => return Ok(conn),
                Err(e) => {
                    if start.elapsed().as_secs() >= timeout_secs {
                        return Err(format!(
                            "Failed to get {:?} connection after {}s: {}",
                            operation_type, timeout_secs, e
                        ));
                    }
                    std::thread::sleep(Duration::from_millis(100));
                }
            }
        }
    }

    /// Get pool statistics for monitoring
    pub fn get_pool_stats(&self) -> PoolStats {
        PoolStats {
            read_pool: PoolInfo {
                total_connections: self.read_pool.state().connections,
                idle_connections: self.read_pool.state().idle_connections,
                max_connections: self.config.read_config.max_connections,
            },
            write_pool: PoolInfo {
                total_connections: self.write_pool.state().connections,
                idle_connections: self.write_pool.state().idle_connections,
                max_connections: self.config.write_config.max_connections,
            },
            report_pool: PoolInfo {
                total_connections: self.report_pool.state().connections,
                idle_connections: self.report_pool.state().idle_connections,
                max_connections: self.config.report_config.max_connections,
            },
        }
    }

    /// Perform WAL checkpoint on all pools
    pub fn checkpoint_all(&self) -> Result<(), String> {
        use crate::db::connection::checkpoint_wal;

        checkpoint_wal(&self.read_pool)?;
        checkpoint_wal(&self.write_pool)?;
        checkpoint_wal(&self.report_pool)?;

        debug!("WAL checkpoint completed on all pools");
        Ok(())
    }

    /// Get a clone of the underlying pool for the given operation type
    ///
    /// Used for streaming queries that need to manage their own connections.
    pub fn get_pool(&self, operation_type: OperationType) -> Pool<SqliteConnectionManager> {
        match operation_type {
            OperationType::Read => self.read_pool.clone(),
            OperationType::Write => self.write_pool.clone(),
            OperationType::Report => self.report_pool.clone(),
        }
    }
}

/// Pool statistics for monitoring
#[derive(Debug, Clone)]
pub struct PoolStats {
    pub read_pool: PoolInfo,
    pub write_pool: PoolInfo,
    pub report_pool: PoolInfo,
}

/// Information about a single pool
#[derive(Debug, Clone)]
pub struct PoolInfo {
    pub total_connections: u32,
    pub idle_connections: u32,
    pub max_connections: u32,
}

/// Wrapper type to simplify routing operations
pub struct RoutedConnection {
    conn: PooledConnection<SqliteConnectionManager>,
    operation_type: OperationType,
}

/// Trait for database operations that can be routed
pub trait OperationRoutable {
    fn operation_type(&self) -> OperationType;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_operation_pool_config_default() {
        let config = OperationPoolConfig::default();
        assert_eq!(config.read_config.max_connections, 80);
        assert_eq!(config.write_config.max_connections, 30);
        assert_eq!(config.report_config.max_connections, 20);
    }
}
