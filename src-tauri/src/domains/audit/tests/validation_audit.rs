use std::sync::Arc;

use crate::db::Database;
use crate::domains::audit::infrastructure::audit_service::AuditService;
use crate::domains::audit::AuditFacade;
use crate::shared::ipc::errors::AppError;

#[tokio::test]
async fn map_audit_error_returns_internal_error() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(AuditService::new(db));
    let facade = AuditFacade::new(service);
    let err = facade.map_audit_error("test_context", "something went wrong");
    assert!(matches!(err, AppError::Internal(_)));
}

#[tokio::test]
async fn map_audit_error_includes_context_in_message() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(AuditService::new(db));
    let facade = AuditFacade::new(service);
    let err = facade.map_audit_error("login_audit", "db connection lost");
    match err {
        AppError::Internal(msg) => {
            assert!(msg.contains("login_audit"));
            assert!(msg.contains("db connection lost"));
        }
        _ => panic!("Expected AppError::Internal"),
    }
}
