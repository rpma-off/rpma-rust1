use std::sync::Arc;

use crate::db::Database;
use crate::domains::audit::infrastructure::audit_service::AuditService;
use crate::domains::audit::AuditFacade;

#[tokio::test]
async fn audit_facade_is_ready() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(AuditService::new(db));
    let facade = AuditFacade::new(service);
    assert!(facade.is_ready());
}

#[tokio::test]
async fn audit_facade_exposes_service() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(AuditService::new(db));
    let facade = AuditFacade::new(service.clone());
    let svc = facade.audit_service();
    assert!(Arc::ptr_eq(&service, svc));
}
