use crate::db::Database;
use crate::domains::interventions::infrastructure::intervention::InterventionService;
use crate::domains::interventions::InterventionsFacade;
use std::sync::Arc;

#[tokio::test]
async fn interventions_facade_is_ready() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(InterventionService::new(db));
    let facade = InterventionsFacade::new(service);
    assert!(facade.is_ready());
}

#[tokio::test]
async fn validate_intervention_id_accepts_valid_id() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(InterventionService::new(db));
    let facade = InterventionsFacade::new(service);
    assert!(facade.validate_intervention_id("int-001").is_ok());
}
