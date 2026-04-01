use crate::domains::clients::ipc::error_mapping::map_service_error;
use crate::shared::ipc::errors::AppError;

#[tokio::test]
async fn map_service_error_returns_not_found_for_missing_entity() {
    let err = map_service_error("get_client", "client not found");
    assert!(matches!(err, AppError::NotFound(_)));
}

#[tokio::test]
async fn map_service_error_returns_validation_for_invalid_input() {
    let err = map_service_error("create_client", "validation failed");
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn map_service_error_returns_database_for_unknown_errors() {
    let err = map_service_error("update_client", "timeout");
    assert!(matches!(err, AppError::Database(_)));
}

#[tokio::test]
async fn map_service_error_returns_authorization_for_permission_errors() {
    let err = map_service_error("delete_client", "permission denied");
    assert!(matches!(err, AppError::Authorization(_)));
}

#[tokio::test]
async fn map_service_error_returns_authorization_for_owner_errors() {
    let err = map_service_error("update_client", "You can only update clients you created");
    assert!(matches!(err, AppError::Authorization(_)));
}

#[tokio::test]
async fn map_service_error_returns_validation_for_duplicate_errors() {
    let err = map_service_error("create_client", "A client with this email already exists");
    assert!(matches!(err, AppError::Validation(_)));
}
