use std::sync::Arc;
use crate::db::Database;
use crate::domains::settings::infrastructure::settings::SettingsService;
use crate::domains::settings::SettingsFacade;

#[tokio::test]
async fn settings_facade_is_ready() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(SettingsService::new(db));
    let facade = SettingsFacade::new(service);
    assert!(facade.is_ready());
}

#[tokio::test]
async fn validate_user_id_accepts_valid_id() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(SettingsService::new(db));
    let facade = SettingsFacade::new(service);
    assert!(facade.validate_user_id("user-123").is_ok());
}
