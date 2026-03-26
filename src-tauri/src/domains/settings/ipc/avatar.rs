//! Avatar upload handler with local file storage.
//!
//! Stores avatar images in the app's data directory on the user's computer.
//! ADR-018: Thin IPC layer — file validation delegated to this module.

use std::fs;
use std::path::PathBuf;

use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use tracing::{info, instrument};
use ts_rs::TS;

use crate::commands::{ApiResponse, AppError, AppState};
use crate::resolve_context;

/// Request payload for avatar upload.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct UploadAvatarRequest {
    /// Base64-encoded image data (without data URL prefix)
    pub avatar_data: String,
    /// MIME type (e.g., "image/png", "image/jpeg")
    pub mime_type: String,
}

const SUPPORTED_FORMATS: [&str; 3] = ["image/png", "image/jpeg", "image/gif"];
const MAX_FILE_SIZE_BYTES: usize = 5 * 1024 * 1024; // 5 MB

fn get_avatar_directory() -> Result<PathBuf, AppError> {
    let dir = dirs::data_dir()
        .ok_or_else(|| AppError::Internal("Could not determine app data directory".to_string()))?
        .join("rpma-rust")
        .join("avatars");

    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| AppError::Internal(format!("Failed to create avatar directory: {}", e)))?;
    }

    Ok(dir)
}

fn extension_for(mime_type: &str) -> Result<&'static str, AppError> {
    match mime_type {
        "image/png" => Ok("png"),
        "image/jpeg" => Ok("jpg"),
        "image/gif" => Ok("gif"),
        _ => Err(AppError::Validation(format!(
            "Unsupported image format: {}. Supported: PNG, JPEG, GIF",
            mime_type
        ))),
    }
}

/// Upload and store a user avatar locally.
/// ADR-018: Thin IPC layer
#[tauri::command]
#[instrument(skip(state, request))]
pub async fn upload_user_avatar(
    request: UploadAvatarRequest,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<String>, AppError> {
    let ctx = resolve_context!(&state, &correlation_id);
    let correlation_id =
        crate::commands::init_correlation_context(&correlation_id, Some(&ctx.auth.user_id));

    if !SUPPORTED_FORMATS.contains(&request.mime_type.as_str()) {
        return Err(AppError::Validation(format!(
            "Unsupported image format: {}. Supported: PNG, JPEG, GIF",
            request.mime_type
        )));
    }

    let image_data = general_purpose::STANDARD
        .decode(&request.avatar_data)
        .map_err(|e| AppError::Validation(format!("Invalid image data: {}", e)))?;

    if image_data.len() > MAX_FILE_SIZE_BYTES {
        return Err(AppError::Validation(format!(
            "Image too large. Maximum size is {}MB",
            MAX_FILE_SIZE_BYTES / (1024 * 1024)
        )));
    }

    let ext = extension_for(&request.mime_type)?;
    let avatar_dir = get_avatar_directory()?;
    let filename = format!("{}.{}", ctx.auth.user_id, ext);
    let file_path = avatar_dir.join(&filename);

    fs::write(&file_path, &image_data)
        .map_err(|e| AppError::Internal(format!("Failed to save avatar: {}", e)))?;

    let avatar_url = format!("local-avatar://{}", filename);

    info!(
        user_id = %ctx.auth.user_id,
        avatar_url = %avatar_url,
        "Avatar uploaded successfully"
    );

    Ok(ApiResponse::success(avatar_url).with_correlation_id(Some(correlation_id)))
}
