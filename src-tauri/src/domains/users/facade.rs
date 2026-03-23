use std::sync::Arc;

// TODO: ADR Violation (ADR-001) - UsersFacade contains orchestration and business logic
// that should be in Application or Domain layers. It also violates dependency rules
// by importing from infrastructure.
// TODO: ADR Violation (ADR-008) - derive_username_from_email contains ad-hoc
// sanitization logic that should be moved to ValidationService.

use crate::domains::users::application::{UserListResponse, UserResponse};
use crate::domains::users::domain::{
    CreateUserRequest, UpdateUserRequest, UserAccessPolicy, UserAction,
};
use crate::domains::users::infrastructure::user::UserService;
use crate::shared::context::RequestContext;
use crate::shared::contracts::auth::{UserRole, UserSession};
use crate::shared::contracts::user_account::UserAccountManager;
use crate::shared::ipc::errors::AppError;
use crate::shared::services::event_bus::EventPublisher;

/// TODO: document
pub struct UsersServices {
    pub account_manager: Arc<dyn UserAccountManager>,
    pub user_service: Arc<UserService>,
    pub event_bus: Arc<dyn EventPublisher>,
}

/// TODO: document
#[derive(Debug)]
pub enum UsersCommand {
    Crud(UserAction),
    BootstrapFirstAdmin { user_id: String },
    HasAdmins,
}

/// TODO: document
pub enum UsersDomainResponse {
    Crud(UserResponse),
    BootstrapMessage(String),
    HasAdmins(bool),
}

/// TODO: document
#[derive(Debug, Default, Clone)]
pub struct UsersFacade;

impl UsersFacade {
    /// TODO: document
    pub fn new() -> Self {
        Self
    }

    /// TODO: document
    pub fn required_permission(&self, action: &UserAction) -> &'static str {
        UserAccessPolicy::required_permission(action)
    }

    /// TODO: document
    pub fn target_user_id<'a>(&self, action: &'a UserAction) -> Option<&'a str> {
        UserAccessPolicy::target_user_id(action)
    }

    /// TODO: document
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

    /// TODO: document
    pub fn parse_role(&self, role: &str) -> Result<UserRole, AppError> {
        role.parse::<UserRole>()
            .map_err(|_| AppError::Validation(format!("Invalid role: {}", role)))
    }

    /// TODO: document
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

    /// TODO: document
    pub fn validate_bootstrap_request(
        &self,
        user_id: &str,
        authenticated_user_id: &str,
    ) -> Result<(), AppError> {
        if user_id.trim().is_empty() {
            return Err(AppError::Validation(
                "user_id is required for bootstrap".to_string(),
            ));
        }
        if authenticated_user_id != user_id {
            return Err(AppError::Authorization(
                "You can only bootstrap your own account".to_string(),
            ));
        }
        Ok(())
    }

    /// TODO: document
    pub async fn execute(
        &self,
        command: UsersCommand,
        ctx: &RequestContext,
        services: &UsersServices,
    ) -> Result<UsersDomainResponse, AppError> {
        match command {
            UsersCommand::Crud(action) => {
                let current_user = ctx.auth.to_user_session();
                self.enforce_action_permissions(&current_user, &action)?;
                let response = match action {
                    UserAction::Create { data } => {
                        let role = self.parse_role(&data.role)?;
                        let username = Self::derive_username_from_email(&data.email);
                        let user = services
                            .account_manager
                            .create_account(
                                &data.email,
                                &username,
                                &data.first_name,
                                &data.last_name,
                                role,
                                &data.password,
                            )
                            .map_err(|e| {
                                AppError::Database(format!("User creation failed: {}", e))
                            })?;

                        let event =
                            crate::shared::services::event_bus::event_factory::user_created_with_ctx(
                                user.id.clone(),
                                user.email.clone(),
                                user.role.to_string(),
                                ctx.auth.user_id.clone(),
                                ctx.correlation_id.clone(),
                            );
                        if let Err(e) = services.event_bus.publish(event) {
                            tracing::warn!("Failed to publish UserCreated event: {}", e);
                        }

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
                            &ctx.auth.user_id,
                            &id,
                            "delete your own account",
                        )?;
                        services.account_manager.delete_user(&id).map_err(|e| {
                            AppError::Database(format!("User deletion failed: {}", e))
                        })?;
                        UserResponse::Deleted
                    }
                    UserAction::List {
                        limit,
                        offset,
                        search,
                        role_filter,
                    } => {
                        let default_limit = crate::shared::constants::DEFAULT_USER_LIST_SIZE as i32;
                        let users = if search.is_some() || role_filter.is_some() {
                            services
                                .account_manager
                                .search_users(
                                    search.as_deref(),
                                    role_filter.as_deref(),
                                    limit.unwrap_or(default_limit),
                                    offset.unwrap_or(0),
                                )
                                .map_err(|e| {
                                    AppError::Database(format!("User search failed: {}", e))
                                })?
                        } else {
                            services
                                .account_manager
                                .list_users(
                                    Some(limit.unwrap_or(default_limit)),
                                    Some(offset.unwrap_or(0)),
                                )
                                .map_err(|e| {
                                    AppError::Database(format!("User listing failed: {}", e))
                                })?
                        };
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
                            &ctx.auth.user_id,
                            &id,
                            "change your own role",
                        )?;
                        services
                            .user_service
                            .change_role(&id, new_role, &ctx.auth.user_id)
                            .await?;
                        UserResponse::RoleChanged
                    }
                    UserAction::Ban { id } => {
                        self.ensure_not_self_action(&ctx.auth.user_id, &id, "ban yourself")?;
                        services
                            .user_service
                            .ban_user(&id, &ctx.auth.user_id)
                            .await?;
                        UserResponse::UserBanned
                    }
                    UserAction::Unban { id } => {
                        services
                            .user_service
                            .unban_user(&id, &ctx.auth.user_id)
                            .await?;
                        UserResponse::UserUnbanned
                    }
                    UserAction::AdminResetPassword { id } => {
                        self.ensure_not_self_action(
                            &ctx.auth.user_id,
                            &id,
                            "reset your own password via admin reset",
                        )?;
                        let temp_password = UserService::generate_temp_password();
                        services
                            .account_manager
                            .change_password(&id, &temp_password)
                            .map_err(|e| {
                                AppError::Database(format!("Password reset failed: {}", e))
                            })?;
                        UserResponse::PasswordReset(temp_password)
                    }
                };

                Ok(UsersDomainResponse::Crud(response))
            }
            UsersCommand::BootstrapFirstAdmin { user_id } => {
                self.validate_bootstrap_request(&user_id, &ctx.auth.user_id)?;
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

    /// Derive a validator-compliant username from an email address.
    /// Takes the local-part (before `@`), replaces forbidden chars with `_`,
    /// trims leading/trailing `_`/`-`, and ensures the result is 3–50 chars.
    pub(crate) fn derive_username_from_email(email: &str) -> String {
        let local = email.split('@').next().unwrap_or(email);

        let sanitized: String = local
            .chars()
            .map(|c| {
                if c.is_alphanumeric() || c == '-' {
                    c
                } else {
                    '_'
                }
            })
            .collect();

        let trimmed = sanitized
            .trim_matches(|c: char| c == '_' || c == '-')
            .to_string();

        let result = if trimmed.len() < 3 {
            format!("u_{}", trimmed)
        } else {
            trimmed
        };

        result.chars().take(50).collect()
    }
}
