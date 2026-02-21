use std::sync::Arc;
use crate::db::Database;
use crate::domains::reports::ReportsFacade;
use crate::shared::ipc::errors::AppError;

#[tokio::test]
async fn map_report_error_returns_internal() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let facade = ReportsFacade::new(db);
    let err = facade.map_report_error("generation", "timeout");
    assert!(matches!(err, AppError::Internal(_)));
}

#[tokio::test]
async fn map_report_error_includes_context() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let facade = ReportsFacade::new(db);
    let err = facade.map_report_error("pdf_export", "disk full");
    match err {
        AppError::Internal(msg) => {
            assert!(msg.contains("pdf_export"));
            assert!(msg.contains("disk full"));
        }
        _ => panic!("Expected AppError::Internal"),
    }
}
