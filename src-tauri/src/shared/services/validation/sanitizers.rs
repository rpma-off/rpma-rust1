//! Input sanitization and text formatting utilities.

use super::ValidationError;

impl super::ValidationService {
    /// Sanitize string input (remove potentially dangerous characters)
    pub fn sanitize_string(&self, input: &str) -> Result<String, ValidationError> {
        // Check for potentially dangerous characters
        let dangerous_chars = ['<', '>', '"', '\'', '&', '\0', '\n', '\r', '\t'];

        for char in dangerous_chars {
            if input.contains(char) {
                return Err(ValidationError::ForbiddenCharacters);
            }
        }

        // Trim whitespace
        let sanitized = input.trim();

        if sanitized.is_empty() {
            return Err(ValidationError::InvalidName(
                "Input cannot be empty after sanitization".to_string(),
            ));
        }

        Ok(sanitized.to_string())
    }

    /// Comprehensive input sanitization - removes dangerous characters and normalizes whitespace
    pub fn sanitize_input(&self, input: &str) -> String {
        // Remove null bytes and other control characters except whitespace
        let filtered: String = input
            .chars()
            .filter(|&c| c != '\0' && (c.is_whitespace() || !c.is_control()))
            .collect();

        // Normalize whitespace (multiple spaces/tabs/newlines to single space)
        let whitespace_regex =
            regex::Regex::new(r"\s+").expect("Invalid regex pattern for whitespace normalization");
        let normalized = whitespace_regex.replace_all(&filtered, " ").to_string();

        // Trim leading/trailing whitespace
        normalized.trim().to_string()
    }

    /// Sanitize text input with length validation
    pub fn sanitize_text_input(
        &self,
        input: &str,
        field_name: &str,
        max_length: usize,
    ) -> Result<String, ValidationError> {
        let sanitized = self.sanitize_input(input);

        if sanitized.is_empty() {
            return Err(ValidationError::InvalidName(format!(
                "{} cannot be empty",
                field_name
            )));
        }

        if sanitized.len() > max_length {
            return Err(ValidationError::InputTooLong {
                field: field_name.to_string(),
                max: max_length,
            });
        }

        Ok(sanitized)
    }

    /// Sanitize optional text input
    pub fn sanitize_optional_text(
        &self,
        input: Option<&str>,
        field_name: &str,
        max_length: usize,
    ) -> Result<Option<String>, ValidationError> {
        match input {
            Some(text) if !text.trim().is_empty() => {
                let sanitized = self.sanitize_text_input(text, field_name, max_length)?;
                Ok(Some(sanitized))
            }
            _ => Ok(None),
        }
    }

    /// Validate and sanitize date string (YYYY-MM-DD format)
    pub fn validate_date(&self, date: &str, field_name: &str) -> Result<String, ValidationError> {
        if date.is_empty() {
            return Err(ValidationError::InvalidName(format!(
                "{} cannot be empty",
                field_name
            )));
        }

        // Basic format check
        if date.len() != 10 || !date.chars().all(|c| c.is_numeric() || c == '-') {
            return Err(ValidationError::InvalidName(format!(
                "{} must be in YYYY-MM-DD format",
                field_name
            )));
        }

        // Parse to validate
        match chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d") {
            Ok(_) => Ok(date.to_string()),
            Err(_) => Err(ValidationError::InvalidName(format!(
                "{} is not a valid date",
                field_name
            ))),
        }
    }

    /// Validate and sanitize numeric input
    pub fn validate_number<T>(
        &self,
        value: &str,
        field_name: &str,
        min: Option<T>,
        max: Option<T>,
    ) -> Result<T, ValidationError>
    where
        T: std::str::FromStr + PartialOrd + std::fmt::Display,
    {
        match value.parse::<T>() {
            Ok(num) => {
                if let Some(min_val) = min {
                    if num < min_val {
                        return Err(ValidationError::InvalidName(format!(
                            "{} must be at least {}",
                            field_name, min_val
                        )));
                    }
                }
                if let Some(max_val) = max {
                    if num > max_val {
                        return Err(ValidationError::InvalidName(format!(
                            "{} must be at most {}",
                            field_name, max_val
                        )));
                    }
                }
                Ok(num)
            }
            Err(_) => Err(ValidationError::InvalidName(format!(
                "{} must be a valid number",
                field_name
            ))),
        }
    }

    /// Sanitize and validate URL (for future use)
    pub fn validate_url(&self, url: &str, field_name: &str) -> Result<String, ValidationError> {
        if url.is_empty() {
            return Err(ValidationError::InvalidName(format!(
                "{} cannot be empty",
                field_name
            )));
        }

        // Basic URL validation
        if !url.starts_with("http://") && !url.starts_with("https://") {
            return Err(ValidationError::InvalidName(format!(
                "{} must start with http:// or https://",
                field_name
            )));
        }

        // Check for dangerous characters
        if url.contains('<') || url.contains('>') || url.contains('"') || url.contains('\'') {
            return Err(ValidationError::InvalidName(format!(
                "{} contains invalid characters",
                field_name
            )));
        }

        Ok(url.to_string())
    }

    /// Validate file name for uploads
    pub fn validate_filename(&self, filename: &str) -> Result<String, ValidationError> {
        if filename.is_empty() {
            return Err(ValidationError::InvalidName(
                "Filename cannot be empty".to_string(),
            ));
        }

        if filename.len() > 255 {
            return Err(ValidationError::InputTooLong {
                field: "filename".to_string(),
                max: 255,
            });
        }

        // Check for dangerous characters
        let dangerous_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
        if filename.chars().any(|c| dangerous_chars.contains(&c)) {
            return Err(ValidationError::InvalidName(
                "Filename contains invalid characters".to_string(),
            ));
        }

        // Check for path traversal attempts
        if filename.contains("..") || filename.starts_with('.') {
            return Err(ValidationError::InvalidName("Invalid filename".to_string()));
        }

        Ok(filename.to_string())
    }

    /// Batch validation helper for multiple fields
    pub fn validate_batch<F, T>(&self, items: Vec<(&str, F)>) -> Result<Vec<T>, ValidationError>
    where
        F: Fn(&str) -> Result<T, ValidationError>,
    {
        let mut results = Vec::new();
        let mut errors = Vec::new();

        for (field_name, validator) in items {
            match validator(field_name) {
                Ok(result) => results.push(result),
                Err(e) => errors.push(format!("{}: {}", field_name, e)),
            }
        }

        if !errors.is_empty() {
            return Err(ValidationError::InvalidName(format!(
                "Validation errors: {}",
                errors.join(", ")
            )));
        }

        Ok(results)
    }
}
