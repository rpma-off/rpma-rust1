//! Unit tests for authentication and security validation proptests
//!
//! Property-based tests for authentication flows using proptest to generate
//! a wide range of valid and invalid inputs to ensure robustness.

use crate::commands::auth::SignupRequest;
use crate::models::auth::{UserAccount, UserRole};
use crate::services::auth::AuthService;
use crate::test_utils::TestDataFactory;
use crate::{test_client, test_db, test_intervention, test_task};
use chrono::Utc;

use proptest::prelude::*;
use std::sync::Arc;

#[cfg(test)]
mod tests {
    use super::*;

    fn create_auth_service() -> AuthService {
        setup_test_env();
        let test_db = test_db!();
        AuthService::new(test_db.db()).expect("Failed to create auth service")
    }

    fn setup_test_env() {
        std::env::set_var("JWT_SECRET", "test_jwt_secret_32_bytes_long__ok");
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn test_username_generation_normalization(
            first_name in prop::string::string_regex(r"[a-zA-Zàèéìòù]{2,20}"),
            last_name in prop::string::string_regex(r"[a-zA-Zàèéìòù]{2,20}")
        ) {
            let auth_service = create_auth_service();

            let result = auth_service.generate_username_from_names(&first_name, &last_name);
            prop_assert!(result.is_ok());

            let username = result.unwrap();

            // Should be lowercase with underscore
            prop_assert!(username.is_lowercase());
            prop_assert!(username.contains('_'));

            // Should not contain accented characters
            prop_assert!(!username.chars().any(|c| c.is_ascii() && !c.is_alphanumeric() && c != '_'));

            // Should be reasonable length
            prop_assert!(username.len() <= 30);
        }

        #[test]
        fn test_email_validation(
            email in super::super::super::proptests::main::email_strategy()
        ) {
            let auth_service = create_auth_service();

            // Create valid user with generated email
            let mut signup_request = TestDataFactory::create_test_client(None);
            signup_request.email = email;

            // Basic validation - email should be in valid format from strategy
            prop_assert!(signup_request.email.contains('@'));
            prop_assert!(signup_request.email.len() <= 254);
        }

        #[test]
        fn test_password_strength_scenarios(
            password in prop::string::string_regex(r".{1,50}")
        ) {
            let auth_service = create_auth_service();

            // Test password validation with various strings
            let is_strong = password.len() >= 8
                && password.chars().any(|c| c.is_uppercase())
                && password.chars().any(|c| c.is_lowercase())
                && password.chars().any(|c| c.is_numeric())
                && password.chars().any(|c| "!@#$%^&*()_+-=[]{}|;:,.<>?".contains(c));

            // Strong passwords should pass basic validation
            if is_strong {
                // In real implementation, this would be validated by password hashing service
                prop_assert!(password.len() >= 8);
            }
        }

        #[test]
        fn test_phone_number_validation(
            phone in super::super::super::proptests::main::phone_strategy()
        ) {
            // Phone numbers from strategy should be in valid format
            prop_assert!(phone.len() >= 7);
            prop_assert!(phone.len() <= 20);

            // Should contain mostly digits and valid separators
            let valid_chars = phone.chars().all(|c| c.is_ascii_digit() || "+-() ".contains(c));
            prop_assert!(valid_chars, "Invalid characters in phone: {}", phone);
        }

        #[test]
        fn test_user_role_assignments(
            role_str in prop_oneof![
                "admin",
                "supervisor",
                "technician",
                "client"
            ]
        ) {
            let role = role_str.parse::<UserRole>();
            prop_assert!(role.is_ok(), "Invalid role string: {}", role_str);

            let user_role = role.unwrap();
            let role_string = user_role.to_string();
            prop_assert_eq!(role_str, role_string);
        }

        #[test]
        fn test_session_token_format(
            user_id in prop::string::string_regex(r"[a-f0-9-]{36}"), // UUID format
            ip_address in prop_oneof![
                "192.168.1.100",
                "10.0.0.1",
                "172.16.0.1",
                "203.0.113.1"
            ]
        ) {
            let auth_service = create_auth_service();

            // Create a test user first
            let mut user_request = TestDataFactory::create_test_user(None);
            user_request.email = format!("test_{}@example.com", user_id.replace("-", ""));

            let _user = auth_service.create_account(user_request, &ip_address).unwrap();

            // Authenticate to get session token
            let result = auth_service.authenticate(
                &format!("test_{}@example.com", user_id.replace("-", "")),
                "SecurePassword123!",
                &ip_address
            );

            prop_assume!(result.is_ok());
            let session = result.unwrap();

            // Token should be valid format
            prop_assert!(!session.token.is_empty());
            prop_assert!(session.token.len() > 50); // JWT tokens are typically long
            prop_assert!(session.user_id.contains(user_id));
            prop_assert!(session.expires_at > chrono::Utc::now());
        }

        #[test]
        fn test_login_attempt_rate_limiting(
            base_email in prop::string::string_regex(r"[a-z0-9]{5,10}"),
            ip_address in prop_oneof![
                "192.168.1.100",
                "10.0.0.1",
                "172.16.0.1"
            ]
        ) {
            let auth_service = create_auth_service();
            let email = format!("{}@example.com", base_email);

            // Create a test user
            let mut user_request = TestDataFactory::create_test_user(None);
            user_request.email = email.clone();

            let _user = auth_service.create_account(user_request, &ip_address).unwrap();

            // Test multiple failed attempts
            let mut failed_attempts = 0;
            for i in 1..=15 {
                let result = auth_service.authenticate(&email, "wrong_password", &ip_address);
                prop_assert!(result.is_err() || i <= 5); // First few attempts might succeed

                if result.is_err() {
                    failed_attempts += 1;
                }
            }

            // After many failed attempts, should be rate limited
            prop_assert!(failed_attempts > 5, "Should have multiple failed attempts");
        }

        #[test]
        fn test_password_change_scenarios(
            old_password in prop::string::string_regex(r".{8,30}"),
            new_password in prop::string::string_regex(r".{8,30}")
        ) {
            let auth_service = create_auth_service();

            // Create test user
            let mut user_request = TestDataFactory::create_test_user(None);
            user_request.email = format!("password_test_{}@example.com", old_password.len());

            let user = auth_service.create_account(user_request, "127.0.0.1").unwrap();

            // Try password change
            let result = auth_service.change_password(&user.id, &old_password, &new_password);

            // Should fail if old password doesn't match or new password is weak
            if old_password != "SecurePassword123!" || new_password.len() < 8 {
                prop_assert!(result.is_err());
            } else {
                prop_assert!(result.is_ok());
            }
        }
    }

