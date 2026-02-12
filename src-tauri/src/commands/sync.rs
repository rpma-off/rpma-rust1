//! Tauri commands for background sync service - PRD-08

use crate::commands::AppState;
use crate::sync::background::SyncResult;

/// Start the background sync service
#[tauri::command]
pub async fn sync_start_background_service(
    session_token: String,
    state: AppState<'_>,
) -> Result<(), String> {
    state
        .auth_service
        .validate_session(&session_token)
        .map_err(|e| format!("Authentication failed: {}", e))?;
    let service_arc = std::sync::Arc::clone(&state.background_sync);

    let service_clone = {
        let service = service_arc.lock().map_err(|e| e.to_string())?;
        service.clone()
    };

    service_clone
        .start_async()
        .await
        .map_err(|e| format!("Failed to start background sync: {}", e))
}

/// Stop the background sync service
#[tauri::command]
pub async fn sync_stop_background_service(
    session_token: String,
    state: AppState<'_>,
) -> Result<(), String> {
    state
        .auth_service
        .validate_session(&session_token)
        .map_err(|e| format!("Authentication failed: {}", e))?;
    let service_arc = std::sync::Arc::clone(&state.background_sync);

    let service_clone = {
        let service = service_arc.lock().map_err(|e| e.to_string())?;
        service.clone()
    };

    service_clone
        .stop_async()
        .await
        .map_err(|e| format!("Failed to stop background sync: {}", e))
}

/// Trigger immediate sync
#[tauri::command]
pub async fn sync_now(session_token: String, state: AppState<'_>) -> Result<SyncResult, String> {
    state
        .auth_service
        .validate_session(&session_token)
        .map_err(|e| format!("Authentication failed: {}", e))?;
    let service_arc = std::sync::Arc::clone(&state.background_sync);

    let service_clone = {
        let service = service_arc.lock().map_err(|e| e.to_string())?;
        service.clone()
    };

    service_clone
        .sync_now_async()
        .await
        .map_err(|e| format!("Failed to sync now: {}", e))
}

/// Get current sync status
#[tauri::command]
pub async fn sync_get_status(
    session_token: String,
    state: AppState<'_>,
) -> Result<serde_json::Value, String> {
    state
        .auth_service
        .validate_session(&session_token)
        .map_err(|e| format!("Authentication failed: {}", e))?;
    let service_arc = std::sync::Arc::clone(&state.background_sync);

    let service_clone = {
        let service = service_arc.lock().map_err(|e| e.to_string())?;
        service.clone()
    };

    let status = service_clone
        .get_status_async()
        .await
        .map_err(|e| format!("Failed to get sync status: {}", e))?;

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
pub fn sync_get_operations_for_entity(
    entity_id: String,
    entity_type: String,
    session_token: String,
    state: AppState<'_>,
) -> Result<Vec<crate::models::SyncOperation>, String> {
    state
        .auth_service
        .validate_session(&session_token)
        .map_err(|e| format!("Authentication failed: {}", e))?;
    let queue = std::sync::Arc::clone(&state.sync_queue);
    queue
        .get_operations_for_entity(&entity_id, &entity_type)
        .map_err(|e| format!("Failed to get operations for entity: {}", e))
}
