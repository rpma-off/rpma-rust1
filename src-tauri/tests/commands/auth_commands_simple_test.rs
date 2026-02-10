//! Simple test for basic auth request structure validation

use rpma_ppf_intervention::commands::auth::{auth_login, LoginRequest};

#[test]
fn test_basic_auth_login_structure() {
    // Test that login request can be created correctly
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