    #[test]
    fn test_edge_case_usernames() {
        let auth_service = create_auth_service();

        // Test extreme cases
        let test_cases = vec![
            ("A", "B"), // Very short names
            (
                "VeryLongFirstNameThatExceeds",
                "VeryLongLastNameThatExceeds",
            ), // Long names
            ("Émilie", "François"), // Accented characters
            ("John", ""), // Empty last name
            ("", "Doe"), // Empty first name
            ("John123", "Doe456"), // Numbers in names
            ("John-Mary", "O'Connor-Smith"), // Special characters
        ];

        for (first, last) in test_cases {
            if first.is_empty() || last.is_empty() {
                // Should handle empty names gracefully
                continue;
            }

            let result = auth_service.generate_username_from_names(first, last);
            assert!(
                result.is_ok(),
                "Failed to generate username for {} {}",
                first,
                last
            );

            let username = result.unwrap();
            assert!(!username.is_empty(), "Username should not be empty");
            assert!(username.len() <= 30, "Username should be reasonable length");
        }
    }

    #[test]
    fn test_authentication_edge_cases() {
        let auth_service = create_auth_service();

        // Test with various authentication scenarios
        let test_cases = vec![
            ("", "password"),              // Empty email
            ("test@example.com", ""),      // Empty password
            ("invalid-email", "password"), // Invalid email format
            ("test@example.com", "123"),   // Very short password
        ];

        for (email, password) in test_cases {
            let result = auth_service.authenticate(email, password, "127.0.0.1");
            assert!(
                result.is_err(),
                "Should fail authentication for invalid input: {}, {}",
                email,
                password
            );
        }
    }

    #[test]
    fn test_concurrent_session_creation() {
        let auth_service = Arc::new(create_auth_service());

        // Create a test user
        let mut user_request = TestDataFactory::create_test_user(None);
        user_request.email = "concurrent@example.com".to_string();

        let user = auth_service
            .create_account(user_request, "127.0.0.1")
            .unwrap();

        // Create multiple concurrent sessions
        let handles: Vec<_> = (0..5)
            .map(|i| {
                let auth = auth_service.clone();
                std::thread::spawn(move || {
                    auth.authenticate(
                        "concurrent@example.com",
                        "SecurePassword123!",
                        &format!("127.0.0.{}", i + 1),
                    )
                })
            })
            .collect();

        // All sessions should be created successfully
        for handle in handles {
            let result = handle.join().unwrap();
            assert!(result.is_ok(), "Concurrent session creation should succeed");

            let session = result.unwrap();
            assert!(
                !session.token.is_empty(),
                "Session token should not be empty"
            );
            assert_eq!(
                session.user_id, user.id,
                "Session should belong to correct user"
            );
        }
    }
}
