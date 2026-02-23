//! System information commands

use crate::authenticate;
use crate::commands::{AppError, AppState};
use serde::Serialize;
use std::process::Command;
use tracing;

#[derive(Serialize)]
pub struct DeviceInfo {
    pub hostname: Option<String>,
    pub platform: String,
    pub arch: String,
    pub id: Option<String>,
}

/// Get device information for fingerprinting
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn get_device_info(correlation_id: Option<String>) -> Result<DeviceInfo, String> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    use tokio::time::{timeout, Duration};

    // Add 3 second timeout
    timeout(Duration::from_secs(3), async {
        let hostname = get_hostname().ok();
        let platform = get_platform();
        let arch = get_arch();
        let id = get_device_id().ok();

        Ok(DeviceInfo {
            hostname,
            platform,
            arch,
            id,
        })
    })
    .await
    .map_err(|_| "get_device_info timed out".to_string())?
}

fn get_hostname() -> Result<String, String> {
    #[cfg(unix)]
    {
        use std::fs;
        match fs::read_to_string("/etc/hostname") {
            Ok(content) => Ok(content.trim().to_string()),
            Err(_) => {
                // Fallback to hostname command
                let output = Command::new("hostname")
                    .output()
                    .map_err(|e| format!("Failed to get hostname: {}", e))?;

                Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
            }
        }
    }

    #[cfg(windows)]
    {
        let output = Command::new("hostname")
            .output()
            .map_err(|e| format!("Failed to get hostname: {}", e))?;

        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    }
}

fn get_platform() -> String {
    #[cfg(target_os = "windows")]
    return "windows".to_string();

    #[cfg(target_os = "macos")]
    return "macos".to_string();

    #[cfg(target_os = "linux")]
    return "linux".to_string();

    #[cfg(target_os = "freebsd")]
    return "freebsd".to_string();

    #[allow(unreachable_code)]
    "unknown".to_string()
}

fn get_arch() -> String {
    #[cfg(target_arch = "x86_64")]
    return "x86_64".to_string();

    #[cfg(target_arch = "aarch64")]
    return "aarch64".to_string();

    #[cfg(target_arch = "arm")]
    return "arm".to_string();

    #[allow(unreachable_code)]
    "unknown".to_string()
}

