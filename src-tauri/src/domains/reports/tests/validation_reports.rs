use std::sync::Arc;
use crate::db::Database;
use crate::domains::reports::ReportsFacade;
use crate::shared::ipc::errors::AppError;

#[tokio::test]
async fn validate_report_type_rejects_invalid_type() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let facade = ReportsFacade::new(db);
    let err = facade.validate_report_type("unknown").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn validate_report_type_rejects_empty_string() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let facade = ReportsFacade::new(db);
    let err = facade.validate_report_type("").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}
