use crate::db::Database;
use crate::domains::quotes::application::quote_service::QuoteService;
use crate::domains::quotes::infrastructure::quote_repository::QuoteRepository;
use crate::domains::quotes::QuotesFacade;
use crate::shared::ipc::errors::AppError;
use crate::shared::repositories::Cache;
use crate::shared::services::event_bus::InMemoryEventBus;
use std::sync::Arc;

fn make_facade(db: Arc<Database>) -> QuotesFacade {
    let cache = Arc::new(Cache::new(100));
    let repo = Arc::new(QuoteRepository::new(db.clone(), cache));
    let event_bus = Arc::new(InMemoryEventBus::new());
    let service = Arc::new(QuoteService::new(repo, event_bus));
    QuotesFacade::new(service)
}

#[tokio::test]
async fn map_quote_service_error_returns_not_found_for_not_found() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let facade = make_facade(db);
    let err = facade.map_quote_service_error("Quote not found".to_string());
    assert!(matches!(err, AppError::NotFound(_)));
}

#[tokio::test]
async fn map_quote_service_error_returns_validation_for_other() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let facade = make_facade(db);
    let err = facade.map_quote_service_error("database connection failed".to_string());
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn check_permission_viewer_denied_create() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let facade = make_facade(db);
    let result =
        facade.check_permission(&crate::shared::contracts::auth::UserRole::Viewer, "create");
    assert!(result.is_err());
}

#[tokio::test]
async fn check_permission_admin_allowed_delete() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let facade = make_facade(db);
    let result =
        facade.check_permission(&crate::shared::contracts::auth::UserRole::Admin, "delete");
    assert!(result.is_ok());
}
