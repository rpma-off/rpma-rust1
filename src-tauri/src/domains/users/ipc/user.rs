//! User CRUD commands for Tauri IPC

use crate::domains::users::application::{
    CreateUserRequest, UpdateUserRequest, UserAction, UserListResponse, UserResponse,
};
use crate::domains::users::UsersFacade;
use crate::shared::app_state::AppState;
use crate::shared::ipc::{ApiResponse, AppError};
use serde::Deserialize;
use tracing::{debug, error, info, instrument, warn};

#[derive(Deserialize, Debug)]
pub struct BootstrapFirstAdminRequest {
    pub user_id: String,
    pub session_token: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

// Import authentication macros
use crate::authenticate;

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
#[instrument(skip(state))]
pub async fn user_crud(
    request: UserCrudRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<UserResponse>, AppError> {
    let action = request.action;
    let session_token = request.session_token;
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    debug!(
        "User CRUD operation requested with action: {:?}, session_token length: {}",
        action,
        session_token.len()
    );

    // Centralized authentication
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    let facade = UsersFacade::new();
    facade.enforce_action_permissions(&current_user, &action)?;

    let auth_service = state.auth_service.clone();

    match action {
        UserAction::Create { data } => {
            info!("Creating new user");
            let role = facade.parse_role(&data.role)?;

            let user = auth_service
                .create_account(
                    &data.email,
                    &data.email,
                    &data.first_name,
                    &data.last_name,
                    role,
                    &data.password,
                )
                .map_err(|e| {
                    error!("Failed to create user: {}", e);
                    AppError::Database(format!("User creation failed: {}", e))
                })?;
            info!("User created successfully with ID: {}", user.id);

            Ok(ApiResponse::success(UserResponse::Created(user))
                .with_correlation_id(Some(correlation_id.clone())))
        }
        UserAction::Get { id } => {
            debug!("Retrieving user with ID: {}", id);

            let user = auth_service.get_user(&id).map_err(|e| {
                error!("Failed to retrieve user {}: {}", id, e);
                AppError::Database(format!("User retrieval failed: {}", e))
            })?;
            let response = match user {
                Some(user) => {
                    debug!("User {} found", id);
                    ApiResponse::success(UserResponse::Found(user))
                        .with_correlation_id(Some(correlation_id.clone()))
                }
                None => {
                    warn!("User {} not found", id);
                    ApiResponse::success(UserResponse::NotFound)
                        .with_correlation_id(Some(correlation_id.clone()))
                }
            };
            Ok(response)
        }
        UserAction::Update { id, data } => {
            info!("Updating user with ID: {}", id);

            let role = match data.role.as_ref() {
                Some(r) => Some(facade.parse_role(r)?),
                None => None,
            };

            let user = auth_service
                .update_user(
                    &id,
                    data.email.as_deref(),
                    data.first_name.as_deref(),
                    data.last_name.as_deref(),
                    role,
                    data.is_active,
                )
                .map_err(|e| {
                    error!("Failed to update user {}: {}", id, e);
                    AppError::Database(format!("User update failed: {}", e))
                })?;
            info!("User {} updated successfully", id);

            Ok(ApiResponse::success(UserResponse::Updated(user))
                .with_correlation_id(Some(correlation_id.clone())))
        }
        UserAction::Delete { id } => {
            info!("Deleting user with ID: {}", id);

            // Prevent self-deletion
            facade.ensure_not_self_action(&current_user.user_id, &id, "delete your own account")?;

            auth_service.delete_user(&id).map_err(|e| {
                error!("Failed to delete user {}: {}", id, e);
                AppError::Database(format!("User deletion failed: {}", e))
            })?;
            info!("User {} deleted successfully", id);
            Ok(ApiResponse::success(UserResponse::Deleted)
                .with_correlation_id(Some(correlation_id.clone())))
        }
        UserAction::List { limit, offset } => {
            debug!(
                "Listing users with limit: {:?}, offset: {:?}",
                limit, offset
            );

            let users = auth_service
                .list_users(Some(limit.unwrap_or(50)), Some(offset.unwrap_or(0)))
                .map_err(|e| {
                    error!("Failed to list users: {}", e);
                    AppError::Database(format!("User listing failed: {}", e))
                })?;
            debug!("Retrieved {} users", users.len());
            Ok(
                ApiResponse::success(UserResponse::List(UserListResponse { data: users }))
                    .with_correlation_id(Some(correlation_id.clone())),
            )
        }
        UserAction::ChangePassword { id, new_password } => {
            info!("Changing password for user ID: {}", id);

            auth_service
                .change_password(&id, &new_password)
                .map_err(|e| {
                    error!("Failed to change password for user {}: {}", id, e);
                    AppError::Database(format!("Password change failed: {}", e))
                })?;
            info!("Password changed successfully for user {}", id);
            Ok(ApiResponse::success(UserResponse::PasswordChanged)
                .with_correlation_id(Some(correlation_id.clone())))
        }
        UserAction::ChangeRole { id, new_role } => {
            info!("Changing role for user ID: {} to {:?}", id, new_role);

            // Prevent changing own role
            facade.ensure_not_self_action(&current_user.user_id, &id, "change your own role")?;

            state.user_service
                .change_role(&id, new_role, &current_user.user_id)
                .await?;

            info!("Role changed successfully for user {}", id);
            Ok(ApiResponse::success(UserResponse::RoleChanged)
                .with_correlation_id(Some(correlation_id.clone())))
        }
        UserAction::Ban { id } => {
            info!("Banning user ID: {}", id);

            // Prevent banning self
            facade.ensure_not_self_action(&current_user.user_id, &id, "ban yourself")?;

            state.user_service.ban_user(&id, &current_user.user_id).await?;

            info!("User {} banned successfully", id);
            Ok(ApiResponse::success(UserResponse::UserBanned)
                .with_correlation_id(Some(correlation_id.clone())))
        }
        UserAction::Unban { id } => {
            info!("Unbanning user ID: {}", id);

            state.user_service.unban_user(&id, &current_user.user_id).await?;

            info!("User {} unbanned successfully", id);
            Ok(ApiResponse::success(UserResponse::UserUnbanned)
                .with_correlation_id(Some(correlation_id.clone())))
        }
    }
}

/// Bootstrap first admin user - only works if no admin exists
#[tauri::command]
#[instrument(skip(state, request), fields(user_id = %request.user_id))]
pub async fn bootstrap_first_admin(
    request: BootstrapFirstAdminRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    let user_id = request.user_id.trim().to_string();
    let session_token = request.session_token;
    let correlation_id = crate::commands::init_correlation_context(&request.correlation_id, None);
    let facade = UsersFacade::new();

    info!("Attempting to bootstrap first admin for user: {}", user_id);

    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    if let Err(error) =
        facade.validate_bootstrap_request(&user_id, &session_token, &current_user.user_id)
    {
        warn!(
            "Bootstrap attempt blocked: user {} tried to promote {}",
            current_user.user_id, user_id
        );
        return Err(error);
    }

    let message = state.user_service.bootstrap_first_admin(&user_id).await?;
    info!("Bootstrap completed for user: {}", user_id);

    Ok(ApiResponse::success(message).with_correlation_id(Some(correlation_id.clone())))
}

/// Check if any admin users exist in the system
#[tauri::command]
#[instrument(skip(state))]
pub async fn has_admins(
    state: AppState<'_>,
    correlation_id: Option<String>,
) -> Result<ApiResponse<bool>, AppError> {
    let correlation_id = crate::commands::init_correlation_context(&correlation_id, None);
    debug!("Checking if admin users exist");

    let has_admin = state.user_service.has_admins().await?;

    debug!("Admin check completed: has_admins={}", has_admin);
    Ok(ApiResponse::success(has_admin).with_correlation_id(Some(correlation_id.clone())))
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
        _ => Err(AppError::Internal("Failed to update user status".to_string())),
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
