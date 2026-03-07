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
}
