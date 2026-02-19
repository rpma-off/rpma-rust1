use crate::domains::auth::AuthFacade;
use crate::shared::ipc::errors::AppError;

#[test]
fn validate_login_input_rejects_invalid_email() {
    let facade = AuthFacade::new();

    let err = facade
        .validate_login_input("not-an-email", "StrongPass123!")
        .unwrap_err();

    assert!(matches!(err, AppError::Validation(_)));
}

#[test]
fn validate_signup_input_rejects_weak_password() {
    let facade = AuthFacade::new();
    let request = crate::domains::auth::application::SignupRequest {
        email: "valid@example.com".to_string(),
        first_name: "Jane".to_string(),
        last_name: "Doe".to_string(),
        password: "123".to_string(),
        role: Some("viewer".to_string()),
        correlation_id: None,
    };

    let err = facade.validate_signup_input(&request).unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}
