use crate::db::Database;
use crate::domains::quotes::infrastructure::quote::QuoteService;
use crate::domains::quotes::infrastructure::quote_repository::QuoteRepository;
use crate::domains::quotes::QuotesFacade;
use crate::shared::ipc::errors::AppError;
use crate::shared::repositories::Cache;
use crate::shared::services::event_system::InMemoryEventBus;
use std::sync::Arc;

#[tokio::test]
async fn map_quote_error_returns_internal_error() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let cache = Arc::new(Cache::new(100));
    let repo = Arc::new(QuoteRepository::new(db.clone(), cache));
    let event_bus = Arc::new(InMemoryEventBus::new());
    let service = Arc::new(QuoteService::new(repo, db, event_bus));
    let facade = QuotesFacade::new(service);

    let err = facade.map_quote_error("create", "database connection failed");
    assert!(matches!(err, AppError::Internal(_)));
}

#[tokio::test]
async fn map_quote_error_includes_context() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let cache = Arc::new(Cache::new(100));
    let repo = Arc::new(QuoteRepository::new(db.clone(), cache));
    let event_bus = Arc::new(InMemoryEventBus::new());
    let service = Arc::new(QuoteService::new(repo, db, event_bus));
    let facade = QuotesFacade::new(service);

    let err = facade.map_quote_error("update", "timeout");
    let err_msg = format!("{:?}", err);
    assert!(err_msg.contains("update") || err_msg.contains("timeout"));
}

#[tokio::test]
async fn facade_is_ready_after_creation() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let cache = Arc::new(Cache::new(100));
    let repo = Arc::new(QuoteRepository::new(db.clone(), cache));
    let event_bus = Arc::new(InMemoryEventBus::new());
    let service = Arc::new(QuoteService::new(repo, db, event_bus));
    let facade = QuotesFacade::new(service);

    assert!(facade.is_ready());
}
