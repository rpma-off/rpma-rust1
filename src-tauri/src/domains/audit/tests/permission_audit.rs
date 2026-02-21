use std::sync::Arc;

use crate::db::Database;
use crate::domains::audit::infrastructure::audit_service::AuditService;
use crate::domains::audit::AuditFacade;

#[tokio::test]
async fn audit_facade_debug_output_contains_type_name() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(AuditService::new(db));
    let facade = AuditFacade::new(service);
    let debug = format!("{:?}", facade);
    assert!(debug.contains("AuditFacade"));
}

#[tokio::test]
async fn audit_facade_service_is_shared_reference() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(AuditService::new(db));
    let facade = AuditFacade::new(service);
    let svc1 = facade.audit_service();
    let svc2 = facade.audit_service();
    assert!(Arc::ptr_eq(svc1, svc2));
}
