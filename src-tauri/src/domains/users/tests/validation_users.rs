use crate::domains::users::UsersFacade;
use crate::shared::ipc::errors::AppError;

#[test]
fn parse_role_rejects_unknown_role() {
    let facade = UsersFacade::new();

    let err = facade.parse_role("unknown-role").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[test]
fn validate_bootstrap_request_requires_user_id() {
    let facade = UsersFacade::new();

    let err = facade
        .validate_bootstrap_request("", "session-token", "user-1")
        .unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}
