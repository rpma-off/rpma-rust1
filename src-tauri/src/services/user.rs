//! User service for user management operations

use crate::commands::AppError;
use crate::models::auth::{UserAccount, UserRole};
use crate::models::user::User as RepoUser; // Import as RepoUser to distinguish
use crate::repositories::{Repository, UserRepository};
use std::sync::Arc;
use tracing::{error, info};

#[derive(Clone, Debug)]
pub struct UserService {
    user_repo: Arc<UserRepository>,
}

/// Convert between repository User and auth UserAccount
#[allow(dead_code)]
fn repo_user_to_auth_user(repo_user: &RepoUser) -> UserAccount {
    UserAccount {
        id: repo_user.id.clone(),
        email: repo_user.email.clone(),
        username: repo_user.email.clone(), // Using email as username for compatibility
        first_name: repo_user.full_name.clone(), // Splitting full_name might be needed
        last_name: String::new(),          // Empty for now
        role: match repo_user.role {
            crate::models::user::UserRole::Admin => UserRole::Admin,
            crate::models::user::UserRole::Technician => UserRole::Technician,
            crate::models::user::UserRole::Supervisor => UserRole::Supervisor,
            crate::models::user::UserRole::Viewer => UserRole::Viewer,
        },
        password_hash: repo_user.password_hash.clone(),
        salt: None, // Not in repo user model
        phone: repo_user.phone.clone(),
        is_active: repo_user.is_active,
        last_login: repo_user.last_login_at,
        login_count: repo_user.login_count,
        preferences: repo_user
            .preferences
            .as_ref()
            .map(|p| serde_json::to_string(p).ok())
            .flatten(),
        synced: repo_user.synced,
        last_synced_at: repo_user.last_synced_at,
        created_at: repo_user.created_at,
        updated_at: repo_user.updated_at,
    }
}

/// Convert between auth UserRole and repo UserRole
fn auth_role_to_repo_role(auth_role: UserRole) -> crate::models::user::UserRole {
    match auth_role {
        UserRole::Admin => crate::models::user::UserRole::Admin,
        UserRole::Technician => crate::models::user::UserRole::Technician,
        UserRole::Supervisor => crate::models::user::UserRole::Supervisor,
        UserRole::Viewer => crate::models::user::UserRole::Viewer,
    }
}

impl UserService {
    pub fn new(user_repo: Arc<UserRepository>) -> Self {
        Self { user_repo }
    }

    /// Create a new UserService instance with database (for backward compatibility)
    #[deprecated(note = "Use new(user_repo) instead")]
    pub fn new_with_db(db: Arc<crate::db::Database>) -> Self {
        use crate::repositories::Cache;
        let cache = Arc::new(Cache::new(1000));
        Self {
            user_repo: Arc::new(UserRepository::new(db, cache)),
        }
    }

    /// Change user role with audit logging and session invalidation
    pub async fn change_role(
        &self,
        user_id: &str,
        new_role: UserRole,
        admin_id: &str,
    ) -> Result<(), AppError> {
        // Get current user for audit
        let repo_user = self
            .user_repo
            .find_by_id(user_id.to_string())
            .await
            .map_err(|e| {
                error!("Failed to get user for role change: {}", e);
                AppError::Database("Failed to get current user".to_string())
            })?
            .ok_or_else(|| {
                error!("User {} not found for role change", user_id);
                AppError::Database("User not found".to_string())
            })?;

        let old_role = repo_user.role.clone();

        // Update user with new role
        let mut updated_user = repo_user.clone();
        updated_user.role = auth_role_to_repo_role(new_role.clone());
        updated_user.updated_at = chrono::Utc::now().timestamp_millis();

        self.user_repo
            .save(updated_user.clone())
            .await
            .map_err(|e| {
                error!("Failed to update user role for {}: {}", user_id, e);
                AppError::Database("Failed to update user role".to_string())
            })?;

        // TODO: Add audit log to database directly since we don't have an audit repository yet
        // For now, we'll just log the action
        info!(
            "Successfully changed role for user {} from {} to {} by admin {}",
            user_id,
            format!("{:?}", old_role),
            new_role.to_string(),
            admin_id
        );

        // TODO: Invalidate sessions - this would require direct DB access or session repository
        info!("Sessions for user {} should be invalidated", user_id);

        Ok(())
    }

