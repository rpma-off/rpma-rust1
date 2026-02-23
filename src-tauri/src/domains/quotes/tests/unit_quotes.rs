use crate::db::Database;
use crate::domains::quotes::infrastructure::quote::QuoteService;
use crate::domains::quotes::infrastructure::quote_repository::QuoteRepository;
use crate::domains::quotes::QuotesFacade;
use crate::shared::repositories::Cache;
use std::sync::Arc;

#[tokio::test]
async fn quotes_facade_is_ready() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let cache = Arc::new(Cache::new(100));
    let repo = Arc::new(QuoteRepository::new(db.clone(), cache));
    let service = Arc::new(QuoteService::new(repo, db));
    let facade = QuotesFacade::new(service);
    assert!(facade.is_ready());
}

#[tokio::test]
async fn quotes_facade_exposes_service() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let cache = Arc::new(Cache::new(100));
    let repo = Arc::new(QuoteRepository::new(db.clone(), cache));
    let service = Arc::new(QuoteService::new(repo, db));
    let facade = QuotesFacade::new(service);
    let _svc = facade.quote_service();
}
