//! Authentication commands for Tauri IPC

use crate::commands::{ApiResponse, AppError, AppState};
use crate::services::validation::ValidationService;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use tracing::{debug, error, info, instrument, warn};

#[derive(Deserialize, Debug)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct SignupRequest {
    pub email: String,
    pub first_name: String,
    pub last_name: String,
    pub password: String,
    pub role: Option<String>,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Login command
#[tauri::command]
#[instrument(skip(state), fields(email = %request.email))]
pub async fn auth_login(
    request: LoginRequest,
    state: AppState<'_>,
    // Note: In a real web application, you'd get IP from request headers
    // For desktop app, IP is optional and may come from network configuration.
    ip_address: Option<String>,
) -> Result<ApiResponse<crate::models::auth::UserSession>, AppError> {
    // Initialize correlation context at command start
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);

    // Validate input data
    let validator = ValidationService::new();
    let validated_email = validator
        .validate_email_secure(&request.email)
        .map_err(|e| AppError::Validation(format!("Email validation failed: {}", e)))?;
    let validated_password = validator
        .sanitize_text_input(&request.password, "password", 128)
        .map_err(|e| AppError::Validation(format!("Password validation failed: {}", e)))?;

    // Use consistent authentication pattern - clone to avoid lock issues
    let auth_service = state.auth_service.clone();

    debug!(
        correlation_id = %correlation_id,
        "Auth service acquired, attempting authentication"
    );
    let session_result =
        auth_service.authenticate(&validated_email, &validated_password, ip_address.as_deref());
    let session = match session_result {
        Ok(session) => {
            debug!(
                correlation_id = %correlation_id,
                user_id = %session.user_id,
                "Authentication successful"
            );
            // Update correlation context with user_id after successful authentication
            crate::commands::update_correlation_context_user(&session.user_id);
            session
        }
        Err(e) => {
            // Return user-friendly error message
            let error_msg = if e.contains("Invalid email or password") {
                "Email ou mot de passe incorrect".to_string()
            } else if e.contains("Account temporarily locked") {
                e
            } else {
                "Erreur d'authentification. Veuillez réessayer.".to_string()
            };
            return Ok(ApiResponse::error(AppError::Authentication(error_msg))
                .with_correlation_id(Some(correlation_id)));
        }
    };

    let response = ApiResponse::success(session).with_correlation_id(Some(correlation_id));
    Ok(response)
}

