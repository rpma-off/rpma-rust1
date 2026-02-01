//! Background Sync Service - PRD-08 Implementation
//!
//! Provides automatic bidirectional synchronization between local SQLite
//! and remote Supabase with background processing and error handling.

use crate::models::sync::*;
use crate::sync::queue::SyncQueue;
use chrono::{DateTime, Utc};
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{interval, Duration, Instant};

/// Sync service modes
#[derive(Debug, Clone)]
pub enum SyncMode {
    Continuous,
    OnDemand,
    OnNetworkRestore,
    Batch,
}

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
    #[error("No network connectivity")]
    NoNetwork,
    #[error("Queue error: {0}")]
    QueueError(#[from] crate::sync::queue::SyncQueueError),
    #[error("Sync operation error: {0}")]
    SyncOperationError(String),
}

/// Supabase REST API client
#[derive(Clone, Debug)]
pub struct SupabaseClient {
    client: reqwest::Client,
    base_url: String,
    api_key: String,
}

impl SupabaseClient {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
            base_url: String::new(),
            api_key: String::new(),
        }
    }

    pub fn with_config(base_url: String, api_key: String) -> Self {
        Self {
            client: reqwest::Client::new(),
            base_url,
            api_key,
        }
    }
}

impl SupabaseClient {
    fn entity_type_to_table(entity_type: &EntityType) -> &'static str {
        match entity_type {
            EntityType::Intervention => "interventions",
            EntityType::Step => "steps",
            EntityType::Photo => "photos",
            EntityType::Client => "clients",
            EntityType::User => "users",
            EntityType::Task => "tasks",
        }
    }

    pub async fn health_check(&self) -> Result<(), SupabaseError> {
        let url = format!("{}/rest/v1/", self.base_url);
        self.client
            .get(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await?
            .error_for_status()?;
        Ok(())
    }

    pub async fn entity_exists(
        &self,
        entity_type: &EntityType,
        entity_id: &str,
    ) -> Result<bool, SupabaseError> {
        let table = Self::entity_type_to_table(entity_type);
        let url = format!("{}/rest/v1/{}?id=eq.{}", self.base_url, table, entity_id);
        let response = self
            .client
            .get(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await?;
        if response.status() == 200 {
            let json: serde_json::Value = response.json().await?;
            if let Some(arr) = json.as_array() {
                Ok(!arr.is_empty())
            } else {
                Ok(false)
            }
        } else if response.status() == 404 {
            Ok(false)
        } else {
            Err(SupabaseError::ServerError(format!(
                "Status: {}",
                response.status()
            )))
        }
    }

    pub async fn create_entity(
        &self,
        entity_type: &EntityType,
        data: &serde_json::Value,
    ) -> Result<(), SupabaseError> {
        let table = Self::entity_type_to_table(entity_type);
        let url = format!("{}/rest/v1/{}", self.base_url, table);
        let response = self
            .client
            .post(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .json(data)
            .send()
            .await?;
        if response.status().is_success() {
            Ok(())
        } else if response.status() == 409 {
            // Conflict
            let existing = response.json().await.unwrap_or(serde_json::Value::Null);
            Err(SupabaseError::Conflict(existing))
        } else {
            let error_text = response.text().await.unwrap_or_default();
            Err(SupabaseError::ServerError(error_text))
        }
    }

    pub async fn update_entity(
        &self,
        entity_type: &EntityType,
        entity_id: &str,
        data: &serde_json::Value,
    ) -> Result<(), SupabaseError> {
        let table = Self::entity_type_to_table(entity_type);
        let url = format!("{}/rest/v1/{}?id=eq.{}", self.base_url, table, entity_id);
        let response = self
            .client
            .patch(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=minimal")
            .json(data)
            .send()
            .await?;
        if response.status().is_success() {
            Ok(())
        } else if response.status() == 404 {
            Err(SupabaseError::NotFound)
        } else {
            let error_text = response.text().await.unwrap_or_default();
            Err(SupabaseError::ServerError(error_text))
        }
    }

    pub async fn delete_entity(
        &self,
        entity_type: &EntityType,
        entity_id: &str,
    ) -> Result<(), SupabaseError> {
        let table = Self::entity_type_to_table(entity_type);
        let url = format!("{}/rest/v1/{}?id=eq.{}", self.base_url, table, entity_id);
        let response = self
            .client
            .delete(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Prefer", "return=minimal")
            .send()
            .await?;
        if response.status().is_success() {
            Ok(())
        } else if response.status() == 404 {
            Err(SupabaseError::NotFound)
        } else {
            let error_text = response.text().await.unwrap_or_default();
            Err(SupabaseError::ServerError(error_text))
        }
    }
}

/// Supabase API errors
#[derive(Debug, thiserror::Error)]
pub enum SupabaseError {
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Conflict: {0}")]
    Conflict(serde_json::Value),
    #[error("Not found")]
    NotFound,
    #[error("Server error: {0}")]
    ServerError(String),
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
}

/// Conflict resolution strategy
#[derive(Debug, Clone)]
pub enum ConflictResolutionStrategy {
    LastWriteWins,
    ClientWins,
    ServerWins,
    Manual,
}

/// Action to take when resolving a conflict
#[derive(Debug)]
pub enum ConflictResolutionAction {
    UpdateEntity(serde_json::Value),
    SkipOperation,
    CreateEntity(serde_json::Value),
    DeleteEntity,
    ManualResolutionNeeded,
}

/// Conflict resolver
#[derive(Clone, Debug)]
pub struct ConflictResolver {
    strategy: ConflictResolutionStrategy,
    #[allow(dead_code)]
    supabase_client: Arc<SupabaseClient>,
}

impl Default for ConflictResolver {
    fn default() -> Self {
        Self::new()
    }
}

impl ConflictResolver {
    pub fn new() -> Self {
        Self {
            strategy: ConflictResolutionStrategy::LastWriteWins,
            supabase_client: Arc::new(SupabaseClient::new()),
        }
    }

    pub fn with_strategy(
        strategy: ConflictResolutionStrategy,
        supabase_client: Arc<SupabaseClient>,
    ) -> Self {
        Self {
            strategy,
            supabase_client,
        }
    }

    /// Resolve create conflict
    pub async fn resolve_create_conflict(
        &self,
        operation: SyncOperation,
        existing_data: serde_json::Value,
    ) -> Result<ConflictResolutionAction, String> {
        match self.strategy {
            ConflictResolutionStrategy::LastWriteWins => {
                self.resolve_create_last_write_wins(operation, existing_data)
                    .await
            }
            ConflictResolutionStrategy::ClientWins => {
                Ok(ConflictResolutionAction::UpdateEntity(operation.data))
            }
            ConflictResolutionStrategy::ServerWins => Ok(ConflictResolutionAction::SkipOperation),
            ConflictResolutionStrategy::Manual => {
                // For manual resolution, we'd need to store the conflict for later resolution
                // For now, default to last-write-wins
                self.resolve_create_last_write_wins(operation, existing_data)
                    .await
            }
        }
    }

    /// Resolve create conflict using last-write-wins
    async fn resolve_create_last_write_wins(
        &self,
        operation: SyncOperation,
        existing_data: serde_json::Value,
    ) -> Result<ConflictResolutionAction, String> {
        // Compare timestamps - use operation timestamp vs existing data timestamp
        let operation_timestamp = operation.timestamp_utc.timestamp();
        let existing_timestamp = existing_data
            .get("updated_at")
            .and_then(|v| v.as_str())
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.timestamp())
            .unwrap_or(0);

        if operation_timestamp > existing_timestamp {
            // Operation is newer, update the existing entity
            tracing::info!(
                "Resolving create conflict (last-write-wins): operation {} is newer, will update existing entity",
                operation.id.unwrap_or(-1)
            );
            Ok(ConflictResolutionAction::UpdateEntity(operation.data))
        } else {
            // Existing is newer, skip this operation
            tracing::info!(
                "Resolving create conflict (last-write-wins): existing entity is newer, skipping operation {}",
                operation.id.unwrap_or(-1)
            );
            Ok(ConflictResolutionAction::SkipOperation)
        }
    }

    /// Resolve update conflict
    pub async fn resolve_update_conflict(
        &self,
        operation: SyncOperation,
        existing_data: serde_json::Value,
    ) -> Result<ConflictResolutionAction, String> {
        match self.strategy {
            ConflictResolutionStrategy::LastWriteWins => {
                self.resolve_update_last_write_wins(operation, existing_data)
                    .await
            }
            ConflictResolutionStrategy::ClientWins => {
                Ok(ConflictResolutionAction::UpdateEntity(operation.data))
            }
            ConflictResolutionStrategy::ServerWins => Ok(ConflictResolutionAction::SkipOperation),
            ConflictResolutionStrategy::Manual => {
                // For manual resolution, we'd need to store the conflict for later resolution
                self.resolve_update_last_write_wins(operation, existing_data)
                    .await
            }
        }
    }

    /// Resolve update conflict using last-write-wins
    async fn resolve_update_last_write_wins(
        &self,
        operation: SyncOperation,
        existing_data: serde_json::Value,
    ) -> Result<ConflictResolutionAction, String> {
        // Compare timestamps
        let operation_timestamp = operation.timestamp_utc.timestamp();
        let existing_timestamp = existing_data
            .get("updated_at")
            .and_then(|v| v.as_str())
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .map(|dt| dt.timestamp())
            .unwrap_or(0);

        if operation_timestamp > existing_timestamp {
            // Operation is newer, proceed with update
            tracing::info!(
                "Resolving update conflict (last-write-wins): operation {} is newer, proceeding with update",
                operation.id.unwrap_or(-1)
            );
            Ok(ConflictResolutionAction::UpdateEntity(operation.data))
        } else {
            // Existing is newer, skip this operation
            tracing::info!(
                "Resolving update conflict (last-write-wins): existing entity is newer, skipping operation {}",
                operation.id.unwrap_or(-1)
            );
            Ok(ConflictResolutionAction::SkipOperation)
        }
    }
}

/// Basic sync metrics implementation
#[derive(Clone, Debug)]
pub struct SyncMetrics {
    metrics: Arc<Mutex<SyncQueueMetrics>>,
}

impl Default for SyncMetrics {
    fn default() -> Self {
        Self::new()
    }
}

impl SyncMetrics {
    pub fn new() -> Self {
        Self {
            metrics: Arc::new(Mutex::new(SyncQueueMetrics {
                pending_operations: 0,
                processing_operations: 0,
                completed_operations: 0,
                failed_operations: 0,
                abandoned_operations: 0,
                oldest_pending_age_seconds: None,
                average_retry_count: 0.0,
            })),
        }
    }

    pub async fn record_sync_result(&self, result: &SyncResult) {
        let mut metrics = self.metrics.lock().await;
        metrics.completed_operations += result.successful_operations as i64;
        metrics.failed_operations += result.failed_operations as i64;
        // Reset processing count as batch is done
        metrics.processing_operations = 0;
    }

    pub async fn record_sync_error(&self, _error: &BackgroundSyncError) {
        let mut metrics = self.metrics.lock().await;
        metrics.failed_operations += 1;
    }

    pub async fn update_pending_count(&self, count: i64) {
        let mut metrics = self.metrics.lock().await;
        metrics.pending_operations = count;
    }

    pub async fn get_current(&self) -> Result<SyncQueueMetrics, String> {
        let metrics = self.metrics.lock().await;
        Ok(metrics.clone())
    }
}

/// Background sync service
#[derive(Debug)]
pub struct BackgroundSyncService {
    queue: Arc<SyncQueue>,
    supabase_client: Arc<SupabaseClient>,
    conflict_resolver: Arc<ConflictResolver>,
    metrics: Arc<SyncMetrics>,
    is_running: Arc<Mutex<bool>>,
    last_sync: Arc<Mutex<Option<DateTime<Utc>>>>,
    errors: Arc<Mutex<Vec<String>>>,
}

impl BackgroundSyncService {
    /// Create a new background sync service
    pub fn new(queue: Arc<SyncQueue>) -> Self {
        let supabase_client = Arc::new(SupabaseClient::new());
        Self {
            queue,
            supabase_client: Arc::clone(&supabase_client),
            conflict_resolver: Arc::new(ConflictResolver::with_strategy(
                ConflictResolutionStrategy::LastWriteWins,
                supabase_client,
            )),
            metrics: Arc::new(SyncMetrics::new()),
            is_running: Arc::new(Mutex::new(false)),
            last_sync: Arc::new(Mutex::new(None)),
            errors: Arc::new(Mutex::new(Vec::new())),
        }
    }

    /// Start the background sync service (async version for internal use)
    pub async fn start_async(&self) -> Result<(), BackgroundSyncError> {
        let mut running = self.is_running.lock().await;
        if *running {
            return Err(BackgroundSyncError::AlreadyRunning);
        }
        *running = true;
        drop(running);

        // Use weak reference to avoid memory leak
        let queue = Arc::clone(&self.queue);
        let supabase_client = Arc::clone(&self.supabase_client);
        let conflict_resolver = Arc::clone(&self.conflict_resolver);
        let metrics = Arc::clone(&self.metrics);
        let is_running = Arc::clone(&self.is_running);
        let last_sync = Arc::clone(&self.last_sync);
        let errors = Arc::clone(&self.errors);

        tokio::spawn(async move {
            let service = BackgroundSyncService {
                queue,
                supabase_client,
                conflict_resolver,
                metrics,
                is_running,
                last_sync,
                errors,
            };
            service.run_continuous_sync().await;
        });

        Ok(())
    }

    /// Stop the background sync service (async version for internal use)
    pub async fn stop_async(&self) -> Result<(), BackgroundSyncError> {
        let mut running = self.is_running.lock().await;
        *running = false;
        Ok(())
    }

    /// Run continuous sync in background
    async fn run_continuous_sync(&self) {
        let mut interval = interval(Duration::from_secs(30));

        loop {
            interval.tick().await;

            let running = self.is_running.lock().await;
            if !*running {
                break;
            }
            drop(running);

            // Check network connectivity
            if !self.check_network_connectivity().await {
                continue;
            }

            // Process batch
            match self.process_sync_batch().await {
                Ok(result) => {
                    self.metrics.record_sync_result(&result).await;
                    let mut last_sync = self.last_sync.lock().await;
                    *last_sync = Some(Utc::now());
                    // Clear errors on successful sync
                    let mut errors = self.errors.lock().await;
                    errors.clear();
                }
                Err(e) => {
                    self.metrics.record_sync_error(&e).await;
                    // Record error for status display
                    let mut errors = self.errors.lock().await;
                    errors.push(e.to_string());
                    // Keep only last 5 errors
                    if errors.len() > 5 {
                        errors.remove(0);
                    }
                }
            }
        }
    }

    /// Trigger immediate sync (async version for internal use)
    pub async fn sync_now_async(&self) -> Result<SyncResult, BackgroundSyncError> {
        if !self.check_network_connectivity().await {
            return Err(BackgroundSyncError::NoNetwork);
        }

        self.process_sync_batch().await
    }

    /// Get current sync status (async version for internal use)
    pub async fn get_status_async(&self) -> Result<SyncStatus, BackgroundSyncError> {
        let is_running = *self.is_running.lock().await;
        let last_sync = *self.last_sync.lock().await;
        let metrics = self
            .metrics
            .get_current()
            .await
            .map_err(BackgroundSyncError::SyncOperationError)?;
        let network_available = self.check_network_connectivity().await;
        let errors = self.errors.lock().await.clone();

        Ok(SyncStatus {
            is_running,
            last_sync,
            pending_operations: metrics.pending_operations,
            failed_operations: metrics.failed_operations,
            total_operations: metrics.pending_operations
                + metrics.completed_operations
                + metrics.failed_operations,
            network_available,
            errors,
        })
    }

    /// Check network connectivity
    async fn check_network_connectivity(&self) -> bool {
        // For now, assume network is available if Supabase health check passes
        // In production, this should check actual network connectivity
        (self.supabase_client.health_check().await).is_ok()
    }

    /// Process a batch of sync operations
    async fn process_sync_batch(&self) -> Result<SyncResult, BackgroundSyncError> {
        let start_time = Instant::now();

        // Get batch of operations to process
        let operations = self.queue.dequeue_batch(10)?;

        // Update processing count
        self.metrics
            .update_pending_count(operations.len() as i64)
            .await;

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

        // Process each operation
        let total_operations = operations.len();
        for operation in operations {
            match self.process_operation(operation.clone()).await {
                Ok(_) => {
                    if let Some(id) = operation.id {
                        self.queue.mark_completed(id)?;
                    }
                    successful += 1;
                }
                Err(e) => {
                    let error_msg = format!(
                        "Failed to sync operation {}: {}",
                        operation.id.unwrap_or(-1),
                        e
                    );
                    errors.push(error_msg.clone());

                    if let Some(id) = operation.id {
                        self.queue.mark_failed(id, &error_msg)?;
                    }
                    failed += 1;
                }
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

    /// Process a single sync operation
    async fn process_operation(&self, operation: SyncOperation) -> Result<(), String> {
        // Check dependencies first
        self.validate_dependencies(&operation).await?;

        match operation.operation_type {
            OperationType::Create => self.sync_create_operation(operation).await,
            OperationType::Update => self.sync_update_operation(operation).await,
            OperationType::Delete => self.sync_delete_operation(operation).await,
        }
    }

    /// Validate operation dependencies
    async fn validate_dependencies(&self, operation: &SyncOperation) -> Result<(), String> {
        for dep_id in &operation.dependencies {
            if !self
                .supabase_client
                .entity_exists(&operation.entity_type, dep_id)
                .await
                .map_err(|e| e.to_string())?
            {
                return Err(format!("Dependency missing: {}", dep_id));
            }
        }
        Ok(())
    }

    /// Sync create operation
    async fn sync_create_operation(&self, operation: SyncOperation) -> Result<(), String> {
        match self
            .supabase_client
            .create_entity(&operation.entity_type, &operation.data)
            .await
        {
            Ok(_) => Ok(()),
            Err(SupabaseError::Conflict(existing_data)) => {
                // Conflict - resolve using configured strategy
                match self
                    .conflict_resolver
                    .resolve_create_conflict(operation.clone(), existing_data)
                    .await?
                {
                    ConflictResolutionAction::UpdateEntity(data) => {
                        // Update the existing entity
                        self.supabase_client
                            .update_entity(&operation.entity_type, &operation.entity_id, &data)
                            .await
                            .map_err(|e| format!("Failed to update entity after conflict: {:?}", e))
                    }
                    ConflictResolutionAction::SkipOperation => {
                        tracing::info!("Skipping create operation due to conflict resolution");
                        Ok(())
                    }
                    ConflictResolutionAction::CreateEntity(_) => {
                        // This shouldn't happen for create conflicts, but try again
                        self.supabase_client
                            .create_entity(&operation.entity_type, &operation.data)
                            .await
                            .map_err(|e| {
                                format!("Supabase error after conflict resolution: {:?}", e)
                            })
                    }
                    ConflictResolutionAction::DeleteEntity => {
                        // Delete the existing entity
                        self.supabase_client
                            .delete_entity(&operation.entity_type, &operation.entity_id)
                            .await
                            .map_err(|e| format!("Failed to delete entity after conflict: {:?}", e))
                    }
                    ConflictResolutionAction::ManualResolutionNeeded => {
                        // For now, skip the operation
                        tracing::warn!("Manual conflict resolution needed for create operation");
                        Ok(())
                    }
                }
            }
            Err(e) => Err(format!("Supabase error: {:?}", e)),
        }
    }

    /// Sync update operation
    async fn sync_update_operation(&self, operation: SyncOperation) -> Result<(), String> {
        match self
            .supabase_client
            .update_entity(
                &operation.entity_type,
                &operation.entity_id,
                &operation.data,
            )
            .await
        {
            Ok(_) => Ok(()),
            Err(SupabaseError::NotFound) => {
                // Entity doesn't exist in cloud, create it
                self.supabase_client
                    .create_entity(&operation.entity_type, &operation.data)
                    .await
                    .map_err(|e| format!("Supabase error: {:?}", e))
            }
            Err(SupabaseError::Conflict(existing_data)) => {
                // Conflict - resolve using configured strategy
                match self
                    .conflict_resolver
                    .resolve_update_conflict(operation.clone(), existing_data)
                    .await?
                {
                    ConflictResolutionAction::UpdateEntity(data) => {
                        // Update the existing entity
                        self.supabase_client
                            .update_entity(&operation.entity_type, &operation.entity_id, &data)
                            .await
                            .map_err(|e| format!("Failed to update entity after conflict: {:?}", e))
                    }
                    ConflictResolutionAction::SkipOperation => {
                        tracing::info!("Skipping update operation due to conflict resolution");
                        Ok(())
                    }
                    ConflictResolutionAction::CreateEntity(data) => {
                        // Create the entity
                        self.supabase_client
                            .create_entity(&operation.entity_type, &data)
                            .await
                            .map_err(|e| format!("Failed to create entity after conflict: {:?}", e))
                    }
                    ConflictResolutionAction::DeleteEntity => {
                        // Delete the existing entity
                        self.supabase_client
                            .delete_entity(&operation.entity_type, &operation.entity_id)
                            .await
                            .map_err(|e| format!("Failed to delete entity after conflict: {:?}", e))
                    }
                    ConflictResolutionAction::ManualResolutionNeeded => {
                        // For now, skip the operation
                        tracing::warn!("Manual conflict resolution needed for update operation");
                        Ok(())
                    }
                }
            }
            Err(e) => Err(format!("Supabase error: {:?}", e)),
        }
    }

    /// Sync delete operation
    async fn sync_delete_operation(&self, operation: SyncOperation) -> Result<(), String> {
        match self
            .supabase_client
            .delete_entity(&operation.entity_type, &operation.entity_id)
            .await
        {
            Ok(_) => Ok(()),
            Err(SupabaseError::NotFound) => {
                // Entity already deleted, consider as success
                Ok(())
            }
            Err(e) => Err(format!("Supabase error: {:?}", e)),
        }
    }

    /// Get sync metrics
    pub fn get_metrics(&self) -> Result<serde_json::Value, String> {
        // For now, return dummy metrics since get_current() is async
        // TODO: Implement proper synchronous metrics retrieval
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
            "oldest_pending_age_seconds": None::<i64>,
            "average_retry_count": 0.0,
            "errors": errors
        }))
    }
}

impl Default for SupabaseClient {
    fn default() -> Self {
        Self::new()
    }
}

impl Clone for BackgroundSyncService {
    fn clone(&self) -> Self {
        Self {
            queue: Arc::clone(&self.queue),
            supabase_client: Arc::clone(&self.supabase_client),
            conflict_resolver: Arc::clone(&self.conflict_resolver),
            metrics: Arc::clone(&self.metrics),
            is_running: Arc::clone(&self.is_running),
            last_sync: Arc::clone(&self.last_sync),
            errors: Arc::clone(&self.errors),
        }
    }
}
