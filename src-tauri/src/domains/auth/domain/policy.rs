use crate::shared::ipc::errors::AppError;

#[derive(Debug, Clone, Copy, Default)]
pub struct AuthErrorPolicy;

impl AuthErrorPolicy {
    pub fn authentication_error(raw_error: &str) -> AppError {
        if raw_error.contains("Invalid email or password") {
            AppError::Authentication("Email ou mot de passe incorrect".to_string())
        } else if raw_error.contains("Account temporarily locked")
            || raw_error.contains("IP address temporarily locked")
        {
            AppError::Authentication(raw_error.to_string())
        } else {
            AppError::Authentication("Erreur d'authentification. Veuillez reessayer.".to_string())
        }
    }

    pub fn signup_error(raw_error: &str) -> AppError {
        match raw_error {
            "Email is required"
            | "First name is required"
            | "Last name is required"
            | "Password is required"
            | "An account with this email already exists"
            | "Username is already taken" => AppError::Validation(raw_error.to_string()),
            _ => AppError::db_sanitized("create_account", raw_error),
        }
    }
}
