//! User service for user management operations
//!
//! // TODO: ADR Violation (ADR-001, ADR-002) - UserService is in the Infrastructure layer
//! // but contains orchestration and business logic. It should be moved to
//! // the application layer, and its business rules to the domain layer.

use crate::commands::AppError;
use crate::domains::auth::infrastructure::session_repository::SessionRepository;
use crate::domains::users::infrastructure::user_repository::UserRepository;
use crate::shared::contracts::auth::UserRole;
use crate::shared::repositories::base::RepoError;
use crate::shared::repositories::Repository;
use std::sync::Arc;
use tracing::{debug, error, info, warn};

/// TODO: document
#[derive(Clone, Debug)]
pub struct UserService {
    user_repo: Arc<UserRepository>,
    session_repo: Arc<SessionRepository>,
}

/// Convert between auth UserRole and repo UserRole
fn auth_role_to_repo_role(
    auth_role: UserRole,
) -> crate::domains::users::domain::models::user::UserRole {
    match auth_role {
        UserRole::Admin => crate::domains::users::domain::models::user::UserRole::Admin,
        UserRole::Technician => crate::domains::users::domain::models::user::UserRole::Technician,
        UserRole::Supervisor => crate::domains::users::domain::models::user::UserRole::Supervisor,
        UserRole::Viewer => crate::domains::users::domain::models::user::UserRole::Viewer,
    }
}

impl UserService {
    /// TODO: document
    pub fn new(user_repo: Arc<UserRepository>, session_repo: Arc<SessionRepository>) -> Self {
        Self {
            user_repo,
            session_repo,
        }
    }

    /// Create a new UserService instance with database (for backward compatibility)
    #[deprecated(note = "Use new(user_repo, session_repo) instead")]
    pub fn new_with_db(db: Arc<crate::db::Database>) -> Self {
        use crate::shared::repositories::Cache;
        let cache = Arc::new(Cache::new(1000));
        Self {
            user_repo: Arc::new(UserRepository::new(db.clone(), cache)),
            session_repo: Arc::new(SessionRepository::new(db)),
        }
    }

    /// Generate a temporary password for admin-initiated password resets.
    /// Returns a string suitable for one-time display to the admin.
    pub fn generate_temp_password() -> String {
        let raw = uuid::Uuid::new_v4().to_string().replace('-', "");
        format!("Tmp{}", &raw[..9])
    }

    /// Parse a role string into a UserRole enum.
    ///
    /// Centralises the role-string ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ enum conversion so that IPC command
    /// handlers do not contain this business logic.
    pub fn parse_user_role(role_str: &str) -> Result<UserRole, AppError> {
        role_str
            .parse::<UserRole>()
            .map_err(|_| AppError::Validation(format!("Invalid role: {}", role_str)))
    }

