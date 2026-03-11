use crate::db::Database;
use crate::domains::quotes::infrastructure::quote::QuoteService;
use crate::domains::quotes::infrastructure::quote_repository::QuoteRepository;
use crate::domains::quotes::QuotesFacade;
use crate::shared::ipc::errors::AppError;
use crate::shared::repositories::Cache;
use std::sync::Arc;

fn make_facade(db: Arc<Database>) -> QuotesFacade {
    let cache = Arc::new(Cache::new(100));
    let repo = Arc::new(QuoteRepository::new(db.clone(), cache));
    let event_bus = Arc::new(crate::shared::services::event_bus::InMemoryEventBus::new());
    let service = Arc::new(QuoteService::new(repo, db, event_bus));
    QuotesFacade::new(service)
}

#[tokio::test]
async fn map_quote_service_error_returns_validation_for_validation_keyword() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let facade = make_facade(db);
    let err = facade.map_quote_service_error("validation failed".to_string());
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn map_quote_service_error_returns_validation_for_unknown() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let facade = make_facade(db);
    let err = facade.map_quote_service_error("timeout".to_string());
    // Unknown errors are mapped to Validation
    assert!(matches!(err, AppError::Validation(_)));
}
