//! Tauri commands for background sync service - PRD-08

use crate::commands::AppState;
use crate::domains::sync::application::SyncResult;
use tracing::{error, info, instrument};

/// Start the background sync service
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn sync_start_background_service(
    correlation_id: Option<String>,
    session_token: String,
    state: AppState<'_>,
) -> Result<(), String> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = state
        .auth_service
        .validate_session(&session_token)
        .map_err(|e| {
            error!(error = %e, "Authentication failed for sync_start_background_service");
            "Authentication failed".to_string()
        })?;
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service_arc = std::sync::Arc::clone(&state.background_sync);

    let service_clone = {
        let service = service_arc.lock().map_err(|e| {
            error!(error = %e, "Failed to acquire sync service lock");
            "Sync service unavailable".to_string()
        })?;
        service.clone()
    };

    service_clone.start_async().await.map_err(|e| {
        error!(error = %e, "Failed to start background sync");
        "Failed to start background sync".to_string()
    })?;

    info!("Background sync service started");
    Ok(())
}

/// Stop the background sync service
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn sync_stop_background_service(
    correlation_id: Option<String>,
    session_token: String,
    state: AppState<'_>,
) -> Result<(), String> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = state
        .auth_service
        .validate_session(&session_token)
        .map_err(|e| {
            error!(error = %e, "Authentication failed for sync_stop_background_service");
            "Authentication failed".to_string()
        })?;
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service_arc = std::sync::Arc::clone(&state.background_sync);

    let service_clone = {
        let service = service_arc.lock().map_err(|e| {
            error!(error = %e, "Failed to acquire sync service lock");
            "Sync service unavailable".to_string()
        })?;
        service.clone()
    };

    service_clone.stop_async().await.map_err(|e| {
        error!(error = %e, "Failed to stop background sync");
        "Failed to stop background sync".to_string()
    })?;

    info!("Background sync service stopped");
    Ok(())
}

/// Trigger immediate sync
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn sync_now(
    correlation_id: Option<String>,
    session_token: String,
    state: AppState<'_>,
) -> Result<SyncResult, String> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = state
        .auth_service
        .validate_session(&session_token)
        .map_err(|e| {
            error!(error = %e, "Authentication failed for sync_now");
            "Authentication failed".to_string()
        })?;
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service_arc = std::sync::Arc::clone(&state.background_sync);

    let service_clone = {
        let service = service_arc.lock().map_err(|e| {
            error!(error = %e, "Failed to acquire sync service lock");
            "Sync service unavailable".to_string()
        })?;
        service.clone()
    };

    let result = service_clone.sync_now_async().await.map_err(|e| {
        error!(error = %e, "Failed to sync now");
        "Sync operation failed".to_string()
    })?;

    info!("Immediate sync completed");
    Ok(SyncResult {
        processed_operations: result.processed_operations,
        successful_operations: result.successful_operations,
        failed_operations: result.failed_operations,
        duration_ms: result.duration_ms,
        errors: result.errors,
    })
}

/// Get current sync status
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn sync_get_status(
    correlation_id: Option<String>,
    session_token: String,
    state: AppState<'_>,
) -> Result<serde_json::Value, String> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = state
        .auth_service
        .validate_session(&session_token)
        .map_err(|e| {
            error!(error = %e, "Authentication failed for sync_get_status");
            "Authentication failed".to_string()
        })?;
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let service_arc = std::sync::Arc::clone(&state.background_sync);

    let service_clone = {
        let service = service_arc.lock().map_err(|e| {
            error!(error = %e, "Failed to acquire sync service lock");
            "Sync service unavailable".to_string()
        })?;
        service.clone()
    };

    let status = service_clone.get_status_async().await.map_err(|e| {
        error!(error = %e, "Failed to get sync status");
        "Failed to get sync status".to_string()
    })?;

    // Transform to match frontend expectations
    Ok(serde_json::json!({
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
}

/// Get operations for a specific entity
#[tauri::command]
#[instrument(skip(state, session_token))]
pub fn sync_get_operations_for_entity(
    correlation_id: Option<String>,
    entity_id: String,
    entity_type: String,
    session_token: String,
    state: AppState<'_>,
) -> Result<Vec<crate::domains::sync::domain::models::sync::SyncOperation>, String> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let current_user = state
        .auth_service
        .validate_session(&session_token)
        .map_err(|e| {
            error!(error = %e, "Authentication failed for sync_get_operations_for_entity");
            "Authentication failed".to_string()
        })?;
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let queue = std::sync::Arc::clone(&state.sync_queue);
    queue
        .get_operations_for_entity(&entity_id, &entity_type)
        .map_err(|e| {
            error!(error = %e, entity_id = %entity_id, entity_type = %entity_type, "Failed to get operations for entity");
            "Failed to get operations for entity".to_string()
        })
}
