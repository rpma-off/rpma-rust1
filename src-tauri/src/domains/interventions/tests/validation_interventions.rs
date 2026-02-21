use std::sync::Arc;
use crate::db::Database;
use crate::domains::interventions::infrastructure::intervention::InterventionService;
use crate::domains::interventions::InterventionsFacade;
use crate::shared::ipc::errors::AppError;

#[tokio::test]
async fn validate_intervention_id_rejects_empty() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(InterventionService::new(db));
    let facade = InterventionsFacade::new(service);
    let err = facade.validate_intervention_id("").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn validate_task_id_rejects_empty() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(InterventionService::new(db));
    let facade = InterventionsFacade::new(service);
    let err = facade.validate_task_id("").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}
