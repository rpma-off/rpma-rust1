//! Authentication commands for Tauri IPC

use crate::domains::auth::application::auth_security_service::AuthSecurityService;
use crate::domains::auth::AuthFacade;
use crate::shared::app_state::AppState;
use crate::shared::ipc::{ApiResponse, AppError};
use serde::Deserialize;
use tracing::{debug, error, info, instrument, warn};

fn security_service(state: &AppState<'_>) -> AuthSecurityService {
    AuthSecurityService::new(state.session_service.clone())
}

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
#[instrument(skip(state, request))]
pub async fn auth_login(
    request: LoginRequest,
    state: AppState<'_>,
    ip_address: Option<String>,
) -> Result<ApiResponse<crate::domains::auth::domain::models::auth::UserSession>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);

    let auth_service = state.auth_service.clone();
    let auth_facade = AuthFacade::new();
    let sec_svc = AuthSecurityService::new(state.session_service.clone());

    debug!(
        correlation_id = %correlation_id,
        "Auth service acquired, attempting authentication"
    );
    let (validated_email, validated_password) =
        sec_svc.validate_login_input(&request.email, &request.password)?;
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
#[instrument(skip(state, request), fields(first_name = %request.first_name, last_name = %request.last_name))]
pub async fn auth_create_account(
    request: SignupRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::domains::auth::domain::models::auth::UserSession>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let auth_facade = AuthFacade::new();
    let sec_svc = AuthSecurityService::new(state.session_service.clone());

    info!(
        correlation_id = %correlation_id,
        "Account creation attempt"
    );

    let validated_request = sec_svc.validate_signup_input(&request)?;
    let validated_email = validated_request.email.clone();
    let validated_password = validated_request.password.clone();

    let auth_service = state.auth_service.clone();

    let account = auth_facade
        .create_account_from_signup(&validated_request, &auth_service)
        .map_err(|e| {
            warn!("Account creation failed: {}", e);
            auth_facade.map_signup_error(&e)
        })?;

    info!(
        correlation_id = %correlation_id,
        username = %account.username,
        "Account created successfully"
    );

    // Auto-login after signup
    let session = auth_service
        .authenticate(&validated_email, &validated_password, None)
        .map_err(|e| {
            error!(
                correlation_id = %correlation_id,
                error = %e,
                "Auto-login failed"
            );
            AppError::Internal(
                "Account created but login failed, please try logging in manually".to_string(),
            )
        })?;

    info!(
        correlation_id = %correlation_id,
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
/// ADR-018: Thin IPC layer — session restore delegated to AuthSecurityService
#[tauri::command]
#[instrument(skip(state))]
pub async fn auth_validate_session(
    session_token: Option<String>,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::domains::auth::domain::models::auth::UserSession>, AppError> {
    debug!("Session validation request");
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    let session = match state.session_store.get() {
        Ok(s) => s,
        Err(_) => {
            let token = session_token
                .ok_or_else(|| AppError::Authentication("Not authenticated".to_string()))?;

            debug!("Session not in memory, attempting to restore from database");
            let restored = security_service(&state).restore_session(&token).await?;
            state.session_store.set(restored.clone());
            restored
        }
    };

    crate::commands::update_correlation_context_user(&session.user_id);
    debug!("Session validation successful");
    Ok(ApiResponse::success(session).with_correlation_id(Some(correlation_id)))
}
