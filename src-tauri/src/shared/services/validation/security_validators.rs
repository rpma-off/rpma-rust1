//! Enhanced security validators for email and password.

use super::ValidationError;

impl super::ValidationService {
    /// Validate and sanitize email with additional security checks
    pub fn validate_email_secure(&self, email: &str) -> Result<String, ValidationError> {
        let validated = self.validate_email(email)?;

        // Additional security checks
        let lower_email = validated.to_lowercase();

        // Check for suspicious patterns
        if lower_email.contains("script") || lower_email.contains("javascript") {
            return Err(ValidationError::InvalidEmail(
                "Invalid email format".to_string(),
            ));
        }

        // Check for excessive length in local part
        if let Some(at_pos) = lower_email.find('@') {
            if at_pos > 64 {
                // RFC 5321 limit
                return Err(ValidationError::InvalidEmail(
                    "Email local part too long".to_string(),
                ));
            }
        }

        Ok(validated)
    }

    /// Validate password with enhanced security requirements
    pub fn validate_password_enhanced(&self, password: &str) -> Result<String, ValidationError> {
        // Basic validation first
        let validated = self.validate_password(password)?;

        // Additional security checks
        if password.chars().all(|c| c.is_alphanumeric()) {
            return Err(ValidationError::WeakPassword(
                "Password must contain at least one special character".to_string(),
            ));
        }

        // Check for common weak patterns
        let lower_pass = password.to_lowercase();
        if lower_pass.contains("password")
            || lower_pass.contains("123456")
            || lower_pass.contains("qwerty")
        {
            return Err(ValidationError::WeakPassword(
                "Password contains common weak patterns".to_string(),
            ));
        }

        // Check for repeated characters
        let chars: Vec<char> = password.chars().collect();
        let mut consecutive_count = 1;
        for i in 1..chars.len() {
            if chars[i] == chars[i - 1] {
                consecutive_count += 1;
                if consecutive_count >= 4 {
                    return Err(ValidationError::WeakPassword(
                        "Password cannot contain 4 or more consecutive identical characters"
                            .to_string(),
                    ));
                }
            } else {
                consecutive_count = 1;
            }
        }

        Ok(validated)
    }
}
