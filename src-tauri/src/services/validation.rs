//! Input validation and sanitization service

use regex::Regex;
use thiserror::Error;

use crate::commands::TaskAction;
use crate::models::task::CreateTaskRequest;

#[derive(Error, Debug)]
pub enum ValidationError {
    #[error("Invalid email format: {0}")]
    InvalidEmail(String),
    #[error("Password too weak: {0}")]
    WeakPassword(String),
    #[error("Invalid username: {0}")]
    InvalidUsername(String),
    #[error("Invalid name: {0}")]
    InvalidName(String),
    #[error("Input contains forbidden characters")]
    ForbiddenCharacters,
    #[error("Input too long: {field} (max {max} characters)")]
    InputTooLong { field: String, max: usize },
    #[error("Input too short: {field} (min {min} characters)")]
    InputTooShort { field: String, min: usize },
    #[error("Invalid GPS coordinates: {0}")]
    InvalidGPSCoordinates(String),
    #[error("GPS accuracy too low: {accuracy}m (minimum required: {required}m)")]
    GPSAccuracyTooLow { accuracy: f64, required: f64 },
    #[error("GPS data too old: {age_seconds}s (maximum age: {max_age}s)")]
    GPSDataTooOld { age_seconds: i64, max_age: i64 },
}

#[derive(Clone, Debug)]
pub struct ValidationService;

impl Default for ValidationService {
    fn default() -> Self {
        Self::new()
    }
}

impl ValidationService {
    pub fn new() -> Self {
        Self
    }

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

    /// Validate user role
    pub fn validate_role(&self, role: &str) -> Result<String, ValidationError> {
        let valid_roles = ["admin", "technician", "supervisor", "viewer"];

        if !valid_roles.contains(&role.to_lowercase().as_str()) {
            return Err(ValidationError::InvalidName(
                "Invalid user role".to_string(),
            ));
        }

        Ok(role.to_lowercase())
    }

    /// Validate complete signup data
    pub fn validate_signup_data(
        &self,
        email: &str,
        username: &str,
        first_name: &str,
        last_name: &str,
        password: &str,
        role: Option<&str>,
    ) -> Result<(String, String, String, String, String, String), ValidationError> {
        let validated_email = self.validate_email(email)?;
        let validated_username = self.validate_username(username)?;
        let validated_first_name = self.validate_name(first_name, "First name")?;
        let validated_last_name = self.validate_name(last_name, "Last name")?;
        let validated_password = self.validate_password(password)?;

        let validated_role = match role {
            Some(r) => self.validate_role(r)?,
            None => "viewer".to_string(), // Default role
        };

        Ok((
            validated_email,
            validated_username,
            validated_first_name,
            validated_last_name,
            validated_password,
            validated_role,
        ))
    }

    /// Validate login data
    pub fn validate_login_data(
        &self,
        email: &str,
        password: &str,
    ) -> Result<(String, String), ValidationError> {
        let validated_email = self.validate_email(email)?;

        if password.is_empty() {
            return Err(ValidationError::WeakPassword(
                "Password cannot be empty".to_string(),
            ));
        }

        if password.len() > 128 {
            return Err(ValidationError::InputTooLong {
                field: "password".to_string(),
                max: 128,
            });
        }

        Ok((validated_email, password.to_string()))
    }

    /// Validate GPS coordinates
    pub fn validate_gps_coordinates(&self, lat: f64, lon: f64) -> Result<(), ValidationError> {
        if !(-90.0..=90.0).contains(&lat) {
            return Err(ValidationError::InvalidGPSCoordinates(format!(
                "Latitude {} is out of valid range (-90 to 90)",
                lat
            )));
        }

        if !(-180.0..=180.0).contains(&lon) {
            return Err(ValidationError::InvalidGPSCoordinates(format!(
                "Longitude {} is out of valid range (-180 to 180)",
                lon
            )));
        }

        Ok(())
    }

    /// Validate GPS accuracy for PPF work
    pub fn validate_gps_accuracy(
        &self,
        accuracy: f64,
        required_accuracy: Option<f64>,
    ) -> Result<(), ValidationError> {
        let min_accuracy = required_accuracy.unwrap_or(100.0); // Default 100m for PPF work

        if accuracy > min_accuracy {
            return Err(ValidationError::GPSAccuracyTooLow {
                accuracy,
                required: min_accuracy,
            });
        }

        Ok(())
    }

