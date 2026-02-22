use std::sync::Arc;
use crate::db::Database;
use crate::domains::reports::ReportsFacade;

#[tokio::test]
async fn reports_facade_is_ready() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let facade = ReportsFacade::new(db);
    assert!(facade.is_ready());
}

#[tokio::test]
async fn validate_report_type_accepts_all_valid_types() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let facade = ReportsFacade::new(db);
    for report_type in &["task", "client", "technician", "material", "geographic", "quality", "seasonal", "intelligence", "overview"] {
        assert!(facade.validate_report_type(report_type).is_ok(), "Expected {} to be valid", report_type);
    }
}
