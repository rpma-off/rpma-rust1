use crate::domains::auth::AuthFacade;
use crate::shared::ipc::errors::AppError;

#[test]
fn ensure_session_token_rejects_empty_values() {
    let facade = AuthFacade::new();

    let err = facade.ensure_session_token("").unwrap_err();
    assert!(matches!(err, AppError::Authentication(_)));
}

#[test]
fn ensure_session_token_rejects_whitespace_values() {
    let facade = AuthFacade::new();

    let err = facade.ensure_session_token("   ").unwrap_err();
    assert!(matches!(err, AppError::Authentication(_)));
}
