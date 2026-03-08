//! Tauri commands for background sync service - PRD-08

use crate::authenticate;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::sync::application::SyncResult;
use tracing::{error, info, instrument};

/// Start the background sync service
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn sync_start_background_service(
    correlation_id: Option<String>,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service_arc = std::sync::Arc::clone(&state.background_sync);

    let service_clone = {
        let service = service_arc.lock().map_err(|e| {
            error!(error = %e, "Failed to acquire sync service lock");
            AppError::Sync("Sync service unavailable".to_string())
        })?;
        service.clone()
    };

    service_clone.start_async().await.map_err(|e| {
        error!(error = %e, "Failed to start background sync");
        AppError::Sync("Failed to start background sync".to_string())
    })?;

    info!("Background sync service started");
    Ok(ApiResponse::success(()).with_correlation_id(Some(correlation_id)))
}

/// Stop the background sync service
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn sync_stop_background_service(
    correlation_id: Option<String>,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service_arc = std::sync::Arc::clone(&state.background_sync);

    let service_clone = {
        let service = service_arc.lock().map_err(|e| {
            error!(error = %e, "Failed to acquire sync service lock");
            AppError::Sync("Sync service unavailable".to_string())
        })?;
        service.clone()
    };

    service_clone.stop_async().await.map_err(|e| {
        error!(error = %e, "Failed to stop background sync");
        AppError::Sync("Failed to stop background sync".to_string())
    })?;

    info!("Background sync service stopped");
    Ok(ApiResponse::success(()).with_correlation_id(Some(correlation_id)))
}

/// Trigger immediate sync
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn sync_now(
    correlation_id: Option<String>,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<SyncResult>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service_arc = std::sync::Arc::clone(&state.background_sync);

    let service_clone = {
        let service = service_arc.lock().map_err(|e| {
            error!(error = %e, "Failed to acquire sync service lock");
            AppError::Sync("Sync service unavailable".to_string())
        })?;
        service.clone()
    };

    let result = service_clone.sync_now_async().await.map_err(|e| {
        error!(error = %e, "Failed to sync now");
        AppError::Sync("Sync operation failed".to_string())
    })?;

    info!("Immediate sync completed");
    Ok(ApiResponse::success(SyncResult {
        processed_operations: result.processed_operations,
        successful_operations: result.successful_operations,
        failed_operations: result.failed_operations,
        duration_ms: result.duration_ms,
        errors: result.errors,
    })
    .with_correlation_id(Some(correlation_id)))
}

/// Get current sync status
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn sync_get_status(
    correlation_id: Option<String>,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service_arc = std::sync::Arc::clone(&state.background_sync);

    let service_clone = {
        let service = service_arc.lock().map_err(|e| {
            error!(error = %e, "Failed to acquire sync service lock");
            AppError::Sync("Sync service unavailable".to_string())
        })?;
        service.clone()
    };

    let status = service_clone.get_status_async().await.map_err(|e| {
        error!(error = %e, "Failed to get sync status");
        AppError::Sync("Failed to get sync status".to_string())
    })?;

    // Transform to match frontend expectations
    Ok(ApiResponse::success(serde_json::json!({
        "network_available": status.network_available,
        "is_running": status.is_running,
        "is_syncing": status.is_running, // Map is_running to is_syncing for frontend compatibility
        "pending_operations": status.pending_operations,
        "failed_operations": status.failed_operations,
        "total_operations": status.total_operations,
        "last_sync_at": status.last_sync.map(|dt| dt.timestamp_millis()),
        "last_sync": status.last_sync.map(|dt| dt.timestamp_millis()),
        "errors": status.errors
    }))
    .with_correlation_id(Some(correlation_id)))
}

/// Get operations for a specific entity
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn sync_get_operations_for_entity(
    correlation_id: Option<String>,
    entity_id: String,
    entity_type: String,
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<crate::domains::sync::domain::models::sync::SyncOperation>>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let queue = std::sync::Arc::clone(&state.sync_queue);
    let ops = queue
        .get_operations_for_entity(&entity_id, &entity_type)
        .map_err(|e| {
            error!(error = %e, entity_id = %entity_id, entity_type = %entity_type, "Failed to get operations for entity");
            AppError::Sync("Failed to get operations for entity".to_string())
        })?;
    Ok(ApiResponse::success(ops).with_correlation_id(Some(correlation_id)))
}
