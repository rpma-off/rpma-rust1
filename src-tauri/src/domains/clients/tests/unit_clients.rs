use crate::db::Database;
use crate::domains::clients::client_handler::ClientService;
use crate::domains::clients::ClientsFacade;
use std::sync::Arc;

#[tokio::test]
async fn clients_facade_is_ready() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(ClientService::new_with_db(db));
    let facade = ClientsFacade::new(service);
    let _ = facade.client_service(); // facade constructed successfully
}

#[tokio::test]
async fn validate_client_id_accepts_valid_id() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(ClientService::new_with_db(db));
    let facade = ClientsFacade::new(service);
    assert!(facade.validate_client_id("client-123").is_ok());
}
