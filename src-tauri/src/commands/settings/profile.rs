//! User profile settings operations
//!
//! This module handles user profile CRUD operations including
//! profile updates, password changes, data export, and account deletion.

use crate::commands::settings::core::{authenticate_user, handle_settings_error};
use crate::commands::{ApiResponse, AppError, AppState};
use crate::models::auth::UserRole;

use base64::{Engine as _, engine::general_purpose};
use serde::Deserialize;

use tracing::info;

// Import authentication macros
use crate::authenticate;

#[derive(Deserialize)]
pub struct UpdateUserProfileRequest {
    pub session_token: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub job_title: Option<String>,
    pub department: Option<String>,
    pub employee_id: Option<String>,
}

#[derive(Deserialize)]
pub struct ChangeUserPasswordRequest {
    pub session_token: String,
    pub current_password: String,
    pub new_password: String,
}

#[derive(Deserialize)]
pub struct DeleteUserAccountRequest {
    pub session_token: String,
    pub confirmation: String,
}

#[derive(Deserialize)]
pub struct UploadUserAvatarRequest {
    pub session_token: String,
    pub avatar_data: String, // Base64 encoded image
    pub mime_type: String,
}

/// Get user settings
#[tauri::command]

pub async fn get_user_settings(
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::models::settings::UserSettings>, AppError> {
    info!("Getting user settings");

    let user = authenticate_user(&session_token, &state)?;

    state
        .settings_service
        .get_user_settings(&user.id)
        .map(ApiResponse::success)
        .map_err(|e| handle_settings_error(e, "Get user settings"))
}

/// Update user profile
#[tauri::command]

pub async fn update_user_profile(
    request: UpdateUserProfileRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::models::settings::UserProfileSettings>, AppError> {
    info!("Updating user profile");

    let user = authenticate!(&request.session_token, &state);

    let full_name = format!("{} {}", request.first_name.unwrap_or_default(), request.last_name.unwrap_or_default()).trim().to_string();

    let profile_settings = crate::models::settings::UserProfileSettings {
        full_name,
        email: request.email.unwrap_or_default(),
        phone: request.phone,
        avatar_url: None, // Will be set by upload_user_avatar
        notes: None,
    };

    state
        .settings_service
        .update_user_profile(&user.id, &profile_settings)
        .map(|_| ApiResponse::success(profile_settings))
        .map_err(|e| handle_settings_error(e, "Update user profile"))
}

/// Change user password
#[tauri::command]

pub async fn change_user_password(
    request: ChangeUserPasswordRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    info!("Changing user password");

    let user = authenticate!(&request.session_token, &state);

    // Validate current password (this would typically be done by the auth service)
    // For now, we'll assume it's validated and just update

    state
        .settings_service
        .change_user_password(&user.id, &request.new_password)
        .map(|_| ApiResponse::success("Password changed successfully".to_string()))
        .map_err(|e| handle_settings_error(e, "Change user password"))
}

/// Export user data
#[tauri::command]

pub async fn export_user_data(
    session_token: String,
    state: AppState<'_>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    info!("Exporting user data");

    let _user = authenticate_user(&session_token, &state)?;

    // This would implement GDPR-compliant data export
    // TODO: Implement export_user_data method in settings service
    Err(AppError::Validation("User data export not yet implemented".to_string()))
        .map_err(|e| handle_settings_error(e, "Export user data"))
}

/// Delete user account
#[tauri::command]

pub async fn delete_user_account(
    request: DeleteUserAccountRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    info!("Deleting user account");

    let user = authenticate_user(&request.session_token, &state)?;

    // Validate confirmation
    if request.confirmation != "DELETE" {
        return Err(AppError::Validation("Invalid confirmation text".to_string()));
    }

    // Only allow self-deletion or admin deletion
    if !matches!(user.role, UserRole::Admin) {
        return Err(AppError::Authorization("Only administrators can delete accounts".to_string()));
    }

    // TODO: Implement delete_user_account method in settings service
    Err(AppError::Validation("Account deletion not yet implemented".to_string()))
        .map_err(|e| handle_settings_error(e, "Delete user account"))
}

/// Upload user avatar
#[tauri::command]

pub async fn upload_user_avatar(
    request: UploadUserAvatarRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    info!("Uploading user avatar");

    let _user = authenticate!(&request.session_token, &state);

    // Decode base64 avatar data
    let avatar_data = general_purpose::STANDARD.decode(&request.avatar_data)
        .map_err(|e| AppError::Validation(format!("Invalid base64 data: {}", e)))?;

    // Validate file size (max 5MB)
    if avatar_data.len() > 5 * 1024 * 1024 {
        return Err(AppError::Validation("Avatar file too large (max 5MB)".to_string()));
    }

    // Validate MIME type
    if !["image/jpeg", "image/png", "image/gif"].contains(&request.mime_type.as_str()) {
        return Err(AppError::Validation("Unsupported image format".to_string()));
    }

    // TODO: Implement upload_user_avatar method in settings service
    Err(AppError::Validation("Avatar upload not yet implemented".to_string()))
        .map_err(|e| handle_settings_error(e, "Upload user avatar"))
}