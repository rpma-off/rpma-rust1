//! User CRUD commands for Tauri IPC

use crate::domains::users::application::{
    CreateUserRequest, UpdateUserRequest, UserAction, UserResponse,
};
use crate::domains::users::{UsersCommand, UsersDomainResponse, UsersFacade, UsersServices};
use crate::shared::app_state::AppState;
use crate::shared::auth_middleware::AuthMiddleware;
use crate::shared::ipc::{ApiResponse, AppError};
use serde::Deserialize;
use tracing::{debug, info, instrument};

#[derive(Deserialize, Debug)]
pub struct BootstrapFirstAdminRequest {
    pub user_id: String,
    pub session_token: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// User request structure
#[derive(Deserialize, Debug)]
pub struct UserCrudRequest {
    pub action: UserAction,
    pub session_token: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// User CRUD operations
#[tauri::command]
#[instrument(skip(state, request))]
pub async fn user_crud(
    request: UserCrudRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<UserResponse>, AppError> {
    let action = request.action;
    debug!(
        "User CRUD operation requested with action: {:?}, session_token length: {}",
        action,
        request.session_token.len()
    );

    let ctx = AuthMiddleware::authenticate_command(
        &request.session_token,
        &state,
        None,
        &request.correlation_id,
    )
    .await?;

    let facade = UsersFacade::new();
    let services = UsersServices {
        account_manager: state.auth_service.clone()
            as std::sync::Arc<dyn crate::shared::contracts::user_account::UserAccountManager>,
        user_service: state.user_service.clone(),
    };

    let domain_response = facade
        .execute(UsersCommand::Crud(action), &ctx, &services)
        .await?;
    let response = match domain_response {
        UsersDomainResponse::Crud(payload) => payload,
        _ => {
            return Err(AppError::Internal(
                "Unexpected users facade response".to_string(),
            ))
        }
    };

    Ok(ApiResponse::success(response).with_correlation_id(Some(ctx.correlation_id)))
}

/// Bootstrap first admin user - only works if no admin exists
#[tauri::command]
#[instrument(skip(state, request), fields(user_id = %request.user_id))]
pub async fn bootstrap_first_admin(
    request: BootstrapFirstAdminRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let user_id = request.user_id.trim().to_string();
    let facade = UsersFacade::new();
    let ctx = AuthMiddleware::authenticate_command(
        &request.session_token,
        &state,
        None,
        &request.correlation_id,
    )
    .await?;
    let services = UsersServices {
        account_manager: state.auth_service.clone()
            as std::sync::Arc<dyn crate::shared::contracts::user_account::UserAccountManager>,
        user_service: state.user_service.clone(),
    };
    info!("Attempting to bootstrap first admin for user: {}", user_id);
    let response = facade
        .execute(
            UsersCommand::BootstrapFirstAdmin {
                user_id: user_id.clone(),
                session_token: request.session_token,
            },
            &ctx,
            &services,
        )
        .await?;
    match response {
        UsersDomainResponse::BootstrapMessage(message) => {
            info!("Bootstrap completed for user: {}", user_id);
            Ok(ApiResponse::success(message).with_correlation_id(Some(ctx.correlation_id)))
        }
        _ => Err(AppError::Internal(
            "Unexpected users facade response".to_string(),
        )),
    }
}

/// Check if any admin users exist in the system
#[tauri::command]
#[instrument(skip(state))]
pub async fn has_admins(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<bool>, AppError> {
    let corr = crate::commands::init_correlation_context(&correlation_id, None);
    let facade = UsersFacade::new();
    let services = UsersServices {
        account_manager: state.auth_service.clone()
            as std::sync::Arc<dyn crate::shared::contracts::user_account::UserAccountManager>,
        user_service: state.user_service.clone(),
    };
    let system_session = crate::shared::contracts::auth::UserSession {
        id: "system-session".to_string(),
        user_id: "system".to_string(),
        username: "system".to_string(),
        email: "system@localhost".to_string(),
        role: crate::shared::contracts::auth::UserRole::Admin,
        token: "system-session".to_string(),
        expires_at: chrono::Utc::now().to_rfc3339(),
        last_activity: chrono::Utc::now().to_rfc3339(),
        created_at: chrono::Utc::now().to_rfc3339(),
    };
    let ctx = crate::shared::ipc::CommandContext::new(system_session, corr.clone());
    debug!("Checking if admin users exist");
    let response = facade
        .execute(UsersCommand::HasAdmins, &ctx, &services)
        .await?;
    match response {
        UsersDomainResponse::HasAdmins(has_admin) => {
            debug!("Admin check completed: has_admins={}", has_admin);
            Ok(ApiResponse::success(has_admin).with_correlation_id(Some(corr)))
        }
        _ => Err(AppError::Internal(
            "Unexpected users facade response".to_string(),
        )),
    }
}

#[tauri::command]
pub async fn get_users(
    page: i32,
    page_size: i32,
    _search: Option<String>,
    _role: Option<String>,
    session_token: String,
    state: AppState<'_>,
) -> Result<serde_json::Value, AppError> {
    let limit = Some(page_size);
    let offset = Some((page - 1) * page_size);

    match execute_user_action(UserAction::List { limit, offset }, session_token, state).await? {
        UserResponse::List(users) => Ok(serde_json::json!({
            "users": users.data,
            "total": users.data.len(),
            "page": page,
            "page_size": page_size
        })),
        _ => Err(AppError::Internal("Unexpected response".to_string())),
    }
}

#[tauri::command]
pub async fn create_user(
    user_data: CreateUserRequest,
    session_token: String,
    state: AppState<'_>,
) -> Result<serde_json::Value, AppError> {
    match execute_user_action(UserAction::Create { data: user_data }, session_token, state).await? {
        UserResponse::Created(user) => Ok(serde_json::json!(user)),
        _ => Err(AppError::Internal("Failed to create user".to_string())),
    }
}

#[tauri::command]
pub async fn update_user(
    user_id: String,
    user_data: UpdateUserRequest,
    session_token: String,
    state: AppState<'_>,
) -> Result<serde_json::Value, AppError> {
    match execute_user_action(
        UserAction::Update {
            id: user_id,
            data: user_data,
        },
        session_token,
        state,
    )
    .await?
    {
        UserResponse::Updated(user) => Ok(serde_json::json!(user)),
        _ => Err(AppError::Internal("Failed to update user".to_string())),
    }
}

#[tauri::command]
pub async fn update_user_status(
    user_id: String,
    is_active: bool,
    session_token: String,
    state: AppState<'_>,
) -> Result<(), AppError> {
    let update_data = UpdateUserRequest {
        email: None,
        first_name: None,
        last_name: None,
        role: None,
        is_active: Some(is_active),
    };

    match execute_user_action(
        UserAction::Update {
            id: user_id,
            data: update_data,
        },
        session_token,
        state,
    )
    .await?
    {
        UserResponse::Updated(_) => Ok(()),
        _ => Err(AppError::Internal(
            "Failed to update user status".to_string(),
        )),
    }
}

#[tauri::command]
pub async fn delete_user(
    user_id: String,
    session_token: String,
    state: AppState<'_>,
) -> Result<(), AppError> {
    match execute_user_action(UserAction::Delete { id: user_id }, session_token, state).await? {
        UserResponse::Deleted => Ok(()),
        _ => Err(AppError::Internal("Failed to delete user".to_string())),
    }
}

async fn execute_user_action(
    action: UserAction,
    session_token: String,
    state: AppState<'_>,
) -> Result<UserResponse, AppError> {
    let request = UserCrudRequest {
        action,
        session_token,
        correlation_id: None,
    };

    let response = user_crud(request, state).await?;
    response
        .data
        .ok_or_else(|| AppError::Internal("Missing user CRUD response payload".to_string()))
}
