use std::sync::Arc;
use crate::db::Database;
use crate::domains::clients::infrastructure::client::ClientService;
use crate::domains::clients::ClientsFacade;
use crate::shared::ipc::errors::AppError;

#[tokio::test]
async fn validate_client_id_rejects_empty_string() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(ClientService::new_with_db(db));
    let facade = ClientsFacade::new(service);
    let err = facade.validate_client_id("").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn validate_client_id_rejects_whitespace_only() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(ClientService::new_with_db(db));
    let facade = ClientsFacade::new(service);
    let err = facade.validate_client_id("   ").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}
