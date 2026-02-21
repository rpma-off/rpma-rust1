use std::sync::Arc;
use crate::db::Database;
use crate::domains::interventions::infrastructure::intervention::InterventionService;
use crate::domains::interventions::InterventionsFacade;

#[tokio::test]
async fn interventions_facade_debug_output() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(InterventionService::new(db));
    let facade = InterventionsFacade::new(service);
    let debug = format!("{:?}", facade);
    assert!(debug.contains("InterventionsFacade"));
}

#[tokio::test]
async fn interventions_facade_service_is_shared_reference() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(InterventionService::new(db));
    let facade = InterventionsFacade::new(service);
    let svc1 = facade.intervention_service();
    let svc2 = facade.intervention_service();
    assert!(Arc::ptr_eq(svc1, svc2));
}
