use crate::db::Database;
use crate::domains::clients::infrastructure::client::ClientService;
use crate::domains::clients::ClientsFacade;
use crate::shared::ipc::errors::AppError;
use std::sync::Arc;

#[tokio::test]
async fn map_service_error_returns_not_found_for_missing_entity() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(ClientService::new_with_db(db));
    let facade = ClientsFacade::new(service);
    let err = facade.map_service_error("get_client", "client not found");
    assert!(matches!(err, AppError::NotFound(_)));
}

#[tokio::test]
async fn map_service_error_returns_validation_for_invalid_input() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(ClientService::new_with_db(db));
    let facade = ClientsFacade::new(service);
    let err = facade.map_service_error("create_client", "validation failed");
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn map_service_error_returns_internal_for_unknown_errors() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(ClientService::new_with_db(db));
    let facade = ClientsFacade::new(service);
    let err = facade.map_service_error("update_client", "timeout");
    assert!(matches!(err, AppError::Internal(_)));
}
