//! Tauri commands for sync queue management - PRD-07

use crate::commands::AppState;
use crate::models::sync::{SyncOperation, SyncQueueMetrics};
use tracing::{error, info, instrument};

/// Enqueue a sync operation
#[tauri::command]
#[instrument(skip(state, session_token, operation))]
pub fn sync_enqueue(
    operation: SyncOperation,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState,
) -> Result<i64, String> {
    // Initialize correlation context
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    let current_user = state
        .auth_service
        .validate_session(&session_token)
        .map_err(|e| {
            error!(error = %e, "Authentication failed for sync_enqueue");
            "Authentication failed".to_string()
        })?;

    // Update correlation context with user_id
    crate::commands::update_correlation_context_user(&current_user.user_id);

    let result = state.sync_queue.enqueue(operation).map_err(|e| {
        error!(error = %e, "Failed to enqueue sync operation");
        "Failed to enqueue operation".to_string()
    })?;
    info!(operation_id = result, "Sync operation enqueued");
    Ok(result)
}

/// Dequeue a batch of pending operations
#[tauri::command]
#[instrument(skip(state, session_token))]
pub fn sync_dequeue_batch(
    limit: usize,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState,
) -> Result<Vec<SyncOperation>, String> {
    // Initialize correlation context
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    let current_user = state
        .auth_service
        .validate_session(&session_token)
        .map_err(|e| {
            error!(error = %e, "Authentication failed for sync_dequeue_batch");
            "Authentication failed".to_string()
        })?;

    // Update correlation context with user_id
    crate::commands::update_correlation_context_user(&current_user.user_id);

    state.sync_queue.dequeue_batch(limit).map_err(|e| {
        error!(error = %e, "Failed to dequeue sync operations");
        "Failed to dequeue operations".to_string()
    })
}

/// Get sync queue metrics
#[tauri::command]
#[instrument(skip(state, session_token))]
pub fn sync_get_metrics(
    session_token: String,
    correlation_id: Option<String>,
    state: AppState,
) -> Result<SyncQueueMetrics, String> {
    // Initialize correlation context
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    let current_user = state
        .auth_service
        .validate_session(&session_token)
        .map_err(|e| {
            error!(error = %e, "Authentication failed for sync_get_metrics");
            "Authentication failed".to_string()
        })?;

    // Update correlation context with user_id
    crate::commands::update_correlation_context_user(&current_user.user_id);

    state.sync_queue.get_metrics().map_err(|e| {
        error!(error = %e, "Failed to get sync queue metrics");
        "Failed to get metrics".to_string()
    })
}

/// Mark an operation as completed
#[tauri::command]
#[instrument(skip(state, session_token))]
pub fn sync_mark_completed(
    operation_id: i64,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState,
) -> Result<(), String> {
    // Initialize correlation context
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    let current_user = state
        .auth_service
        .validate_session(&session_token)
        .map_err(|e| {
            error!(error = %e, "Authentication failed for sync_mark_completed");
            "Authentication failed".to_string()
        })?;

    // Update correlation context with user_id
    crate::commands::update_correlation_context_user(&current_user.user_id);

    state.sync_queue.mark_completed(operation_id).map_err(|e| {
        error!(error = %e, operation_id = operation_id, "Failed to mark operation completed");
        "Failed to mark operation completed".to_string()
    })?;
    info!(
        operation_id = operation_id,
        "Sync operation marked completed"
    );
    Ok(())
}

/// Mark an operation as failed
#[tauri::command]
#[instrument(skip(state, session_token))]
pub fn sync_mark_failed(
    operation_id: i64,
    error: String,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState,
) -> Result<(), String> {
    // Initialize correlation context
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    let current_user = state
        .auth_service
        .validate_session(&session_token)
        .map_err(|e| {
            tracing::error!(error = %e, "Authentication failed for sync_mark_failed");
            "Authentication failed".to_string()
        })?;

    // Update correlation context with user_id
    crate::commands::update_correlation_context_user(&current_user.user_id);

    state
        .sync_queue
        .mark_failed(operation_id, &error)
        .map_err(|e| {
            tracing::error!(error = %e, operation_id = operation_id, "Failed to mark operation as failed");
            "Failed to mark operation failed".to_string()
        })?;
    info!(operation_id = operation_id, "Sync operation marked failed");
    Ok(())
}

/// Get a specific operation by ID
#[tauri::command]
#[instrument(skip(state, session_token))]
pub fn sync_get_operation(
    operation_id: i64,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState,
) -> Result<SyncOperation, String> {
    // Initialize correlation context
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    let current_user = state
        .auth_service
        .validate_session(&session_token)
        .map_err(|e| {
            error!(error = %e, "Authentication failed for sync_get_operation");
            "Authentication failed".to_string()
        })?;

    // Update correlation context with user_id
    crate::commands::update_correlation_context_user(&current_user.user_id);

    state.sync_queue.get_operation(operation_id).map_err(|e| {
        error!(error = %e, operation_id = operation_id, "Failed to get sync operation");
        "Failed to get operation".to_string()
    })
}

/// Clean up old completed operations
#[tauri::command]
#[instrument(skip(state, session_token))]
pub fn sync_cleanup_old_operations(
    days_old: i64,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState,
) -> Result<i64, String> {
    // Initialize correlation context
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    let current_user = state
        .auth_service
        .validate_session(&session_token)
        .map_err(|e| {
            error!(error = %e, "Authentication failed for sync_cleanup_old_operations");
            "Authentication failed".to_string()
        })?;

    // Update correlation context with user_id
    crate::commands::update_correlation_context_user(&current_user.user_id);

    let cleaned = state
        .sync_queue
        .cleanup_old_operations(days_old)
        .map_err(|e| {
            error!(error = %e, days_old = days_old, "Failed to cleanup old sync operations");
            "Failed to cleanup old operations".to_string()
        })?;
    info!(
        days_old = days_old,
        cleaned_count = cleaned,
        "Old sync operations cleaned up"
    );
    Ok(cleaned)
}
