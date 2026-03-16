// TODO(issue-XXX): Cannot use `TestApp` test harness from within the lib crate.
// Move these tests to the `tests/integration/` folder.

/*
use crate::domains::trash::domain::models::trash::EntityType;
use crate::domains::trash::ipc::{empty_trash, hard_delete_entity, list_trash, restore_entity};
use crate::shared::contracts::auth::UserRole;
use crate::shared::ipc::AppError;
use tests_harness::TestApp;

#[tokio::test]
async fn test_trash_list_requires_supervisor() {
    let app = TestApp::seeded().await;

    // Viewer -> Should Fail
    app.inject_session(UserRole::Viewer);
    let state = app.state();
    let result = list_trash(
        EntityType::Task,
        10,
        0,
        state,
        Some("corr-123".to_string()),
    )
    .await;
    
    assert!(matches!(result, Err(AppError::Authentication(_))));

    // Supervisor -> Should Succeed
    app.inject_session(UserRole::Supervisor);
    let state = app.state();
    let result = list_trash(
        EntityType::Task,
        10,
        0,
        state,
        Some("corr-123".to_string()),
    )
    .await;
    
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_trash_hard_delete_requires_admin() {
    let app = TestApp::seeded().await;

    // Supervisor -> Should Fail
    app.inject_session(UserRole::Supervisor);
    let state = app.state();
    let result = hard_delete_entity(
        EntityType::Task,
        "some-id".to_string(),
        state,
        Some("corr-123".to_string()),
    )
    .await;
    
    assert!(matches!(result, Err(AppError::Authentication(_))));
    
    // Admin -> Should succeed (with not found error since id doesn't exist, but NOT auth error)
    app.inject_session(UserRole::Admin);
    let state = app.state();
    let result = hard_delete_entity(
        EntityType::Task,
        "some-id".to_string(),
        state,
        Some("corr-123".to_string()),
    )
    .await;
    
    assert!(!matches!(result, Err(AppError::Authentication(_))));
}
*/