    /// Validate that the acting user is not performing an action on themselves
    /// when the action type forbids it (e.g. delete, ban, role-change).
    pub fn validate_not_self_action(
        current_user_id: &str,
        target_user_id: &str,
        action: &str,
    ) -> Result<(), AppError> {
        if current_user_id == target_user_id {
            Err(AppError::Validation(format!(
                "You cannot {} yourself",
                action
            )))
        } else {
            Ok(())
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

        // NOTE: Add audit log to database directly since we don't have an audit repository yet
        // For now, we'll just log the action
        info!(
            "Successfully changed role for user {} from {} to {} by admin {}",
            user_id,
            format!("{:?}", old_role),
            new_role.to_string(),
            admin_id
        );

        // Invalidate all active sessions for the user immediately.
        if let Err(e) = self.session_repo.delete_user_sessions(user_id) {
            warn!(
                "Failed to revoke sessions for user {} after role change: {}",
                user_id, e
            );
        }

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

        info!("Successfully banned user {} by admin {}", user_id, admin_id);

        // Invalidate all active sessions for the banned user immediately.
        if let Err(e) = self.session_repo.delete_user_sessions(user_id) {
            warn!(
                "Failed to revoke sessions for banned user {}: {}",
                user_id, e
            );
        }

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
        let admin_count = self.user_repo.count_admins().await.map_err(|e| {
            error!("Failed to count admin users: {}", e);
            AppError::Database("Failed to check existing admins".to_string())
        })?;

        debug!(admin_count, "Admin user count retrieved");
        Ok(admin_count > 0)
    }

    /// Bootstrap the first admin user - only works if no admin exists
    pub async fn bootstrap_first_admin(&self, user_id: &str) -> Result<String, AppError> {
        let user_email = self
            .user_repo
            .bootstrap_first_admin(user_id)
            .await
            .map_err(|e| {
                warn!("Bootstrap admin failed in repository: {}", e);
                match e {
                    RepoError::NotFound(msg) => AppError::NotFound(msg),
                    RepoError::Validation(msg) => AppError::Validation(msg),
                    RepoError::Conflict(msg) => AppError::Validation(msg),
                    RepoError::Database(msg) => AppError::Database(msg),
                    RepoError::Cache(msg) => AppError::Internal(msg),
                }
            })?;

        info!("Successfully bootstrapped admin");
        Ok(format!(
            "User {} has been promoted to admin. Please log in again to apply new permissions.",
            user_email
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domains::users::domain::models::user::{User as RepoUser, UserRole as RepoUserRole};
    use crate::shared::repositories::cache::Cache;
    use crate::test_utils::setup_test_db;
    use std::sync::Arc;

    fn build_user(id: &str, role: RepoUserRole, is_active: bool) -> RepoUser {
        RepoUser {
            id: id.to_string(),
            email: format!("{}@example.com", id),
            username: id.to_string(),
            password_hash: "hashed".to_string(),
            full_name: format!("User {}", id),
            role,
            phone: None,
            is_active,
            last_login_at: None,
            login_count: 0,
            preferences: None,
            synced: false,
            last_synced_at: None,
            created_at: chrono::Utc::now().timestamp_millis(),
            updated_at: chrono::Utc::now().timestamp_millis(),
        }
    }

    #[tokio::test]
    async fn test_bootstrap_first_admin_success() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = Arc::new(UserRepository::new(Arc::clone(&db), cache));
        let session_repo = Arc::new(SessionRepository::new(db.clone()));
        let service = UserService::new(repo.clone(), session_repo);

        let user = build_user("bootstrap-success", RepoUserRole::Viewer, true);
        repo.save(user.clone()).await.unwrap();

        let result = service.bootstrap_first_admin(&user.id).await;
        assert!(result.is_ok());

        let has_admins = service.has_admins().await.unwrap();
        assert!(has_admins);
    }

    #[tokio::test]
    async fn test_bootstrap_first_admin_admin_exists() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = Arc::new(UserRepository::new(Arc::clone(&db), cache));
        let session_repo = Arc::new(SessionRepository::new(db.clone()));
        let service = UserService::new(repo.clone(), session_repo);

        let admin = build_user("admin-user", RepoUserRole::Admin, true);
        repo.save(admin).await.unwrap();

        let user = build_user("bootstrap-conflict", RepoUserRole::Viewer, true);
        repo.save(user.clone()).await.unwrap();

        let err = service.bootstrap_first_admin(&user.id).await.unwrap_err();
        assert!(matches!(err, AppError::Validation(_)));
    }

    #[tokio::test]
    async fn test_bootstrap_first_admin_user_not_found() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = Arc::new(UserRepository::new(db.clone(), cache));
        let session_repo = Arc::new(SessionRepository::new(db));
        let service = UserService::new(repo, session_repo);

        let err = service
            .bootstrap_first_admin("missing-user")
            .await
            .unwrap_err();
        assert!(matches!(err, AppError::NotFound(_)));
    }

    #[tokio::test]
    async fn test_bootstrap_first_admin_inactive_user() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = Arc::new(UserRepository::new(Arc::clone(&db), cache));
        let session_repo = Arc::new(SessionRepository::new(db.clone()));
        let service = UserService::new(repo.clone(), session_repo);

        let user = build_user("inactive-user", RepoUserRole::Viewer, false);
        repo.save(user.clone()).await.unwrap();

        let err = service.bootstrap_first_admin(&user.id).await.unwrap_err();
        assert!(matches!(err, AppError::Validation(_)));
    }