    /// Validate GPS data freshness
    pub fn validate_gps_freshness(
        &self,
        timestamp_ms: i64,
        max_age_seconds: Option<i64>,
    ) -> Result<(), ValidationError> {
        let max_age = max_age_seconds.unwrap_or(300); // Default 5 minutes
        let now = chrono::Utc::now().timestamp_millis();
        let age_seconds = (now - timestamp_ms) / 1000;

        if age_seconds > max_age {
            return Err(ValidationError::GPSDataTooOld {
                age_seconds,
                max_age,
            });
        }

        Ok(())
    }

    /// Comprehensive GPS validation for PPF interventions
    pub fn validate_gps_for_ppf(
        &self,
        lat: Option<f64>,
        lon: Option<f64>,
        accuracy: Option<f64>,
        timestamp_ms: Option<i64>,
    ) -> Result<(), ValidationError> {
        // Check if coordinates are provided
        let (lat, lon) = match (lat, lon) {
            (Some(lat), Some(lon)) => (lat, lon),
            _ => return Ok(()), // Optional for PPF work
        };

        // Validate coordinate ranges
        self.validate_gps_coordinates(lat, lon)?;

        // Validate accuracy if provided
        if let Some(acc) = accuracy {
            // For PPF work, we require at least 100m accuracy
            self.validate_gps_accuracy(acc, Some(100.0))?;
        }

        // Validate freshness if timestamp provided
        if let Some(ts) = timestamp_ms {
            self.validate_gps_freshness(ts, Some(600))?; // 10 minutes for PPF work
        }

        Ok(())
    }

    /// Validate task creation data
    pub fn validate_task_creation(
        &self,
        vehicle_plate: &str,
        vehicle_model: &str,
        ppf_zones: &[String],
        scheduled_date: &str,
    ) -> Result<(String, String, Vec<String>, String), ValidationError> {
        // Validate required fields
        if vehicle_plate.trim().is_empty() {
            return Err(ValidationError::InvalidName(
                "Vehicle plate is required".to_string(),
            ));
        }
        if vehicle_plate.len() > 20 {
            return Err(ValidationError::InputTooLong {
                field: "vehicle_plate".to_string(),
                max: 20,
            });
        }

        if vehicle_model.trim().is_empty() {
            return Err(ValidationError::InvalidName(
                "Vehicle model is required".to_string(),
            ));
        }
        if vehicle_model.len() > 100 {
            return Err(ValidationError::InputTooLong {
                field: "vehicle_model".to_string(),
                max: 100,
            });
        }

        if ppf_zones.is_empty() {
            return Err(ValidationError::InvalidName(
                "PPF zones are required".to_string(),
            ));
        }
        for zone in ppf_zones {
            if zone.trim().is_empty() {
                return Err(ValidationError::InvalidName(
                    "PPF zone cannot be empty".to_string(),
                ));
            }
            if zone.len() > 100 {
                return Err(ValidationError::InputTooLong {
                    field: "ppf_zone".to_string(),
                    max: 100,
                });
            }
        }

        if scheduled_date.trim().is_empty() {
            return Err(ValidationError::InvalidName(
                "Scheduled date is required".to_string(),
            ));
        }
        // Basic date format validation (YYYY-MM-DD)
        if !scheduled_date.chars().all(|c| c.is_numeric() || c == '-') || scheduled_date.len() != 10
        {
            return Err(ValidationError::InvalidName(
                "Invalid scheduled date format".to_string(),
            ));
        }

        Ok((
            vehicle_plate.to_string(),
            vehicle_model.to_string(),
            ppf_zones.to_vec(),
            scheduled_date.to_string(),
        ))
    }

    /// Validate task action data
    pub async fn validate_task_action(
        &self,
        action: TaskAction,
    ) -> Result<TaskAction, ValidationError> {
        match action {
            TaskAction::Create { data } => {
                let (validated_plate, validated_model, validated_zones, validated_date) = self
                    .validate_task_creation(
                        &data.vehicle_plate,
                        &data.vehicle_model,
                        &data.ppf_zones,
                        &data.scheduled_date,
                    )?;

                Ok(TaskAction::Create {
                    data: CreateTaskRequest {
                        vehicle_plate: validated_plate,
                        vehicle_model: validated_model,
                        ppf_zones: validated_zones,
                        scheduled_date: validated_date,
                        ..data
                    },
                })
            }
            TaskAction::Update { id, data } => {
                // Validate ID format
                if id.trim().is_empty() {
                    return Err(ValidationError::InvalidName(
                        "Task ID is required".to_string(),
                    ));
                }

                // For update, we can validate optional fields if provided
                if let Some(vehicle_plate) = &data.vehicle_plate {
                    if vehicle_plate.trim().is_empty() {
                        return Err(ValidationError::InvalidName(
                            "Vehicle plate cannot be empty".to_string(),
                        ));
                    }
                    if vehicle_plate.len() > 20 {
                        return Err(ValidationError::InputTooLong {
                            field: "vehicle_plate".to_string(),
                            max: 20,
                        });
                    }
                }

                if let Some(ppf_zones) = &data.ppf_zones {
                    if ppf_zones.is_empty() {
                        return Err(ValidationError::InvalidName(
                            "At least one PPF zone required".to_string(),
                        ));
                    }
                    for zone in ppf_zones {
                        if zone.trim().is_empty() {
                            return Err(ValidationError::InvalidName(
                                "PPF zone cannot be empty".to_string(),
                            ));
                        }
                    }
                }

                Ok(TaskAction::Update { id, data })
            }
            // For other actions, just return as-is for now
            _ => Ok(action),
        }
    }

