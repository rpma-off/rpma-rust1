//! Field-level validators for email, password, username, and name.

use regex::Regex;

use super::ValidationError;

impl super::ValidationService {
    /// Validate email address
    pub fn validate_email(&self, email: &str) -> Result<String, ValidationError> {
        if email.is_empty() {
            return Err(ValidationError::InvalidEmail(
                "Email cannot be empty".to_string(),
            ));
        }

        if email.len() > 254 {
            return Err(ValidationError::InputTooLong {
                field: "email".to_string(),
                max: 254,
            });
        }

        // Email regex pattern (RFC 5322 compliant simplified version)
        let email_regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
            .map_err(|_| ValidationError::InvalidEmail("Invalid regex pattern".to_string()))?;

        if !email_regex.is_match(email) {
            return Err(ValidationError::InvalidEmail(
                "Invalid email format".to_string(),
            ));
        }

        // Check for suspicious patterns
        if email.contains("..") || email.starts_with('.') || email.ends_with('.') {
            return Err(ValidationError::InvalidEmail(
                "Invalid email format".to_string(),
            ));
        }

        // Normalize email (lowercase)
        Ok(email.to_lowercase())
    }

    /// Validate password strength
    pub fn validate_password(&self, password: &str) -> Result<String, ValidationError> {
        if password.is_empty() {
            return Err(ValidationError::WeakPassword(
                "Password cannot be empty".to_string(),
            ));
        }

        if password.len() < 8 {
            return Err(ValidationError::WeakPassword(
                "Password must be at least 8 characters long".to_string(),
            ));
        }

        if password.len() > 128 {
            return Err(ValidationError::InputTooLong {
                field: "password".to_string(),
                max: 128,
            });
        }

        // Check for character variety (matching frontend validation)
        let has_upper = password.chars().any(|c| c.is_uppercase());
        let has_lower = password.chars().any(|c| c.is_lowercase());
        let has_digit = password.chars().any(|c| c.is_numeric());
        let has_special = password
            .chars()
            .any(|c| "!@#$%^&*()_+-=[]{}|;:,.<>?".contains(c));

        let requirements_met = [has_upper, has_lower, has_digit, has_special]
            .iter()
            .filter(|&&x| x)
            .count();

        if requirements_met < 3 {
            return Err(ValidationError::WeakPassword(
                "Password must contain at least 3 of 4 character types: uppercase, lowercase, number, special character".to_string()
            ));
        }

        Ok(password.to_string())
    }

    /// Validate username
    pub fn validate_username(&self, username: &str) -> Result<String, ValidationError> {
        if username.is_empty() {
            return Err(ValidationError::InvalidUsername(
                "Username cannot be empty".to_string(),
            ));
        }

        if username.len() < 3 {
            return Err(ValidationError::InputTooShort {
                field: "username".to_string(),
                min: 3,
            });
        }

        if username.len() > 50 {
            return Err(ValidationError::InputTooLong {
                field: "username".to_string(),
                max: 50,
            });
        }

        // Username regex: alphanumeric, underscores and hyphens allowed
        let username_regex = Regex::new(r"^[a-zA-Z0-9_-]+$")
            .map_err(|_| ValidationError::InvalidUsername("Invalid regex pattern".to_string()))?;

        if !username_regex.is_match(username) {
            return Err(ValidationError::InvalidUsername(
                "Username can only contain letters, numbers, and underscores".to_string(),
            ));
        }

        // Cannot start or end with underscore or hyphen
        if username.starts_with('_')
            || username.ends_with('_')
            || username.starts_with('-')
            || username.ends_with('-')
        {
            return Err(ValidationError::InvalidUsername(
                "Username cannot start or end with underscore or hyphen".to_string(),
            ));
        }

        Ok(username.to_string())
    }

    /// Validate first or last name
    pub fn validate_name(&self, name: &str, field_name: &str) -> Result<String, ValidationError> {
        if name.is_empty() {
            return Err(ValidationError::InvalidName(format!(
                "{} cannot be empty",
                field_name
            )));
        }

        if name.len() < 2 {
            return Err(ValidationError::InputTooShort {
                field: field_name.to_string(),
                min: 2,
            });
        }

        if name.len() > 100 {
            return Err(ValidationError::InputTooLong {
                field: field_name.to_string(),
                max: 100,
            });
        }

        // Name regex: letters (including accented), spaces, hyphens, apostrophes allowed
        let name_regex = Regex::new(r"^[\p{L}\s'-]+$")
            .map_err(|_| ValidationError::InvalidName("Invalid regex pattern".to_string()))?;

        if !name_regex.is_match(name) {
            return Err(ValidationError::InvalidName(format!(
                "{} can only contain letters, spaces, hyphens, and apostrophes",
                field_name
            )));
        }

        // Normalize name (proper case) - handle edge cases properly
        let normalized = name
            .split_whitespace()
            .filter(|word| !word.is_empty()) // Remove empty words from multiple spaces
            .map(|word| -> Result<String, ValidationError> {
                let mut chars = word.chars();
                match chars.next() {
                    None => Ok(String::new()),
                    Some(first) => {
                        // Handle names with apostrophes or hyphens properly
                        let rest = chars.as_str();
                        if rest.contains("'") || rest.contains("-") {
                            // Process each part separately for compound names
                            let parts: Vec<&str> =
                                rest.split(|c| ['\'', '-'].contains(&c)).collect();
                            let mut result = first.to_uppercase().collect::<String>();
                            for (i, part) in parts.iter().enumerate() {
                                if !part.is_empty() {
                                    if i > 0 {
                                        // Add back the separator
                                        let sep_pos = rest
                                            .chars()
                                            .position(|c| c == '\'' || c == '-')
                                            .ok_or_else(|| {
                                                ValidationError::InvalidName(
                                                    "Invalid name format".to_string(),
                                                )
                                            })?;
                                        if sep_pos < rest.len() {
                                            let sep_char =
                                                rest.chars().nth(sep_pos).ok_or_else(|| {
                                                    ValidationError::InvalidName(
                                                        "Invalid name format".to_string(),
                                                    )
                                                })?;
                                            result.push(sep_char);
                                        }
                                    }
                                    let mut part_chars = part.chars();
                                    if let Some(part_first) = part_chars.next() {
                                        result.push_str(
                                            &part_first.to_uppercase().collect::<String>(),
                                        );
                                        result.push_str(&part_chars.as_str().to_lowercase());
                                    }
                                }
                            }
                            Ok(result)
                        } else {
                            Ok(first.to_uppercase().collect::<String>() + &rest.to_lowercase())
                        }
                    }
                }
            })
            .collect::<Result<Vec<String>, _>>()?
            .join(" ");

        Ok(normalized)
    }
}
