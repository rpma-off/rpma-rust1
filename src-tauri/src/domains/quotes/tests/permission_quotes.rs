use std::sync::Arc;
use crate::db::Database;
use crate::domains::quotes::infrastructure::quote::QuoteService;
use crate::domains::quotes::infrastructure::quote_repository::QuoteRepository;
use crate::domains::quotes::QuotesFacade;
use crate::repositories::Cache;

#[tokio::test]
async fn quotes_facade_debug_output() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let cache = Arc::new(Cache::new(100));
    let repo = Arc::new(QuoteRepository::new(db.clone(), cache));
    let service = Arc::new(QuoteService::new(repo, db));
    let facade = QuotesFacade::new(service);
    let debug = format!("{:?}", facade);
    assert!(debug.contains("QuotesFacade"));
}

#[tokio::test]
async fn quotes_facade_service_is_shared_reference() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let cache = Arc::new(Cache::new(100));
    let repo = Arc::new(QuoteRepository::new(db.clone(), cache));
    let service = Arc::new(QuoteService::new(repo, db));
    let facade = QuotesFacade::new(service);
    let svc1 = facade.quote_service();
    let svc2 = facade.quote_service();
    assert!(Arc::ptr_eq(svc1, svc2));
}
