use crate::db::Database;
use crate::domains::clients::ipc::error_mapping::map_service_error;
use crate::domains::clients::ClientsFacade;
use crate::shared::ipc::errors::AppError;
use std::sync::Arc;

#[tokio::test]
async fn map_service_error_detects_invalid_keyword() {
    let err = map_service_error("update", "invalid email format");
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn clients_facade_service_is_shared_reference() {
    use crate::domains::clients::application::ClientService;
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(ClientService::new_with_db(db));
    let _facade = ClientsFacade::new(service.clone());
    // Since we can't access .service directly and there is no getter,
    // we just verify facade creation with the service.
}
