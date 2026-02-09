//! Integration tests for Tauri IPC command handlers
//! 
//! These tests verify that the frontend-backend communication works correctly,
//! including validation, authentication, and error handling.

pub mod auth_commands_test;
pub mod task_commands_test;
pub mod intervention_commands_test;
pub mod client_commands_test;
pub mod user_commands_test;

// Test utilities for command testing
use crate::test_utils::{create_test_db, TestContext};
use rpma_ppf_intervention::models::*;
use serde_json::json;

/// Helper to create a valid authentication session for testing
pub async fn create_test_session(ctx: &TestContext) -> String {
    use rpma_ppf_intervention::services::auth::AuthService;
    use rpma_ppf_intervention::models::auth::{CreateUserRequest, UserRole};
    
    // Create admin user
    let user_req = CreateUserRequest {
        email: "admin@test.com".to_string(),
        username: "testadmin".to_string(),
        first_name: "Test",
        last_name: "Admin",
        password: "SecurePass123!".to_string(),
        role: UserRole::Admin,
        is_active: true,
    };
    
    // Need to create user through auth service
    let auth = AuthService::new(ctx.db.clone());
    let user = auth.create_account(&user_req.email, &user_req.username, &user_req.first_name, &user_req.last_name, user_req.role, &user_req.password).unwrap();
    
    // Authenticate and get session token
    let session = auth.authenticate_by_email("admin@test.com", "SecurePass123!", None).await.unwrap();
    session.token
}

/// Helper to create a test technician user
pub async fn create_test_technician(ctx: &TestContext) -> rpma_ppf_intervention::models::auth::UserAccount {
    use rpma_ppf_intervention::services::auth::AuthService;
    use rpma_ppf_intervention::models::auth::{CreateUserRequest, UserRole};
    
    let user_req = CreateUserRequest {
        email: "tech1@test.com".to_string(),
        username: "tech1".to_string(),
        first_name: "Test",
        last_name: "Technician",
        password: "TechPass123!".to_string(),
        role: UserRole::Technician,
        is_active: true,
    };
    
    let auth = AuthService::new(ctx.db.clone());
    auth.create_account(&user_req.email, &user_req.username, &user_req.first_name, &user_req.last_name, user_req.role, &user_req.password).unwrap()
}