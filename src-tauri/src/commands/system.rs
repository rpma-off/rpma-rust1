//! System information commands

use crate::db::Database;
use serde::Serialize;
use serde_json::json;
use std::process::Command;
use tauri::State;

#[derive(Serialize)]
pub struct DeviceInfo {
    pub hostname: Option<String>,
    pub platform: String,
    pub arch: String,
    pub id: Option<String>,
}

/// Get device information for fingerprinting
#[tauri::command]
pub async fn get_device_info() -> Result<DeviceInfo, String> {
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

#[tauri::command]
pub async fn diagnose_database(pool: State<'_, Database>) -> Result<serde_json::Value, String> {
    let pool = pool.pool().clone();

    tokio::task::spawn_blocking(move || {
        let conn = pool
            .get()
            .map_err(|e| format!("Failed to get connection: {}", e))?;

        let journal_mode: String = conn
            .query_row("PRAGMA journal_mode;", [], |row| row.get(0))
            .map_err(|e| format!("Failed to check journal mode: {}", e))?;

        let wal_checkpoint: (i64, i64) = conn
            .query_row("PRAGMA wal_checkpoint;", [], |row| {
                Ok((row.get(0)?, row.get(1)?))
            })
            .map_err(|e| format!("Failed to checkpoint: {}", e))?;

        let busy_timeout: i64 = conn
            .query_row("PRAGMA busy_timeout;", [], |row| row.get(0))
            .map_err(|e| format!("Failed to check busy_timeout: {}", e))?;

        let integrity: String = conn
            .query_row("PRAGMA integrity_check;", [], |row| row.get(0))
            .map_err(|e| format!("Failed integrity check: {}", e))?;

        let task_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM tasks;", [], |row| row.get(0))
            .unwrap_or(0);

        let client_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM clients;", [], |row| row.get(0))
            .unwrap_or(0);

        Ok(json!({
            "journal_mode": journal_mode,
            "wal_checkpoint": {
                "busy": wal_checkpoint.0,
                "log": wal_checkpoint.1
            },
            "busy_timeout_ms": busy_timeout,
            "integrity": integrity,
            "table_counts": {
                "tasks": task_count,
                "clients": client_count
            },
            "pool_state": {
                "active": pool.state().connections,
                "idle": pool.state().idle_connections,
            }
        }))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn force_wal_checkpoint(pool: State<'_, Database>) -> Result<String, String> {
    let pool = pool.pool().clone();

    tokio::task::spawn_blocking(move || {
        let conn = pool
            .get()
            .map_err(|e| format!("Failed to get connection: {}", e))?;

        conn.execute_batch("PRAGMA wal_checkpoint(RESTART);")
            .map_err(|e| format!("Checkpoint failed: {}", e))?;

        Ok("WAL checkpoint completed successfully".to_string())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Health check command
#[tauri::command]
pub async fn health_check(pool: State<'_, Database>) -> Result<String, String> {
    let pool = pool.pool().clone();

    tokio::task::spawn_blocking(move || {
        // Test database connection
        let conn = pool
            .get()
            .map_err(|e| format!("Database connection failed: {}", e))?;

        // Test basic query
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
            .map_err(|e| format!("Database query failed: {}", e))?;

        // Check if we have at least one user (basic sanity check)
        if count == 0 {
            return Err("No users found in database".to_string());
        }

        Ok("OK".to_string())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Get database statistics
#[tauri::command]
pub async fn get_database_stats(pool: State<'_, Database>) -> Result<serde_json::Value, String> {
    let pool = pool.pool().clone();

    tokio::task::spawn_blocking(move || {
        let conn = pool
            .get()
            .map_err(|e| format!("Failed to get connection: {}", e))?;

        // Get database file size
        let db_path: String = conn
            .query_row("PRAGMA database_list;", [], |row| {
                let _seq: i64 = row.get(0)?;
                let _name: String = row.get(1)?;
                let path: String = row.get(2)?;
                Ok(path)
            })
            .map_err(|e| format!("Failed to get database path: {}", e))?;

        let size_bytes = if let Ok(metadata) = std::fs::metadata(&db_path) {
            metadata.len() as i64
        } else {
            0
        };

        // Get table counts
        let users_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
            .unwrap_or(0);

        let tasks_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM tasks", [], |row| row.get(0))
            .unwrap_or(0);

        let clients_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM clients", [], |row| row.get(0))
            .unwrap_or(0);

        let interventions_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM interventions", [], |row| row.get(0))
            .unwrap_or(0);

        Ok(json!({
            "size_bytes": size_bytes,
            "tables": {
                "users": users_count,
                "tasks": tasks_count,
                "clients": clients_count,
                "interventions": interventions_count
            },
            "database_path": db_path
        }))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

/// Get application information
#[tauri::command]
pub async fn get_app_info() -> Result<serde_json::Value, String> {
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
