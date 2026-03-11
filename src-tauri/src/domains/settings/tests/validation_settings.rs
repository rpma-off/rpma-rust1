use crate::db::Database;
use crate::domains::settings::application::SystemConfigService;
use crate::domains::settings::infrastructure::settings::SettingsService;
use crate::domains::settings::SettingsFacade;
use crate::shared::context::auth_context::AuthContext;
use crate::shared::context::request_context::RequestContext;
use crate::shared::contracts::auth::{UserRole, UserSession};
use crate::shared::ipc::errors::AppError;
use std::sync::Arc;

// ─── helpers ────────────────────────────────────────────────────────────────

fn make_admin_ctx() -> RequestContext {
    let session = UserSession::new(
        "admin-1".into(),
        "admin".into(),
        "admin@example.com".into(),
        UserRole::Admin,
        "sess-1".into(),
        3600,
    );
    RequestContext::new(AuthContext::from(&session), "corr-test".into())
}

fn make_system_config_service(db: Arc<Database>) -> SystemConfigService {
    let settings_svc = Arc::new(SettingsService::new(db));
    SystemConfigService::new(settings_svc)
}

// ─── SettingsFacade / user-id validation (pre-existing) ─────────────────────

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

// ─── SystemConfigService::update_business_rules validation ──────────────────

#[tokio::test]
async fn update_business_rules_rejects_empty_array() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let svc = make_system_config_service(db);
    let ctx = make_admin_ctx();
    let err = svc.update_business_rules(&ctx, vec![]).unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn update_business_rules_rejects_non_object_element() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let svc = make_system_config_service(db);
    let ctx = make_admin_ctx();
    let err = svc
        .update_business_rules(&ctx, vec![serde_json::Value::Bool(true)])
        .unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

// ─── SystemConfigService::update_security_policies validation ───────────────

#[tokio::test]
async fn update_security_policies_rejects_empty_array() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let svc = make_system_config_service(db);
    let ctx = make_admin_ctx();
    let err = svc.update_security_policies(&ctx, vec![]).unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

// ─── SystemConfigService::update_integrations validation ────────────────────

#[tokio::test]
async fn update_integrations_rejects_empty_array() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let svc = make_system_config_service(db);
    let ctx = make_admin_ctx();
    let err = svc.update_integrations(&ctx, vec![]).unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

// ─── SystemConfigService::update_performance_configs validation ─────────────

#[tokio::test]
async fn update_performance_configs_rejects_empty_array() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let svc = make_system_config_service(db);
    let ctx = make_admin_ctx();
    let err = svc.update_performance_configs(&ctx, vec![]).unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

// ─── SystemConfigService::update_business_hours validation ──────────────────

#[tokio::test]
async fn update_business_hours_rejects_non_object() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let svc = make_system_config_service(db);
    let ctx = make_admin_ctx();
    let err = svc
        .update_business_hours(&ctx, serde_json::Value::Null)
        .unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn update_business_hours_rejects_array() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let svc = make_system_config_service(db);
    let ctx = make_admin_ctx();
    let err = svc
        .update_business_hours(&ctx, serde_json::json!([]))
        .unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}
