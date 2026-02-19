use crate::domains::users::application::UserAction;
use crate::models::auth::{UserRole, UserSession};
use crate::shared::ipc::errors::AppError;

#[derive(Debug, Clone, Copy, Default)]
pub struct UserAccessPolicy;

impl UserAccessPolicy {
    pub fn required_permission(action: &UserAction) -> &'static str {
        match action {
            UserAction::Create { .. } => "create",
            UserAction::Update { .. }
            | UserAction::ChangePassword { .. }
            | UserAction::ChangeRole { .. }
            | UserAction::Ban { .. }
            | UserAction::Unban { .. } => "update",
            UserAction::Delete { .. } => "delete",
            UserAction::Get { .. } | UserAction::List { .. } => "read",
        }
    }

    pub fn target_user_id<'a>(action: &'a UserAction) -> Option<&'a str> {
        match action {
            UserAction::Get { id }
            | UserAction::Update { id, .. }
            | UserAction::Delete { id }
            | UserAction::ChangePassword { id, .. }
            | UserAction::ChangeRole { id, .. }
            | UserAction::Ban { id }
            | UserAction::Unban { id } => Some(id.as_str()),
            UserAction::Create { .. } | UserAction::List { .. } => None,
        }
    }

    pub fn ensure_role_specific_rules(
        current_user: &UserSession,
        action: &UserAction,
    ) -> Result<(), AppError> {
        match action {
            UserAction::Create { .. } | UserAction::List { .. } => {
                if matches!(current_user.role, UserRole::Admin | UserRole::Supervisor) {
                    Ok(())
                } else {
                    Err(AppError::Authorization(
                        "Only admins and supervisors can perform this operation".to_string(),
                    ))
                }
            }
            UserAction::Delete { .. }
            | UserAction::ChangeRole { .. }
            | UserAction::Ban { .. }
            | UserAction::Unban { .. } => {
                if matches!(current_user.role, UserRole::Admin) {
                    Ok(())
                } else {
                    Err(AppError::Authorization(
                        "Only administrators can perform this operation".to_string(),
                    ))
                }
            }
            UserAction::Get { id }
            | UserAction::Update { id, .. }
            | UserAction::ChangePassword { id, .. } => {
                let privileged =
                    matches!(current_user.role, UserRole::Admin | UserRole::Supervisor);
                if privileged || current_user.user_id == *id {
                    Ok(())
                } else {
                    Err(AppError::Authorization(
                        "You can only manage your own profile".to_string(),
                    ))
                }
            }
        }
    }
}
