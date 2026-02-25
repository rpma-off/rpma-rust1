//! UI-related Tauri commands
//!
//! This module contains commands for window management and system integration.

use crate::authenticate;
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

/// Validate a URL for safe external opening.
/// Returns `Ok(())` if the URL is safe, or `Err` with a descriptive message otherwise.
fn validate_open_url(url: &str) -> Result<(), String> {
    if url.is_empty() {
        return Err("URL cannot be empty".to_string());
    }
    // Only allow HTTPS URLs to prevent protocol smuggling and open redirects
    if !url.starts_with("https://") {
        return Err("Invalid URL format - only HTTPS URLs are allowed".to_string());
    }
    // Reject URLs with embedded credentials (e.g. https://user:pass@host).
    // Only check the authority component (between "https://" and the first "/" or end).
    let authority = url
        .strip_prefix("https://")
        .and_then(|s| s.split('/').next())
        .unwrap_or("");
    if authority.contains('@') {
        return Err("URLs with embedded credentials are not allowed".to_string());
    }
    Ok(())
}

/// Open URL in system default browser
#[command]
pub async fn ui_shell_open_url(url: String) -> Result<(), String> {
    validate_open_url(&url)?;
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
pub async fn dashboard_get_stats(
    session_token: String,
    state: super::AppState<'_>,
    time_range: Option<String>,
    correlation_id: Option<String>,
) -> Result<super::ApiResponse<serde_json::Value>, super::AppError> {
    crate::domains::analytics::ipc::dashboard::dashboard_get_stats(
        session_token,
        state,
        time_range,
        correlation_id,
    )
    .await
}

/// Get recent activities for admin dashboard
#[command]
pub async fn get_recent_activities(
    session_token: String,
    state: super::AppState<'_>,
    correlation_id: Option<String>,
) -> Result<Vec<serde_json::Value>, String> {
    use tracing::debug;

    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    let current_user = authenticate!(&session_token, &state, super::UserRole::Admin);
    crate::commands::update_correlation_context_user(&current_user.user_id);

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

#[cfg(test)]
mod tests {
    use super::validate_open_url;

    #[test]
    fn test_shell_open_url_rejects_empty() {
        let result = validate_open_url("");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "URL cannot be empty");
    }

    #[test]
    fn test_shell_open_url_rejects_http() {
        let result = validate_open_url("http://example.com");
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "Invalid URL format - only HTTPS URLs are allowed"
        );
    }

    #[test]
    fn test_shell_open_url_rejects_credentials_in_authority() {
        let result = validate_open_url("https://user:pass@example.com");
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "URLs with embedded credentials are not allowed"
        );
    }

    #[test]
    fn test_shell_open_url_accepts_https() {
        let result = validate_open_url("https://example.com/path?query=1");
        assert!(result.is_ok());
    }

    #[test]
    fn test_shell_open_url_accepts_email_in_query_param() {
        // Email addresses in query parameters must not be rejected
        let result = validate_open_url("https://example.com/contact?email=user@domain.com");
        assert!(result.is_ok());
    }

    #[test]
    fn test_shell_open_url_rejects_javascript_protocol() {
        let result = validate_open_url("javascript:alert(1)");
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "Invalid URL format - only HTTPS URLs are allowed"
        );
    }

    #[test]
    fn test_shell_open_url_rejects_file_protocol() {
        let result = validate_open_url("file:///etc/passwd");
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "Invalid URL format - only HTTPS URLs are allowed"
        );
    }
}