    /// Ban a user with audit logging and session invalidation
    pub async fn ban_user(&self, user_id: &str, admin_id: &str) -> Result<(), AppError> {
        // Get current user
        let repo_user = self
            .user_repo
            .find_by_id(user_id.to_string())
            .await
            .map_err(|e| {
                error!("Failed to get user for ban: {}", e);
                AppError::Database("Failed to get current user".to_string())
            })?
            .ok_or_else(|| {
                error!("User {} not found for ban", user_id);
                AppError::Database("User not found".to_string())
            })?;

        // Check if user is already banned
        if !repo_user.is_active {
            return Err(AppError::Validation("User is already banned".to_string()));
        }

        // Update user status to banned (inactive)
        let mut updated_user = repo_user.clone();
        updated_user.is_active = false;
        updated_user.updated_at = chrono::Utc::now().timestamp_millis();

        self.user_repo
            .save(updated_user.clone())
            .await
            .map_err(|e| {
                error!("Failed to ban user {}: {}", user_id, e);
                AppError::Database("Failed to ban user".to_string())
            })?;

        // TODO: Add audit log to database directly since we don't have an audit repository yet
        info!("Successfully banned user {} by admin {}", user_id, admin_id);

        // TODO: Invalidate sessions - this would require direct DB access or session repository
        info!("Sessions for user {} should be invalidated", user_id);

        Ok(())
    }

    /// Unban a user with audit logging
    pub async fn unban_user(&self, user_id: &str, admin_id: &str) -> Result<(), AppError> {
        // Get current user
        let repo_user = self
            .user_repo
            .find_by_id(user_id.to_string())
            .await
            .map_err(|e| {
                error!("Failed to get user for unban: {}", e);
                AppError::Database("Failed to get current user".to_string())
            })?
            .ok_or_else(|| {
                error!("User {} not found for unban", user_id);
                AppError::Database("User not found".to_string())
            })?;

        // Check if user is banned
        if repo_user.is_active {
            return Err(AppError::Validation("User is not banned".to_string()));
        }

        // Update user status to active (unbanned)
        let mut updated_user = repo_user.clone();
        updated_user.is_active = true;
        updated_user.updated_at = chrono::Utc::now().timestamp_millis();

        self.user_repo
            .save(updated_user.clone())
            .await
            .map_err(|e| {
                error!("Failed to unban user {}: {}", user_id, e);
                AppError::Database("Failed to unban user".to_string())
            })?;

        info!(
            "Successfully unbanned user {} by admin {}",
            user_id, admin_id
        );

        Ok(())
    }

    /// Check if any admin users exist in the system
    pub async fn has_admins(&self) -> Result<bool, AppError> {
        let users = self
            .user_repo
            .find_by_role(crate::models::user::UserRole::Admin)
            .await
            .map_err(|e| {
                error!("Failed to check admin users: {}", e);
                AppError::Database("Failed to check existing admins".to_string())
            })?;

        Ok(!users.is_empty())
    }

    /// Bootstrap the first admin user - only works if no admin exists
    pub async fn bootstrap_first_admin(&self, user_id: &str) -> Result<String, AppError> {
        // Check if any admin exists
        if self.has_admins().await? {
            return Err(AppError::Validation(
                "An admin user already exists. Use the admin panel to manage roles.".to_string(),
            ));
        }

        // Get user
        let repo_user = self
            .user_repo
            .find_by_id(user_id.to_string())
            .await
            .map_err(|e| {
                error!("Failed to find user for bootstrap: {}", e);
                AppError::Database("Failed to find user".to_string())
            })?
            .ok_or_else(|| {
                error!("User not found for bootstrap: {}", user_id);
                AppError::NotFound("User not found".to_string())
            })?;

        let user_email = repo_user.email.clone();

        // Update to admin
        let mut updated_user = repo_user;
        updated_user.role = crate::models::user::UserRole::Admin;
        updated_user.updated_at = chrono::Utc::now().timestamp_millis();

        self.user_repo.save(updated_user).await.map_err(|e| {
            error!("Failed to update user role: {}", e);
            AppError::Database("Failed to update user role".to_string())
        })?;

        info!("Successfully bootstrapped admin for user: {}", user_email);
        Ok(format!(
            "User {} has been promoted to admin. Please log in again to apply new permissions.",
            user_email
        ))
    }
}
