//! User profile settings operations
//!
//! This module handles user profile CRUD operations including
//! profile updates, password changes, data export, and account deletion.

use crate::commands::{ApiResponse, AppError, AppState};
use crate::domains::settings::application::{apply_profile_updates, build_export_payload};
use crate::domains::settings::ipc::settings::core::handle_settings_error;

use serde::Deserialize;
use serde_json::json;

use tracing::info;

// Import authentication macros
use crate::authenticate;

#[derive(Deserialize)]
pub struct UpdateUserProfileRequest {
    pub session_token: String,
    #[serde(default)]
    pub full_name: Option<String>,
    #[serde(default)]
    pub first_name: Option<String>,
    #[serde(default)]
    pub last_name: Option<String>,
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub phone: Option<String>,
    #[serde(default, alias = "profile_picture")]
    pub avatar_url: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default)]
    pub job_title: Option<String>,
    #[serde(default)]
    pub department: Option<String>,
    #[serde(default)]
    pub employee_id: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize)]
pub struct ChangeUserPasswordRequest {
    pub session_token: String,
    pub current_password: String,
    pub new_password: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize)]
pub struct DeleteUserAccountRequest {
    pub session_token: String,
    pub confirmation: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize)]
pub struct UploadUserAvatarRequest {
    pub session_token: String,
    pub avatar_data: String, // Base64 encoded image
    pub mime_type: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Get user settings
#[tracing::instrument(skip_all)]
#[tauri::command]

pub async fn get_user_settings(
    session_token: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<crate::domains::settings::domain::models::settings::UserSettings>, AppError>
{
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    info!("Getting user settings");

    let user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&user.id);

    state
        .settings_service
        .get_user_settings(&user.id)
        .map(|v| ApiResponse::success(v).with_correlation_id(Some(correlation_id.clone())))
        .map_err(|e| handle_settings_error(e, "Get user settings"))
}

/// Update user profile
#[tracing::instrument(skip_all)]
#[tauri::command]

pub async fn update_user_profile(
    request: UpdateUserProfileRequest,
    state: AppState<'_>,
) -> Result<
    ApiResponse<crate::domains::settings::domain::models::settings::UserProfileSettings>,
    AppError,
> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    info!("Updating user profile");

    let user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&user.id);
    let existing_profile = state
        .settings_service
        .get_user_settings(&user.id)
        .map_err(|e| handle_settings_error(e, "Load existing user profile"))?
        .profile;

    let profile_settings = apply_profile_updates(
        existing_profile,
        request.full_name,
        request.first_name,
        request.last_name,
        request.email,
        request.phone,
        request.avatar_url,
        request.notes,
    );

    state
        .settings_service
        .update_user_profile(&user.id, &profile_settings)
        .map(|_| {
            ApiResponse::success(profile_settings).with_correlation_id(Some(correlation_id.clone()))
        })
        .map_err(|e| handle_settings_error(e, "Update user profile"))
}

/// Change user password
#[tracing::instrument(skip_all)]
#[tauri::command]

pub async fn change_user_password(
    request: ChangeUserPasswordRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    info!("Changing user password");

    let user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&user.id);

    state
        .settings_service
        .change_user_password(
            &user.id,
            &request.current_password,
            &request.new_password,
            &request.session_token,
            state.auth_service.as_ref(),
        )
        .map(|_| {
            ApiResponse::success("Password changed successfully".to_string())
                .with_correlation_id(Some(correlation_id.clone()))
        })
        .map_err(|e| handle_settings_error(e, "Change user password"))
}

/// Export user data
#[tracing::instrument(skip_all)]
#[tauri::command]

pub async fn export_user_data(
    session_token: String,
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<serde_json::Value>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    info!("Exporting user data");

    let user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&user.id);
    let settings = state
        .settings_service
        .get_user_settings(&user.id)
        .map_err(|e| handle_settings_error(e, "Load user settings for export"))?;

    let account = state
        .auth_service
        .get_user(&user.id)
        .map_err(|e| AppError::Database(format!("Failed to load user account: {}", e)))?;

    let consent = state
        .settings_service
        .get_user_consent(&user.id)
        .map_err(|e| handle_settings_error(e, "Load user consent for export"))?;

    let user_identity = match account {
        Some(account) => json!({
            "id": account.id,
            "email": account.email,
            "username": account.username,
            "first_name": account.first_name,
            "last_name": account.last_name,
            "role": account.role,
            "phone": account.phone,
            "is_active": account.is_active,
            "last_login": account.last_login,
            "login_count": account.login_count,
            "created_at": account.created_at,
            "updated_at": account.updated_at
        }),
        None => json!({
            "id": user.user_id,
            "email": user.email,
            "username": user.username,
            "role": user.role
        }),
    };

    Ok(
        ApiResponse::success(build_export_payload(user_identity, &settings, consent))
            .with_correlation_id(Some(correlation_id.clone())),
    )
}

/// Delete user account
#[tracing::instrument(skip_all)]
#[tauri::command]

pub async fn delete_user_account(
    request: DeleteUserAccountRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    info!("Deleting user account");

    let user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&user.id);

    // Validate confirmation
    if request.confirmation != "DELETE" {
        return Err(AppError::Validation(
            "Invalid confirmation text".to_string(),
        ));
    }

    state
        .settings_service
        .delete_user_account(&user.id)
        .map(|_| {
            ApiResponse::success("Account deleted successfully".to_string())
                .with_correlation_id(Some(correlation_id.clone()))
        })
        .map_err(|e| handle_settings_error(e, "Delete user account"))
}

/// Upload user avatar
#[tracing::instrument(skip_all)]
#[tauri::command]

pub async fn upload_user_avatar(
    request: UploadUserAvatarRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    info!("Uploading user avatar");

    let user = authenticate!(&request.session_token, &state);
    crate::commands::update_correlation_context_user(&user.id);

    state
        .settings_service
        .upload_avatar(&user.id, &request.avatar_data, &request.mime_type)
        .map(|data_url| {
            ApiResponse::success(data_url).with_correlation_id(Some(correlation_id.clone()))
        })
        .map_err(|e| handle_settings_error(e, "Upload user avatar"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn export_payload_contains_expected_sections() {
        let settings = crate::domains::settings::domain::models::settings::UserSettings::default();
        let payload = build_export_payload(
            json!({
                "id": "user-1",
                "email": "settings@example.com"
            }),
            &settings,
            Some(json!({"data": {"analytics_consent": true}})),
        );

        assert!(payload.get("exported_at").is_some());
        assert_eq!(payload["user"]["id"], "user-1");
        assert!(payload.get("profile").is_some());
        assert!(payload.get("settings").is_some());
        assert_eq!(payload["consent"]["data"]["analytics_consent"], true);
    }
}
