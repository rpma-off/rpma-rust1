use crate::db::Database;
use crate::domains::interventions::infrastructure::intervention::InterventionService;
use crate::domains::interventions::InterventionsFacade;
use crate::shared::ipc::errors::AppError;
use std::sync::Arc;

#[tokio::test]
async fn validate_intervention_id_rejects_whitespace() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(InterventionService::new(db));
    let facade = InterventionsFacade::new(service);
    let err = facade.validate_intervention_id("   ").unwrap_err();
    assert!(matches!(err, AppError::Validation(_)));
}

#[tokio::test]
async fn validate_task_id_accepts_valid_id() {
    let db = Arc::new(Database::new_in_memory().await.expect("in-memory database"));
    let service = Arc::new(InterventionService::new(db));
    let facade = InterventionsFacade::new(service);
    assert!(facade.validate_task_id("task-123").is_ok());
}
