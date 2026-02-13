//! Authentication middleware for consistent IPC command authentication
//!
//! This module provides centralized authentication and authorization
//! functionality for all Tauri IPC commands to ensure consistent
//! security patterns across the application.

use crate::commands::{AppError, AppResult, AppState};
use crate::models::auth::{UserRole, UserSession};
use sha2::{Digest, Sha256};
use tracing::{debug, instrument, warn};

/// Centralized authentication middleware
pub struct AuthMiddleware;

impl AuthMiddleware {
    /// Authenticate a session token and optionally verify role permissions
    ///
    /// # Arguments
    /// * `session_token` - The session token to validate
    /// * `state` - Application state containing services
    /// * `required_role` - Optional minimum role required for the operation
    ///
    /// # Returns
    /// * `Ok(UserSession)` - Authenticated user session
    /// * `Err(AppError)` - Authentication or authorization error
    #[instrument(skip(state), fields(token_hash = %format!("{:x}", Sha256::digest(session_token.as_bytes()))))]
    pub async fn authenticate(
        session_token: &str,
        state: &AppState<'_>,
        required_role: Option<UserRole>,
    ) -> AppResult<UserSession> {
        if session_token.is_empty() {
            return Err(AppError::Authentication(
                "Session token is required".to_string(),
            ));
        }

        debug!("Attempting to authenticate session token");

        // Use consistent authentication pattern - clone to avoid lock issues
        let auth_service = state.auth_service.clone();

        let user = auth_service.validate_session(session_token).map_err(|e| {
            warn!("Session validation failed: {}", e);
            AppError::Authentication(format!("Session validation failed: {}", e))
        })?;

        // Centralized authorization check
        if let Some(required) = required_role {
            if !Self::has_permission(&user.role, &required) {
                warn!(
                    "Authorization failed for user {} with role {:?}, required role: {:?}",
                    user.user_id, user.role, required
                );
                return Err(AppError::Authorization(
                    "Insufficient permissions for this operation".to_string(),
                ));
            }
        }

        debug!(
            "Successfully authenticated user {} with role {:?}",
            user.user_id, user.role
        );
        Ok(user)
    }

    /// Check if a user role has permission for the required role
    ///
    /// # Arguments
    /// * `user_role` - The user's current role
    /// * `required_role` - The minimum role required
    ///
    /// # Returns
    /// * `bool` - True if user has permission, false otherwise
    pub fn has_permission(user_role: &UserRole, required_role: &UserRole) -> bool {
        use UserRole::*;

        match (user_role, required_role) {
            // Admin has access to everything
            (Admin, _) => true,

            // Supervisor can access supervisor and viewer operations
            (Supervisor, Admin) => false,
            (Supervisor, _) => true,

            // Technician can access technician and viewer operations
            (Technician, Admin | Supervisor) => false,
            (Technician, _) => true,

            // Viewer can only access viewer operations
            (Viewer, Viewer) => true,
            (Viewer, _) => false,
        }
    }
}

impl AuthMiddleware {
    /// Check if user can perform task operations
    ///
    /// # Arguments
    /// * `user_role` - The user's role
    /// * `operation` - The type of operation ('create', 'read', 'update', 'delete', 'assign')
    ///
    /// # Returns
    /// * `bool` - True if user can perform the operation
    pub fn can_perform_task_operation(user_role: &UserRole, operation: &str) -> bool {
        use UserRole::*;

        match (user_role, operation) {
            // Admin can do everything
            (Admin, _) => true,

            // Supervisor can create, read, update, assign but not delete
            (Supervisor, op) if ["create", "read", "update", "assign"].contains(&op) => true,
            (Supervisor, _) => false,

            // Technician can create, read, update but not delete or assign
            (Technician, op) if ["create", "read", "update"].contains(&op) => true,
            (Technician, _) => false,

            // Viewer can only read
            (Viewer, "read") => true,
            (Viewer, _) => false,
        }
    }

    /// Check if user can perform client operations
    ///
    /// # Arguments
    /// * `user_role` - The user's role
    /// * `operation` - The type of operation ('create', 'read', 'update', 'delete')
    ///
    /// # Returns
    /// * `bool` - True if user can perform the operation
    pub fn can_perform_client_operation(user_role: &UserRole, operation: &str) -> bool {
        // Same permissions as tasks for now
        Self::can_perform_task_operation(user_role, operation)
    }