/// Create account command
#[tauri::command]
#[instrument(skip(state), fields(email = %request.email, first_name = %request.first_name, last_name = %request.last_name))]
pub async fn auth_create_account(
    request: SignupRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::models::auth::UserSession>, AppError> {
    // Initialize correlation context at command start
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);

    info!(
        correlation_id = %correlation_id,
        email = %request.email,
        "Account creation attempt"
    );

    // Validate input data
    let validator = ValidationService::new();
    let validated_email = validator
        .validate_email_secure(&request.email)
        .map_err(|e| AppError::Validation(format!("Email validation failed: {}", e)))?;
    let validated_first_name = validator
        .sanitize_text_input(&request.first_name, "first_name", 100)
        .map_err(|e| AppError::Validation(format!("First name validation failed: {}", e)))?;
    let validated_last_name = validator
        .sanitize_text_input(&request.last_name, "last_name", 100)
        .map_err(|e| AppError::Validation(format!("Last name validation failed: {}", e)))?;
    let validated_password = validator
        .validate_password_enhanced(&request.password)
        .map_err(|e| AppError::Validation(format!("Password validation failed: {}", e)))?;

    let auth_service = state.auth_service.clone();

    // Create validated request for service call
    let validated_request = SignupRequest {
        email: validated_email.clone(),
        first_name: validated_first_name.clone(),
        last_name: validated_last_name.clone(),
        password: validated_password.clone(),
        role: request.role.clone(),
        correlation_id: request.correlation_id.clone(),
    };

    let account = auth_service
        .create_account_from_signup(&validated_request)
        .map_err(|e| {
            error!("Account creation failed for {}: {}", validated_email, e);
            match e.as_str() {
                "Email is required"
                | "First name is required"
                | "Last name is required"
                | "Password is required" => AppError::Validation(e),
                "An account with this email already exists" | "Username is already taken" => {
                    AppError::Validation(e)
                }
                _ => AppError::db_sanitized("create_account", &e),
            }
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

    // Update correlation context with user_id after successful authentication
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
    // Initialize correlation context at command start
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);

    info!(
        correlation_id = %correlation_id,
        "User logout attempt"
    );

    // Use consistent authentication pattern - clone to avoid lock issues
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
#[instrument(skip(state), fields(token_hash = %format!("{:x}", Sha256::digest(token.as_bytes()))))]
pub async fn auth_validate_session(
    token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::models::auth::UserSession>, AppError> {
    debug!("Session validation request");
    let correlation_id =
        correlation_id.or_else(|| Some(crate::logging::correlation::generate_correlation_id()));

    // Use consistent authentication pattern - clone to avoid lock issues
    let auth_service = state.auth_service.clone();

    let session = auth_service.validate_session(&token).map_err(|e| {
        warn!("Session validation failed: {}", e);
        AppError::Authentication(format!("Session validation failed: {}", e))
    })?;

    debug!("Session validation successful");
    Ok(ApiResponse::success(session).with_correlation_id(correlation_id))
}

/// Refresh access token command
#[tauri::command]
#[instrument(skip(state), fields(refresh_token_hash = %format!("{:x}", Sha256::digest(refresh_token.as_bytes()))))]
pub async fn auth_refresh_token(
    refresh_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::models::auth::UserSession>, AppError> {
    info!("Token refresh request");
    let correlation_id =
        correlation_id.or_else(|| Some(crate::logging::correlation::generate_correlation_id()));

    // Use consistent authentication pattern - clone to avoid lock issues
    let auth_service = state.auth_service.clone();

    let session = auth_service.refresh_session(&refresh_token).map_err(|e| {
        warn!("Token refresh failed: {}", e);
        AppError::Authentication(format!("Token refresh failed: {}", e))
    })?;

    info!("Token refresh successful");
    Ok(ApiResponse::success(session).with_correlation_id(correlation_id))
}

/// Enable 2FA for the current user
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn enable_2fa(
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<crate::models::auth::TwoFactorSetup>, AppError> {
    let correlation_id =
        correlation_id.or_else(|| Some(crate::logging::correlation::generate_correlation_id()));
    // Authenticate the user
    let current_user = crate::commands::auth_middleware::AuthMiddleware::authenticate(
        &session_token,
        &state,
        None, // Any authenticated user can enable 2FA
    )
    .await?;

    // Generate 2FA setup data
    let setup = state
        .two_factor_service
        .generate_setup(&current_user.user_id)
        .await
        .map_err(|e| {
            error!(error = %e, user_id = %current_user.user_id, "Failed to generate 2FA setup");
            AppError::Internal("Failed to generate 2FA setup".to_string())
        })?;

    info!(user_id = %current_user.user_id, "Generated 2FA setup");
    Ok(ApiResponse::success(setup).with_correlation_id(correlation_id))
}

/// Verify 2FA setup and enable 2FA
#[tauri::command]
#[instrument(skip(state, session_token, verification_code, backup_codes))]
pub async fn verify_2fa_setup(
    verification_code: String,
    backup_codes: Vec<String>,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id =
        correlation_id.or_else(|| Some(crate::logging::correlation::generate_correlation_id()));
    // Authenticate the user
    let current_user = crate::commands::auth_middleware::AuthMiddleware::authenticate(
        &session_token,
        &state,
        None,
    )
    .await?;

    // Enable 2FA for the user
    state
        .two_factor_service
        .enable_2fa(&current_user.user_id, &verification_code, backup_codes)
        .await
        .map_err(|e| {
            error!(error = %e, user_id = %current_user.user_id, "Failed to enable 2FA");
            AppError::Internal("Failed to enable 2FA".to_string())
        })?;

    info!(user_id = %current_user.user_id, "2FA enabled");
    Ok(
        ApiResponse::success("Two-factor authentication has been enabled successfully".to_string())
            .with_correlation_id(correlation_id),
    )
}

/// Disable 2FA for the current user
#[tauri::command]
#[instrument(skip(state, session_token, password))]
pub async fn disable_2fa(
    password: String,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let correlation_id =
        correlation_id.or_else(|| Some(crate::logging::correlation::generate_correlation_id()));
    // Authenticate the user
    let current_user = crate::commands::auth_middleware::AuthMiddleware::authenticate(
        &session_token,
        &state,
        None,
    )
    .await?;

    // Verify password before disabling 2FA
    let is_valid_password = state
        .auth_service
        .verify_user_password(&current_user.user_id, &password)
        .map_err(|e| {
            error!(error = %e, user_id = %current_user.user_id, "Password verification failed during 2FA disable");
            AppError::Internal("Password verification failed".to_string())
        })?;

    if !is_valid_password {
        return Err(AppError::Authentication("Invalid password".to_string()));
    }

    // Disable 2FA for the user
    state
        .two_factor_service
        .disable_2fa(&current_user.user_id)
        .await
        .map_err(|e| {
            error!(error = %e, user_id = %current_user.user_id, "Failed to disable 2FA");
            AppError::Internal("Failed to disable 2FA".to_string())
        })?;

    info!(user_id = %current_user.user_id, "2FA disabled");
    Ok(
        ApiResponse::success("Two-factor authentication has been disabled".to_string())
            .with_correlation_id(correlation_id),
    )
}

/// Regenerate backup codes for 2FA
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn regenerate_backup_codes(
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<Vec<String>>, AppError> {
    let correlation_id =
        correlation_id.or_else(|| Some(crate::logging::correlation::generate_correlation_id()));
    // Authenticate the user
    let current_user = crate::commands::auth_middleware::AuthMiddleware::authenticate(
        &session_token,
        &state,
        None,
    )
    .await?;

    // Regenerate backup codes
    let backup_codes = state
        .two_factor_service
        .regenerate_backup_codes(&current_user.user_id)
        .await
        .map_err(|e| {
            error!(error = %e, user_id = %current_user.user_id, "Failed to regenerate backup codes");
            AppError::Internal("Failed to regenerate backup codes".to_string())
        })?;

    info!(user_id = %current_user.user_id, "Backup codes regenerated");
    Ok(ApiResponse::success(backup_codes).with_correlation_id(correlation_id))
}

/// Verify 2FA code (used during login or other sensitive operations)
#[tauri::command]
#[instrument(skip(state, session_token, code))]
pub async fn verify_2fa_code(
    code: String,
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<bool>, AppError> {
    let correlation_id =
        correlation_id.or_else(|| Some(crate::logging::correlation::generate_correlation_id()));
    // Authenticate the user
    let current_user = crate::commands::auth_middleware::AuthMiddleware::authenticate(
        &session_token,
        &state,
        None,
    )
    .await?;

    // Verify the 2FA code
    let is_valid = state
        .two_factor_service
        .verify_code(&current_user.user_id, &code)
        .await
        .map_err(|e| {
            error!(error = %e, user_id = %current_user.user_id, "Failed to verify 2FA code");
            AppError::Internal("Failed to verify 2FA code".to_string())
        })?;

    if is_valid {
        info!(user_id = %current_user.user_id, "2FA code verified");
    } else {
        warn!(user_id = %current_user.user_id, "Invalid 2FA code attempt");
    }

    Ok(ApiResponse::success(is_valid).with_correlation_id(correlation_id))
}

/// Check if 2FA is enabled for the current user
#[tauri::command]
#[instrument(skip(state, session_token))]
pub async fn is_2fa_enabled(
    session_token: String,
    correlation_id: Option<String>,
    state: AppState<'_>,
) -> Result<ApiResponse<bool>, AppError> {
    let correlation_id =
        correlation_id.or_else(|| Some(crate::logging::correlation::generate_correlation_id()));
    // Authenticate the user
    let current_user = crate::commands::auth_middleware::AuthMiddleware::authenticate(
        &session_token,
        &state,
        None,
    )
    .await?;

    // Check if 2FA is enabled
    let is_enabled = state
        .two_factor_service
        .is_enabled(&current_user.user_id)
        .await
        .map_err(|e| {
            error!(error = %e, user_id = %current_user.user_id, "Failed to check 2FA status");
            AppError::Internal("Failed to check 2FA status".to_string())
        })?;

    Ok(ApiResponse::success(is_enabled).with_correlation_id(correlation_id))
}
