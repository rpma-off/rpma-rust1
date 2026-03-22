use crate::domains::auth::domain::models::auth::UserSession;
use crate::domains::auth::domain::AuthErrorPolicy;
use crate::shared::ipc::errors::AppError;

/// Thin facade that maps raw infrastructure/domain results into IPC-ready
/// `AppError` variants.  Input validation has been moved to
/// `application::auth_security_service::AuthSecurityService` (ADR-001).
#[derive(Debug, Clone)]
pub struct AuthFacade;

impl Default for AuthFacade {
    fn default() -> Self {
        Self::new()
    }
}

impl AuthFacade {
    /// TODO: document
    pub fn new() -> Self {
        Self
    }

    /// Map an authentication result into a typed `AppError` on failure.
    pub fn map_authentication_result(
        &self,
        result: Result<UserSession, String>,
    ) -> Result<UserSession, AppError> {
        result.map_err(|e| AuthErrorPolicy::authentication_error(&e))
    }

    /// Map a raw signup error string into a typed `AppError`.
    pub fn map_signup_error(&self, raw_error: &str) -> AppError {
        AuthErrorPolicy::signup_error(raw_error)
    }

    /// Return an error if `token` is empty or whitespace-only.
    pub fn ensure_session_token(&self, token: &str) -> Result<(), AppError> {
        if token.trim().is_empty() {
            return Err(AppError::Authentication(
                "Session token is required".to_string(),
            ));
        }
        Ok(())
    }

    /// Orchestrate signup: validate input, assign Viewer role, generate username, delegate to infrastructure.
    pub fn create_account_from_signup(
        &self,
        request: &crate::domains::auth::application::SignupRequest,
        auth_service: &crate::domains::auth::infrastructure::auth::AuthService,
    ) -> Result<crate::domains::auth::domain::models::auth::UserAccount, String> {
        use crate::domains::auth::domain::models::auth::UserRole;

        if request.email.trim().is_empty() {
            return Err("Email is required".to_string());
        }
        if request.first_name.trim().is_empty() {
            return Err("First name is required".to_string());
        }
        if request.last_name.trim().is_empty() {
            return Err("Last name is required".to_string());
        }
        if request.password.trim().is_empty() {
            return Err("Password is required".to_string());
        }

        // New users always start with 'viewer' role — admin must approve
        let role = UserRole::Viewer;

        let username = auth_service
            .generate_username_from_names(&request.first_name, &request.last_name)
            .map_err(|e| format!("Failed to generate username: {}", e))?;

        auth_service.create_account(
            &request.email,
            &username,
            &request.first_name,
            &request.last_name,
            role,
            &request.password,
        )
    }
}
