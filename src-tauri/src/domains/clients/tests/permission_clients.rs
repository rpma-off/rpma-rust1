use crate::db::Database;
use crate::domains::clients::infrastructure::client::ClientService;
use crate::domains::clients::ClientsFacade;
use crate::shared::ipc::errors::AppError;
use std::sync::Arc;

#[tokio::test]
async fn map_service_error_detects_invalid_keyword() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(ClientService::new_with_db(db));
    let facade = ClientsFacade::new(service);
    let err = facade.map_service_error("update", "invalid email format");
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn clients_facade_service_is_shared_reference() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(ClientService::new_with_db(db));
    let facade = ClientsFacade::new(service);
    let svc1 = facade.client_service();
    let svc2 = facade.client_service();
    assert!(Arc::ptr_eq(svc1, svc2));
}
