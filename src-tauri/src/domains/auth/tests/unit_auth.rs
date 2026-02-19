use crate::domains::auth::AuthFacade;

#[test]
fn validate_login_input_normalizes_email() {
    let facade = AuthFacade::new();

    let (email, password) = facade
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
