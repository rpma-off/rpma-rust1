//! Async worker pool module for CPU-intensive IPC operations
//!
//! This module provides worker pools for executing CPU-intensive operations
//! asynchronously without blocking the main IPC thread.

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;
use tracing::{debug, error, info, warn};

/// Configuration for worker pools
#[derive(Debug, Clone)]
pub struct WorkerPoolConfig {
    /// Number of worker threads in the pool
    pub num_workers: usize,
    /// Maximum queue size for pending tasks
    pub max_queue_size: usize,
    /// Task execution timeout in seconds
    pub task_timeout_secs: u64,
    /// Pool name for logging
    pub pool_name: String,
}

impl Default for WorkerPoolConfig {
    fn default() -> Self {
        Self {
            num_workers: num_cpus::get(),
            max_queue_size: 1000,
            task_timeout_secs: 30,
            pool_name: "default".to_string(),
        }
    }
}

/// Task to be executed by the worker pool
#[derive(Debug, Clone)]
pub struct WorkerTask {
    /// Unique task identifier
    pub id: String,
    /// Task priority (higher = more urgent)
    pub priority: i32,
    /// Task payload
    pub payload: Vec<u8>,
    /// Task metadata
    pub metadata: std::collections::HashMap<String, String>,
}

/// Result of task execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskResult {
    /// Task identifier
    pub task_id: String,
    /// Whether execution was successful
    pub success: bool,
    /// Result data
    pub data: Option<Vec<u8>>,
    /// Error message if failed
    pub error: Option<String>,
    /// Execution time in nanoseconds
    pub execution_time_ns: u128,
}

/// Broadcast sender that sends tasks to all worker channels
#[derive(Debug)]
struct BroadcastSender {
    senders: Vec<mpsc::UnboundedSender<WorkerTask>>,
}

impl BroadcastSender {
    fn send(&self, task: WorkerTask) -> Result<(), WorkerPoolError> {
        // Send to the first available worker (round-robin could be implemented here)
        for sender in &self.senders {
            if let Err(_) = sender.send(task.clone()) {
                continue; // Try next sender
            }
            return Ok(());
        }
        Err(WorkerPoolError::PoolShutdown)
    }
}

/// Worker pool for executing CPU-intensive operations
#[derive(Debug)]
pub struct WorkerPool {
    config: WorkerPoolConfig,
    task_sender: BroadcastSender,
    result_receiver: mpsc::UnboundedReceiver<TaskResult>,
    handles: Vec<JoinHandle<()>>,
    stats: Arc<parking_lot::Mutex<PoolStats>>,
}

impl WorkerPool {
    /// Create a new worker pool with default configuration
    pub fn new() -> Self {
        Self::with_config(WorkerPoolConfig::default())
    }

    /// Create a new worker pool with custom configuration
    pub fn with_config(config: WorkerPoolConfig) -> Self {
        let (result_sender, result_receiver) = mpsc::unbounded_channel();

        let stats = Arc::new(parking_lot::Mutex::new(PoolStats::new(
            config.pool_name.clone(),
        )));

        let mut task_senders = Vec::new();
        let mut handles = Vec::new();

        // Create a separate channel for each worker
        for worker_id in 0..config.num_workers {
            let (task_sender, task_receiver) = mpsc::unbounded_channel();
            task_senders.push(task_sender);

            let result_sender_clone = result_sender.clone();
            let stats_clone = stats.clone();
            let config_clone = config.clone();

            let handle = tokio::spawn(async move {
                Self::worker_loop(
                    worker_id,
                    task_receiver,
                    result_sender_clone,
                    stats_clone,
                    config_clone,
                )
                .await;
            });

            handles.push(handle);
        }

        // Create a broadcast sender that sends to all worker channels
        let task_sender = BroadcastSender {
            senders: task_senders,
        };

        Self {
            config,
            task_sender,
            result_receiver,
            handles,
            stats,
        }
    }

    /// Submit a task to the worker pool
    pub async fn submit_task(&self, task: WorkerTask) -> Result<String, WorkerPoolError> {
        let task_id = task.id.clone();
        let mut stats = self.stats.lock();

        if stats.queue_size >= self.config.max_queue_size {
            stats.tasks_rejected += 1;
            return Err(WorkerPoolError::QueueFull);
        }

        stats.tasks_submitted += 1;
        stats.queue_size += 1;

        drop(stats); // Release lock before sending

        self.task_sender
            .send(task)
            .map_err(|_| WorkerPoolError::PoolShutdown)?;

        Ok(task_id)
    }

    /// Receive the next completed task result
    pub async fn receive_result(&mut self) -> Option<TaskResult> {
        self.result_receiver.recv().await
    }

    /// Get current pool statistics
    pub fn get_stats(&self) -> PoolStats {
        self.stats.lock().clone()
    }

