use crate::domains::auth::AuthFacade;
use crate::shared::ipc::errors::AppError;

#[test]
fn map_signup_error_returns_validation_for_duplicate_email() {
    let facade = AuthFacade::new();

    let err = facade.map_signup_error("An account with this email already exists");
    assert!(matches!(err, AppError::Validation(_)));
}

#[test]
fn map_signup_error_sanitizes_unknown_database_errors() {
    let facade = AuthFacade::new();

    let err = facade.map_signup_error("UNIQUE constraint failed: users.email");
    assert!(matches!(err, AppError::Database(_)));
}
