//! Request batching module for optimizing IPC communications
//!
//! This module provides functionality to batch multiple IPC requests into single calls,
//! reducing round-trip overhead and improving performance for bulk operations.

use crate::ipc_serialization::{IpcSerializer, SerializationFormat};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Unique identifier for batch requests
pub type BatchId = String;

/// Result of a single operation within a batch
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchOperationResult {
    /// Operation identifier
    pub operation_id: String,
    /// Whether the operation succeeded
    pub success: bool,
    /// Result data (serialized)
    pub data: Option<String>,
    /// Error message if operation failed
    pub error: Option<String>,
    /// Execution time in nanoseconds
    pub execution_time_ns: u128,
}

/// Batch request containing multiple operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchRequest {
    /// Unique batch identifier
    pub batch_id: BatchId,
    /// List of operations to execute
    pub operations: Vec<BatchOperation>,
    /// Whether to execute operations in parallel
    pub parallel: bool,
    /// Timeout for the entire batch (in milliseconds)
    pub timeout_ms: Option<u64>,
}

/// Single operation within a batch
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchOperation {
    /// Unique operation identifier within the batch
    pub operation_id: String,
    /// IPC command name
    pub command: String,
    /// Serialized arguments
    pub args: String,
    /// Priority (higher numbers = higher priority)
    pub priority: i32,
}

/// Batch response containing results for all operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchResponse {
    /// Batch identifier (matches request)
    pub batch_id: BatchId,
    /// Results for each operation
    pub results: Vec<BatchOperationResult>,
    /// Total execution time in nanoseconds
    pub total_execution_time_ns: u128,
    /// Whether the batch completed successfully (all operations succeeded)
    pub success: bool,
    /// Number of successful operations
    pub success_count: usize,
    /// Number of failed operations
    pub failure_count: usize,
}

/// Batch processor for executing batched operations
pub struct BatchProcessor {
    serializer: IpcSerializer,
    operation_registry: Arc<Mutex<HashMap<String, Box<dyn BatchOperationHandler>>>>,
    max_batch_size: usize,
    max_parallel_operations: usize,
}

impl BatchProcessor {
    /// Create a new batch processor
    pub fn new() -> Self {
        Self {
            serializer: IpcSerializer::messagepack(), // Use MessagePack for better performance
            operation_registry: Arc::new(Mutex::new(HashMap::new())),
            max_batch_size: 50,          // Maximum operations per batch
            max_parallel_operations: 10, // Maximum parallel operations
        }
    }

    /// Create batch processor with custom settings
    pub fn with_config(
        max_batch_size: usize,
        max_parallel_operations: usize,
        use_json: bool,
    ) -> Self {
        Self {
            serializer: if use_json {
                IpcSerializer::json()
            } else {
                IpcSerializer::messagepack()
            },
            operation_registry: Arc::new(Mutex::new(HashMap::new())),
            max_batch_size,
            max_parallel_operations,
        }
    }

    /// Register an operation handler
    pub async fn register_handler<H>(&self, command: &str, handler: H)
    where
        H: BatchOperationHandler + 'static,
    {
        let mut registry = self.operation_registry.lock().await;
        registry.insert(command.to_string(), Box::new(handler));
    }

    /// Process a batch request
    pub async fn process_batch(&self, request: BatchRequest) -> Result<BatchResponse, BatchError> {
        let start_time = std::time::Instant::now();

        // Validate batch request
        self.validate_batch_request(&request)?;

        // Sort operations by priority (highest first)
        let mut operations = request.operations;
        operations.sort_by(|a, b| b.priority.cmp(&a.priority));

        // Execute operations
        let results = if request.parallel {
            self.execute_parallel(operations, request.timeout_ms)
                .await?
        } else {
            self.execute_sequential(operations, request.timeout_ms)
                .await?
        };

        let total_time = start_time.elapsed().as_nanos();
        let success_count = results.iter().filter(|r| r.success).count();
        let failure_count = results.len() - success_count;
        let overall_success = failure_count == 0;

        Ok(BatchResponse {
            batch_id: request.batch_id,
            results,
            total_execution_time_ns: total_time,
            success: overall_success,
            success_count,
            failure_count,
        })
    }

    /// Execute operations sequentially
    async fn execute_sequential(
        &self,
        operations: Vec<BatchOperation>,
        timeout_ms: Option<u64>,
    ) -> Result<Vec<BatchOperationResult>, BatchError> {
        let mut results = Vec::with_capacity(operations.len());

        for operation in operations {
            let result = self.execute_single_operation(operation, timeout_ms).await?;
            results.push(result);
        }

        Ok(results)
    }

