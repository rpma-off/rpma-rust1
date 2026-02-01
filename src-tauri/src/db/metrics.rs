//! Database metrics and monitoring module
//!
//! This module provides performance monitoring, health checks, and connection
//! pool statistics for the database layer.

use crate::db::{Database, DbResult, QueryMetrics};
use tracing::{debug, error, instrument, warn};

/// Metrics and monitoring implementation
impl Database {
    /// Log query metrics using structured logging
    #[instrument(skip(self, metrics))]
    pub fn log_metrics(&self, metrics: &QueryMetrics) {
        let rows_info = if let Some(rows) = metrics.rows_affected {
            format!("{} rows", rows)
        } else {
            "query".to_string()
        };

        let query_preview = &metrics.query[..std::cmp::min(50, metrics.query.len())];

        debug!(
            query = %query_preview,
            duration_ms = metrics.duration_ms,
            rows_affected = %rows_info,
            "Database query executed"
        );

        // Log slow queries (>100ms) as warnings
        if metrics.duration_ms > 100 {
            warn!(
                query = %metrics.query,
                duration_ms = metrics.duration_ms,
                "Slow database query detected"
            );
        }
    }

    /// Enable/disable query metrics
    pub fn set_metrics_enabled(&mut self, enabled: bool) {
        self.metrics_enabled = enabled;
    }

    /// Check if metrics are enabled
    pub fn is_metrics_enabled(&self) -> bool {
        self.metrics_enabled
    }

    /// Get connection pool statistics
    pub fn get_pool_stats(&self) -> (u32, u32) {
        let state = self.pool.state();
        (state.connections, state.idle_connections)
    }

    /// Get detailed connection pool statistics
    pub fn get_detailed_pool_stats(&self) -> serde_json::Value {
        let state = self.pool.state();
        let utilization = if state.connections > 0 {
            (state.connections - state.idle_connections) as f64 / state.connections as f64 * 100.0
        } else {
            0.0
        };

        serde_json::json!({
            "total_connections": state.connections,
            "idle_connections": state.idle_connections,
            "active_connections": state.connections - state.idle_connections,
            "utilization_percent": utilization,
            "max_size": 20, // From pool builder
            "connection_timeout_secs": 10, // From pool builder
        })
    }

    /// Log pool statistics for monitoring
    pub fn log_pool_stats(&self) {
        let (total, idle) = self.get_pool_stats();
        let utilization = if total > 0 {
            ((total - idle) as f64 / total as f64 * 100.0) as u32
        } else {
            0
        };

        debug!(
            total_connections = total,
            idle_connections = idle,
            utilization_percent = utilization,
            "Database connection pool statistics"
        );

        // Warn if pool utilization is high
        if utilization >= 80 {
            warn!(
                idle_connections = idle,
                total_connections = total,
                utilization_percent = utilization,
                "High connection pool utilization - potential performance issues"
            );
        }

        // Critical alert if all connections are in use
        if idle == 0 && total > 0 {
            error!(
                idle_connections = idle,
                total_connections = total,
                "All database connections in use - pool exhaustion detected"
            );
        }
    }

    /// Health check for database connectivity
    pub fn health_check(&self) -> DbResult<()> {
        let conn = self.get_connection()?;
        conn.query_row("SELECT 1", [], |_| Ok(()))
            .map_err(|e| format!("Database health check failed: {}", e))?;
        Ok(())
    }
}
