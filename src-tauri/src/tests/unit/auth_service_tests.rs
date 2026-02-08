//! Unit tests for authentication service
//!
//! Tests the core authentication functionality including:
//! - Username generation and normalization
//! - User authentication and session management
//! - Password hashing and verification
//! - Security monitoring integration

use crate::commands::auth::SignupRequest;
use crate::models::auth::{UserAccount, UserRole, UserSession};
use crate::services::auth::AuthService;
use crate::services::performance_monitor::PerformanceMonitorService;
use crate::services::rate_limiter::RateLimiterService;
use crate::services::security_monitor::SecurityMonitorService;
use crate::services::token::TokenService;
use crate::services::validation::ValidationService;
use crate::test_utils::{test_db, TestDataFactory};

use chrono::Utc;
use std::sync::Arc;
use tempfile::TempDir;

// Set JWT_SECRET for tests
fn setup_test_env() {
    std::env::set_var("JWT_SECRET", "test_jwt_secret_32_bytes_long!");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_auth_service() -> (AuthService, TempDir) {
        setup_test_env();
        let test_db = test_db!();
        let auth_service = AuthService::new(test_db.db()).expect("Failed to create auth service");
        (auth_service, test_db.temp_dir)
    }

    fn create_test_user() -> SignupRequest {
        SignupRequest {
            first_name: "John".to_string(),
            last_name: "Doe".to_string(),
            email: "john.doe@example.com".to_string(),
            phone: Some("555-1234".to_string()),
            password: "SecurePassword123!".to_string(),
            role: UserRole::Technician,
            two_factor_enabled: false,
            avatar_url: None,
            address_street: Some("123 Test St".to_string()),
            address_city: Some("Test City".to_string()),
            address_state: Some("Test State".to_string()),
            address_zip: Some("12345".to_string()),
            address_country: Some("Test Country".to_string()),
            tax_id: None,
            company_name: None,
            contact_person: None,
            notes: None,
            tags: None,
        }
    }

    #[test]
    fn test_generate_username_normal_names() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Test basic name combination
        let username = auth_service
            .generate_username_from_names("John", "Doe")
            .expect("Failed to generate username");
        assert_eq!(username, "john_doe");

        // Test with spaces and mixed case
        let username = auth_service
            .generate_username_from_names("  Alice  ", "  Smith  ")
            .expect("Failed to generate username");
        assert_eq!(username, "alice_smith");
    }

    #[test]
    fn test_generate_username_with_accents() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Test with accented characters
        let username = auth_service
            .generate_username_from_names("José", "García")
            .expect("Failed to generate username");
        assert_eq!(username, "jose_garcia");

        // Test with various special characters
        let username = auth_service
            .generate_username_from_names("François", "Müller")
            .expect("Failed to generate username");
        assert_eq!(username, "francois_muller");
    }

    #[test]
    fn test_generate_username_long_names() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Test with very long names
        let long_first = "Verylongfirstnamethatexceedsnormallimit";
        let long_last = "Verylonglastnamethatexceedsnormallimit";

        let username = auth_service
            .generate_username_from_names(long_first, long_last)
            .expect("Failed to generate username");

        // Should be truncated to reasonable length
        assert!(username.len() <= 30);
        assert!(username.contains("verylongfirst"));
        assert!(username.contains("verylonglast"));
    }

    #[test]
    fn test_generate_username_uniqueness_with_numbers() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // First user should get simple username
        let username1 = auth_service
            .generate_username_from_names("John", "Doe")
            .expect("Failed to generate username");
        assert_eq!(username1, "john_doe");

        // Simulate existing user by manually inserting
        let conn = auth_service
            .db
            .get_connection()
            .expect("Failed to get connection");
        conn.execute(
            "INSERT INTO users (id, username, email, first_name, last_name, password_hash, role, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            [
                uuid::Uuid::new_v4().to_string(),
                "john_doe".to_string(),
                "existing@example.com".to_string(),
                "John".to_string(),
                "Doe".to_string(),
                "hashed_password".to_string(),
                UserRole::Technician.to_string(),
                Utc::now().to_string(),
                Utc::now().to_string(),
            ],
        ).expect("Failed to insert test user");

        // Second user with same name should get number
        let username2 = auth_service
            .generate_username_from_names("John", "Doe")
            .expect("Failed to generate username");
        assert_eq!(username2, "john_doe1");
    }

    #[test]
    fn test_authenticate_valid_credentials() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Create a test user
        let mut user_request = create_test_user();
        user_request.first_name = "Alice".to_string();
        user_request.last_name = "Smith".to_string();
        user_request.email = "alice@example.com".to_string();

        let created_user = auth_service
            .create_account(user_request, "127.0.0.1")
            .expect("Failed to create test user");

        // Authenticate with valid credentials
        let result =
            auth_service.authenticate("alice@example.com", "SecurePassword123!", "127.0.0.1");

        assert!(
            result.is_ok(),
            "Authentication should succeed with valid credentials"
        );
        let session = result.unwrap();
        assert_eq!(session.user_id, created_user.id);
        assert!(!session.token.is_empty());
        assert!(session.expires_at > Utc::now());
    }

    #[test]
    fn test_authenticate_invalid_password() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Create a test user
        let mut user_request = create_test_user();
        user_request.email = "bob@example.com".to_string();

        auth_service
            .create_account(user_request, "127.0.0.1")
            .expect("Failed to create test user");

        // Authenticate with wrong password
        let result = auth_service.authenticate("bob@example.com", "WrongPassword!", "127.0.0.1");

        assert!(
            result.is_err(),
            "Authentication should fail with wrong password"
        );
        let error = result.unwrap_err();
        assert!(error.contains("Invalid credentials"));
    }

    #[test]
    fn test_authenticate_nonexistent_user() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Try to authenticate non-existent user
        let result =
            auth_service.authenticate("nonexistent@example.com", "SomePassword!", "127.0.0.1");

        assert!(
            result.is_err(),
            "Authentication should fail for non-existent user"
        );
        let error = result.unwrap_err();
        assert!(error.contains("Invalid credentials"));
    }

    #[test]
    fn test_authenticate_rate_limiting() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Create a test user
        let mut user_request = create_test_user();
        user_request.email = "ratelimit@example.com".to_string();

        auth_service
            .create_account(user_request, "127.0.0.1")
            .expect("Failed to create test user");

        // Try multiple failed attempts
        for _ in 0..10 {
            let _ =
                auth_service.authenticate("ratelimit@example.com", "WrongPassword!", "127.0.0.1");
        }

        // Should be rate limited now
        let result =
            auth_service.authenticate("ratelimit@example.com", "SecurePassword123!", "127.0.0.1");
        assert!(
            result.is_err(),
            "Should be rate limited after many failed attempts"
        );
        let error = result.unwrap_err();
        assert!(error.contains("Too many login attempts"));
    }

    #[test]
    fn test_create_account_validation() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Test creating account with invalid email
        let mut invalid_user = create_test_user();
        invalid_user.email = "invalid-email".to_string();

        let result = auth_service.create_account(invalid_user, "127.0.0.1");
        assert!(result.is_err(), "Should reject invalid email");

        // Test creating account with weak password
        let mut weak_password_user = create_test_user();
        weak_password_user.email = "weak@example.com".to_string();
        weak_password_user.password = "123".to_string();

        let result = auth_service.create_account(weak_password_user, "127.0.0.1");
        assert!(result.is_err(), "Should reject weak password");

        // Test creating account with duplicate email
        let valid_user = create_test_user();
        let valid_user2 = create_test_user();
        valid_user2.email = "duplicate@example.com".to_string();

        // First user should succeed
        auth_service
            .create_account(valid_user, "127.0.0.1")
            .expect("First user should succeed");

        // Second user with same email should fail
        let result = auth_service.create_account(valid_user2, "127.0.0.1");
        assert!(result.is_err(), "Should reject duplicate email");
    }

    #[test]
    fn test_session_validation() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Create user and authenticate to get session
        let mut user_request = create_test_user();
        user_request.email = "session@example.com".to_string();

        auth_service
            .create_account(user_request, "127.0.0.1")
            .expect("Failed to create test user");

        let session = auth_service
            .authenticate("session@example.com", "SecurePassword123!", "127.0.0.1")
            .expect("Authentication should succeed");

        // Validate session
        let result = auth_service.validate_session(&session.token);
        assert!(result.is_ok(), "Valid session should validate");

        let validated_user = result.unwrap();
        assert_eq!(validated_user.email, "session@example.com");
    }

    #[test]
    fn test_session_validation_invalid_token() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Test with invalid token
        let result = auth_service.validate_session("invalid_token");
        assert!(result.is_err(), "Invalid token should fail validation");
    }

    #[test]
    fn test_logout() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Create user and authenticate
        let mut user_request = create_test_user();
        user_request.email = "logout@example.com".to_string();

        auth_service
            .create_account(user_request, "127.0.0.1")
            .expect("Failed to create test user");

        let session = auth_service
            .authenticate("logout@example.com", "SecurePassword123!", "127.0.0.1")
            .expect("Authentication should succeed");

        // Logout should succeed
        let result = auth_service.logout(&session.token);
        assert!(result.is_ok(), "Logout should succeed");

        // Session should no longer be valid
        let result = auth_service.validate_session(&session.token);
        assert!(result.is_err(), "Logged out session should be invalid");
    }

    #[test]
    fn test_password_change() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Create user
        let mut user_request = create_test_user();
        user_request.email = "changepass@example.com".to_string();

        let user = auth_service
            .create_account(user_request, "127.0.0.1")
            .expect("Failed to create test user");

        // Change password
        let result =
            auth_service.change_password(&user.id, "SecurePassword123!", "NewSecurePassword456!");
        assert!(result.is_ok(), "Password change should succeed");

        // Old password should fail
        let result =
            auth_service.authenticate("changepass@example.com", "SecurePassword123!", "127.0.0.1");
        assert!(result.is_err(), "Old password should fail after change");

        // New password should work
        let result = auth_service.authenticate(
            "changepass@example.com",
            "NewSecurePassword456!",
            "127.0.0.1",
        );
        assert!(result.is_ok(), "New password should work after change");
    }

    #[test]
    fn test_password_change_wrong_current_password() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Create user
        let mut user_request = create_test_user();
        user_request.email = "wrongpass@example.com".to_string();

        let user = auth_service
            .create_account(user_request, "127.0.0.1")
            .expect("Failed to create test user");

        // Try to change with wrong current password
        let result = auth_service.change_password(
            &user.id,
            "WrongCurrentPassword!",
            "NewSecurePassword456!",
        );
        assert!(
            result.is_err(),
            "Password change should fail with wrong current password"
        );
    }

    #[test]
    fn test_cleanup_expired_sessions() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Create user and get multiple sessions
        let mut user_request = create_test_user();
        user_request.email = "cleanup@example.com".to_string();

        auth_service
            .create_account(user_request, "127.0.0.1")
            .expect("Failed to create test user");

        // Create multiple sessions
        for i in 0..5 {
            let session = auth_service
                .authenticate("cleanup@example.com", "SecurePassword123!", "127.0.0.1")
                .expect("Authentication should succeed");

            // Manually expire some sessions by updating expiration time
            if i % 2 == 0 {
                let conn = auth_service
                    .db
                    .get_connection()
                    .expect("Failed to get connection");
                conn.execute(
                    "UPDATE user_sessions SET expires_at = ?1 WHERE token = ?2",
                    [Utc::now().timestamp() - 3600, session.token],
                )
                .expect("Failed to expire session");
            }
        }

        // Run cleanup
        let result = auth_service.cleanup_expired_sessions();
        assert!(result.is_ok(), "Cleanup should succeed");

        let cleanup_count = result.unwrap();
        assert!(
            cleanup_count > 0,
            "Should have cleaned up some expired sessions"
        );
    }
}
