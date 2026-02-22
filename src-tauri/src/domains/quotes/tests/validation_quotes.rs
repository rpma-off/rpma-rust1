use std::sync::Arc;
use crate::db::Database;
use crate::domains::quotes::infrastructure::quote::QuoteService;
use crate::domains::quotes::infrastructure::quote_repository::QuoteRepository;
use crate::domains::quotes::QuotesFacade;
use crate::repositories::Cache;
use crate::shared::ipc::errors::AppError;

#[tokio::test]
async fn map_quote_error_returns_not_found() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let cache = Arc::new(Cache::new(100));
    let repo = Arc::new(QuoteRepository::new(db.clone(), cache));
    let service = Arc::new(QuoteService::new(repo, db));
    let facade = QuotesFacade::new(service);
    let err = facade.map_quote_error("get_quote", "quote not found");
    assert!(matches!(err, AppError::NotFound(_)));
}

#[tokio::test]
async fn map_quote_error_returns_validation_for_invalid() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let cache = Arc::new(Cache::new(100));
    let repo = Arc::new(QuoteRepository::new(db.clone(), cache));
    let service = Arc::new(QuoteService::new(repo, db));
    let facade = QuotesFacade::new(service);
    let err = facade.map_quote_error("create", "invalid amount");
    assert!(matches!(err, AppError::Validation(_)));
}
