//! Tauri commands for sync queue management - PRD-07

use crate::commands::AppState;
use crate::models::sync::{SyncOperation, SyncQueueMetrics};

/// Enqueue a sync operation
#[tauri::command]
pub fn sync_enqueue(operation: SyncOperation, session_token: String, state: AppState) -> Result<i64, String> {
    state.auth_service.validate_session(&session_token)
        .map_err(|e| format!("Authentication failed: {}", e))?;
    state
        .sync_queue
        .enqueue(operation)
        .map_err(|e| format!("Failed to enqueue operation: {}", e))
}

/// Dequeue a batch of pending operations
#[tauri::command]
pub fn sync_dequeue_batch(limit: usize, session_token: String, state: AppState) -> Result<Vec<SyncOperation>, String> {
    state.auth_service.validate_session(&session_token)
        .map_err(|e| format!("Authentication failed: {}", e))?;
    state
        .sync_queue
        .dequeue_batch(limit)
        .map_err(|e| format!("Failed to dequeue operations: {}", e))
}

/// Get sync queue metrics
#[tauri::command]
pub fn sync_get_metrics(session_token: String, state: AppState) -> Result<SyncQueueMetrics, String> {
    state.auth_service.validate_session(&session_token)
        .map_err(|e| format!("Authentication failed: {}", e))?;
    state
        .sync_queue
        .get_metrics()
        .map_err(|e| format!("Failed to get metrics: {}", e))
}

/// Mark an operation as completed
#[tauri::command]
pub fn sync_mark_completed(operation_id: i64, session_token: String, state: AppState) -> Result<(), String> {
    state.auth_service.validate_session(&session_token)
        .map_err(|e| format!("Authentication failed: {}", e))?;
    state
        .sync_queue
        .mark_completed(operation_id)
        .map_err(|e| format!("Failed to mark operation completed: {}", e))
}

/// Mark an operation as failed
#[tauri::command]
pub fn sync_mark_failed(operation_id: i64, error: String, session_token: String, state: AppState) -> Result<(), String> {
    state.auth_service.validate_session(&session_token)
        .map_err(|e| format!("Authentication failed: {}", e))?;
    state
        .sync_queue
        .mark_failed(operation_id, &error)
        .map_err(|e| format!("Failed to mark operation failed: {}", e))
}

/// Get a specific operation by ID
#[tauri::command]
pub fn sync_get_operation(operation_id: i64, session_token: String, state: AppState) -> Result<SyncOperation, String> {
    state.auth_service.validate_session(&session_token)
        .map_err(|e| format!("Authentication failed: {}", e))?;
    state
        .sync_queue
        .get_operation(operation_id)
        .map_err(|e| format!("Failed to get operation: {}", e))
}

/// Clean up old completed operations
#[tauri::command]
pub fn sync_cleanup_old_operations(days_old: i64, session_token: String, state: AppState) -> Result<i64, String> {
    state.auth_service.validate_session(&session_token)
        .map_err(|e| format!("Authentication failed: {}", e))?;
    state
        .sync_queue
        .cleanup_old_operations(days_old)
        .map_err(|e| format!("Failed to cleanup old operations: {}", e))
}
