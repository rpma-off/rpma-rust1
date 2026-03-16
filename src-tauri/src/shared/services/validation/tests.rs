#[cfg(test)]
mod tests {
    use crate::shared::services::validation::ValidationService;

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

    #[test]
    fn test_validate_required_trimmed_preserves_exact_message() {
        let validator = ValidationService::new();

        let err = validator
            .validate_required_trimmed("   ", "task_id is required")
            .unwrap_err();

        assert_eq!(err.to_string(), "task_id is required");
    }

    #[test]
    fn test_validate_required_trimmed_with_max_length_preserves_exact_messages() {
        let validator = ValidationService::new();

        let empty_err = validator
            .validate_required_trimmed_with_max_length(
                "   ",
                "Title cannot be empty",
                10,
                "Title must be 10 characters or less",
            )
            .unwrap_err();
        assert_eq!(empty_err.to_string(), "Title cannot be empty");

        let long_err = validator
            .validate_required_trimmed_with_max_length(
                "01234567890",
                "Title cannot be empty",
                10,
                "Title must be 10 characters or less",
            )
            .unwrap_err();
        assert_eq!(long_err.to_string(), "Title must be 10 characters or less");
    }

    #[test]
    fn test_validate_required_date_format_preserves_exact_messages() {
        let validator = ValidationService::new();

        let empty_err = validator
            .validate_required_date_format(
                "",
                "new_date is required",
                "new_date must be in YYYY-MM-DD format",
            )
            .unwrap_err();
        assert_eq!(empty_err.to_string(), "new_date is required");

        let invalid_err = validator
            .validate_required_date_format(
                "06/01/2024",
                "new_date is required",
                "new_date must be in YYYY-MM-DD format",
            )
            .unwrap_err();
        assert_eq!(
            invalid_err.to_string(),
            "new_date must be in YYYY-MM-DD format"
        );
    }
}