    /// Check if user can perform user management operations
    ///
    /// # Arguments
    /// * `user_role` - The user's role
    /// * `operation` - The type of operation
    /// * `target_user_id` - The ID of the user being operated on (optional)
    ///
    /// # Returns
    /// * `bool` - True if user can perform the operation
    pub fn can_perform_user_operation(
        user_role: &UserRole,
        operation: &str,
        target_user_id: Option<&str>,
        current_user_id: &str,
    ) -> bool {
        use UserRole::*;

        match (user_role, operation) {
            // Admin can do everything
            (Admin, _) => true,

            // Supervisor can read and update but not create/delete users
            (Supervisor, op) if ["read", "update"].contains(&op) => true,
            (Supervisor, _) => false,

            // Users can always read/update their own profile
            (_role, op)
                if ["read", "update"].contains(&op) && target_user_id == Some(current_user_id) =>
            {
                true
            }

            // Technicians and viewers can only read their own profile
            (Technician | Viewer, "read") if target_user_id == Some(current_user_id) => true,
            (Technician | Viewer, _) => false,
        }
    }
}

/// Macro for easy authentication in IPC commands
#[macro_export]
macro_rules! authenticate {
    ($session_token:expr, $state:expr) => {
        $crate::commands::auth_middleware::AuthMiddleware::authenticate(
            $session_token,
            $state,
            None,
        )
        .await?
    };
    ($session_token:expr, $state:expr, $required_role:expr) => {
        $crate::commands::auth_middleware::AuthMiddleware::authenticate(
            $session_token,
            $state,
            Some($required_role),
        )
        .await?
    };
}

/// Macro for authenticated IPC commands with consistent error handling
#[macro_export]
macro_rules! authenticated_command {
    (
        $session_token:expr,
        $state:expr,
        $required_permission:expr,
        $command_body:expr
    ) => {{
        let current_user = authenticate!($session_token, $state);

        // Check specific permission if provided
        if let Some(permission) = $required_permission {
            if !$crate::commands::auth_middleware::AuthMiddleware::can_perform_task_operation(
                &current_user.role,
                permission,
            ) {
                return Err($crate::commands::AppError::Authorization(format!(
                    "Insufficient permissions to {} tasks",
                    permission
                )));
            }
        }

        $command_body(current_user, $state)
    }};
}

/// Macro for checking task operation permissions
#[macro_export]
macro_rules! check_task_permission {
    ($user_role:expr, $operation:expr) => {
        if !$crate::commands::auth_middleware::AuthMiddleware::can_perform_task_operation(
            $user_role, $operation,
        ) {
            return Err($crate::commands::AppError::Authorization(format!(
                "Insufficient permissions to {} tasks",
                $operation
            )));
        }
    };
}

/// Macro for checking client operation permissions
#[macro_export]
macro_rules! check_client_permission {
    ($user_role:expr, $operation:expr) => {
        if !$crate::commands::auth_middleware::AuthMiddleware::can_perform_client_operation(
            $user_role, $operation,
        ) {
            return Err($crate::commands::AppError::Authorization(format!(
                "Insufficient permissions to {} clients",
                $operation
            )));
        }
    };
}

