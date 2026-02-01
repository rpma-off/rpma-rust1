//! Worker Pool Module - Async task processing infrastructure
//!
//! This module provides a worker pool implementation for executing
//! CPU-intensive tasks asynchronously using tokio's spawn_blocking.
//!
//! Features:
//! - Configurable pool size with semaphore-based concurrency control
//! - Task queue with WorkerTask abstraction
//! - Async/await interface with blocking task offloading
//! - Thread-safe operation

use std::sync::Arc;
use tokio::sync::Semaphore;

/// Worker task structure containing task metadata and payload
#[derive(Debug, Clone)]
pub struct WorkerTask {
    /// Task type identifier (e.g., "image_compression", "pdf_generation")
    pub task_type: String,
    /// Binary payload data for the task
    pub payload: Vec<u8>,
    /// Optional task identifier for tracking
    pub task_id: Option<String>,
}

impl WorkerTask {
    /// Create a new worker task
    pub fn new(task_type: impl Into<String>, payload: Vec<u8>) -> Self {
        Self {
            task_type: task_type.into(),
            payload,
            task_id: None,
        }
    }

    /// Create a new worker task with ID
    pub fn with_id(
        task_type: impl Into<String>,
        payload: Vec<u8>,
        task_id: impl Into<String>,
    ) -> Self {
        Self {
            task_type: task_type.into(),
            payload,
            task_id: Some(task_id.into()),
        }
    }
}

/// Worker pool for executing CPU-intensive tasks asynchronously
///
/// The pool uses a semaphore to limit concurrent operations and
/// tokio::task::spawn_blocking to offload work to separate threads.
#[derive(Debug, Clone)]
pub struct WorkerPool {
    pool_size: usize,
    semaphore: Arc<Semaphore>,
}

impl WorkerPool {
    /// Create a new worker pool with the specified size
    ///
    /// # Arguments
    /// * `pool_size` - Maximum number of concurrent tasks allowed
    ///
    /// # Example
    /// ```
    /// let pool = WorkerPool::new(4);
    /// ```
    pub fn new(pool_size: usize) -> Self {
        Self {
            pool_size,
            semaphore: Arc::new(Semaphore::new(pool_size)),
        }
    }

    /// Create a new worker pool with size based on CPU count
    ///
    /// Uses `num_cpus::get()` to determine optimal pool size.
    pub fn with_cpu_count() -> Self {
        let cpu_count = num_cpus::get();
        Self::new(cpu_count * 2) // 2x CPU count for I/O bound tasks
    }

    /// Get the configured pool size
    pub fn pool_size(&self) -> usize {
        self.pool_size
    }

    /// Execute a task asynchronously using the worker pool
    ///
    /// This method acquires a permit from the semaphore and executes
    /// the provided processor function in a blocking task.
    ///
    /// # Type Parameters
    /// * `F` - The processor function type
    /// * `T` - The return type of the processor function
    ///
    /// # Arguments
    /// * `task` - The WorkerTask containing task data
    /// * `processor` - The function to execute on the task
    ///
    /// # Returns
    /// * `Result<T, String>` - The result of the processor function
    ///
    /// # Example
    /// ```
    /// let pool = WorkerPool::new(4);
    /// let task = WorkerTask::new("example", vec![1, 2, 3]);
    /// 
    /// let result = pool.execute(task, |t| {
    ///     // Process the task
    ///     Ok(t.payload.len())
    /// }).await;
    /// ```
    pub async fn execute<F, T>(&self, task: WorkerTask, processor: F) -> Result<T, String>
    where
        F: FnOnce(WorkerTask) -> Result<T, String> + Send + 'static,
        T: Send + 'static,
    {
        // Acquire permit from semaphore (will wait if pool is at capacity)
        let permit = self
            .semaphore
            .clone()
            .acquire_owned()
            .await
            .map_err(|e| format!("Failed to acquire semaphore permit: {}", e))?;

        // Execute the processor in a blocking task
        let handle = tokio::task::spawn_blocking(move || {
            // Permit is held for the duration of execution
            let _permit = permit;
            processor(task)
        });

        // Await the blocking task result
        handle
            .await
            .map_err(|e| format!("Task join error: {}", e))?
    }

