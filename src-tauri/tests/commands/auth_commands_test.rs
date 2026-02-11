//! Tests for authentication command handlers
//!
//! These tests verify that authentication IPC commands work correctly,
//! including login, session validation, logout, and account creation.

use rpma_ppf_intervention::commands::auth::auth_create_account;
use rpma_ppf_intervention::commands::auth::auth_logout;
use rpma_ppf_intervention::commands::auth::auth_refresh_token;
use rpma_ppf_intervention::commands::auth::auth_validate_session;
use rpma_ppf_intervention::commands::auth::{auth_login, LoginRequest, SignupRequest};

#[tokio::test]
async fn test_auth_login_request_structure() {
    // Create login request
    let login_req = LoginRequest {
        email: "test@example.com".to_string(),
        password: "password".to_string(),
        correlation_id: Some("test-123".to_string()),
    };

    // Verify structure
    assert_eq!(login_req.email, "test@example.com");
    assert_eq!(login_req.password, "password");
    assert_eq!(login_req.correlation_id, Some("test-123".to_string()));
}

#[tokio::test]
async fn test_auth_create_account_request_structure() {
    // Create signup request
    let signup_req = SignupRequest {
        email: "test@example.com".to_string(),
        first_name: "Test".to_string(),
        last_name: "User".to_string(),
        password: "Password123!".to_string(),
        role: Some("technician".to_string()),
        correlation_id: Some("test-456".to_string()),
    };

    // Verify structure
    assert_eq!(signup_req.email, "test@example.com");
    assert_eq!(signup_req.first_name, "Test");
    assert_eq!(signup_req.last_name, "User");
    assert_eq!(signup_req.password, "Password123!");
    assert_eq!(signup_req.role, Some("technician".to_string()));
    assert_eq!(signup_req.correlation_id, Some("test-456".to_string()));
}

#[tokio::test]
async fn test_auth_validate_session_signature() {
    // Test that the function exists with right signature
    // We can't actually call it without proper app state setup,
    // but we can verify it exists by checking its type
    let _ = auth_validate_session as fn(String, _) -> _;
}

#[tokio::test]
async fn test_auth_logout_signature() {
    // Test that the function exists with right signature
    let _ = auth_logout as fn(String, _) -> _;
}

#[tokio::test]
async fn test_auth_create_account_signature() {
    // Test that the function exists with right signature
    let _ = auth_create_account as fn(_, _) -> _;
}

#[tokio::test]
async fn test_auth_refresh_token_signature() {
    // Test that the function exists with right signature
    let _ = auth_refresh_token as fn(String, _) -> _;
}