    /// Execute operations in parallel with controlled concurrency
    async fn execute_parallel(
        &self,
        operations: Vec<BatchOperation>,
        timeout_ms: Option<u64>,
    ) -> Result<Vec<BatchOperationResult>, BatchError> {
        use futures::stream::{self, StreamExt};

        let results =
            stream::iter(operations)
                .map(|operation| async move {
                    self.execute_single_operation(operation, timeout_ms).await
                })
                .buffer_unordered(self.max_parallel_operations)
                .collect::<Vec<_>>()
                .await;

        // Collect results and handle errors
        let mut final_results = Vec::new();
        for result in results {
            final_results.push(result?);
        }

        Ok(final_results)
    }

    /// Execute a single operation
    async fn execute_single_operation(
        &self,
        operation: BatchOperation,
        timeout_ms: Option<u64>,
    ) -> Result<BatchOperationResult, BatchError> {
        let start_time = std::time::Instant::now();

        // Get the operation handler
        let registry = self.operation_registry.lock().await;
        let handler = registry
            .get(&operation.command)
            .ok_or_else(|| BatchError::UnknownCommand(operation.command.clone()))?;

        // Execute with timeout if specified
        let result = if let Some(timeout) = timeout_ms {
            tokio::time::timeout(
                std::time::Duration::from_millis(timeout),
                handler.execute(&operation.args, &self.serializer),
            )
            .await
            .map_err(|_| BatchError::Timeout)?
        } else {
            handler.execute(&operation.args, &self.serializer).await
        };

        let execution_time = start_time.elapsed().as_nanos();

        match result {
            Ok(data) => Ok(BatchOperationResult {
                operation_id: operation.operation_id,
                success: true,
                data: Some(data),
                error: None,
                execution_time_ns: execution_time,
            }),
            Err(error) => Ok(BatchOperationResult {
                operation_id: operation.operation_id,
                success: false,
                data: None,
                error: Some(error.to_string()),
                execution_time_ns: execution_time,
            }),
        }
    }

    /// Validate a batch request
    fn validate_batch_request(&self, request: &BatchRequest) -> Result<(), BatchError> {
        if request.operations.is_empty() {
            return Err(BatchError::EmptyBatch);
        }

        if request.operations.len() > self.max_batch_size {
            return Err(BatchError::BatchTooLarge(
                request.operations.len(),
                self.max_batch_size,
            ));
        }

        // Check for duplicate operation IDs
        let mut seen_ids = std::collections::HashSet::new();
        for operation in &request.operations {
            if !seen_ids.insert(&operation.operation_id) {
                return Err(BatchError::DuplicateOperationId(
                    operation.operation_id.clone(),
                ));
            }
        }

        Ok(())
    }

    /// Get batch processor statistics
    pub async fn get_stats(&self) -> BatchProcessorStats {
        let registry = self.operation_registry.lock().await;
        BatchProcessorStats {
            registered_commands: registry.keys().cloned().collect(),
            max_batch_size: self.max_batch_size,
            max_parallel_operations: self.max_parallel_operations,
            serialization_format: self.serializer.format(),
        }
    }
}

impl Default for BatchProcessor {
    fn default() -> Self {
        Self::new()
    }
}

/// Statistics for the batch processor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchProcessorStats {
    pub registered_commands: Vec<String>,
    pub max_batch_size: usize,
    pub max_parallel_operations: usize,
    pub serialization_format: SerializationFormat,
}

/// Trait for handling batch operations
#[async_trait::async_trait]
pub trait BatchOperationHandler: Send + Sync {
    /// Execute an operation with serialized arguments
    async fn execute(
        &self,
        args: &str,
        serializer: &IpcSerializer,
    ) -> Result<String, Box<dyn std::error::Error + Send + Sync>>;
}

/// Batch processing errors
#[derive(Debug, thiserror::Error)]
pub enum BatchError {
    #[error("Unknown command: {0}")]
    UnknownCommand(String),
    #[error("Empty batch request")]
    EmptyBatch,
    #[error("Batch too large: {0} operations (max: {1})")]
    BatchTooLarge(usize, usize),
    #[error("Duplicate operation ID: {0}")]
    DuplicateOperationId(String),
    #[error("Operation timeout")]
    Timeout,
    #[error("Serialization error: {0}")]
    Serialization(#[from] crate::ipc_serialization::SerializationError),
    #[error("Operation execution error: {0}")]
    ExecutionError(String),
}

/// Utility functions for creating batch requests
pub mod utils {
    use super::*;
    use uuid::Uuid;

