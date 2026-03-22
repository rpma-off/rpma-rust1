use crate::domains::auth::AuthFacade;
use crate::shared::contracts::auth::{UserAccount, UserRole};

#[tokio::test]
async fn validate_login_input_normalizes_email() {
    use crate::db::Database;
    use crate::domains::auth::application::auth_security_service::AuthSecurityService;
    use crate::domains::auth::infrastructure::session::SessionService;
    use std::sync::Arc;

    let db = Arc::new(
        Database::new_in_memory()
            .await
            .expect("in-memory DB for test"),
    );
    let session_service = Arc::new(SessionService::new(db));
    let sec_svc = AuthSecurityService::new(session_service);

    let (email, password) = sec_svc
        .validate_login_input("User@Example.com", "StrongPass123!")
        .expect("login input should be valid");

    assert_eq!(email, "user@example.com");
    assert_eq!(password, "StrongPass123!");
}

#[test]
fn ensure_session_token_accepts_non_empty_value() {
    let facade = AuthFacade::new();

    let result = facade.ensure_session_token("token-123");
    assert!(result.is_ok());
}

#[test]
fn serialize_user_account_omits_password_hash_and_salt() {
    let account = UserAccount {
        id: "user-1".to_string(),
        email: "user@example.com".to_string(),
        username: "user".to_string(),
        first_name: "Test".to_string(),
        last_name: "User".to_string(),
        role: UserRole::Admin,
        password_hash: "hashed-password".to_string(),
        salt: Some("salt-value".to_string()),
        phone: None,
        is_active: true,
        last_login: None,
        login_count: 1,
        preferences: None,
        synced: false,
        last_synced_at: None,
        created_at: 1,
        updated_at: 1,
    };

    let value = serde_json::to_value(&account).expect("user account should serialize");
    let object = value
        .as_object()
        .expect("user account should serialize to an object");

    assert!(!object.contains_key("password_hash"));
    assert!(!object.contains_key("salt"));
}
