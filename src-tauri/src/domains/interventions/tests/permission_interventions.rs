use crate::db::Database;
use crate::domains::interventions::infrastructure::intervention::InterventionService;
use crate::domains::interventions::InterventionsFacade;
use std::sync::Arc;

#[tokio::test]
async fn validate_intervention_id_rejects_empty_id() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(InterventionService::new(db));
    let facade = InterventionsFacade::new(service);

    let result = facade.validate_intervention_id("");
    assert!(result.is_err());
}

#[tokio::test]
async fn validate_intervention_id_accepts_valid_id() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(InterventionService::new(db));
    let facade = InterventionsFacade::new(service);

    let result = facade.validate_intervention_id("intervention-123");
    assert!(result.is_ok());
}

#[tokio::test]
async fn validate_task_id_rejects_empty_id() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(InterventionService::new(db));
    let facade = InterventionsFacade::new(service);

    let result = facade.validate_task_id("");
    assert!(result.is_err());
}