    /// Execute a task with a custom timeout
    ///
    /// Similar to `execute`, but with a configurable timeout duration.
    /// If the task exceeds the timeout, it returns an error.
    ///
    /// # Arguments
    /// * `task` - The WorkerTask to process
    /// * `processor` - The processing function
    /// * `timeout_secs` - Timeout in seconds
    pub async fn execute_with_timeout<F, T>(
        &self,
        task: WorkerTask,
        processor: F,
        timeout_secs: u64,
    ) -> Result<T, String>
    where
        F: FnOnce(WorkerTask) -> Result<T, String> + Send + 'static,
        T: Send + 'static,
    {
        let permit = self
            .semaphore
            .clone()
            .acquire_owned()
            .await
            .map_err(|e| format!("Failed to acquire semaphore permit: {}", e))?;

        let handle = tokio::task::spawn_blocking(move || {
            let _permit = permit;
            processor(task)
        });

        // Apply timeout
        match tokio::time::timeout(std::time::Duration::from_secs(timeout_secs), handle).await {
            Ok(result) => result.map_err(|e| format!("Task join error: {}", e))?,
            Err(_) => Err(format!("Task timed out after {} seconds", timeout_secs)),
        }
    }

    /// Execute multiple tasks in parallel with semaphore limiting
    ///
    /// This is useful for batch processing with concurrency control.
    ///
    /// # Arguments
    /// * `tasks` - Vector of WorkerTasks to process
    /// * `processor` - The processing function to apply to each task
    ///
    /// # Returns
    /// * `Vec<Result<T, String>>` - Results for each task
    pub async fn execute_batch<F, T>(
        &self,
        tasks: Vec<WorkerTask>,
        processor: F,
    ) -> Vec<Result<T, String>>
    where
        F: Fn(WorkerTask) -> Result<T, String> + Send + Sync + 'static,
        T: Send + 'static,
    {
        let processor = Arc::new(processor);
        let mut handles = Vec::with_capacity(tasks.len());

        for task in tasks {
            let pool = self.clone();
            let proc = processor.clone();

            let handle = tokio::spawn(async move { pool.execute(task, move |t| proc(t)).await });
            handles.push(handle);
        }

        // Collect all results
        let mut results = Vec::with_capacity(handles.len());
        for handle in handles {
            match handle.await {
                Ok(result) => results.push(result),
                Err(e) => results.push(Err(format!("Task spawn error: {}", e))),
            }
        }

        results
    }

    /// Get current number of available permits
    pub fn available_permits(&self) -> usize {
        self.semaphore.available_permits()
    }

    /// Check if the pool is at full capacity
    pub fn is_at_capacity(&self) -> bool {
        self.available_permits() == 0
    }
}

impl Default for WorkerPool {
    fn default() -> Self {
        Self::with_cpu_count()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_worker_pool_creation() {
        let pool = WorkerPool::new(4);
        assert_eq!(pool.pool_size(), 4);
        assert_eq!(pool.available_permits(), 4);
    }

    #[tokio::test]
    async fn test_worker_pool_execute() {
        let pool = WorkerPool::new(2);
        let task = WorkerTask::new("test", vec![1, 2, 3, 4, 5]);

        let result = pool
            .execute(task, |t| Ok::<usize, String>(t.payload.len()))
            .await;

        assert_eq!(result.unwrap(), 5);
    }

    #[tokio::test]
    async fn test_worker_pool_concurrent_execution() {
        let pool = WorkerPool::new(2);
        let tasks: Vec<WorkerTask> = (0..5)
            .map(|i| WorkerTask::new("concurrent", vec![i as u8]))
            .collect();

        let processor = |task: WorkerTask| -> Result<u8, String> {
            // Simulate some work
            std::thread::sleep(std::time::Duration::from_millis(10));
            Ok(task.payload[0])
        };

        let results = pool.execute_batch(tasks, processor).await;

        assert_eq!(results.len(), 5);
        for (i, result) in results.iter().enumerate() {
            assert_eq!(result.as_ref().unwrap(), &(i as u8));
        }
    }

    #[tokio::test]
    async fn test_worker_pool_error_handling() {
        let pool = WorkerPool::new(1);
        let task = WorkerTask::new("error_test", vec![]);

        let result = pool
            .execute(task, |_t| Err::<(), String>("Test error".to_string()))
            .await;

        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Test error");
    }

    #[tokio::test]
    async fn test_worker_pool_timeout() {
        let pool = WorkerPool::new(1);
        let task = WorkerTask::new("slow_task", vec![]);

        let result = pool
            .execute_with_timeout(
                task,
                |_t| {
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    Ok::<(), String>(())
                },
                1, // 1 second timeout
            )
            .await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("timed out"));
    }

    #[tokio::test]
    async fn test_worker_task_with_id() {
        let task = WorkerTask::with_id("test", vec![], "task-123");
        assert_eq!(task.task_id, Some("task-123".to_string()));
    }
}