    /// Shutdown the worker pool gracefully
    pub async fn shutdown(self) -> Result<(), WorkerPoolError> {
        // Close the task sender to signal workers to shut down
        drop(self.task_sender);

        // Wait for all workers to complete
        for handle in self.handles {
            if let Err(e) = handle.await {
                error!("Worker task panicked: {:?}", e);
            }
        }

        info!("Worker pool '{}' shutdown complete", self.config.pool_name);
        Ok(())
    }

    /// Worker loop that processes tasks
    async fn worker_loop(
        worker_id: usize,
        mut task_receiver: mpsc::UnboundedReceiver<WorkerTask>,
        result_sender: mpsc::UnboundedSender<TaskResult>,
        stats: Arc<parking_lot::Mutex<PoolStats>>,
        config: WorkerPoolConfig,
    ) {
        debug!(
            "Worker {} starting in pool '{}'",
            worker_id, config.pool_name
        );

        while let Some(task) = task_receiver.recv().await {
            // Continue with task

            let start_time = std::time::Instant::now();

            // Update stats
            {
                let mut stats = stats.lock();
                stats.tasks_active += 1;
            }

            debug!("Worker {} processing task {}", worker_id, task.id);

            // Execute task with timeout
            let result = tokio::time::timeout(
                std::time::Duration::from_secs(config.task_timeout_secs),
                Self::execute_task(task.clone()),
            )
            .await;

            let execution_time = start_time.elapsed().as_nanos();

            // Update stats and send result
            {
                let mut stats = stats.lock();
                stats.tasks_active -= 1;
                stats.queue_size -= 1;
                stats.total_execution_time_ns += execution_time;

                match &result {
                    Ok(Ok(_)) => stats.tasks_completed += 1,
                    Ok(Err(_)) => stats.tasks_failed += 1,
                    Err(_) => {
                        stats.tasks_failed += 1;
                        stats.tasks_timed_out += 1;
                    }
                }
            }

            let task_result = match result {
                Ok(Ok(data)) => TaskResult {
                    task_id: task.id,
                    success: true,
                    data: Some(data),
                    error: None,
                    execution_time_ns: execution_time,
                },
                Ok(Err(error)) => TaskResult {
                    task_id: task.id,
                    success: false,
                    data: None,
                    error: Some(error.to_string()),
                    execution_time_ns: execution_time,
                },
                Err(_) => TaskResult {
                    task_id: task.id,
                    success: false,
                    data: None,
                    error: Some("Task execution timed out".to_string()),
                    execution_time_ns: execution_time,
                },
            };

            if result_sender.send(task_result).is_err() {
                warn!("Failed to send task result - result receiver closed");
                break;
            }
        }

        debug!("Worker {} shutting down", worker_id);
    }

    /// Execute a single task (placeholder - should be overridden by specific implementations)
    async fn execute_task(
        task: WorkerTask,
    ) -> Result<Vec<u8>, Box<dyn std::error::Error + Send + Sync>> {
        // This is a placeholder implementation
        // In practice, this would dispatch to specific task handlers based on task type

        // Simulate some CPU-intensive work
        tokio::task::spawn_blocking(move || {
            // For demonstration, just return the payload as-is
            // Real implementations would perform actual work here
            Ok(task.payload)
        })
        .await
        .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)?
    }
}

/// Pool statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolStats {
    pub pool_name: String,
    pub tasks_submitted: u64,
    pub tasks_completed: u64,
    pub tasks_failed: u64,
    pub tasks_timed_out: u64,
    pub tasks_rejected: u64,
    pub tasks_active: u64,
    pub queue_size: usize,
    pub total_execution_time_ns: u128,
}

impl PoolStats {
    fn new(pool_name: String) -> Self {
        Self {
            pool_name,
            tasks_submitted: 0,
            tasks_completed: 0,
            tasks_failed: 0,
            tasks_timed_out: 0,
            tasks_rejected: 0,
            tasks_active: 0,
            queue_size: 0,
            total_execution_time_ns: 0,
        }
    }

    /// Calculate average execution time
    pub fn avg_execution_time_ns(&self) -> Option<u128> {
        if self.tasks_completed == 0 {
            None
        } else {
            Some(self.total_execution_time_ns / self.tasks_completed as u128)
        }
    }

    /// Calculate success rate as percentage
    pub fn success_rate_percent(&self) -> f64 {
        let total_completed = self.tasks_completed + self.tasks_failed;
        if total_completed == 0 {
            0.0
        } else {
            (self.tasks_completed as f64 / total_completed as f64) * 100.0
        }
    }
}

/// Worker pool manager for managing multiple pools
pub struct WorkerPoolManager {
    pools: parking_lot::Mutex<std::collections::HashMap<String, Arc<WorkerPool>>>,
}

impl WorkerPoolManager {
    /// Create a new pool manager
    pub fn new() -> Self {
        Self {
            pools: parking_lot::Mutex::new(std::collections::HashMap::new()),
        }
    }

