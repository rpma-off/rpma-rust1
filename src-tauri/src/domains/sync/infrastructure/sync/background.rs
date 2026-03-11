//! Background Sync Service — local queue flush only.
//!
//! No external sync backend exists. This service periodically drains the
//! local queue and marks operations as completed.

use crate::domains::sync::infrastructure::sync::queue::SyncQueue;
use chrono::{DateTime, Utc};
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{interval, Duration, Instant};

/// Result of a sync operation batch
#[derive(Debug, Clone, serde::Serialize)]
pub struct SyncResult {
    pub processed_operations: usize,
    pub successful_operations: usize,
    pub failed_operations: usize,
    pub duration_ms: u64,
    pub errors: Vec<String>,
}

/// Sync service status
#[derive(Debug, Clone, serde::Serialize)]
pub struct SyncStatus {
    pub is_running: bool,
    pub last_sync: Option<DateTime<Utc>>,
    pub pending_operations: i64,
    pub failed_operations: i64,
    pub total_operations: i64,
    pub network_available: bool,
    pub errors: Vec<String>,
}

/// Background sync service errors
#[derive(Debug, thiserror::Error)]
pub enum BackgroundSyncError {
    #[error("Service already running")]
    AlreadyRunning,
    #[error("Queue error: {0}")]
    QueueError(#[from] crate::domains::sync::infrastructure::sync::queue::SyncQueueError),
    #[error("Sync operation error: {0}")]
    SyncOperationError(String),
}

/// Background sync service — drains the local queue.
#[derive(Debug)]
pub struct BackgroundSyncService {
    queue: Arc<SyncQueue>,
    is_running: Arc<Mutex<bool>>,
    last_sync: Arc<Mutex<Option<DateTime<Utc>>>>,
    errors: Arc<Mutex<Vec<String>>>,
}

impl BackgroundSyncService {
    /// Create a new background sync service
    pub fn new(queue: Arc<SyncQueue>) -> Self {
        Self {
            queue,
            is_running: Arc::new(Mutex::new(false)),
            last_sync: Arc::new(Mutex::new(None)),
            errors: Arc::new(Mutex::new(Vec::new())),
        }
    }

    /// Start the background sync service
    pub async fn start_async(&self) -> Result<(), BackgroundSyncError> {
        let mut running = self.is_running.lock().await;
        if *running {
            return Err(BackgroundSyncError::AlreadyRunning);
        }
        *running = true;
        drop(running);

        let queue = Arc::clone(&self.queue);
        let is_running = Arc::clone(&self.is_running);
        let last_sync = Arc::clone(&self.last_sync);
        let errors = Arc::clone(&self.errors);

        tokio::spawn(async move {
            let service = BackgroundSyncService {
                queue,
                is_running,
                last_sync,
                errors,
            };
            service.run_continuous_sync().await;
        });

        Ok(())
    }

    /// Stop the background sync service
    pub async fn stop_async(&self) -> Result<(), BackgroundSyncError> {
        let mut running = self.is_running.lock().await;
        *running = false;
        Ok(())
    }

    /// Run continuous sync in background
    async fn run_continuous_sync(&self) {
        let mut tick = interval(Duration::from_secs(30));

        loop {
            tick.tick().await;

            let running = self.is_running.lock().await;
            if !*running {
                break;
            }
            drop(running);

            match self.process_sync_batch().await {
                Ok(_result) => {
                    let mut last_sync = self.last_sync.lock().await;
                    *last_sync = Some(Utc::now());
                    let mut errors = self.errors.lock().await;
                    errors.clear();
                }
                Err(e) => {
                    let mut errors = self.errors.lock().await;
                    errors.push(e.to_string());
                    if errors.len() > 5 {
                        errors.remove(0);
                    }
                }
            }
        }
    }

    /// Trigger immediate sync
    pub async fn sync_now_async(&self) -> Result<SyncResult, BackgroundSyncError> {
        self.process_sync_batch().await
    }

    /// Get current sync status
    pub async fn get_status_async(&self) -> Result<SyncStatus, BackgroundSyncError> {
        let is_running = *self.is_running.lock().await;
        let last_sync = *self.last_sync.lock().await;
        let errors = self.errors.lock().await.clone();

        Ok(SyncStatus {
            is_running,
            last_sync,
            pending_operations: 0,
            failed_operations: 0,
            total_operations: 0,
            network_available: false,
            errors,
        })
    }

    /// Process a batch of sync operations (local queue flush)
    async fn process_sync_batch(&self) -> Result<SyncResult, BackgroundSyncError> {
        let start_time = Instant::now();
        let operations = self.queue.dequeue_batch(10)?;

        if operations.is_empty() {
            return Ok(SyncResult {
                processed_operations: 0,
                successful_operations: 0,
                failed_operations: 0,
                duration_ms: start_time.elapsed().as_millis() as u64,
                errors: vec![],
            });
        }

        let mut successful = 0;
        let mut failed = 0;
        let mut errors = Vec::new();
        let total_operations = operations.len();

        for operation in operations {
            // No external sync — mark completed immediately
            if let Some(id) = operation.id {
                match self.queue.mark_completed(id) {
                    Ok(_) => successful += 1,
                    Err(e) => {
                        let msg = format!("Failed to mark operation {} completed: {}", id, e);
                        errors.push(msg.clone());
                        let _ = self.queue.mark_failed(id, &msg);
                        failed += 1;
                    }
                }
            } else {
                successful += 1;
            }
        }

        Ok(SyncResult {
            processed_operations: total_operations,
            successful_operations: successful,
            failed_operations: failed,
            duration_ms: start_time.elapsed().as_millis() as u64,
            errors,
        })
    }

    /// Get sync metrics
    pub fn get_metrics(&self) -> Result<serde_json::Value, String> {
        let errors = self
            .errors
            .try_lock()
            .map_err(|e| format!("Failed to lock errors: {}", e))?
            .clone();

        Ok(serde_json::json!({
            "pending_operations": 0,
            "processing_operations": 0,
            "completed_operations": 0,
            "failed_operations": 0,
            "abandoned_operations": 0,
            "oldest_pending_age_seconds": null,
            "average_retry_count": 0.0,
            "errors": errors
        }))
    }
}

impl Clone for BackgroundSyncService {
    fn clone(&self) -> Self {
        Self {
            queue: Arc::clone(&self.queue),
            is_running: Arc::clone(&self.is_running),
            last_sync: Arc::clone(&self.last_sync),
            errors: Arc::clone(&self.errors),
        }
    }
}
