use crate::db::Database;
use crate::domains::settings::infrastructure::settings::SettingsService;
use crate::domains::settings::SettingsFacade;
use std::sync::Arc;

#[tokio::test]
async fn settings_facade_service_is_shared_reference() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(SettingsService::new(db));
    let facade = SettingsFacade::new(service);
    let svc1 = facade.settings_service();
    let svc2 = facade.settings_service();
    assert!(Arc::ptr_eq(svc1, svc2));
}

#[tokio::test]
async fn validate_user_id_accepts_trimmed_id() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(SettingsService::new(db));
    let facade = SettingsFacade::new(service);
    assert!(facade.validate_user_id("  user-123  ").is_ok());
}
