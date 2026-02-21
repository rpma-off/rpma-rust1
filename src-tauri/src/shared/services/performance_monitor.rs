//! Performance monitoring and metrics collection service

use crate::db::Database;
use crate::shared::db::performance_repository::PerformanceRepository;
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tracing::{debug, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetric {
    pub id: String,
    pub command: String,
    pub duration_ms: f64,
    pub success: bool,
    pub timestamp: DateTime<Utc>,
    pub user_id: Option<String>,
    pub error_message: Option<String>,
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceStats {
    pub total_requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub average_response_time: f64,
    pub p95_response_time: f64,
    pub p99_response_time: f64,
    pub requests_per_minute: f64,
    pub error_rate: f64,
    pub slowest_commands: Vec<(String, f64)>,
    pub most_frequent_commands: Vec<(String, u64)>,
}

#[derive(Debug)]
pub struct PerformanceMonitorService {
    db: Database,
    metrics_cache: Arc<Mutex<Vec<PerformanceMetric>>>,
    stats_cache: Arc<Mutex<Option<PerformanceStats>>>,
    stats_last_updated: Arc<Mutex<Option<DateTime<Utc>>>>,
}

impl PerformanceMonitorService {
    pub fn new(db: Database) -> Self {
        Self {
            db,
            metrics_cache: Arc::new(Mutex::new(Vec::new())),
            stats_cache: Arc::new(Mutex::new(None)),
            stats_last_updated: Arc::new(Mutex::new(None)),
        }
    }

    /// Initialize performance monitoring tables
    pub fn init(&self) -> Result<(), String> {
        let repo = PerformanceRepository::new(&self.db);
        repo.init_schema()
    }

    /// Record a performance metric
    pub fn record_metric(&self, metric: PerformanceMetric) -> Result<(), String> {
        // Add to cache
        {
            let mut cache = self.metrics_cache.lock().unwrap();
            cache.push(metric.clone());
            // Keep only last 1000 metrics in memory
            if cache.len() > 1000 {
                cache.remove(0);
            }
        }

        // Invalidate stats cache
        *self.stats_cache.lock().unwrap() = None;

        // Store in database
        let metadata_json = metric
            .metadata
            .as_ref()
            .map(serde_json::to_string)
            .transpose()
            .map_err(|e| format!("Failed to serialize metadata: {}", e))?
            .unwrap_or_else(|| "{}".to_string());

        let repo = PerformanceRepository::new(&self.db);
        repo.insert_metric(
            &metric.id,
            &metric.command,
            metric.duration_ms,
            metric.success,
            &metric.timestamp.to_rfc3339(),
            metric.user_id.as_deref(),
            metric.error_message.as_deref(),
            &metadata_json,
            &Utc::now().to_rfc3339(),
        )
    }

    /// Get performance statistics
    pub fn get_stats(&self) -> Result<PerformanceStats, String> {
        // Check if we have cached stats that are still fresh (within last minute)
        {
            let stats_cache = self.stats_cache.lock().unwrap();
            let last_updated = self.stats_last_updated.lock().unwrap();

            if let (Some(stats), Some(updated)) = (&*stats_cache, &*last_updated) {
                if Utc::now().signed_duration_since(*updated) < Duration::minutes(1) {
                    return Ok(stats.clone());
                }
            }
        }

        // Calculate fresh stats
        let one_hour_ago = Utc::now() - Duration::hours(1);

        let repo = PerformanceRepository::new(&self.db);
        let rows = repo.query_metrics_since(&one_hour_ago)?;

        let metrics: Vec<(String, f64, bool)> = rows
            .into_iter()
            .map(|r| (r.command, r.duration_ms, r.success))
            .collect();

        if metrics.is_empty() {
            return Ok(PerformanceStats {
                total_requests: 0,
                successful_requests: 0,
                failed_requests: 0,
                average_response_time: 0.0,
                p95_response_time: 0.0,
                p99_response_time: 0.0,
                requests_per_minute: 0.0,
                error_rate: 0.0,
                slowest_commands: vec![],
                most_frequent_commands: vec![],
            });
        }

        let total_requests = metrics.len() as u64;
        let successful_requests = metrics.iter().filter(|(_, _, success)| *success).count() as u64;
        let failed_requests = total_requests - successful_requests;

        let durations: Vec<f64> = metrics.iter().map(|(_, duration, _)| *duration).collect();
        let average_response_time = durations.iter().sum::<f64>() / durations.len() as f64;

        // Calculate percentiles
        let mut sorted_durations = durations.clone();
        sorted_durations.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let p95_index = (sorted_durations.len() as f64 * 0.95) as usize;
        let p99_index = (sorted_durations.len() as f64 * 0.99) as usize;

        let p95_response_time = sorted_durations.get(p95_index).copied().unwrap_or(0.0);
        let p99_response_time = sorted_durations.get(p99_index).copied().unwrap_or(0.0);

        let requests_per_minute = total_requests as f64 / 60.0;
        let error_rate = if total_requests > 0 {
            failed_requests as f64 / total_requests as f64
        } else {
            0.0
        };

        // Calculate slowest commands
        let mut command_durations: HashMap<String, Vec<f64>> = HashMap::new();
        for (command, duration, _) in &metrics {
            command_durations
                .entry(command.clone())
                .or_default()
                .push(*duration);
        }

        let mut slowest_commands: Vec<(String, f64)> = command_durations
            .iter()
            .map(|(cmd, durations)| {
                let avg_duration = durations.iter().sum::<f64>() / durations.len() as f64;
                (cmd.clone(), avg_duration)
            })
            .collect();

        slowest_commands.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        slowest_commands.truncate(10);

        // Calculate most frequent commands
        let mut command_counts: HashMap<String, u64> = HashMap::new();
        for (command, _, _) in &metrics {
            *command_counts.entry(command.clone()).or_insert(0) += 1;
        }

        let mut most_frequent_commands: Vec<(String, u64)> = command_counts.into_iter().collect();

        most_frequent_commands.sort_by(|a, b| b.1.cmp(&a.1));
        most_frequent_commands.truncate(10);

        let stats = PerformanceStats {
            total_requests,
            successful_requests,
            failed_requests,
            average_response_time,
            p95_response_time,
            p99_response_time,
            requests_per_minute,
            error_rate,
            slowest_commands,
            most_frequent_commands,
        };

        // Cache the stats
        *self.stats_cache.lock().unwrap() = Some(stats.clone());
        *self.stats_last_updated.lock().unwrap() = Some(Utc::now());

        Ok(stats)
    }

    /// Get recent performance metrics
    pub fn get_recent_metrics(&self, limit: usize) -> Vec<PerformanceMetric> {
        let cache = self.metrics_cache.lock().unwrap();
        cache.iter().rev().take(limit).cloned().collect()
    }

    /// Clean up old performance metrics (keep last 7 days)
    pub fn cleanup_old_metrics(&self) -> Result<(), String> {
        let seven_days_ago = Utc::now() - Duration::days(7);
        let repo = PerformanceRepository::new(&self.db);
        repo.delete_metrics_before(&seven_days_ago)
    }

    /// Start timing an operation
    pub fn start_timing(&self, command: &str) -> PerformanceTimer {
        PerformanceTimer {
            command: command.to_string(),
            start_time: Instant::now(),
        }
    }
}

/// Command performance tracker for automatic IPC command monitoring
#[derive(Clone, Debug)]
pub struct CommandPerformanceTracker {
    performance_monitor: Arc<PerformanceMonitorService>,
    active_commands: Arc<Mutex<HashMap<String, Instant>>>,
}

impl CommandPerformanceTracker {
    pub fn new(performance_monitor: Arc<PerformanceMonitorService>) -> Self {
        Self {
            performance_monitor,
            active_commands: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Start tracking a command execution
    pub fn start_tracking(&self, command_name: &str, user_id: Option<String>) -> CommandTimer {
        let start_time = Instant::now();
        {
            let mut active = self.active_commands.lock().unwrap();
            active.insert(command_name.to_string(), start_time);
        }

        CommandTimer::new(
            command_name.to_string(),
            user_id,
            self.performance_monitor.clone(),
            self.active_commands.clone(),
        )
    }

    /// Get current active command count
    pub fn active_command_count(&self) -> usize {
        self.active_commands.lock().unwrap().len()
    }

    /// Get performance statistics
    pub fn get_stats(&self) -> Result<PerformanceStats, String> {
        self.performance_monitor.get_stats()
    }
}

/// RAII timer for automatic performance tracking of IPC commands
pub struct CommandTimer {
    command_name: String,
    user_id: Option<String>,
    start_time: Instant,
    performance_monitor: Arc<PerformanceMonitorService>,
    active_commands: Arc<Mutex<HashMap<String, Instant>>>,
    marked_failed: bool,
}

impl CommandTimer {
    fn new(
        command_name: String,
        user_id: Option<String>,
        performance_monitor: Arc<PerformanceMonitorService>,
        active_commands: Arc<Mutex<HashMap<String, Instant>>>,
    ) -> Self {
        Self {
            command_name,
            user_id,
            start_time: Instant::now(),
            performance_monitor,
            active_commands,
            marked_failed: false,
        }
    }
}

impl Drop for CommandTimer {
    fn drop(&mut self) {
        let duration = self.start_time.elapsed();
        let duration_ms = duration.as_millis() as f64;

        // Remove from active commands
        {
            let mut active = self.active_commands.lock().unwrap();
            active.remove(&self.command_name);
        }

        // Record the performance metric
        let mut metadata = std::collections::HashMap::new();
        metadata.insert(
            "command_type".to_string(),
            serde_json::Value::String("ipc".to_string()),
        );
        metadata.insert(
            "tracking_type".to_string(),
            serde_json::Value::String("automatic".to_string()),
        );

        let metric = PerformanceMetric {
            id: format!(
                "cmd_{}_{}",
                self.command_name,
                chrono::Utc::now().timestamp_millis()
            ),
            command: self.command_name.clone(),
            duration_ms,
            success: !self.marked_failed,
            timestamp: chrono::Utc::now(),
            user_id: self.user_id.clone(),
            error_message: None,
            metadata: Some(metadata),
        };

        if let Err(e) = self.performance_monitor.record_metric(metric) {
            warn!(
                "Failed to record performance metric for command {}: {}",
                self.command_name, e
            );
        }

        debug!(
            "Command {} completed in {:.2}ms",
            self.command_name, duration_ms
        );
    }
}

impl CommandTimer {
    /// Mark this command execution as failed
    pub fn mark_failed(mut self) -> Self {
        self.marked_failed = true;
        self
    }
}

/// Legacy helper struct for manual timing operations (deprecated)
pub struct PerformanceTimer {
    command: String,
    start_time: Instant,
}

impl PerformanceTimer {
    /// Complete timing and record the metric
    pub fn complete(
        self,
        monitor: &PerformanceMonitorService,
        success: bool,
        user_id: Option<String>,
        error_message: Option<String>,
    ) -> Result<(), String> {
        let duration_ms = self.start_time.elapsed().as_millis() as f64;

        let metric = PerformanceMetric {
            id: uuid::Uuid::new_v4().to_string(),
            command: self.command,
            duration_ms,
            success,
            timestamp: Utc::now(),
            user_id,
            error_message,
            metadata: None,
        };

        monitor.record_metric(metric)
    }
}
