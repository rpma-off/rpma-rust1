use crate::db::Database;
use crate::domains::settings::infrastructure::settings::SettingsService;
use crate::domains::settings::SettingsFacade;
use crate::shared::ipc::errors::AppError;
use std::sync::Arc;

#[tokio::test]
async fn validate_user_id_rejects_empty_string() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(SettingsService::new(db));
    let facade = SettingsFacade::new(service);
    let err = facade.validate_user_id("").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn validate_user_id_rejects_whitespace_only() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(SettingsService::new(db));
    let facade = SettingsFacade::new(service);
    let err = facade.validate_user_id("   ").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}
