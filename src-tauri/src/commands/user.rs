//! User CRUD commands for Tauri IPC

use crate::commands::{
    ApiResponse, AppError, AppState, UserAction, UserListResponse, UserResponse,
};
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

    // Determine required permission based on action
    let required_permission = match &action {
        UserAction::Create { .. } => Some("create"),
        UserAction::Update { .. } => Some("update"),
        UserAction::Delete { .. } => Some("delete"),
        UserAction::ChangePassword { .. } => Some("update"),
        UserAction::ChangeRole { .. } => Some("update"), // Role changes require update permission
        UserAction::Ban { .. } | UserAction::Unban { .. } => Some("update"), // Ban/unban requires update permission
        UserAction::Get { .. } | UserAction::List { .. } => Some("read"),
    };

    // Centralized authentication
    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);

    // Check specific permission if provided
    if let Some(permission) = required_permission {
        if !crate::commands::auth_middleware::AuthMiddleware::can_perform_user_operation(
            &current_user.role,
            permission,
            None,
            &current_user.user_id,
        ) {
            return Err(crate::commands::AppError::Authorization(format!(
                "Insufficient permissions to {} users",
                permission
            )));
        }
    }

    let auth_service = state.auth_service.clone();

    match action {
        UserAction::Create { data } => {
            info!("Creating new user");

            // For user creation, we need admin/supervisor permissions
            if !matches!(
                current_user.role,
                crate::models::auth::UserRole::Admin | crate::models::auth::UserRole::Supervisor
            ) {
                return Err(crate::commands::AppError::Authorization(
                    "Only admins and supervisors can create users".to_string(),
                ));
            }

            let role = crate::services::UserService::parse_user_role(&data.role)?;

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

            // Users can only view their own profile unless they're admin/supervisor
            if !matches!(
                current_user.role,
                crate::models::auth::UserRole::Admin | crate::models::auth::UserRole::Supervisor
            ) && current_user.user_id != id
            {
                return Err(crate::commands::AppError::Authorization(
                    "You can only view your own profile".to_string(),
                ));
            }

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

            // Users can only update their own profile unless they're admin/supervisor
            if !matches!(
                current_user.role,
                crate::models::auth::UserRole::Admin | crate::models::auth::UserRole::Supervisor
            ) && current_user.user_id != id
            {
                return Err(crate::commands::AppError::Authorization(
                    "You can only update your own profile".to_string(),
                ));
            }

            let role = match data.role.as_ref() {
                Some(r) => Some(crate::services::UserService::parse_user_role(r)?),
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

            // Only admins can delete users
            if !matches!(current_user.role, crate::models::auth::UserRole::Admin) {
                return Err(crate::commands::AppError::Authorization(
                    "Only admins can delete users".to_string(),
                ));
            }

            // Prevent self-deletion
            crate::services::UserService::validate_not_self_action(
                &current_user.user_id,
                &id,
                "delete your own account",
            )?;

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

            // Only admins and supervisors can list users
            if !matches!(
                current_user.role,
                crate::models::auth::UserRole::Admin | crate::models::auth::UserRole::Supervisor
            ) {
                return Err(crate::commands::AppError::Authorization(
                    "Only admins and supervisors can list users".to_string(),
                ));
            }

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

            // Users can only change their own password unless they're admin
            if !matches!(current_user.role, crate::models::auth::UserRole::Admin)
                && current_user.user_id != id
            {
                return Err(crate::commands::AppError::Authorization(
                    "You can only change your own password".to_string(),
                ));
            }

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

            // Only admin can change roles
            if !matches!(current_user.role, crate::models::auth::UserRole::Admin) {
                return Err(crate::commands::AppError::Authorization(
                    "Only administrators can change user roles".to_string(),
                ));
            }

            // Prevent changing own role
            crate::services::UserService::validate_not_self_action(
                &current_user.user_id,
                &id,
                "change your own role",
            )?;

            // Use UserService to change role
            let user_service = crate::services::UserService::new(state.repositories.user.clone());
            user_service
                .change_role(&id, new_role, &current_user.user_id)
                .await?;

            info!("Role changed successfully for user {}", id);
            Ok(ApiResponse::success(UserResponse::RoleChanged)
                .with_correlation_id(Some(correlation_id.clone())))
        }
        UserAction::Ban { id } => {
            info!("Banning user ID: {}", id);

            // Only admin can ban users
            if !matches!(current_user.role, crate::models::auth::UserRole::Admin) {
                return Err(crate::commands::AppError::Authorization(
                    "Only administrators can ban users".to_string(),
                ));
            }

            // Prevent banning self
            crate::services::UserService::validate_not_self_action(
                &current_user.user_id,
                &id,
                "ban yourself",
            )?;

            // Use UserService to ban user
            let user_service = crate::services::UserService::new(state.repositories.user.clone());
            user_service.ban_user(&id, &current_user.user_id).await?;

            info!("User {} banned successfully", id);
            Ok(ApiResponse::success(UserResponse::UserBanned)
                .with_correlation_id(Some(correlation_id.clone())))
        }
        UserAction::Unban { id } => {
            info!("Unbanning user ID: {}", id);

            // Only admin can unban users
            if !matches!(current_user.role, crate::models::auth::UserRole::Admin) {
                return Err(crate::commands::AppError::Authorization(
                    "Only administrators can unban users".to_string(),
                ));
            }

            // Use UserService to unban user
            let user_service = crate::services::UserService::new(state.repositories.user.clone());
            user_service.unban_user(&id, &current_user.user_id).await?;

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

    if user_id.is_empty() {
        return Err(AppError::Validation(
            "user_id is required for bootstrap".to_string(),
        ));
    }

    if session_token.trim().is_empty() {
        return Err(AppError::Authentication(
            "Session token is required".to_string(),
        ));
    }

    info!("Attempting to bootstrap first admin for user: {}", user_id);

    let current_user = authenticate!(&session_token, &state);
    crate::commands::update_correlation_context_user(&current_user.user_id);
    if current_user.user_id != user_id {
        warn!(
            "Bootstrap attempt blocked: user {} tried to promote {}",
            current_user.user_id, user_id
        );
        return Err(AppError::Authorization(
            "You can only bootstrap your own account".to_string(),
        ));
    }

    let user_service = crate::services::UserService::new(state.repositories.user.clone());
    let message = user_service.bootstrap_first_admin(&user_id).await?;
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

    let user_service = crate::services::UserService::new(state.repositories.user.clone());
    let has_admin = user_service.has_admins().await?;

    debug!("Admin check completed: has_admins={}", has_admin);
    Ok(ApiResponse::success(has_admin).with_correlation_id(Some(correlation_id.clone())))
}
