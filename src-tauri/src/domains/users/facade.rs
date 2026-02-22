use crate::domains::users::application::UserAction;
use crate::domains::users::domain::UserAccessPolicy;
use crate::domains::auth::domain::models::auth::{UserRole, UserSession};
use crate::shared::ipc::errors::AppError;

#[derive(Debug, Default, Clone)]
pub struct UsersFacade;

impl UsersFacade {
    pub fn new() -> Self {
        Self
    }

    pub fn required_permission(&self, action: &UserAction) -> &'static str {
        UserAccessPolicy::required_permission(action)
    }

    pub fn target_user_id<'a>(&self, action: &'a UserAction) -> Option<&'a str> {
        UserAccessPolicy::target_user_id(action)
    }

    pub fn enforce_action_permissions(
        &self,
        current_user: &UserSession,
        action: &UserAction,
    ) -> Result<(), AppError> {
        let permission = self.required_permission(action);
        let target_user_id = self.target_user_id(action);

        let can_perform =
            crate::shared::auth_middleware::AuthMiddleware::can_perform_user_operation(
                &current_user.role,
                permission,
                target_user_id,
                &current_user.user_id,
            );
        if !can_perform {
            return Err(AppError::Authorization(format!(
                "Insufficient permissions to {} users",
                permission
            )));
        }

        UserAccessPolicy::ensure_role_specific_rules(current_user, action)
    }

    pub fn parse_role(&self, role: &str) -> Result<UserRole, AppError> {
        match role {
            "admin" => Ok(UserRole::Admin),
            "technician" => Ok(UserRole::Technician),
            "supervisor" => Ok(UserRole::Supervisor),
            "viewer" => Ok(UserRole::Viewer),
            _ => Err(AppError::Validation(format!("Invalid role: {}", role))),
        }
    }

    pub fn ensure_not_self_action(
        &self,
        current_user_id: &str,
        target_user_id: &str,
        action: &str,
    ) -> Result<(), AppError> {
        if current_user_id == target_user_id {
            Err(AppError::Validation(format!("You cannot {}", action)))
        } else {
            Ok(())
        }
    }

    pub fn validate_bootstrap_request(
        &self,
        user_id: &str,
        session_token: &str,
        authenticated_user_id: &str,
    ) -> Result<(), AppError> {
        if user_id.trim().is_empty() {
            return Err(AppError::Validation(
                "user_id is required for bootstrap".to_string(),
            ));
        }
        if session_token.trim().is_empty() {
            return Err(AppError::Authentication(
                "Session token is required".to_string(),
            ));
        }
        if authenticated_user_id != user_id {
            return Err(AppError::Authorization(
                "You can only bootstrap your own account".to_string(),
            ));
        }
        Ok(())
    }
}
