use crate::domains::auth::application::SignupRequest;
use crate::domains::auth::domain::models::auth::UserSession;
use crate::domains::auth::domain::AuthErrorPolicy;
use crate::shared::ipc::errors::AppError;
use regex::Regex;

#[derive(Debug, Clone)]
pub struct AuthFacade;

impl Default for AuthFacade {
    fn default() -> Self {
        Self::new()
    }
}

impl AuthFacade {
    pub fn new() -> Self {
        Self
    }

    pub fn validate_login_input(
        &self,
        email: &str,
        password: &str,
    ) -> Result<(String, String), AppError> {
        let validated_email = self.validate_email(email)?;
        let validated_password = self.validate_password(password)?;

        Ok((validated_email, validated_password))
    }

    pub fn validate_signup_input(
        &self,
        request: &SignupRequest,
    ) -> Result<SignupRequest, AppError> {
        let validated_email = self.validate_email(&request.email)?;
        let validated_first_name = self.validate_name(&request.first_name, "first_name")?;
        let validated_last_name = self.validate_name(&request.last_name, "last_name")?;
        let validated_password = self.validate_password(&request.password)?;

        Ok(SignupRequest {
            email: validated_email,
            first_name: validated_first_name,
            last_name: validated_last_name,
            password: validated_password,
            role: request.role.clone(),
            correlation_id: request.correlation_id.clone(),
        })
    }

    pub fn map_authentication_result(
        &self,
        result: Result<UserSession, String>,
    ) -> Result<UserSession, AppError> {
        result.map_err(|e| AuthErrorPolicy::authentication_error(&e))
    }

    pub fn map_signup_error(&self, raw_error: &str) -> AppError {
        AuthErrorPolicy::signup_error(raw_error)
    }

    pub fn ensure_session_token(&self, token: &str) -> Result<(), AppError> {
        if token.trim().is_empty() {
            return Err(AppError::Authentication(
                "Session token is required".to_string(),
            ));
        }
        Ok(())
    }

    fn validate_email(&self, email: &str) -> Result<String, AppError> {
        let trimmed = email.trim().to_lowercase();
        if trimmed.is_empty() || trimmed.len() > 254 {
            return Err(AppError::Validation(
                "Email validation failed: invalid length".to_string(),
            ));
        }
        let email_regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
            .map_err(|e| AppError::Internal(format!("Email validation regex error: {}", e)))?;
        if !email_regex.is_match(&trimmed) {
            return Err(AppError::Validation(
                "Email validation failed: invalid format".to_string(),
            ));
        }
        Ok(trimmed)
    }

    fn validate_name(&self, name: &str, field: &str) -> Result<String, AppError> {
        let trimmed = name.trim();
        if trimmed.is_empty() {
            return Err(AppError::Validation(format!(
                "{} validation failed: required",
                field
            )));
        }
        if trimmed.len() > 100 {
            return Err(AppError::Validation(format!(
                "{} validation failed: exceeds max length",
                field
            )));
        }
        Ok(trimmed.to_string())
    }

    fn validate_password(&self, password: &str) -> Result<String, AppError> {
        if password.trim().is_empty() || password.len() > 128 {
            return Err(AppError::Validation(
                "Password validation failed: invalid length".to_string(),
            ));
        }

        let has_upper = password.chars().any(|c| c.is_uppercase());
        let has_lower = password.chars().any(|c| c.is_lowercase());
        let has_digit = password.chars().any(|c| c.is_ascii_digit());
        if password.len() < 8 || !has_upper || !has_lower || !has_digit {
            return Err(AppError::Validation(
                "Password validation failed: weak password".to_string(),
            ));
        }

        Ok(password.to_string())
    }
}