/// Macro for checking user operation permissions
#[macro_export]
macro_rules! check_user_permission {
    ($user_role:expr, $operation:expr, $target_user_id:expr, $current_user_id:expr) => {
        if !$crate::commands::auth_middleware::AuthMiddleware::can_perform_user_operation(
            $user_role,
            $operation,
            $target_user_id,
            $current_user_id,
        ) {
            return Err($crate::commands::AppError::Authorization(format!(
                "Insufficient permissions to {} user",
                $operation
            )));
        }
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::auth::UserRole::*;

    #[test]
    fn test_has_permission() {
        // Admin has all permissions
        assert!(AuthMiddleware::has_permission(&Admin, &Admin));
        assert!(AuthMiddleware::has_permission(&Admin, &Supervisor));
        assert!(AuthMiddleware::has_permission(&Admin, &Technician));
        assert!(AuthMiddleware::has_permission(&Admin, &Viewer));

        // Supervisor permissions
        assert!(!AuthMiddleware::has_permission(&Supervisor, &Admin));
        assert!(AuthMiddleware::has_permission(&Supervisor, &Supervisor));
        assert!(AuthMiddleware::has_permission(&Supervisor, &Technician));
        assert!(AuthMiddleware::has_permission(&Supervisor, &Viewer));

        // Technician permissions
        assert!(!AuthMiddleware::has_permission(&Technician, &Admin));
        assert!(!AuthMiddleware::has_permission(&Technician, &Supervisor));
        assert!(AuthMiddleware::has_permission(&Technician, &Technician));
        assert!(AuthMiddleware::has_permission(&Technician, &Viewer));

        // Viewer permissions
        assert!(!AuthMiddleware::has_permission(&Viewer, &Admin));
        assert!(!AuthMiddleware::has_permission(&Viewer, &Supervisor));
        assert!(!AuthMiddleware::has_permission(&Viewer, &Technician));
        assert!(AuthMiddleware::has_permission(&Viewer, &Viewer));
    }

    #[test]
    fn test_task_operations() {
        assert!(AuthMiddleware::can_perform_task_operation(&Admin, "create"));
        assert!(AuthMiddleware::can_perform_task_operation(&Admin, "read"));
        assert!(AuthMiddleware::can_perform_task_operation(&Admin, "update"));
        assert!(AuthMiddleware::can_perform_task_operation(&Admin, "delete"));

        assert!(AuthMiddleware::can_perform_task_operation(
            &Supervisor,
            "create"
        ));
        assert!(AuthMiddleware::can_perform_task_operation(
            &Supervisor,
            "read"
        ));
        assert!(AuthMiddleware::can_perform_task_operation(
            &Supervisor,
            "update"
        ));
        assert!(!AuthMiddleware::can_perform_task_operation(
            &Supervisor,
            "delete"
        ));

        assert!(AuthMiddleware::can_perform_task_operation(
            &Technician,
            "create"
        ));
        assert!(AuthMiddleware::can_perform_task_operation(
            &Technician,
            "read"
        ));
        assert!(AuthMiddleware::can_perform_task_operation(
            &Technician,
            "update"
        ));
        assert!(!AuthMiddleware::can_perform_task_operation(
            &Technician,
            "delete"
        ));

        assert!(!AuthMiddleware::can_perform_task_operation(
            &Viewer, "create"
        ));
        assert!(AuthMiddleware::can_perform_task_operation(&Viewer, "read"));
        assert!(!AuthMiddleware::can_perform_task_operation(
            &Viewer, "update"
        ));
        assert!(!AuthMiddleware::can_perform_task_operation(
            &Viewer, "delete"
        ));
    }

    #[test]
    fn test_user_operations() {
        let current_user_id = "user123";
        let target_user_id = "user123";
        let other_user_id = "user456";

        // Admin can do everything
        assert!(AuthMiddleware::can_perform_user_operation(
            &Admin,
            "create",
            None,
            current_user_id
        ));
        assert!(AuthMiddleware::can_perform_user_operation(
            &Admin,
            "read",
            Some(other_user_id),
            current_user_id
        ));
        assert!(AuthMiddleware::can_perform_user_operation(
            &Admin,
            "update",
            Some(other_user_id),
            current_user_id
        ));
        assert!(AuthMiddleware::can_perform_user_operation(
            &Admin,
            "delete",
            Some(other_user_id),
            current_user_id
        ));

        // Users can always read/update their own profile
        assert!(AuthMiddleware::can_perform_user_operation(
            &Technician,
            "read",
            Some(target_user_id),
            current_user_id
        ));
        assert!(AuthMiddleware::can_perform_user_operation(
            &Technician,
            "update",
            Some(target_user_id),
            current_user_id
        ));
        assert!(!AuthMiddleware::can_perform_user_operation(
            &Technician,
            "read",
            Some(other_user_id),
            current_user_id
        ));
        assert!(!AuthMiddleware::can_perform_user_operation(
            &Technician,
            "update",
            Some(other_user_id),
            current_user_id
        ));
    }

    #[test]
    fn test_assign_operation_rbac() {
        // Admin can assign
        assert!(AuthMiddleware::can_perform_task_operation(&Admin, "assign"));
        // Supervisor can assign
        assert!(AuthMiddleware::can_perform_task_operation(
            &Supervisor,
            "assign"
        ));
        // Technician cannot assign
        assert!(!AuthMiddleware::can_perform_task_operation(
            &Technician,
            "assign"
        ));
        // Viewer cannot assign
        assert!(!AuthMiddleware::can_perform_task_operation(
            &Viewer, "assign"
        ));
    }
}
