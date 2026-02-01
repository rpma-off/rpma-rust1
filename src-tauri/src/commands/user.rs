//! User CRUD commands for Tauri IPC

use crate::commands::{
    ApiResponse, AppError, AppState, UserAction, UserListResponse, UserResponse,
};
use serde::Deserialize;
use tracing::{debug, error, info, instrument, warn};

#[derive(Deserialize, Debug)]
pub struct BootstrapFirstAdminRequest {
    pub user_id: String,
}

// Import authentication macros
use crate::authenticate;

/// User request structure
#[derive(Deserialize, Debug)]
pub struct UserCrudRequest {
    pub action: UserAction,
    pub session_token: String,
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

            let role = match data.role.as_str() {
                "admin" => crate::models::auth::UserRole::Admin,
                "technician" => crate::models::auth::UserRole::Technician,
                "supervisor" => crate::models::auth::UserRole::Supervisor,
                "viewer" => crate::models::auth::UserRole::Viewer,
                _ => {
                    return Err(crate::commands::AppError::Validation(format!(
                        "Invalid role: {}",
                        data.role
                    )))
                }
            };

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

            Ok(ApiResponse::success(UserResponse::Created(user)))
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
                }
                None => {
                    warn!("User {} not found", id);
                    ApiResponse::success(UserResponse::NotFound)
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
                Some(r) => Some(match r.as_str() {
                    "admin" => crate::models::auth::UserRole::Admin,
                    "technician" => crate::models::auth::UserRole::Technician,
                    "supervisor" => crate::models::auth::UserRole::Supervisor,
                    "viewer" => crate::models::auth::UserRole::Viewer,
                    _ => {
                        return Err(crate::commands::AppError::Validation(format!(
                            "Invalid role: {}",
                            r
                        )))
                    }
                }),
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

            Ok(ApiResponse::success(UserResponse::Updated(user)))
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
            if current_user.user_id == id {
                return Err(crate::commands::AppError::Validation(
                    "You cannot delete your own account".to_string(),
                ));
            }

            auth_service.delete_user(&id).map_err(|e| {
                error!("Failed to delete user {}: {}", id, e);
                AppError::Database(format!("User deletion failed: {}", e))
            })?;
            info!("User {} deleted successfully", id);
            Ok(ApiResponse::success(UserResponse::Deleted))
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
            Ok(ApiResponse::success(UserResponse::List(UserListResponse {
                data: users,
            })))
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
            Ok(ApiResponse::success(UserResponse::PasswordChanged))
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
            if id == current_user.user_id {
                return Err(crate::commands::AppError::Validation(
                    "You cannot change your own role".to_string(),
                ));
            }

            // Use UserService to change role
            let user_service = crate::services::UserService::new(state.repositories.user.clone());
            user_service.change_role(&id, new_role, &current_user.user_id).await?;

            info!("Role changed successfully for user {}", id);
            Ok(ApiResponse::success(UserResponse::RoleChanged))
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
            if id == current_user.user_id {
                return Err(crate::commands::AppError::Validation(
                    "You cannot ban yourself".to_string(),
                ));
            }

            // Use UserService to ban user
            let user_service = crate::services::UserService::new(state.repositories.user.clone());
            user_service.ban_user(&id, &current_user.user_id).await?;

            info!("User {} banned successfully", id);
            Ok(ApiResponse::success(UserResponse::UserBanned))
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
            Ok(ApiResponse::success(UserResponse::UserUnbanned))
        }
    }
}

/// Bootstrap first admin user - only works if no admin exists
#[tauri::command]
#[instrument(skip(state))]
pub async fn bootstrap_first_admin(
    request: BootstrapFirstAdminRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<String>, AppError> {
    use rusqlite::params;
    let user_id = request.user_id;
    info!("Attempting to bootstrap first admin for user: {}", user_id);

    let conn = state.db.get_connection().map_err(|e| {
        error!("Failed to get database connection: {}", e);
        AppError::Database("Database connection failed".to_string())
    })?;

    // Check if any admin exists
    let admin_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM users WHERE role = 'admin'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| {
            error!("Failed to check admin count: {}", e);
            AppError::Database("Failed to check existing admins".to_string())
        })?;

    if admin_count > 0 {
        warn!("Bootstrap attempt failed: admin already exists");
        return Err(AppError::Validation(
            "An admin user already exists. Use the admin panel to manage roles.".to_string(),
        ));
    }

    // Find user by id
    let user_email: String = conn
        .query_row(
            "SELECT email FROM users WHERE id = ?",
            params![user_id],
            |row| row.get(0),
        )
        .map_err(|_| {
            error!("User not found for bootstrap: {}", user_id);
            AppError::NotFound("User not found".to_string())
        })?;

    // Update to admin
    conn.execute(
        "UPDATE users SET role = 'admin', updated_at = ? WHERE id = ?",
        params![chrono::Utc::now().timestamp_millis(), user_id],
    )
    .map_err(|e| {
        error!("Failed to update user role: {}", e);
        AppError::Database("Failed to update user role".to_string())
    })?;

    // Audit log
    conn.execute(
        "INSERT INTO audit_logs (user_id, user_email, action, entity_type, entity_id, old_values, new_values)
         VALUES (?, ?, 'bootstrap_admin', 'user', ?, 'viewer', 'admin')",
        params![user_id, user_email, user_id],
    ).map_err(|e| {
        error!("Failed to create audit log: {}", e);
        AppError::Database("Failed to create audit log".to_string())
    })?;

    info!("Successfully bootstrapped admin for user: {}", user_email);
    Ok(ApiResponse::success(format!(
        "User {} has been promoted to admin. Please log in again to apply new permissions.",
        user_email
    )))
}

/// Check if any admin users exist in the system
#[tauri::command]
#[instrument(skip(state))]
pub async fn has_admins(state: AppState<'_>) -> Result<ApiResponse<bool>, AppError> {
    debug!("Checking if admin users exist");

    let conn = state.db.get_connection().map_err(|e| {
        error!("Failed to get database connection: {}", e);
        AppError::Database("Database connection failed".to_string())
    })?;

    // Check if any admin exists
    let admin_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM users WHERE role = 'admin'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| {
            error!("Failed to check admin count: {}", e);
            AppError::Database("Failed to check existing admins".to_string())
        })?;

    debug!("Admin check completed: {} admins found", admin_count);
    Ok(ApiResponse::success(admin_count > 0))
}
