use std::sync::Arc;
use crate::db::Database;
use crate::domains::clients::infrastructure::client::ClientService;
use crate::domains::clients::ClientsFacade;

#[tokio::test]
async fn clients_facade_is_ready() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(ClientService::new_with_db(db));
    let facade = ClientsFacade::new(service);
    assert!(facade.is_ready());
}

#[tokio::test]
async fn validate_client_id_accepts_valid_id() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(ClientService::new_with_db(db));
    let facade = ClientsFacade::new(service);
    assert!(facade.validate_client_id("client-123").is_ok());
}
