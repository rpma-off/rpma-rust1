//! Unit tests for authentication service
//!
//! Tests the core authentication functionality including:
//! - Username generation and normalization
//! - User authentication and session management
//! - Password hashing and verification
//! - Security monitoring integration

use crate::domains::auth::application::SignupRequest;
use crate::models::auth::{UserAccount, UserRole, UserSession};
use crate::domains::auth::infrastructure::auth::AuthService;
use crate::shared::services::performance_monitor::PerformanceMonitorService;
use crate::domains::auth::infrastructure::rate_limiter::RateLimiterService;
use crate::domains::audit::infrastructure::security_monitor::SecurityMonitorService;
use crate::domains::auth::infrastructure::token;
use crate::domains::auth::infrastructure::token::TokenService;
use crate::shared::services::validation::ValidationService;
use crate::test_utils::TestDataFactory;
use crate::{test_client, test_db, test_intervention, test_task};

use chrono::Utc;
use std::sync::Arc;
use tempfile::TempDir;

// Set JWT_SECRET for tests
fn setup_test_env() {
    std::env::set_var("JWT_SECRET", "test_jwt_secret_32_bytes_long__ok");
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
            .generate_username_from_names("JosÃƒÂ©", "GarcÃƒÂ­a")
            .expect("Failed to generate username");
        assert_eq!(username, "jose_garcia");

        // Test with various special characters
        let username = auth_service
            .generate_username_from_names("FranÃƒÂ§ois", "MÃƒÂ¼ller")
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
            .create_account_from_signup(&user_request)
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
    fn test_session_tokens_hashed_in_storage() {
        setup_test_env();
        let test_db = test_db!();
        let auth_service = AuthService::new(test_db.db()).expect("Failed to create auth service");

        let mut user_request = create_test_user();
        user_request.email = "hashed@example.com".to_string();
        let created_user = auth_service
            .create_account(user_request, "127.0.0.1")
            .expect("Failed to create test user");

        let session = auth_service
            .authenticate("hashed@example.com", "SecurePassword123!", "127.0.0.1")
            .expect("Authentication should succeed");

        let conn = test_db
            .db
            .get_connection()
            .expect("Failed to get connection");
        let (stored_token, stored_refresh): (String, Option<String>) = conn
            .query_row(
                "SELECT token, refresh_token FROM user_sessions WHERE user_id = ?",
                [created_user.id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("Failed to read stored tokens");

        let expected_token_hash =
            token::hash_token_with_env(&session.token).expect("Failed to hash token");
        assert_eq!(stored_token, expected_token_hash);

        if let Some(refresh_token) = session.refresh_token {
            let expected_refresh_hash =
                token::hash_token_with_env(&refresh_token).expect("Failed to hash refresh token");
            assert_eq!(
                stored_refresh.as_deref(),
                Some(expected_refresh_hash.as_str())
            );
        }
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
    fn test_logout_invalidates_only_target_session() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Create user
        let mut user_request = create_test_user();
        user_request.email = "multi_session@example.com".to_string();

        auth_service
            .create_account(user_request, "127.0.0.1")
            .expect("Failed to create test user");

        // Create two sessions
        let session1 = auth_service
            .authenticate(
                "multi_session@example.com",
                "SecurePassword123!",
                "127.0.0.1",
            )
            .expect("First authentication should succeed");

        let session2 = auth_service
            .authenticate(
                "multi_session@example.com",
                "SecurePassword123!",
                "127.0.0.1",
            )
            .expect("Second authentication should succeed");

        // Logout session 1
        auth_service
            .logout(&session1.token)
            .expect("Logout should succeed");

        // Session 1 should be invalid
        let result = auth_service.validate_session(&session1.token);
        assert!(result.is_err(), "Logged out session should be invalid");

        // Session 2 should still be valid
        let result = auth_service.validate_session(&session2.token);
        assert!(
            result.is_ok(),
            "Other session should remain valid after logging out a different session"
        );
    }

    #[test]
    fn test_login_after_logout() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Create user and authenticate
        let mut user_request = create_test_user();
        user_request.email = "relogin@example.com".to_string();

        auth_service
            .create_account(user_request, "127.0.0.1")
            .expect("Failed to create test user");

        let session = auth_service
            .authenticate("relogin@example.com", "SecurePassword123!", "127.0.0.1")
            .expect("Authentication should succeed");

        // Logout
        auth_service
            .logout(&session.token)
            .expect("Logout should succeed");

        // Should be able to re-authenticate after logout
        let new_session = auth_service
            .authenticate("relogin@example.com", "SecurePassword123!", "127.0.0.1")
            .expect("Re-authentication after logout should succeed");

        // New session should be valid
        let result = auth_service.validate_session(&new_session.token);
        assert!(result.is_ok(), "New session after re-login should be valid");

        // Old session should still be invalid
        let result = auth_service.validate_session(&session.token);
        assert!(
            result.is_err(),
            "Old session should remain invalid after re-login"
        );
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
        let result = auth_service.change_password(&user.id, "NewSecurePassword456!");
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
                let token_hash = token::hash_token_with_env(&session.token)
                    .expect("Failed to hash session token");
                conn.execute(
                    "UPDATE user_sessions SET expires_at = ?1 WHERE token = ?2",
                    [Utc::now().timestamp() - 3600, token_hash],
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

    // ========== USER MANAGEMENT TESTS ==========

    #[test]
    fn test_list_users_empty() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // List users when none exist
        let result = auth_service.list_users(None, None);
        assert!(result.is_ok(), "Listing users should succeed");

        let users = result.unwrap();
        assert!(users.is_empty(), "Should return empty list when no users");
    }

    #[test]
    fn test_list_users_with_data() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Create test users
        for i in 0..3 {
            let mut user_request = create_test_user();
            user_request.email = format!("user{}@example.com", i);
            user_request.first_name = format!("User{}", i);

            auth_service
                .create_account(user_request, "127.0.0.1")
                .expect("Failed to create test user");
        }

        // List all users
        let result = auth_service.list_users(None, None);
        assert!(result.is_ok(), "Listing users should succeed");

        let users = result.unwrap();
        assert_eq!(users.len(), 3, "Should return all created users");

        // Verify ordering (should be by created_at DESC)
        for (i, user) in users.iter().enumerate() {
            assert!(user.email.contains(&format!("user{}@example.com", 2 - i)));
        }
    }

    #[test]
    fn test_list_users_with_pagination() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Create test users
        for i in 0..5 {
            let mut user_request = create_test_user();
            user_request.email = format!("paginate{}@example.com", i);

            auth_service
                .create_account(user_request, "127.0.0.1")
                .expect("Failed to create test user");
        }

        // Test pagination - first page with limit 2
        let result = auth_service.list_users(Some(2), Some(0));
        assert!(result.is_ok(), "Paginated listing should succeed");

        let first_page = result.unwrap();
        assert_eq!(first_page.len(), 2, "First page should have 2 users");

        // Test pagination - second page
        let result = auth_service.list_users(Some(2), Some(2));
        assert!(result.is_ok(), "Second page should succeed");

        let second_page = result.unwrap();
        assert_eq!(second_page.len(), 2, "Second page should have 2 users");

        // Verify different users on different pages
        let first_page_ids: Vec<_> = first_page.iter().map(|u| &u.id).collect();
        let second_page_ids: Vec<_> = second_page.iter().map(|u| &u.id).collect();

        for id1 in &first_page_ids {
            assert!(
                !second_page_ids.contains(&id1),
                "Pages should have different users"
            );
        }
    }

    #[test]
    fn test_get_user_existing() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Create test user
        let mut user_request = create_test_user();
        user_request.email = "getme@example.com".to_string();
        user_request.first_name = "Get".to_string();
        user_request.last_name = "Me".to_string();

        let created_user = auth_service
            .create_account(user_request, "127.0.0.1")
            .expect("Failed to create test user");

        // Get user by ID
        let result = auth_service.get_user(&created_user.id);
        assert!(result.is_ok(), "Getting user should succeed");

        let retrieved_user = result.unwrap();
        assert!(retrieved_user.is_some(), "User should exist");

        let user = retrieved_user.unwrap();
        assert_eq!(user.id, created_user.id);
        assert_eq!(user.email, "getme@example.com");
        assert_eq!(user.first_name, "Get");
        assert_eq!(user.last_name, "Me");
        assert_eq!(user.role, UserRole::Technician);
        assert!(user.is_active);
    }

    #[test]
    fn test_get_user_nonexistent() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Try to get non-existent user
        let fake_id = uuid::Uuid::new_v4().to_string();
        let result = auth_service.get_user(&fake_id);
        assert!(result.is_ok(), "Query should succeed");

        let user = result.unwrap();
        assert!(user.is_none(), "Non-existent user should return None");
    }

    #[test]
    fn test_update_user_all_fields() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Create test user
        let mut user_request = create_test_user();
        user_request.email = "update@example.com".to_string();
        user_request.role = UserRole::Technician;

        let created_user = auth_service
            .create_account(user_request, "127.0.0.1")
            .expect("Failed to create test user");

        // Update all fields
        let result = auth_service.update_user(
            &created_user.id,
            Some("updated@example.com"),
            Some("Updated"),
            Some("Name"),
            Some(UserRole::Admin),
            Some(false),
        );
        assert!(result.is_ok(), "Update should succeed");

        let updated_user = result.unwrap();
        assert_eq!(updated_user.id, created_user.id);
        assert_eq!(updated_user.email, "updated@example.com");
        assert_eq!(updated_user.first_name, "Updated");
        assert_eq!(updated_user.last_name, "Name");
        assert_eq!(updated_user.role, UserRole::Admin);
        assert!(!updated_user.is_active);
        assert!(updated_user.updated_at > created_user.updated_at);
    }

    #[test]
    fn test_update_user_partial_fields() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Create test user
        let mut user_request = create_test_user();
        user_request.email = "partial@example.com".to_string();
        user_request.first_name = "Partial";
        user_request.last_name = "Update";
        user_request.role = UserRole::Technician;

        let created_user = auth_service
            .create_account(user_request, "127.0.0.1")
            .expect("Failed to create test user");

        // Update only email
        let result = auth_service.update_user(
            &created_user.id,
            Some("partial-updated@example.com"),
            None,
            None,
            None,
            None,
        );
        assert!(result.is_ok(), "Partial update should succeed");

        let updated_user = result.unwrap();
        assert_eq!(updated_user.email, "partial-updated@example.com");
        assert_eq!(updated_user.first_name, "Partial"); // Should remain unchanged
        assert_eq!(updated_user.last_name, "Update"); // Should remain unchanged
        assert_eq!(updated_user.role, UserRole::Technician); // Should remain unchanged
    }

    #[test]
    fn test_update_user_nonexistent() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Try to update non-existent user
        let fake_id = uuid::Uuid::new_v4().to_string();
        let result =
            auth_service.update_user(&fake_id, Some("fake@example.com"), None, None, None, None);
        assert!(result.is_err(), "Update should fail for non-existent user");
        assert!(result.unwrap_err().contains("User not found"));
    }

    #[test]
    fn test_delete_user_soft_delete() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Create test user
        let mut user_request = create_test_user();
        user_request.email = "delete@example.com".to_string();

        let created_user = auth_service
            .create_account(user_request, "127.0.0.1")
            .expect("Failed to create test user");

        // Verify user is active before deletion
        let user_before = auth_service.get_user(&created_user.id).unwrap().unwrap();
        assert!(
            user_before.is_active,
            "User should be active before deletion"
        );

        // Delete user (soft delete)
        let result = auth_service.delete_user(&created_user.id);
        assert!(result.is_ok(), "Delete should succeed");

        // Verify user is now inactive but still exists
        let user_after = auth_service.get_user(&created_user.id).unwrap().unwrap();
        assert!(
            !user_after.is_active,
            "User should be inactive after deletion"
        );
        assert_eq!(user_after.id, created_user.id); // Same user record
    }

    #[test]
    fn test_delete_user_nonexistent() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Try to delete non-existent user
        let fake_id = uuid::Uuid::new_v4().to_string();
        let result = auth_service.delete_user(&fake_id);
        assert!(
            result.is_ok(),
            "Delete should succeed even for non-existent user (idempotent)"
        );
    }

    #[test]
    fn test_user_role_consistency() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Test all user roles
        let roles = vec![
            (UserRole::Admin, "admin@example.com"),
            (UserRole::Technician, "tech@example.com"),
            (UserRole::Supervisor, "sup@example.com"),
            (UserRole::Viewer, "viewer@example.com"),
        ];

        for (role, email) in roles {
            let mut user_request = create_test_user();
            user_request.email = email.to_string();
            user_request.role = role.clone();

            let created_user = auth_service
                .create_account(user_request, "127.0.0.1")
                .expect("Failed to create user");

            // Verify role is persisted correctly
            let retrieved_user = auth_service.get_user(&created_user.id).unwrap().unwrap();

            assert_eq!(retrieved_user.role, role, "Role should match for {}", email);
        }
    }

    #[test]
    fn test_user_data_integrity() {
        let (auth_service, _temp_dir) = create_test_auth_service();

        // Create user with all optional fields
        let mut user_request = create_test_user();
        user_request.email = "integrity@example.com".to_string();
        user_request.phone = Some("555-TEST".to_string());
        user_request.address_street = Some("123 Test St".to_string());
        user_request.address_city = Some("Test City".to_string());

        let created_user = auth_service
            .create_account(user_request, "127.0.0.1")
            .expect("Failed to create test user");

        // Retrieve user multiple times to ensure consistency
        for _ in 0..3 {
            let retrieved_user = auth_service.get_user(&created_user.id).unwrap().unwrap();

            assert_eq!(retrieved_user.id, created_user.id);
            assert_eq!(retrieved_user.email, created_user.email);
            assert_eq!(retrieved_user.username, created_user.username);
            assert_eq!(retrieved_user.first_name, created_user.first_name);
            assert_eq!(retrieved_user.last_name, created_user.last_name);
            assert_eq!(retrieved_user.role, created_user.role);
            assert_eq!(retrieved_user.phone, created_user.phone);
            assert_eq!(retrieved_user.is_active, created_user.is_active);
        }
    }
}
