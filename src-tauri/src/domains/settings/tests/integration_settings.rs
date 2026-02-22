use crate::db::Database;
use crate::domains::settings::infrastructure::settings::SettingsService;
use crate::domains::settings::SettingsFacade;
use std::sync::Arc;

#[tokio::test]
async fn settings_facade_debug_output() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(SettingsService::new(db));
    let facade = SettingsFacade::new(service);
    let debug = format!("{:?}", facade);
    assert!(debug.contains("SettingsFacade"));
}

#[tokio::test]
async fn settings_facade_exposes_service() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(SettingsService::new(db));
    let facade = SettingsFacade::new(service);
    let _svc = facade.settings_service();
}
