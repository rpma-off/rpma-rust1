//! UI-related Tauri commands
//!
//! This module contains commands for window management and system integration.

use tauri::{command, Window};

/// Minimize the application window
#[command]
pub async fn ui_window_minimize(window: Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

/// Maximize the application window
#[command]
pub async fn ui_window_maximize(window: Window) -> Result<(), String> {
    window.maximize().map_err(|e| e.to_string())
}

/// Close the application window
#[command]
pub async fn ui_window_close(window: Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

/// Open URL in system default browser
#[command]
pub async fn ui_shell_open_url(url: String) -> Result<(), String> {
    // Validate URL format
    if url.is_empty() {
        return Err("URL cannot be empty".to_string());
    }
    // Basic URL validation - should start with http:// or https://
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Invalid URL format - must start with http:// or https://".to_string());
    }
    // Additional validation could include checking for valid domain, etc.

    open::that(&url).map_err(|e| format!("Failed to open URL: {}", e))
}

/// Initiate a phone call to a customer
#[command]
pub async fn ui_initiate_customer_call(phone_number: String) -> Result<(), String> {
    // Validate phone number
    if phone_number.is_empty() {
        return Err("Phone number cannot be empty".to_string());
    }

    // Basic phone number validation - should contain at least some digits
    if !phone_number.chars().any(|c| c.is_numeric()) {
        return Err("Phone number must contain at least one digit".to_string());
    }

    // Clean the phone number - remove spaces, dashes, etc. for tel: URL
    let clean_number: String = phone_number
        .chars()
        .filter(|c| c.is_numeric() || *c == '+' || *c == '(' || *c == ')' || *c == '-')
        .collect();

    // Create tel: URL
    let tel_url = format!("tel:{}", clean_number);

    // Open with system's default phone application
    open::that(&tel_url).map_err(|e| format!("Failed to initiate call: {}", e))
}

/// Get current GPS position
/// Note: Desktop applications typically don't have GPS hardware.
/// This function attempts to get location through available system APIs.
#[command]
pub async fn ui_gps_get_current_position() -> Result<serde_json::Value, String> {
    // For desktop applications, GPS is not typically available
    // We could potentially use IP-based geolocation services in the future
    // For now, return an appropriate error indicating GPS is not available

    Err("GPS is not available on desktop platforms. Location services require mobile devices with GPS hardware.".to_string())
}

/// Get window state information
#[command]
pub async fn ui_window_get_state(window: Window) -> Result<serde_json::Value, String> {
    let is_minimized = window.is_minimized().unwrap_or(false);
    let is_maximized = window.is_maximized().unwrap_or(false);
    let is_fullscreen = window.is_fullscreen().unwrap_or(false);

    Ok(serde_json::json!({
        "minimized": is_minimized,
        "maximized": is_maximized,
        "fullscreen": is_fullscreen
    }))
}

/// Set window always on top
#[command]
pub async fn ui_window_set_always_on_top(
    window: Window,
    always_on_top: bool,
) -> Result<(), String> {
    window
        .set_always_on_top(always_on_top)
        .map_err(|e| e.to_string())
}

/// Get dashboard statistics
#[command]
pub fn dashboard_get_stats(
    state: super::AppState<'_>,
    time_range: Option<String>,
    correlation_id: Option<String>,
) -> Result<super::ApiResponse<serde_json::Value>, super::AppError> {
    use tracing::{debug, error, info};

    debug!(
        "Retrieving dashboard statistics for time range: {:?}",
        time_range
    );

    let dashboard_service = state.dashboard_service.clone();

    let stats = dashboard_service
        .get_dashboard_stats(time_range)
        .map_err(|e| {
            error!("Failed to get dashboard statistics: {}", e);
            super::AppError::Database(format!("Failed to get dashboard statistics: {}", e))
        })?;

    info!("Dashboard statistics retrieved successfully");
    Ok(super::ApiResponse::success(stats).with_correlation_id(correlation_id.clone()))
}

/// Get recent activities for admin dashboard
#[command]
pub async fn get_recent_activities(
    session_token: String,
    state: super::AppState<'_>,
) -> Result<Vec<serde_json::Value>, String> {
    use tracing::debug;

    // Validate session
    let auth_service = state.auth_service.clone();
    let current_user = auth_service
        .validate_session(&session_token)
        .map_err(|e| format!("Authentication failed: {}", e))?;

    // Check if user is admin
    if current_user.role != super::UserRole::Admin {
        return Err("Admin access required".to_string());
    }

    debug!(
        "Retrieving recent activities for admin: {}",
        current_user.username
    );

    let dashboard_service = state.dashboard_service.clone();
    let activities = dashboard_service.get_recent_activities()?;

    debug!(
        "Recent activities retrieved successfully: {} items",
        activities.len()
    );
    Ok(activities)
}

/// Get sync status (simplified synchronous version)
#[allow(dead_code)]
fn get_sync_status_simple(
    state: &super::AppState<'_>,
) -> Result<serde_json::Value, super::AppError> {
    let mut stats = serde_json::Map::new();

    // Get sync queue metrics
    let sync_queue = &state.sync_queue;
    let metrics = sync_queue
        .get_metrics()
        .map_err(|e| super::AppError::Internal(format!("Failed to get sync metrics: {}", e)))?;

    stats.insert(
        "status".to_string(),
        serde_json::Value::String("online".to_string()),
    );
    stats.insert(
        "pending_operations".to_string(),
        serde_json::Value::Number(metrics.pending_operations.into()),
    );
    stats.insert(
        "completed_operations".to_string(),
        serde_json::Value::Number(metrics.completed_operations.into()),
    );
    stats.insert(
        "failed_operations".to_string(),
        serde_json::Value::Number(metrics.failed_operations.into()),
    );

    // Get last sync time (mock for now)
    stats.insert(
        "last_sync".to_string(),
        serde_json::Value::String(chrono::Utc::now().to_rfc3339()),
    );

    Ok(serde_json::Value::Object(stats))
}