    #[test]
    fn test_parse_user_role_valid() {
        assert!(matches!(
            UserService::parse_user_role("admin"),
            Ok(UserRole::Admin)
        ));
        assert!(matches!(
            UserService::parse_user_role("technician"),
            Ok(UserRole::Technician)
        ));
        assert!(matches!(
            UserService::parse_user_role("supervisor"),
            Ok(UserRole::Supervisor)
        ));
        assert!(matches!(
            UserService::parse_user_role("viewer"),
            Ok(UserRole::Viewer)
        ));
    }

    #[test]
    fn test_parse_user_role_invalid() {
        let err = UserService::parse_user_role("unknown").unwrap_err();
        assert!(matches!(err, AppError::Validation(_)));
    }

    #[test]
    fn test_validate_not_self_action_different_users() {
        assert!(UserService::validate_not_self_action("user1", "user2", "delete").is_ok());
    }

    #[test]
    fn test_validate_not_self_action_same_user() {
        let err =
            UserService::validate_not_self_action("user1", "user1", "ban yourself").unwrap_err();
        assert!(matches!(err, AppError::Validation(_)));
    }

    #[test]
    fn test_generate_temp_password_format() {
        let pwd = UserService::generate_temp_password();
        assert!(pwd.starts_with("Tmp"), "password should start with 'Tmp'");
        assert!(pwd.len() >= 12, "password should be at least 12 chars");
    }

    #[test]
    fn test_generate_temp_password_unique() {
        let a = UserService::generate_temp_password();
        let b = UserService::generate_temp_password();
        assert_ne!(a, b, "generated passwords should be unique");
    }

    #[tokio::test]
    async fn test_ban_user_revokes_sessions() {
        use crate::domains::auth::domain::models::auth::{UserRole as AuthRole, UserSession};
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = Arc::new(UserRepository::new(Arc::clone(&db), cache));
        let session_repo = Arc::new(SessionRepository::new(db.clone()));
        let service = UserService::new(repo.clone(), session_repo.clone());

        let user = build_user("ban-session-test", RepoUserRole::Technician, true);
        repo.save(user.clone()).await.unwrap();

        let session = UserSession::new(
            user.id.clone(),
            user.username.clone(),
            user.email.clone(),
            AuthRole::Technician,
            "test-token-ban".to_string(),
            3600,
        );
        session_repo.insert_session(&session).unwrap();

        service.ban_user(&user.id, "admin-1").await.unwrap();

        let sessions = session_repo
            .list_user_sessions(&user.id, chrono::Utc::now().timestamp_millis())
            .unwrap();
        assert!(sessions.is_empty(), "sessions should be revoked after ban");
    }

    #[tokio::test]
    async fn test_change_role_revokes_sessions() {
        use crate::domains::auth::domain::models::auth::{UserRole as AuthRole, UserSession};
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = Arc::new(UserRepository::new(Arc::clone(&db), cache));
        let session_repo = Arc::new(SessionRepository::new(db.clone()));
        let service = UserService::new(repo.clone(), session_repo.clone());

        let user = build_user("role-session-test", RepoUserRole::Technician, true);
        repo.save(user.clone()).await.unwrap();

        let session = UserSession::new(
            user.id.clone(),
            user.username.clone(),
            user.email.clone(),
            AuthRole::Technician,
            "test-token-role".to_string(),
            3600,
        );
        session_repo.insert_session(&session).unwrap();

        service
            .change_role(&user.id, UserRole::Supervisor, "admin-1")
            .await
            .unwrap();

        let sessions = session_repo
            .list_user_sessions(&user.id, chrono::Utc::now().timestamp_millis())
            .unwrap();
        assert!(
            sessions.is_empty(),
            "sessions should be revoked after role change"
        );
    }

    #[tokio::test]
    async fn test_ban_already_banned_user_returns_validation_error() {
        let db = Arc::new(setup_test_db().await);
        let cache = Arc::new(Cache::new(100));
        let repo = Arc::new(UserRepository::new(Arc::clone(&db), cache));
        let session_repo = Arc::new(SessionRepository::new(db.clone()));
        let service = UserService::new(repo.clone(), session_repo);

        let user = build_user("already-banned", RepoUserRole::Technician, false);
        repo.save(user.clone()).await.unwrap();

        let err = service.ban_user(&user.id, "admin-1").await.unwrap_err();
        assert!(matches!(err, AppError::Validation(_)));
    }
}
