//! Tauri commands for sync queue management - PRD-07

use crate::authenticate;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::sync::domain::models::sync::{SyncOperation, SyncQueueMetrics};
use tracing::{error, info, instrument};

/// Enqueue a sync operation
#[tauri::command]
#[instrument(skip(state, session_token, operation))]
pub async fn sync_enqueue(
    operation: SyncOperation,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<i64>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    let result = state.sync_queue.enqueue(operation).map_err(|e| {
        error!(error = %e, "Failed to enqueue sync operation");
        AppError::Sync("Failed to enqueue operation".to_string())
    })?;
    info!(operation_id = result, "Sync operation enqueued");
    Ok(ApiResponse::success(result).with_correlation_id(Some(correlation_id)))
}

/// Dequeue a batch of pending operations
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn sync_dequeue_batch(
    limit: usize,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<SyncOperation>>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    let ops = state.sync_queue.dequeue_batch(limit).map_err(|e| {
        error!(error = %e, "Failed to dequeue sync operations");
        AppError::Sync("Failed to dequeue operations".to_string())
    })?;
    Ok(ApiResponse::success(ops).with_correlation_id(Some(correlation_id)))
}

/// Get sync queue metrics
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn sync_get_metrics(
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<SyncQueueMetrics>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    let metrics = state.sync_queue.get_metrics().map_err(|e| {
        error!(error = %e, "Failed to get sync queue metrics");
        AppError::Sync("Failed to get metrics".to_string())
    })?;
    Ok(ApiResponse::success(metrics).with_correlation_id(Some(correlation_id)))
}

/// Mark an operation as completed
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn sync_mark_completed(
    operation_id: i64,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    state.sync_queue.mark_completed(operation_id).map_err(|e| {
        error!(error = %e, operation_id = operation_id, "Failed to mark operation completed");
        AppError::Sync("Failed to mark operation completed".to_string())
    })?;
    info!(
        operation_id = operation_id,
        "Sync operation marked completed"
    );
    Ok(ApiResponse::success(()).with_correlation_id(Some(correlation_id)))
}

/// Mark an operation as failed
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn sync_mark_failed(
    operation_id: i64,
    error: String,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    state
        .sync_queue
        .mark_failed(operation_id, &error)
        .map_err(|e| {
            tracing::error!(error = %e, operation_id = operation_id, "Failed to mark operation as failed");
            AppError::Sync("Failed to mark operation failed".to_string())
        })?;
    info!(operation_id = operation_id, "Sync operation marked failed");
    Ok(ApiResponse::success(()).with_correlation_id(Some(correlation_id)))
}

/// Get a specific operation by ID
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn sync_get_operation(
    operation_id: i64,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<SyncOperation>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    let op = state.sync_queue.get_operation(operation_id).map_err(|e| {
        error!(error = %e, operation_id = operation_id, "Failed to get sync operation");
        AppError::Sync("Failed to get operation".to_string())
    })?;
    Ok(ApiResponse::success(op).with_correlation_id(Some(correlation_id)))
}

/// Clean up old completed operations
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn sync_cleanup_old_operations(
    days_old: i64,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<i64>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    let cleaned = state
        .sync_queue
        .cleanup_old_operations(days_old)
        .map_err(|e| {
            error!(error = %e, days_old = days_old, "Failed to cleanup old sync operations");
            AppError::Sync("Failed to cleanup old operations".to_string())
        })?;
    info!(
        days_old = days_old,
        cleaned_count = cleaned,
        "Old sync operations cleaned up"
    );
    Ok(ApiResponse::success(cleaned).with_correlation_id(Some(correlation_id)))
}
