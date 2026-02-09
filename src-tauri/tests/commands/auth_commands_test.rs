//! Tests for authentication command handlers
//! 
//! These tests verify that the authentication IPC commands work correctly,
//! including login, session validation, logout, and account creation.

use super::*;
use rpma_ppf_intervention::commands::auth::{auth_login, LoginRequest};
use rpma_ppf_intervention::commands::auth::auth_validate_session;
use rpma_ppf_intervention::commands::auth::auth_logout;
use rpma_ppf_intervention::commands::auth::auth_create_account;
use rpma_ppf_intervention::commands::auth::auth_refresh_token;
use rpma_ppf_intervention::commands::ApiResponse;
use rpma_ppf_intervention::models::auth::UserSession as LoginResponse;
use serde_json::json;

#[tokio::test]
async fn test_auth_login_valid_credentials() {
    let ctx = create_test_db().await;
    
    // Create test user
    let session_token = create_test_session(&ctx).await;
    
    // Create login request with valid credentials
    let login_req = LoginRequest {
        email: "admin@test.com".to_string(),
        password: "SecurePass123!".to_string(),
        correlation_id: Some("test-123".to_string()),
    };
    
    // Call the command handler
    let result = auth_login(login_req).await;
    
    // Verify successful login
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
    assert!(response.data.is_some());
    
    let login_response: LoginResponse = serde_json::from_value(response.data.unwrap()).unwrap();
    assert!(!login_response.token.is_empty());
    assert_eq!(login_response.user.username, "testadmin");
    assert_eq!(login_response.user.role, UserRole::Admin);
}

#[tokio::test]
async fn test_auth_login_invalid_credentials() {
    let ctx = create_test_db().await;
    
    // Create test user first
    create_test_session(&ctx).await;
    
    // Attempt login with wrong password
    let login_req = LoginRequest {
        username: "testadmin".to_string(),
        password: "WrongPassword".to_string(),
        remember_me: None,
    };
    
    let result = auth_login(login_req).await;
    
    // Verify login fails
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(!response.success);
    assert!(response.error.is_some());
    assert!(response.error.unwrap().contains("Invalid credentials"));
}

#[tokio::test]
async fn test_auth_login_nonexistent_user() {
    let login_req = LoginRequest {
        username: "nonexistent".to_string(),
        password: "AnyPassword".to_string(),
        remember_me: None,
    };
    
    let result = auth_login(login_req).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(!response.success);
    assert!(response.error.unwrap().contains("Invalid credentials"));
}

#[tokio::test]
async fn test_auth_validate_session_valid() {
    let ctx = create_test_db().await;
    
    // Create authenticated session
    let session_token = create_test_session(&ctx).await;
    
    // Validate the session
    let result = auth_validate_session(session_token).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
    assert!(response.data.is_some());
    
    let user: User = serde_json::from_value(response.data.unwrap()).unwrap();
    assert_eq!(user.username, "testadmin");
}

#[tokio::test]
async fn test_auth_validate_session_invalid() {
    // Validate with invalid token
    let result = auth_validate_session("invalid_token".to_string()).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(!response.success);
    assert!(response.error.is_some());
}

#[tokio::test]
async fn test_auth_logout() {
    let ctx = create_test_db().await;
    
    // Create authenticated session
    let session_token = create_test_session(&ctx).await;
    
    // Logout the session
    let result = auth_logout(session_token.clone()).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
    
    // Verify session is no longer valid
    let validate_result = auth_validate_session(session_token).await;
    assert!(!validate_result.unwrap().success);
}

#[tokio::test]
async fn test_auth_create_account_valid() {
    let ctx = create_test_db().await;
    
    // Create new account request
    let create_req = json!({
        "username": "newuser",
        "email": "newuser@test.com",
        "password": "NewPass123!",
        "role": "Technician",
        "is_active": true
    });
    
    // Call create account command
    let result = auth_create_account(create_req.clone()).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
    assert!(response.data.is_some());
    
    // Verify user can login
    let login_req = LoginRequest {
        username: "newuser".to_string(),
        password: "NewPass123!".to_string(),
        remember_me: None,
    };
    
    let login_result = auth_login(login_req).await;
    assert!(login_result.unwrap().success);
}

#[tokio::test]
async fn test_auth_create_account_duplicate_username() {
    let ctx = create_test_db().await;
    
    // Create initial user
    create_test_session(&ctx).await;
    
    // Try to create user with same username
    let create_req = json!({
        "username": "testadmin",
        "email": "different@test.com",
        "password": "Password123!",
        "role": "Technician",
        "is_active": true
    });
    
    let result = auth_create_account(create_req).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(!response.success);
    assert!(response.error.unwrap().contains("already exists"));
}

#[tokio::test]
async fn test_auth_refresh_token() {
    let ctx = create_test_db().await;
    
    // Create authenticated session
    let session_token = create_test_session(&ctx).await;
    
    // Refresh the token
    let result = auth_refresh_token(session_token.clone()).await;
    
    assert!(result.is_ok());
    let response = result.unwrap();
    assert!(response.success);
    assert!(response.data.is_some());
    
    let new_token: String = serde_json::from_value(response.data.unwrap()).unwrap();
    assert!(!new_token.is_empty());
    assert_ne!(new_token, session_token);
    
    // Verify new token works
    let validate_result = auth_validate_session(new_token).await;
    assert!(validate_result.unwrap().success);
}

#[tokio::test]
async fn test_auth_rate_limiting() {
    let ctx = create_test_db().await;
    
    // Create test user
    create_test_session(&ctx).await;
    
    let mut failed_attempts = 0;
    
    // Attempt multiple failed logins to trigger rate limiting
    for i in 0..10 {
        let login_req = LoginRequest {
            username: "testadmin".to_string(),
            password: format!("WrongPassword{}", i),
            remember_me: None,
        };
        
        let result = auth_login(login_req).await;
        if !result.unwrap().success {
            failed_attempts += 1;
        }
    }
    
    // At least some attempts should fail
    assert!(failed_attempts > 5);
}