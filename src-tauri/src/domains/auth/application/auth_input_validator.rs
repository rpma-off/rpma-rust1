//! Input validation for authentication requests.
//!
//! Pure business rules (email format, password strength, name length).
//! No DB access; no IPC types.

use regex::Regex;

use crate::domains::auth::application::SignupRequest;
use crate::shared::ipc::errors::AppError;

/// Stateless validator for authentication input.
#[derive(Debug, Clone, Default)]
pub struct AuthInputValidator;

impl AuthInputValidator {
    pub fn new() -> Self {
        Self
    }

    /// Validate and normalise login credentials.
    pub fn validate_login_input(
        &self,
        email: &str,
        password: &str,
    ) -> Result<(String, String), AppError> {
        let validated_email = self.validate_email(email)?;
        let validated_password = self.validate_password(password)?;
        Ok((validated_email, validated_password))
    }

    /// Validate and normalise a signup request.
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

    fn validate_email(&self, email: &str) -> Result<String, AppError> {
        let trimmed = email.trim().to_lowercase();
        if trimmed.is_empty() || trimmed.len() > 254 {
            return Err(AppError::Validation(
                "Email validation failed: invalid length".to_string(),
            ));
        }
        let re = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
            .map_err(|e| AppError::Internal(format!("Email regex error: {}", e)))?;
        if !re.is_match(&trimmed) {
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
                "{field} validation failed: required"
            )));
        }
        if trimmed.len() > 100 {
            return Err(AppError::Validation(format!(
                "{field} validation failed: exceeds max length"
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
