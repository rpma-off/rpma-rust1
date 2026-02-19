use crate::domains::users::UsersFacade;
use crate::shared::ipc::errors::AppError;

#[test]
fn bootstrap_request_requires_matching_authenticated_user() {
    let facade = UsersFacade::new();

    let err = facade
        .validate_bootstrap_request("target-user", "session-token", "acting-user")
        .unwrap_err();
    assert!(matches!(err, AppError::Authorization(_)));
}

#[test]
fn ensure_not_self_action_blocks_destructive_self_operations() {
    let facade = UsersFacade::new();

    let err = facade
        .ensure_not_self_action("user-1", "user-1", "delete your own account")
        .unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}
