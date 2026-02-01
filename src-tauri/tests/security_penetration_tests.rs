//! Security penetration tests for RPMA application
//!
//! This module contains comprehensive security tests to identify potential vulnerabilities
//! in authentication, input validation, and IPC communication layers.

use rpma_ppf_intervention::db::Database;
use rpma_ppf_intervention::models::auth::UserRole;
use rpma_ppf_intervention::services::auth::AuthService;
use rpma_ppf_intervention::services::rate_limiter::RateLimiterService;
use rpma_ppf_intervention::services::validation::ValidationService;

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_test_db() -> Database {
        let temp_file = tempfile::NamedTempFile::new().unwrap();
        let db = Database::new(temp_file.path()).unwrap();
        db.init().unwrap();
        db
    }

    fn create_test_user(auth_service: &AuthService, email: &str, username: &str) -> String {
        let user = auth_service
            .create_account(
                email,
                username,
                "Test",
                "User",
                UserRole::Technician,
                "SecurePass123!",
            )
            .expect("Failed to create test user");
        user.id
    }

    #[test]
    fn test_sql_injection_attempts() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);

        // Test various SQL injection attempts in email field
        let sql_injection_payloads = vec![
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM users --",
            "admin'--",
            "' OR 1=1 --",
            "'; SELECT * FROM users WHERE '1'='1",
        ];

        for payload in sql_injection_payloads {
            let result = auth_service.authenticate(payload, "password123");
            assert!(
                result.is_err(),
                "SQL injection attempt '{}' should fail",
                payload
            );
        }
    }

    #[test]
    fn test_xss_attempts_in_auth() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);

        // Test XSS attempts in email and password fields
        let xss_payloads = vec![
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "\"><script>alert('xss')</script>",
            "'><script>alert('xss')</script>",
        ];

        for payload in xss_payloads {
            // Test in email field
            let result = auth_service.authenticate(payload, "password123");
            assert!(
                result.is_err(),
                "XSS attempt '{}' in email should fail",
                payload
            );

            // Test in password field (though validation is less strict here)
            let result = auth_service.authenticate("test@example.com", payload);
            // Password validation is more lenient, but authentication should still fail
            assert!(
                result.is_err(),
                "XSS attempt '{}' in password should fail",
                payload
            );
        }
    }

    #[test]
    fn test_buffer_overflow_attempts() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);

        // Test extremely long inputs
        let long_string = "a".repeat(10000);
        let result = auth_service.authenticate(&long_string, "password123");
        assert!(
            result.is_err(),
            "Buffer overflow attempt with long email should fail"
        );

        let result = auth_service.authenticate("test@example.com", &long_string);
        assert!(
            result.is_err(),
            "Buffer overflow attempt with long password should fail"
        );
    }

    #[test]
    fn test_null_byte_injection() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);

        // Test null byte injection attempts
        let null_byte_payloads = vec![
            "test@example.com\x00",
            "test\x00@example.com",
            "password\x00123",
            "\x00admin",
        ];

        for payload in null_byte_payloads {
            let result = auth_service.authenticate(payload, "password123");
            assert!(
                result.is_err(),
                "Null byte injection '{}' should fail",
                payload
            );
        }
    }

    #[test]
    fn test_directory_traversal_attempts() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);

        // Test directory traversal in email field
        let traversal_payloads = vec![
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32",
            "....//....//....//etc/passwd",
            "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
        ];

        for payload in traversal_payloads {
            let result = auth_service.authenticate(payload, "password123");
            assert!(
                result.is_err(),
                "Directory traversal '{}' should fail",
                payload
            );
        }
    }

    #[test]
    fn test_unicode_normalization_attacks() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);

        // Create a user with a specific email
        let _ = auth_service.create_account(
            "test@example.com",
            "testuser",
            "Test",
            "User",
            UserRole::Technician,
            "SecurePass123!",
        );

        // Test unicode normalization attacks
        let unicode_payloads = vec![
            "tëst@example.com", // Different normalization
            "test@ëxample.com", // Unicode in domain
            "тест@example.com", // Cyrillic characters
            "test@пример.com",  // Unicode domain
        ];

        for payload in unicode_payloads {
            let result = auth_service.authenticate(payload, "SecurePass123!");
            // These should fail as they don't match the stored email
            assert!(result.is_err(), "Unicode attack '{}' should fail", payload);
        }
    }

    #[test]
    fn test_timing_attacks() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);

        // Create a user
        let _ = auth_service.create_account(
            "test@example.com",
            "testuser",
            "Test",
            "User",
            UserRole::Technician,
            "SecurePass123!",
        );

        // Test timing differences between existing and non-existing users
        // This is more of a conceptual test - in practice we'd need timing analysis
        let start = std::time::Instant::now();
        let _ = auth_service.authenticate("nonexistent@example.com", "wrongpass");
        let nonexistent_time = start.elapsed();

        let start = std::time::Instant::now();
        let _ = auth_service.authenticate("test@example.com", "wrongpass");
        let existing_time = start.elapsed();

        // The timing should be similar to prevent user enumeration
        // Allow for some variance due to system load
        let ratio = nonexistent_time.as_millis() as f64 / existing_time.as_millis() as f64;
        assert!(
            ratio > 0.5 && ratio < 2.0,
            "Timing attack prevention failed: nonexistent={}ms, existing={}ms",
            nonexistent_time.as_millis(),
            existing_time.as_millis()
        );
    }

    #[test]
    fn test_rate_limiting_effectiveness() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);
        let rate_limiter = auth_service.rate_limiter();

        let email = "test@example.com";

        // Simulate multiple failed attempts
        for i in 0..10 {
            let result = auth_service.authenticate(email, &format!("wrongpass{}", i));
            if i < 5 {
                // First 5 should fail but not be locked out
                assert!(result.is_err());
            }
        }

        // Check if account is locked out
        let is_locked = rate_limiter.is_locked_out(email).unwrap();
        assert!(
            is_locked,
            "Account should be locked out after multiple failed attempts"
        );

        // Verify lockout time
        let remaining = rate_limiter.get_lockout_remaining_time(email).unwrap();
        assert!(remaining.is_some(), "Lockout should have remaining time");
    }

    #[test]
    fn test_session_token_leakage() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);

        // Create and authenticate user
        let _ = auth_service.create_account(
            "test@example.com",
            "testuser",
            "Test",
            "User",
            UserRole::Technician,
            "SecurePass123!",
        );

        let session1 = auth_service
            .authenticate("test@example.com", "SecurePass123!")
            .unwrap();
        let session2 = auth_service
            .authenticate("test@example.com", "SecurePass123!")
            .unwrap();

        // Tokens should be different for each login
        assert_ne!(
            session1.token, session2.token,
            "Session tokens should be unique"
        );
        assert_ne!(
            session1.refresh_token, session2.refresh_token,
            "Refresh tokens should be unique"
        );
    }

    #[test]
    fn test_brute_force_protection() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);

        // Create user
        let _ = auth_service.create_account(
            "test@example.com",
            "testuser",
            "Test",
            "User",
            UserRole::Technician,
            "SecurePass123!",
        );

        // Attempt brute force
        for i in 0..20 {
            let result = auth_service.authenticate("test@example.com", &format!("wrongpass{}", i));
            // Should eventually be locked out
        }

        // Final attempt should definitely fail due to lockout
        let result = auth_service.authenticate("test@example.com", "SecurePass123!");
        assert!(result.is_err(), "Authentication should fail due to lockout");
        assert!(
            result.unwrap_err().contains("locked"),
            "Error should mention lockout"
        );
    }

    #[test]
    fn test_input_validation_comprehensive() {
        let validator = ValidationService::new();

        // Test email validation with malicious inputs
        let malicious_emails = vec![
            "test@exam<script>alert(1)</script>ple.com",
            "test@example.com; DROP TABLE users;",
            "test@127.0.0.1",
            "test@localhost",
            "a".repeat(100) + "@example.com", // Too long local part
        ];

        for email in malicious_emails {
            let result = validator.validate_email(&email);
            assert!(
                result.is_err(),
                "Malicious email '{}' should be rejected",
                email
            );
        }

        // Test password validation
        let weak_passwords = vec![
            "password",
            "12345678",
            "qwerty123",
            "password123",
            "adminadmin",
            "letmein123",
        ];

        for password in weak_passwords {
            let result = validator.validate_password(password);
            assert!(
                result.is_err(),
                "Weak password '{}' should be rejected",
                password
            );
        }
    }

    #[test]
    fn test_command_injection_attempts() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);

        // Test command injection in various fields
        let command_payloads = vec![
            "test@example.com; rm -rf /",
            "test@example.com | cat /etc/passwd",
            "test@example.com && echo 'hacked'",
            "test@example.com || true",
        ];

        for payload in command_payloads {
            let result = auth_service.authenticate(payload, "password123");
            assert!(
                result.is_err(),
                "Command injection '{}' should fail",
                payload
            );
        }
    }

    #[test]
    fn test_format_string_vulnerabilities() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);

        // Test format string attacks
        let format_payloads = vec!["%s%s%s%s%s", "%x%x%x%x", "%n%n%n%n", "%p%p%p%p"];

        for payload in format_payloads {
            let result = auth_service.authenticate(payload, "password123");
            assert!(
                result.is_err(),
                "Format string attack '{}' should fail",
                payload
            );
        }
    }

    #[test]
    fn test_authentication_bypass_attempts() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);

        // Create user
        let _ = auth_service.create_account(
            "test@example.com",
            "testuser",
            "Test",
            "User",
            UserRole::Technician,
            "SecurePass123!",
        );

        // Test various bypass attempts
        let bypass_payloads = vec![
            ("test@example.com", ""),                 // Empty password
            ("", "SecurePass123!"),                   // Empty email
            ("test@example.com", " "),                // Space password
            (" test@example.com ", "SecurePass123!"), // Spaced email
        ];

        for (email, password) in bypass_payloads {
            let result = auth_service.authenticate(email, password);
            assert!(
                result.is_err(),
                "Authentication bypass with email='{}', password='{}' should fail",
                email,
                password
            );
        }
    }

    #[test]
    fn test_session_fixation_attempts() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);

        // Create user
        let _ = auth_service.create_account(
            "test@example.com",
            "testuser",
            "Test",
            "User",
            UserRole::Technician,
            "SecurePass123!",
        );

        // Authenticate to get a session
        let session = auth_service
            .authenticate("test@example.com", "SecurePass123!")
            .unwrap();

        // Try to use the same token multiple times (should work for validation, but new logins should create new tokens)
        let validate1 = auth_service.validate_session(&session.token);
        assert!(validate1.is_ok());

        let validate2 = auth_service.validate_session(&session.token);
        assert!(validate2.is_ok());

        // But logging out should invalidate it
        let _ = auth_service.logout(&session.token);
        let validate3 = auth_service.validate_session(&session.token);
        assert!(validate3.is_err(), "Session should be invalid after logout");
    }

    #[test]
    fn test_mass_assignment_vulnerabilities() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);

        // Test if we can manipulate user creation with additional fields
        // This is more of a conceptual test since we're using direct service calls
        let result = auth_service.create_account(
            "admin@example.com",
            "adminuser",
            "Admin",
            "User",
            UserRole::Admin, // Try to create admin user
            "SecurePass123!",
        );

        // This should work if the service allows it, but in practice we might want to restrict admin creation
        assert!(
            result.is_ok(),
            "Admin user creation should work through service"
        );

        let user = result.unwrap();
        assert_eq!(user.role, UserRole::Admin);
    }

    #[test]
    fn test_information_disclosure() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);

        // Test if error messages leak information
        let result = auth_service.authenticate("nonexistent@example.com", "password");

        if let Err(error_msg) = result {
            // Error should not reveal if email exists or not (to prevent user enumeration)
            assert!(
                !error_msg.to_lowercase().contains("email"),
                "Error message should not mention email existence"
            );
            assert!(
                !error_msg.to_lowercase().contains("user"),
                "Error message should not mention user existence"
            );
        }
    }

    #[test]
    fn test_cryptographic_attacks() {
        let db = setup_test_db();
        let auth_service = AuthService::new(db);

        // Create user
        let _ = auth_service.create_account(
            "test@example.com",
            "testuser",
            "Test",
            "User",
            UserRole::Technician,
            "SecurePass123!",
        );

        // Test if we can authenticate with modified password hashes
        // This is more of a theoretical test since we don't expose hashes
        let result = auth_service.authenticate("test@example.com", "modified_hash");
        assert!(result.is_err(), "Authentication with fake hash should fail");
    }
}