fn get_device_id() -> Result<String, String> {
    // Try to get a unique device identifier
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("wmic")
            .args(["csproduct", "get", "UUID"])
            .output()
            .map_err(|e| format!("Failed to get device UUID: {}", e))?;

        let output_str = String::from_utf8_lossy(&output.stdout);
        for line in output_str.lines() {
            let trimmed = line.trim();
            if trimmed != "UUID" && !trimmed.is_empty() {
                return Ok(trimmed.to_string());
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let output = Command::new("system_profiler")
            .args(&["SPHardwareDataType", "-json"])
            .output()
            .map_err(|e| format!("Failed to get hardware info: {}", e))?;

        let output_str = String::from_utf8_lossy(&output.stdout);
        // Parse JSON to get hardware UUID
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&output_str) {
            if let Some(hardware) = json
                .get("SPHardwareDataType")
                .and_then(|v| v.as_array())
                .and_then(|arr| arr.first())
            {
                if let Some(uuid) = hardware.get("serial_number").and_then(|v| v.as_str()) {
                    return Ok(uuid.to_string());
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        // Try machine-id
        if let Ok(content) = std::fs::read_to_string("/etc/machine-id") {
            return Ok(content.trim().to_string());
        }

        // Try dbus machine-id
        if let Ok(content) = std::fs::read_to_string("/var/lib/dbus/machine-id") {
            return Ok(content.trim().to_string());
        }
    }

    // Fallback: generate a random ID and store it
    let fallback_id = uuid::Uuid::new_v4().to_string();

    // Try to persist the fallback ID
    #[cfg(unix)]
    {
        if let Ok(home_dir) = std::env::var("HOME") {
            let id_file = format!("{}/.rpma_device_id", home_dir);
            if std::fs::metadata(&id_file).is_err() {
                let _ = std::fs::write(&id_file, &fallback_id);
            } else {
                if let Ok(stored_id) = std::fs::read_to_string(&id_file) {
                    return Ok(stored_id.trim().to_string());
                }
            }
        }
    }

    Ok(fallback_id)
}

#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn diagnose_database(
    session_token: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<serde_json::Value, AppError> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let _current_user = authenticate!(
        &session_token,
        &state,
        crate::shared::contracts::auth::UserRole::Admin
    );
    crate::commands::update_correlation_context_user(&_current_user.user_id);
    let pool = state.db.pool().clone();

    tokio::task::spawn_blocking(move || {
        crate::shared::services::system::SystemService::diagnose_database(&pool)
    })
    .await
    .map_err(|e| AppError::Internal(format!("Task join error: {}", e)))?
    .map_err(|e| AppError::Internal(e))
}

#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn force_wal_checkpoint(
    session_token: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<String, AppError> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let _current_user = authenticate!(
        &session_token,
        &state,
        crate::shared::contracts::auth::UserRole::Admin
    );
    crate::commands::update_correlation_context_user(&_current_user.user_id);
    let pool = state.db.pool().clone();

    tokio::task::spawn_blocking(move || {
        crate::shared::services::system::SystemService::force_wal_checkpoint(&pool)
    })
    .await
    .map_err(|e| AppError::Internal(format!("Task join error: {}", e)))?
    .map_err(|e| AppError::Internal(e))
}

/// Health check command
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn health_check(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<String, String> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let pool = state.db.pool().clone();

    tokio::task::spawn_blocking(move || {
        crate::shared::services::system::SystemService::health_check(&pool)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Get database statistics
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn get_database_stats(
    session_token: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<serde_json::Value, AppError> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    let _current_user = authenticate!(
        &session_token,
        &state,
        crate::shared::contracts::auth::UserRole::Admin
    );
    crate::commands::update_correlation_context_user(&_current_user.user_id);
    let pool = state.db.pool().clone();

    tokio::task::spawn_blocking(move || {
        crate::shared::services::system::SystemService::get_database_stats(&pool)
    })
    .await
    .map_err(|e| AppError::Internal(format!("Task join error: {}", e)))?
    .map_err(|e| AppError::Internal(e))
}

/// Get application information
#[tracing::instrument(skip_all)]
#[tauri::command]
pub async fn get_app_info(correlation_id: Option<String>) -> Result<serde_json::Value, String> {
    let _correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    use std::collections::HashMap;

    let mut info = HashMap::new();

    // Get version from Cargo.toml
    info.insert("version".to_string(), env!("CARGO_PKG_VERSION").to_string());
    info.insert("name".to_string(), env!("CARGO_PKG_NAME").to_string());
    info.insert(
        "description".to_string(),
        env!("CARGO_PKG_DESCRIPTION").to_string(),
    );

    // Get build information (with fallbacks)
    info.insert(
        "build_time".to_string(),
        std::env::var("VERGEN_BUILD_TIMESTAMP").unwrap_or_else(|_| "unknown".to_string()),
    );
    info.insert(
        "git_sha".to_string(),
        std::env::var("VERGEN_GIT_SHA").unwrap_or_else(|_| "unknown".to_string()),
    );
    info.insert(
        "rustc_version".to_string(),
        std::env::var("VERGEN_RUSTC_SEMVER").unwrap_or_else(|_| "unknown".to_string()),
    );

    // Get system information
    info.insert("platform".to_string(), std::env::consts::OS.to_string());
    info.insert("arch".to_string(), std::env::consts::ARCH.to_string());

    Ok(serde_json::to_value(info).map_err(|e| format!("Serialization error: {}", e))?)
}
