//! Authentication commands for Tauri IPC

use crate::domains::auth::AuthFacade;
use crate::shared::app_state::AppState;
use crate::shared::ipc::{ApiResponse, AppError};
use serde::Deserialize;
use tracing::{debug, error, info, instrument, warn};

pub use crate::domains::auth::application::SignupRequest;

/// TODO: document
#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Login command
/// ADR-018: Thin IPC layer
#[tauri::command]
#[instrument(skip(state, request), fields(email = %request.email))]
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

    state.session_store.set(session.clone());
    Ok(ApiResponse::success(session).with_correlation_id(Some(correlation_id)))
}

/// Create account command
#[tauri::command]
#[instrument(skip(state, request), fields(email = %request.email, first_name = %request.first_name, last_name = %request.last_name))]
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
            warn!("Account creation failed for {}: {}", validated_email, e);
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
    state.session_store.set(session.clone());
    Ok(ApiResponse::success(session).with_correlation_id(Some(correlation_id)))
}

/// Logout command
#[tauri::command]
#[instrument(skip(state))]
pub async fn auth_logout(
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<()>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    info!(
        correlation_id = %correlation_id,
        "User logout attempt"
    );

    let auth_service = state.auth_service.clone();

    if let Ok(session) = state.session_store.get() {
        if let Err(e) = auth_service.logout(&session.token) {
            warn!(correlation_id = %correlation_id, error = %e, "Logout failed");
        }
    }
    state.session_store.clear();

    info!(
        correlation_id = %correlation_id,
        "User logged out successfully"
    );
    Ok(ApiResponse::success(()).with_correlation_id(Some(correlation_id)))
}

/// Validate session command
#[tauri::command]
#[instrument(skip(state))]
pub async fn auth_validate_session(
    session_token: Option<String>,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::domains::auth::domain::models::auth::UserSession>, AppError> {
    debug!("Session validation request");
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    // Try to get session from in-memory store first
    let session_res = state.session_store.get();

    let session = match session_res {
        Ok(s) => s,
        Err(_) => {
            // If not in memory, try to restore from database if token provided
            if let Some(token) = session_token {
                debug!("Session not in memory, attempting to restore from database");
                match state.session_service.validate_session(&token).await? {
                    Some(s) => {
                        info!("Session restored from database for user: {}", s.username);
                        state.session_store.set(s.clone());
                        s
                    }
                    None => {
                        warn!("Provided session token is invalid or expired");
                        return Err(AppError::Authentication("Not authenticated".to_string()));
                    }
                }
            } else {
                return Err(AppError::Authentication("Not authenticated".to_string()));
            }
        }
    };

    crate::commands::update_correlation_context_user(&session.user_id);
    debug!("Session validation successful");
    Ok(ApiResponse::success(session).with_correlation_id(Some(correlation_id)))
}
