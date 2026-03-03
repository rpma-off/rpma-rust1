use std::sync::Arc;

use crate::domains::users::application::{UserAction, UserListResponse, UserResponse};
use crate::domains::users::domain::UserAccessPolicy;
use crate::domains::users::infrastructure::user::UserService;
use crate::shared::contracts::auth::{UserRole, UserSession};
use crate::shared::contracts::user_account::UserAccountManager;
use crate::shared::ipc::errors::AppError;
use crate::shared::ipc::CommandContext;

pub struct UsersServices {
    pub account_manager: Arc<dyn UserAccountManager>,
    pub user_service: Arc<UserService>,
}

#[derive(Debug)]
pub enum UsersCommand {
    Crud(UserAction),
    BootstrapFirstAdmin {
        user_id: String,
        session_token: String,
    },
    HasAdmins,
}

pub enum UsersDomainResponse {
    Crud(UserResponse),
    BootstrapMessage(String),
    HasAdmins(bool),
}

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

    pub async fn execute(
        &self,
        command: UsersCommand,
        ctx: &CommandContext,
        services: &UsersServices,
    ) -> Result<UsersDomainResponse, AppError> {
        match command {
            UsersCommand::Crud(action) => {
                self.enforce_action_permissions(&ctx.session, &action)?;
                let response = match action {
                    UserAction::Create { data } => {
                        let role = self.parse_role(&data.role)?;
                        let user = services
                            .account_manager
                            .create_account(
                                &data.email,
                                &data.email,
                                &data.first_name,
                                &data.last_name,
                                role,
                                &data.password,
                            )
                            .map_err(|e| {
                                AppError::Database(format!("User creation failed: {}", e))
                            })?;
                        UserResponse::Created(user)
                    }
                    UserAction::Get { id } => {
                        let user = services.account_manager.get_user(&id).map_err(|e| {
                            AppError::Database(format!("User retrieval failed: {}", e))
                        })?;
                        match user {
                            Some(user) => UserResponse::Found(user),
                            None => UserResponse::NotFound,
                        }
                    }
                    UserAction::Update { id, data } => {
                        let role = match data.role.as_ref() {
                            Some(r) => Some(self.parse_role(r)?),
                            None => None,
                        };

                        let user = services
                            .account_manager
                            .update_user(
                                &id,
                                data.email.as_deref(),
                                data.first_name.as_deref(),
                                data.last_name.as_deref(),
                                role,
                                data.is_active,
                            )
                            .map_err(|e| {
                                AppError::Database(format!("User update failed: {}", e))
                            })?;
                        UserResponse::Updated(user)
                    }
                    UserAction::Delete { id } => {
                        self.ensure_not_self_action(
                            &ctx.session.user_id,
                            &id,
                            "delete your own account",
                        )?;
                        services.account_manager.delete_user(&id).map_err(|e| {
                            AppError::Database(format!("User deletion failed: {}", e))
                        })?;
                        UserResponse::Deleted
                    }
                    UserAction::List { limit, offset } => {
                        let users = services
                            .account_manager
                            .list_users(Some(limit.unwrap_or(50)), Some(offset.unwrap_or(0)))
                            .map_err(|e| {
                                AppError::Database(format!("User listing failed: {}", e))
                            })?;
                        UserResponse::List(UserListResponse { data: users })
                    }
                    UserAction::ChangePassword { id, new_password } => {
                        services
                            .account_manager
                            .change_password(&id, &new_password)
                            .map_err(|e| {
                                AppError::Database(format!("Password change failed: {}", e))
                            })?;
                        UserResponse::PasswordChanged
                    }
                    UserAction::ChangeRole { id, new_role } => {
                        self.ensure_not_self_action(
                            &ctx.session.user_id,
                            &id,
                            "change your own role",
                        )?;
                        services
                            .user_service
                            .change_role(&id, new_role, &ctx.session.user_id)
                            .await?;
                        UserResponse::RoleChanged
                    }
                    UserAction::Ban { id } => {
                        self.ensure_not_self_action(&ctx.session.user_id, &id, "ban yourself")?;
                        services
                            .user_service
                            .ban_user(&id, &ctx.session.user_id)
                            .await?;
                        UserResponse::UserBanned
                    }
                    UserAction::Unban { id } => {
                        services
                            .user_service
                            .unban_user(&id, &ctx.session.user_id)
                            .await?;
                        UserResponse::UserUnbanned
                    }
                };

                Ok(UsersDomainResponse::Crud(response))
            }
            UsersCommand::BootstrapFirstAdmin {
                user_id,
                session_token,
            } => {
                self.validate_bootstrap_request(&user_id, &session_token, &ctx.session.user_id)?;
                let message = services
                    .user_service
                    .bootstrap_first_admin(&user_id)
                    .await?;
                Ok(UsersDomainResponse::BootstrapMessage(message))
            }
            UsersCommand::HasAdmins => {
                let has_admin = services.user_service.has_admins().await?;
                Ok(UsersDomainResponse::HasAdmins(has_admin))
            }
        }
    }
}