    /// Create a simple batch request
    pub fn create_batch(operations: Vec<BatchOperation>) -> BatchRequest {
        BatchRequest {
            batch_id: Uuid::new_v4().to_string(),
            operations,
            parallel: true,
            timeout_ms: Some(30000), // 30 second default timeout
        }
    }

    /// Create a batch operation
    pub fn create_operation<T: serde::Serialize>(
        operation_id: String,
        command: &str,
        args: &T,
        priority: i32,
    ) -> Result<BatchOperation, BatchError> {
        let serializer = IpcSerializer::messagepack();
        let args_serialized = serializer.serialize_to_string(args)?;

        Ok(BatchOperation {
            operation_id,
            command: command.to_string(),
            args: args_serialized,
            priority,
        })
    }

    /// Create multiple operations from a list of commands and args
    pub fn create_operations<T: serde::Serialize>(
        command_args: Vec<(&str, &T, i32)>,
    ) -> Result<Vec<BatchOperation>, BatchError> {
        let mut operations = Vec::new();
        for (i, (command, args, priority)) in command_args.into_iter().enumerate() {
            let operation = create_operation(format!("op_{}", i), command, args, priority)?;
            operations.push(operation);
        }
        Ok(operations)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    struct MockHandler {
        call_count: Arc<AtomicUsize>,
    }

    #[async_trait::async_trait]
    impl BatchOperationHandler for MockHandler {
        async fn execute(
            &self,
            args: &str,
            serializer: &IpcSerializer,
        ) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
            self.call_count.fetch_add(1, Ordering::SeqCst);

            // Parse the args (expecting a simple string)
            let input: String = serializer.deserialize_from_string(args)?;
            Ok(format!("processed: {}", input))
        }
    }

    #[tokio::test]
    async fn test_batch_processor() {
        let processor = BatchProcessor::new();

        // Register a mock handler
        let call_count = Arc::new(AtomicUsize::new(0));
        let handler = MockHandler {
            call_count: call_count.clone(),
        };
        processor.register_handler("test_command", handler).await;

        // Create a batch request
        let operations = vec![
            BatchOperation {
                operation_id: "op1".to_string(),
                command: "test_command".to_string(),
                args: processor
                    .serializer
                    .serialize_to_string(&"arg1".to_string())
                    .unwrap(),
                priority: 1,
            },
            BatchOperation {
                operation_id: "op2".to_string(),
                command: "test_command".to_string(),
                args: processor
                    .serializer
                    .serialize_to_string(&"arg2".to_string())
                    .unwrap(),
                priority: 2,
            },
        ];

        let request = BatchRequest {
            batch_id: "test_batch".to_string(),
            operations,
            parallel: false,
            timeout_ms: None,
        };

        // Process the batch
        let response = processor.process_batch(request).await.unwrap();

        // Verify results
        assert_eq!(response.batch_id, "test_batch");
        assert_eq!(response.results.len(), 2);
        assert!(response.success);
        assert_eq!(response.success_count, 2);
        assert_eq!(response.failure_count, 0);
        assert_eq!(call_count.load(Ordering::SeqCst), 2);
    }

    #[tokio::test]
    async fn test_batch_validation() {
        let processor = BatchProcessor::new();

        // Test empty batch
        let empty_request = BatchRequest {
            batch_id: "empty".to_string(),
            operations: vec![],
            parallel: true,
            timeout_ms: None,
        };

        assert!(matches!(
            processor.process_batch(empty_request).await,
            Err(BatchError::EmptyBatch)
        ));

        // Test duplicate operation IDs
        let duplicate_request = BatchRequest {
            batch_id: "duplicate".to_string(),
            operations: vec![
                BatchOperation {
                    operation_id: "dup".to_string(),
                    command: "test".to_string(),
                    args: "{}".to_string(),
                    priority: 1,
                },
                BatchOperation {
                    operation_id: "dup".to_string(),
                    command: "test".to_string(),
                    args: "{}".to_string(),
                    priority: 1,
                },
            ],
            parallel: true,
            timeout_ms: None,
        };

        assert!(matches!(
            processor.process_batch(duplicate_request).await,
            Err(BatchError::DuplicateOperationId(_))
        ));
    }
}
