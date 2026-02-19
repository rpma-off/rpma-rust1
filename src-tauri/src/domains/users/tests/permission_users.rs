use crate::domains::users::application::UserAction;
use crate::domains::users::UsersFacade;
use crate::models::auth::{UserRole, UserSession};
use crate::shared::ipc::errors::AppError;

fn build_session(user_id: &str, role: UserRole) -> UserSession {
    UserSession::new(
        user_id.to_string(),
        "test-user".to_string(),
        "test@example.com".to_string(),
        role,
        "token-123".to_string(),
        None,
        3600,
    )
}

#[test]
fn viewer_cannot_list_users() {
    let facade = UsersFacade::new();
    let current_user = build_session("viewer-1", UserRole::Viewer);
    let action = UserAction::List {
        limit: Some(20),
        offset: Some(0),
    };

    let err = facade
        .enforce_action_permissions(&current_user, &action)
        .unwrap_err();
    assert!(matches!(err, AppError::Authorization(_)));
}

#[test]
fn viewer_can_read_own_profile() {
    let facade = UsersFacade::new();
    let current_user = build_session("viewer-1", UserRole::Viewer);
    let action = UserAction::Get {
        id: "viewer-1".to_string(),
    };

    let result = facade.enforce_action_permissions(&current_user, &action);
    assert!(result.is_ok());
}
