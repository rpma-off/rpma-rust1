//! Authentication commands for Tauri IPC

use crate::domains::auth::AuthFacade;
use crate::shared::app_state::AppState;
use crate::shared::ipc::{ApiResponse, AppError};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use tracing::{debug, error, info, instrument, warn};

pub use crate::domains::auth::application::SignupRequest;

#[derive(Deserialize, Debug)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Login command
#[tauri::command]
#[instrument(skip(state), fields(email = %request.email))]
pub async fn auth_login(
    request: LoginRequest,
    state: AppState<'_>,
    ip_address: Option<String>,
) -> Result<ApiResponse<crate::domains::auth::domain::models::auth::UserSession>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);

    let auth_service = state.auth_service.clone();
    let auth_facade = AuthFacade::new();

    debug!(
        correlation_id = %correlation_id,
        "Auth service acquired, attempting authentication"
    );
    let (validated_email, validated_password) =
        auth_facade.validate_login_input(&request.email, &request.password)?;
    let auth_result =
        auth_service.authenticate(&validated_email, &validated_password, ip_address.as_deref());
    let session = match auth_facade.map_authentication_result(auth_result) {
        Ok(session) => {
            debug!(
                correlation_id = %correlation_id,
                user_id = %session.user_id,
                "Authentication successful"
            );
            crate::commands::update_correlation_context_user(&session.user_id);
            session
        }
        Err(error) => {
            return Ok(ApiResponse::error(error).with_correlation_id(Some(correlation_id)));
        }
    };

    Ok(ApiResponse::success(session).with_correlation_id(Some(correlation_id)))
}

/// Create account command
#[tauri::command]
#[instrument(skip(state), fields(email = %request.email, first_name = %request.first_name, last_name = %request.last_name))]
pub async fn auth_create_account(
    request: SignupRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::domains::auth::domain::models::auth::UserSession>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let auth_facade = AuthFacade::new();

    info!(
        correlation_id = %correlation_id,
        email = %request.email,
        "Account creation attempt"
    );

    let validated_request = auth_facade.validate_signup_input(&request)?;
    let validated_email = validated_request.email.clone();
    let validated_password = validated_request.password.clone();

    let auth_service = state.auth_service.clone();

    let account = auth_service
        .create_account_from_signup(&validated_request)
        .map_err(|e| {
            error!("Account creation failed for {}: {}", validated_email, e);
            auth_facade.map_signup_error(&e)
        })?;

    info!(
        correlation_id = %correlation_id,
        email = %request.email,
        username = %account.username,
        "Account created successfully"
    );

    // Auto-login after signup
    let session = auth_service
        .authenticate(&validated_email, &validated_password, None)
        .map_err(|e| {
            error!(
                correlation_id = %correlation_id,
                email = %validated_email,
                error = %e,
                "Auto-login failed"
            );
            AppError::Internal(
                "Account created but login failed, please try logging in manually".to_string(),
            )
        })?;

    info!(
        correlation_id = %correlation_id,
        email = %request.email,
        user_id = %session.user_id,
        "Auto-login successful for new user"
    );

    crate::commands::update_correlation_context_user(&session.user_id);
    Ok(ApiResponse::success(session).with_correlation_id(Some(correlation_id)))
}

/// Logout command
#[tauri::command]
#[instrument(skip(state), fields(token_hash = %format!("{:x}", Sha256::digest(token.as_bytes()))))]
pub async fn auth_logout(
    token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    info!(
        correlation_id = %correlation_id,
        "User logout attempt"
    );

    let auth_service = state.auth_service.clone();

    auth_service.logout(&token).map_err(|e| {
        warn!(
            correlation_id = %correlation_id,
            error = %e,
            "Logout failed"
        );
        AppError::Authentication(format!("Logout failed: {}", e))
    })?;

    info!(
        correlation_id = %correlation_id,
        "User logged out successfully"
    );
    Ok(ApiResponse::success("Logged out successfully".to_string())
        .with_correlation_id(Some(correlation_id)))
}

/// Validate session command
#[tauri::command]
#[instrument(skip(state), fields(token_hash = %format!("{:x}", Sha256::digest(session_token.as_bytes()))))]
pub async fn auth_validate_session(
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::domains::auth::domain::models::auth::UserSession>, AppError> {
    debug!("Session validation request");
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    let auth_service = state.auth_service.clone();

    let session = auth_service.validate_session(&session_token).map_err(|e| {
        warn!("Session validation failed: {}", e);
        AppError::Authentication(format!("Session validation failed: {}", e))
    })?;

    crate::commands::update_correlation_context_user(&session.user_id);
    debug!("Session validation successful");
    Ok(ApiResponse::success(session).with_correlation_id(Some(correlation_id)))
}
