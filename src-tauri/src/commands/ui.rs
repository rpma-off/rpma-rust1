//! UI-related Tauri commands
//!
//! This module contains commands for window management and system integration.

use crate::resolve_context;
use crate::shared::policies::phone_policy::normalize_dialable_phone_number;
use crate::shared::policies::url_policy::validate_https_url;
use serde::Serialize;
use tauri::{command, Window};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct EntityCountsResponse {
    #[ts(type = "number")]
    pub tasks: i64,
    #[ts(type = "number")]
    pub clients: i64,
    #[ts(type = "number")]
    pub interventions: i64,
}

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
    validate_https_url(&url)?;
    open::that(&url).map_err(|e| format!("Failed to open URL: {}", e))
}

/// Initiate a phone call to a customer
#[command]
pub async fn ui_initiate_customer_call(phone_number: String) -> Result<(), String> {
    let clean_number = normalize_dialable_phone_number(&phone_number)?;
    let tel_url = format!("tel:{}", clean_number);
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
    state: super::AppState<'_>,
    _time_range: Option<String>,
    correlation_id: Option<String>,
) -> Result<super::ApiResponse<serde_json::Value>, super::AppError> {
    let ctx = resolve_context!(&state, &correlation_id, super::UserRole::Viewer);

    let payload = serde_json::json!({
        "tasks": { "total": 0, "completed": 0, "pending": 0, "active": 0 },
        "clients": { "total": 0, "active": 0 },
        "users": { "total": 0, "active": 0, "admins": 0, "technicians": 0 },
        "sync": { "status": "idle", "pending_operations": 0, "completed_operations": 0 }
    });

    Ok(super::ApiResponse::success(payload).with_correlation_id(Some(ctx.correlation_id)))
}

/// Get lightweight entity counters for dashboard cards.
#[command]
pub async fn get_entity_counts(
    state: super::AppState<'_>,
    correlation_id: Option<String>,
) -> Result<super::ApiResponse<EntityCountsResponse>, super::AppError> {
    let ctx = resolve_context!(&state, &correlation_id, super::UserRole::Viewer);

    let pool = state.db.pool().clone();
    let counts = tokio::task::spawn_blocking(move || {
        crate::shared::services::system::SystemService::get_entity_counts(&pool)
    })
    .await
    .map_err(|e| super::AppError::Internal(format!("Task join error: {}", e)))?
    .map_err(super::AppError::Database)?;

    let payload = EntityCountsResponse {
        tasks: counts.0,
        clients: counts.1,
        interventions: counts.2,
    };

    Ok(super::ApiResponse::success(payload).with_correlation_id(Some(ctx.correlation_id)))
}

/// Get recent activities for admin dashboard
#[command]
pub async fn get_recent_activities(
    state: super::AppState<'_>,
    correlation_id: Option<String>,
) -> Result<Vec<serde_json::Value>, String> {
    use tracing::debug;

    let ctx = resolve_context!(&state, &correlation_id, super::UserRole::Admin);

    debug!(
        "Retrieving recent activities for admin: {}",
        ctx.auth.username
    );

    let activities: Vec<serde_json::Value> = Vec::new();
    debug!("Recent activities fallback response returned");
    Ok(activities)
}

#[cfg(test)]
mod tests {
    use crate::shared::policies::url_policy::validate_https_url;

    #[test]
    fn test_shell_open_url_rejects_empty() {
        let result = validate_https_url("");
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "URL cannot be empty");
    }

    #[test]
    fn test_shell_open_url_rejects_http() {
        let result = validate_https_url("http://example.com");
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "Invalid URL format - only HTTPS URLs are allowed"
        );
    }

    #[test]
    fn test_shell_open_url_rejects_credentials_in_authority() {
        let result = validate_https_url("https://user:pass@example.com");
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "URLs with embedded credentials are not allowed"
        );
    }

    #[test]
    fn test_shell_open_url_accepts_https() {
        let result = validate_https_url("https://example.com/path?query=1");
        assert!(result.is_ok());
    }

    #[test]
    fn test_shell_open_url_accepts_email_in_query_param() {
        // Email addresses in query parameters must not be rejected
        let result = validate_https_url("https://example.com/contact?email=user@domain.com");
        assert!(result.is_ok());
    }

    #[test]
    fn test_shell_open_url_rejects_javascript_protocol() {
        let result = validate_https_url("javascript:alert(1)");
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "Invalid URL format - only HTTPS URLs are allowed"
        );
    }

    #[test]
    fn test_shell_open_url_rejects_file_protocol() {
        let result = validate_https_url("file:///etc/passwd");
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "Invalid URL format - only HTTPS URLs are allowed"
        );
    }
}
