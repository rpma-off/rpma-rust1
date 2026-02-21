use std::sync::Arc;

use crate::db::Database;
use crate::domains::audit::infrastructure::audit_service::AuditService;
use crate::domains::audit::AuditFacade;
use crate::shared::ipc::errors::AppError;

#[tokio::test]
async fn map_audit_error_formats_context_and_message() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(AuditService::new(db));
    let facade = AuditFacade::new(service);
    let err = facade.map_audit_error("security", "unauthorized access");
    match err {
        AppError::Internal(msg) => {
            assert_eq!(msg, "Audit error in security: unauthorized access");
        }
        _ => panic!("Expected AppError::Internal"),
    }
}

#[tokio::test]
async fn map_audit_error_handles_empty_strings() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(AuditService::new(db));
    let facade = AuditFacade::new(service);
    let err = facade.map_audit_error("", "");
    assert!(matches!(err, AppError::Internal(_)));
}