    /// Validate client creation data
    pub fn validate_client_creation(&self, name: &str) -> Result<String, ValidationError> {
        if name.trim().is_empty() {
            return Err(ValidationError::InvalidName("Name is required".to_string()));
        }
        if name.len() > 100 {
            return Err(ValidationError::InputTooLong {
                field: "name".to_string(),
                max: 100,
            });
        }

        // Basic name validation - allow letters, spaces, hyphens, apostrophes
        let name_regex = Regex::new(r"^[\p{L}\s'-]+$")
            .map_err(|_| ValidationError::InvalidName("Invalid regex pattern".to_string()))?;

        if !name_regex.is_match(name) {
            return Err(ValidationError::InvalidName(
                "Name can only contain letters, spaces, hyphens, and apostrophes".to_string(),
            ));
        }

        Ok(name.trim().to_string())
    }

    /// Validate email for client (optional field)
    pub fn validate_client_email(
        &self,
        email: Option<&str>,
    ) -> Result<Option<String>, ValidationError> {
        match email {
            Some(email_str) if !email_str.trim().is_empty() => {
                let validated = self.validate_email(email_str)?;
                Ok(Some(validated))
            }
            _ => Ok(None),
        }
    }

    /// Validate phone number (basic validation)
    pub fn validate_phone(&self, phone: Option<&str>) -> Result<Option<String>, ValidationError> {
        match phone {
            Some(phone_str) if !phone_str.trim().is_empty() => {
                let cleaned = phone_str
                    .chars()
                    .filter(|c| c.is_numeric() || "+-() ".contains(*c))
                    .collect::<String>();
                if cleaned.len() < 7 || cleaned.len() > 20 {
                    return Err(ValidationError::InvalidName(
                        "Invalid phone number format".to_string(),
                    ));
                }
                Ok(Some(cleaned))
            }
            _ => Ok(None),
        }
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_validation() {
        let validator = ValidationService::new();

        // Valid emails
        assert!(validator.validate_email("test@example.com").is_ok());
        assert!(validator
            .validate_email("user.name+tag@domain.co.uk")
            .is_ok());

        // Invalid emails
        assert!(validator.validate_email("").is_err());
        assert!(validator.validate_email("invalid-email").is_err());
        assert!(validator.validate_email("@domain.com").is_err());
        assert!(validator.validate_email("user@").is_err());
    }

    #[test]
    fn test_password_validation() {
        let validator = ValidationService::new();

        // Valid passwords
        assert!(validator.validate_password("SecurePass123!").is_ok());
        assert!(validator.validate_password("MyP@ssw0rd").is_ok());

        // Invalid passwords
        assert!(validator.validate_password("").is_err());
        assert!(validator.validate_password("weak").is_err());
        assert!(validator.validate_password("password").is_err());
        assert!(validator.validate_password("12345678").is_err());
    }

    #[test]
    fn test_username_validation() {
        let validator = ValidationService::new();

        // Valid usernames
        assert!(validator.validate_username("user123").is_ok());
        assert!(validator.validate_username("test_user").is_ok());
        assert!(validator.validate_username("admin-2024").is_ok());

        // Invalid usernames
        assert!(validator.validate_username("").is_err());
        assert!(validator.validate_username("ab").is_err());
        assert!(validator.validate_username("_username").is_err());
        assert!(validator.validate_username("username_").is_err());
        assert!(validator.validate_username("user@name").is_err());
    }

    #[test]
    fn test_name_validation() {
        let validator = ValidationService::new();

        // Valid names
        assert!(validator.validate_name("John", "First name").is_ok());
        assert!(validator.validate_name("Mary-Jane", "First name").is_ok());
        assert!(validator.validate_name("O'Connor", "Last name").is_ok());

        // Invalid names
        assert!(validator.validate_name("", "First name").is_err());
        assert!(validator.validate_name("J", "First name").is_err());
        assert!(validator.validate_name("John123", "First name").is_err());
    }
}