    /// Create and register a new worker pool
    pub fn create_pool(&self, name: &str, config: WorkerPoolConfig) -> Arc<WorkerPool> {
        let pool = Arc::new(WorkerPool::with_config(config));
        let mut pools = self.pools.lock();
        pools.insert(name.to_string(), pool.clone());
        pool
    }

    /// Get a worker pool by name
    pub fn get_pool(&self, name: &str) -> Option<Arc<WorkerPool>> {
        self.pools.lock().get(name).cloned()
    }

    /// Get all pool statistics
    pub fn get_all_stats(&self) -> Vec<(String, PoolStats)> {
        let pools = self.pools.lock();
        pools
            .iter()
            .map(|(name, pool)| (name.clone(), pool.get_stats()))
            .collect()
    }

    /// Shutdown all pools
    pub async fn shutdown_all(self) -> Result<(), WorkerPoolError> {
        let pools = self.pools.into_inner();
        for (name, pool) in pools {
            info!("Shutting down worker pool '{}'", name);
            if let Err(e) = Arc::try_unwrap(pool) {
                error!("Failed to shutdown pool '{}': {:?}", name, e);
            }
        }
        Ok(())
    }
}

impl Default for WorkerPoolManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Worker pool errors
#[derive(Debug, thiserror::Error)]
pub enum WorkerPoolError {
    #[error("Worker pool is shutting down")]
    PoolShutdown,
    #[error("Task queue is full")]
    QueueFull,
    #[error("Task execution failed: {0}")]
    TaskExecutionError(String),
    #[error("Pool not found: {0}")]
    PoolNotFound(String),
}

/// Task builder for creating worker tasks
pub struct TaskBuilder {
    id: Option<String>,
    priority: i32,
    payload: Vec<u8>,
    metadata: std::collections::HashMap<String, String>,
}

impl TaskBuilder {
    /// Create a new task builder
    pub fn new() -> Self {
        Self {
            id: None,
            priority: 0,
            payload: Vec::new(),
            metadata: std::collections::HashMap::new(),
        }
    }

    /// Set task ID
    pub fn id(mut self, id: String) -> Self {
        self.id = Some(id);
        self
    }

    /// Set task priority
    pub fn priority(mut self, priority: i32) -> Self {
        self.priority = priority;
        self
    }

    /// Set task payload
    pub fn payload(mut self, payload: Vec<u8>) -> Self {
        self.payload = payload;
        self
    }

    /// Add metadata
    pub fn metadata(mut self, key: &str, value: &str) -> Self {
        self.metadata.insert(key.to_string(), value.to_string());
        self
    }

    /// Build the task
    pub fn build(self) -> WorkerTask {
        WorkerTask {
            id: self.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
            priority: self.priority,
            payload: self.payload,
            metadata: self.metadata,
        }
    }
}

impl Default for TaskBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_worker_pool_basic() {
        let pool = WorkerPool::with_config(WorkerPoolConfig {
            num_workers: 2,
            max_queue_size: 10,
            task_timeout_secs: 5,
            pool_name: "test".to_string(),
        });

        // Submit a simple task
        let task = TaskBuilder::new()
            .payload(b"test data".to_vec())
            .priority(1)
            .build();

        let task_id = pool.submit_task(task).await.unwrap();

        // Receive result
        let mut pool_mut = pool;
        let result = pool_mut.receive_result().await.unwrap();

        assert_eq!(result.task_id, task_id);
        assert!(result.success);
        assert_eq!(result.data.unwrap(), b"test data");

        // Check stats
        let stats = pool_mut.get_stats();
        assert_eq!(stats.tasks_submitted, 1);
        assert_eq!(stats.tasks_completed, 1);
        assert_eq!(stats.tasks_failed, 0);

        // Shutdown
        pool_mut.shutdown().await.unwrap();
    }

    #[tokio::test]
    async fn test_pool_manager() {
        let manager = WorkerPoolManager::new();

        // Create a pool
        let pool = manager.create_pool("test_pool", WorkerPoolConfig::default());
        assert!(manager.get_pool("test_pool").is_some());

        // Get stats
        let stats = manager.get_all_stats();
        assert_eq!(stats.len(), 1);
        assert_eq!(stats[0].0, "test_pool");

        // Shutdown
        manager.shutdown_all().await.unwrap();
    }

    #[tokio::test]
    async fn test_queue_full() {
        let pool = WorkerPool::with_config(WorkerPoolConfig {
            num_workers: 1,
            max_queue_size: 1,
            task_timeout_secs: 30,
            pool_name: "test".to_string(),
        });

        // Submit first task
        let task1 = TaskBuilder::new().payload(b"task1".to_vec()).build();
        pool.submit_task(task1).await.unwrap();

        // Submit second task (should fail as queue is full with in-flight task)
        let task2 = TaskBuilder::new().payload(b"task2".to_vec()).build();
        assert!(matches!(
            pool.submit_task(task2).await,
            Err(WorkerPoolError::QueueFull)
        ));

        pool.shutdown().await.unwrap();
    }
}
