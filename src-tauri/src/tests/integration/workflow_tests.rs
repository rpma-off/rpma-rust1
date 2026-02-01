//! Integration tests for task-intervention workflow
//!
//! This module contains integration tests that verify the interaction
//! between tasks and interventions to ensure proper synchronization.

use crate::commands::AppResult;
use crate::services::audit_service::{AuditEventType, AuditService};
use crate::services::intervention_workflow::InterventionWorkflowService;
use crate::services::task_crud::TaskCrudService;
use crate::test_utils::{test_db, test_intervention, test_task, TestDataFactory, TestDatabase};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_task_and_intervention_workflow() -> AppResult<()> {
        let test_db = test_db!();
        let task_service = TaskCrudService::new(test_db.db());
        let intervention_service = InterventionWorkflowService::new(test_db.db());
        let audit_service = AuditService::new(test_db.db());

        // Initialize audit service
        audit_service.init()?;

        // Create a task
        let task_request = test_task!(
            title: "PPF Installation Task".to_string(),
            vehicle_plate: Some("ABC123".to_string()),
            status: "scheduled".to_string()
        );
        let created_task = task_service
            .create_task_async(task_request, "test_user")
            .await?;

        // Start intervention for the task
        let intervention_request = crate::models::intervention::CreateInterventionRequest {
            task_id: created_task.id.clone(),
            ppf_zones_config: Some("front,rear".to_string()),
            film_type: Some("premium".to_string()),
            notes: Some("Standard PPF installation".to_string()),
        };

        let intervention = intervention_service
            .start_intervention(intervention_request, &created_task, "test_user")
            .await?;

        // Verify intervention was created correctly
        assert_eq!(intervention.task_id, created_task.id);
        assert_eq!(
            intervention.status,
            crate::models::intervention::InterventionStatus::Pending
        );
        assert!(!intervention.steps.is_empty());

        // Verify task status was updated
        let updated_task = task_service
            .get_task_by_id_async(&created_task.id)
            .await?
            .unwrap();
        assert_eq!(updated_task.workflow_id, Some(intervention.id.clone()));
        assert_eq!(updated_task.status, "in_progress");

        // Verify audit events were created
        let task_events = audit_service.get_resource_history("task", &created_task.id, Some(10))?;
        assert!(!task_events.is_empty());

        let intervention_events =
            audit_service.get_resource_history("intervention", &intervention.id, Some(10))?;
        assert!(!intervention_events.is_empty());

        Ok(())
    }

    #[test]
    fn test_intervention_step_progression() -> AppResult<()> {
        let test_db = test_db!();
        let task_service = TaskCrudService::new(test_db.db());
        let intervention_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(
            title: "Multi-step PPF Task".to_string(),
            vehicle_plate: Some("XYZ789".to_string())
        );
        let created_task = task_service
            .create_task_async(task_request, "test_user")
            .await?;

        let intervention_request = crate::models::intervention::CreateInterventionRequest {
            task_id: created_task.id.clone(),
            ppf_zones_config: Some("full".to_string()),
            film_type: Some("premium".to_string()),
            notes: None,
        };

        let intervention = intervention_service
            .start_intervention(intervention_request, &created_task, "test_user")
            .await?;

        // Get first step
        let first_step = &intervention.steps[0];
        assert_eq!(
            first_step.step_status,
            crate::models::intervention::InterventionStepStatus::Pending
        );

        // Start first step
        let advance_request = crate::models::intervention::AdvanceStepRequest {
            step_id: first_step.id.clone(),
            action: "start".to_string(),
            notes: Some("Starting preparation step".to_string()),
            photos: vec![],
            location_lat: Some(40.7128),
            location_lon: Some(-74.0060),
            actual_duration: None,
        };

        let updated_step = intervention_service
            .advance_step(advance_request, "test_user")
            .await?;

        assert_eq!(
            updated_step.step_status,
            crate::models::intervention::InterventionStepStatus::InProgress
        );
        assert!(updated_step.started_at.is_some());
        assert_eq!(updated_step.location_lat, Some(40.7128));
        assert_eq!(updated_step.location_lon, Some(-74.0060));

        Ok(())
    }

    #[test]
    fn test_intervention_completion_updates_task() -> AppResult<()> {
        let test_db = test_db!();
        let task_service = TaskCrudService::new(test_db.db());
        let intervention_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(
            title: "Completable PPF Task".to_string(),
            vehicle_plate: Some("COMPLETE123".to_string())
        );
        let created_task = task_service
            .create_task_async(task_request, "test_user")
            .await?;

        let intervention_request = crate::models::intervention::CreateInterventionRequest {
            task_id: created_task.id.clone(),
            ppf_zones_config: Some("front".to_string()),
            film_type: Some("standard".to_string()),
            notes: None,
        };

        let mut intervention = intervention_service
            .start_intervention(intervention_request, &created_task, "test_user")
            .await?;

        // Complete all steps
        for step in &intervention.steps {
            let advance_request = crate::models::intervention::AdvanceStepRequest {
                step_id: step.id.clone(),
                action: "complete".to_string(),
                notes: Some("Step completed successfully".to_string()),
                photos: vec![],
                location_lat: Some(40.7128),
                location_lon: Some(-74.0060),
                actual_duration: Some(45),
            };

            intervention_service
                .advance_step(advance_request, "test_user")
                .await?;
        }

        // Complete intervention
        let complete_request = crate::models::intervention::CompleteInterventionRequest {
            intervention_id: intervention.id.clone(),
            quality_score: Some(95),
            customer_satisfaction: Some(9),
            final_observations: Some("High quality installation".to_string()),
            actual_duration: Some(180),
        };

        intervention_service
            .complete_intervention(complete_request, "test_user")
            .await?;

        // Verify task is marked as completed
        let updated_task = task_service
            .get_task_by_id_async(&created_task.id)
            .await?
            .unwrap();
        assert_eq!(updated_task.status, "completed");
        assert!(updated_task.completed_at.is_some());

        Ok(())
    }

    #[test]
    fn test_intervention_cancellation_cleans_up_task() -> AppResult<()> {
        let test_db = test_db!();
        let task_service = TaskCrudService::new(test_db.db());
        let intervention_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(
            title: "Cancellable PPF Task".to_string(),
            vehicle_plate: Some("CANCEL123".to_string())
        );
        let created_task = task_service
            .create_task_async(task_request, "test_user")
            .await?;

        let intervention_request = crate::models::intervention::CreateInterventionRequest {
            task_id: created_task.id.clone(),
            ppf_zones_config: Some("rear".to_string()),
            film_type: Some("premium".to_string()),
            notes: None,
        };

        let intervention = intervention_service
            .start_intervention(intervention_request, &created_task, "test_user")
            .await?;

        // Cancel intervention
        let cancel_request = crate::models::intervention::CancelInterventionRequest {
            intervention_id: intervention.id.clone(),
            reason: "Customer requested cancellation".to_string(),
            notes: Some("Customer changed mind about PPF installation".to_string()),
        };

        intervention_service
            .cancel_intervention(cancel_request, "test_user")
            .await?;

        // Verify task is marked as cancelled
        let updated_task = task_service
            .get_task_by_id_async(&created_task.id)
            .await?
            .unwrap();
        assert_eq!(updated_task.status, "cancelled");

        Ok(())
    }

    #[test]
    fn test_duplicate_intervention_prevention() {
        let test_db = test_db!();
        let task_service = TaskCrudService::new(test_db.db());
        let intervention_service = InterventionWorkflowService::new(test_db.db());

        // Create task
        let task_request = test_task!(
            title: "Duplicate Test Task".to_string(),
            vehicle_plate: Some("DUPLICATE999".to_string())
        );
        let created_task = task_service
            .create_task_async(task_request, "test_user")
            .await
            .unwrap();

        // Start first intervention
        let intervention_request = crate::models::intervention::CreateInterventionRequest {
            task_id: created_task.id.clone(),
            ppf_zones_config: Some("front".to_string()),
            film_type: Some("standard".to_string()),
            notes: None,
        };

        let first_intervention = intervention_service
            .start_intervention(intervention_request, &created_task, "test_user")
            .await
            .unwrap();

        // Try to start second intervention (should fail)
        let second_intervention_request = crate::models::intervention::CreateInterventionRequest {
            task_id: created_task.id.clone(),
            ppf_zones_config: Some("rear".to_string()),
            film_type: Some("premium".to_string()),
            notes: None,
        };

        let result = intervention_service
            .start_intervention(second_intervention_request, &created_task, "test_user")
            .await;

        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("already has an active intervention"));

        Ok(())
    }

    #[test]
    fn test_workflow_step_validation() -> AppResult<()> {
        let test_db = test_db!();
        let task_service = TaskCrudService::new(test_db.db());
        let intervention_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(
            title: "Validation Test Task".to_string(),
            vehicle_plate: Some("VALID123".to_string())
        );
        let created_task = task_service
            .create_task_async(task_request, "test_user")
            .await?;

        let intervention_request = crate::models::intervention::CreateInterventionRequest {
            task_id: created_task.id.clone(),
            ppf_zones_config: Some("front".to_string()),
            film_type: Some("standard".to_string()),
            notes: None,
        };

        let intervention = intervention_service
            .start_intervention(intervention_request, &created_task, "test_user")
            .await?;

        // Try to complete step without starting it (should fail)
        let first_step = &intervention.steps[0];
        let advance_request = crate::models::intervention::AdvanceStepRequest {
            step_id: first_step.id.clone(),
            action: "complete".to_string(),
            notes: Some("Trying to complete without starting".to_string()),
            photos: vec![],
            location_lat: None,
            location_lon: None,
            actual_duration: Some(30),
        };

        let result = intervention_service
            .advance_step(advance_request, "test_user")
            .await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("must be started before completing"));

        Ok(())
    }
}
