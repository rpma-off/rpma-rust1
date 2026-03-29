use super::InterventionDataService;
use crate::db::{InterventionError, InterventionResult};
use crate::domains::interventions::domain::models::intervention::Intervention;
use crate::domains::interventions::domain::models::step::InterventionStep;
use crate::domains::interventions::infrastructure::intervention_types::AdvanceStepRequest;
use rusqlite::Transaction;

pub(super) fn initialize_workflow_steps_with_tx(
    service: &InterventionDataService,
    tx: &Transaction,
    intervention: &Intervention,
) -> InterventionResult<Vec<InterventionStep>> {
    use crate::domains::interventions::infrastructure::workflow_strategy::{
        WorkflowContext, WorkflowStrategyFactory,
    };

    let workflow_context = WorkflowContext {
        intervention: intervention.clone(),
        user_id: "system".to_string(),
        environment_conditions: None,
    };

    let strategy = WorkflowStrategyFactory::create_strategy(intervention, &workflow_context);
    let workflow_result = strategy
        .initialize_workflow_sync(intervention, &workflow_context)
        .map_err(|e| InterventionError::Database(format!("Failed to initialize workflow: {}", e)))?;

    service.save_steps_batch_with_tx(tx, &workflow_result.steps)?;

    Ok(workflow_result.steps)
}

pub(super) fn update_step_with_data(
    step: &mut InterventionStep,
    request: &AdvanceStepRequest,
) -> InterventionResult<()> {
    step.collected_data = Some(request.collected_data.clone());
    step.step_data = step.collected_data.clone();
    step.notes = request.notes.clone();

    if let Some(photos) = &request.photos {
        step.photo_count = photos.len() as i32;
        step.photo_urls = Some(photos.clone());
    }

    if let Ok(mut data) = serde_json::from_value::<serde_json::Value>(request.collected_data.clone())
    {
        if let Some(obj) = data.as_object_mut() {
            obj.insert(
                "quality_check_passed".to_string(),
                serde_json::Value::Bool(request.quality_check_passed),
            );
            if let Some(issues) = &request.issues {
                obj.insert(
                    "issues".to_string(),
                    serde_json::to_value(issues).unwrap_or(serde_json::Value::Array(vec![])),
                );
            }
            step.collected_data =
                Some(serde_json::to_value(obj).unwrap_or(request.collected_data.clone()));
            step.step_data = step.collected_data.clone();
        }
    }

    Ok(())
}
