//! Unit tests for intervention workflow service
//!
//! This module tests the workflow orchestration, step management,
//! and state transitions in the intervention process.

use crate::commands::AppResult;
use crate::services::audit_service::AuditService;
use crate::services::intervention_data::InterventionDataService;
use crate::services::intervention_workflow::InterventionWorkflowService;
use crate::test_utils::{test_db, test_intervention, test_task, TestDataFactory, TestDatabase};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_start_intervention_success() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());
        let audit_service = AuditService::new(test_db.db());

        // Initialize audit service
        audit_service.init()?;

        // Create a task
        let task_request = test_task!(
            title: "PPF Installation Task".to_string(),
            vehicle_plate: Some("ABC123".to_string()),
            status: "scheduled".to_string()
        );
        let task = TestDataFactory::create_test_task(Some(task_request));

        // Create intervention
        let request = crate::models::intervention::CreateInterventionRequest {
            task_id: "task-123".to_string(),
            ppf_zones_config: Some("front,rear".to_string()),
            film_type: Some("premium".to_string()),
            notes: Some("Standard installation".to_string()),
        };

        let intervention = workflow_service
            .start_intervention(request, &task, "test_user")
            .await?;

        assert_eq!(intervention.task_id, "task-123");
        assert_eq!(
            intervention.status,
            crate::models::intervention::InterventionStatus::Pending
        );
        assert_eq!(intervention.film_type, Some("premium".to_string()));
        assert!(!intervention.steps.is_empty());

        // Verify audit log entry
        let audit_events =
            audit_service.get_resource_history("intervention", &intervention.id, Some(10))?;
        assert!(!audit_events.is_empty());

        Ok(())
    }

    #[test]
    fn test_start_intervention_with_existing_active() {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        // Create a task
        let task_request = test_task!(title: "Task with existing intervention".to_string());
        let task = TestDataFactory::create_test_task(Some(task_request));

        // Create first intervention
        let request1 = crate::models::intervention::CreateInterventionRequest {
            task_id: "task-123".to_string(),
            ppf_zones_config: Some("front".to_string()),
            film_type: Some("standard".to_string()),
            notes: None,
        };

        let intervention1 = workflow_service
            .start_intervention(request1, &task, "test_user")
            .await
            .unwrap();

        // Try to create second intervention (should fail)
        let request2 = crate::models::intervention::CreateInterventionRequest {
            task_id: "task-123".to_string(),
            ppf_zones_config: Some("rear".to_string()),
            film_type: Some("premium".to_string()),
            notes: None,
        };

        let result = workflow_service
            .start_intervention(request2, &task, "test_user")
            .await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("already has an active intervention"));

        Ok(())
    }

    #[test]
    fn test_advance_step_start() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(title: "Step advancement test".to_string());
        let task = TestDataFactory::create_test_task(Some(task_request));

        let request = crate::models::intervention::CreateInterventionRequest {
            task_id: "task-123".to_string(),
            ppf_zones_config: Some("front".to_string()),
            film_type: Some("standard".to_string()),
            notes: None,
        };

        let intervention = workflow_service
            .start_intervention(request, &task, "test_user")
            .await?;

        // Get first step
        let first_step = &intervention.steps[0];
        assert_eq!(
            first_step.step_status,
            crate::models::intervention::InterventionStepStatus::Pending
        );

        // Start the step
        let advance_request = crate::models::intervention::AdvanceStepRequest {
            step_id: first_step.id.clone(),
            action: "start".to_string(),
            notes: Some("Starting preparation".to_string()),
            photos: vec![],
            location_lat: Some(40.7128),
            location_lon: Some(-74.0060),
            actual_duration: None,
        };

        let updated_step = workflow_service
            .advance_step(advance_request, "test_user")
            .await?;

        assert_eq!(
            updated_step.step_status,
            crate::models::intervention::InterventionStepStatus::InProgress
        );
        assert!(updated_step.started_at.is_some());
        assert_eq!(updated_step.location_lat, Some(40.7128));
        assert_eq!(updated_step.notes, Some("Starting preparation".to_string()));

        Ok(())
    }

    #[test]
    fn test_advance_step_complete() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(title: "Step completion test".to_string());
        let task = TestDataFactory::create_test_task(Some(task_request));

        let request = crate::models::intervention::CreateInterventionRequest {
            task_id: "task-123".to_string(),
            ppf_zones_config: Some("front".to_string()),
            film_type: Some("standard".to_string()),
            notes: None,
        };

        let intervention = workflow_service
            .start_intervention(request, &task, "test_user")
            .await?;

        let first_step = &intervention.steps[0];

        // First start the step
        let start_request = crate::models::intervention::AdvanceStepRequest {
            step_id: first_step.id.clone(),
            action: "start".to_string(),
            notes: None,
            photos: vec![],
            location_lat: None,
            location_lon: None,
            actual_duration: None,
        };

        workflow_service
            .advance_step(start_request, "test_user")
            .await?;

        // Then complete the step
        let complete_request = crate::models::intervention::AdvanceStepRequest {
            step_id: first_step.id.clone(),
            action: "complete".to_string(),
            notes: Some("Step completed successfully".to_string()),
            photos: vec![crate::models::intervention::StepPhoto {
                id: "photo-1".to_string(),
                step_id: first_step.id.clone(),
                photo_type: "before".to_string(),
                file_path: "/tmp/before.jpg".to_string(),
                thumbnail_path: Some("/tmp/before_thumb.jpg".to_string()),
                file_size: 1024,
                width: 1920,
                height: 1080,
                taken_at: chrono::Utc::now().timestamp_millis(),
                location_lat: Some(40.7128),
                location_lon: Some(-74.0060),
                location_accuracy: Some(5.0),
                quality_score: Some(95),
                metadata: None,
                created_at: chrono::Utc::now().timestamp_millis(),
                updated_at: chrono::Utc::now().timestamp_millis(),
                created_by: "test_user".to_string(),
                updated_by: "test_user".to_string(),
                synced: 0,
                last_synced_at: None,
                sync_error: None,
            }],
            location_lat: Some(40.7128),
            location_lon: Some(-74.0060),
            actual_duration: Some(45),
        };

        let completed_step = workflow_service
            .advance_step(complete_request, "test_user")
            .await?;

        assert_eq!(
            completed_step.step_status,
            crate::models::intervention::InterventionStepStatus::Completed
        );
        assert!(completed_step.completed_at.is_some());
        assert_eq!(completed_step.actual_duration, Some(45));
        assert_eq!(completed_step.photos_taken, 1);

        Ok(())
    }

    #[test]
    fn test_advance_step_invalid_transition() {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(title: "Invalid transition test".to_string());
        let task = TestDataFactory::create_test_task(Some(task_request));

        let request = crate::models::intervention::CreateInterventionRequest {
            task_id: "task-123".to_string(),
            ppf_zones_config: Some("front".to_string()),
            film_type: Some("standard".to_string()),
            notes: None,
        };

        let intervention = workflow_service
            .start_intervention(request, &task, "test_user")
            .await
            .unwrap();

        let first_step = &intervention.steps[0];

        // Try to complete step without starting it
        let complete_request = crate::models::intervention::AdvanceStepRequest {
            step_id: first_step.id.clone(),
            action: "complete".to_string(),
            notes: Some("Trying to complete without starting".to_string()),
            photos: vec![],
            location_lat: None,
            location_lon: None,
            actual_duration: Some(30),
        };

        let result = workflow_service
            .advance_step(complete_request, "test_user")
            .await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("must be started before completing"));

        Ok(())
    }

    #[test]
    fn test_complete_intervention_success() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(title: "Intervention completion test".to_string());
        let task = TestDataFactory::create_test_task(Some(task_request));

        let request = crate::models::intervention::CreateInterventionRequest {
            task_id: "task-123".to_string(),
            ppf_zones_config: Some("front".to_string()),
            film_type: Some("standard".to_string()),
            notes: None,
        };

        let mut intervention = workflow_service
            .start_intervention(request, &task, "test_user")
            .await?;

        // Complete all steps
        for step in &intervention.steps {
            let start_request = crate::models::intervention::AdvanceStepRequest {
                step_id: step.id.clone(),
                action: "start".to_string(),
                notes: None,
                photos: vec![],
                location_lat: None,
                location_lon: None,
                actual_duration: None,
            };

            workflow_service
                .advance_step(start_request, "test_user")
                .await?;

            let complete_request = crate::models::intervention::AdvanceStepRequest {
                step_id: step.id.clone(),
                action: "complete".to_string(),
                notes: Some("Step completed".to_string()),
                photos: vec![],
                location_lat: None,
                location_lon: None,
                actual_duration: Some(30),
            };

            workflow_service
                .advance_step(complete_request, "test_user")
                .await?;
        }

        // Complete intervention
        let complete_request = crate::models::intervention::CompleteInterventionRequest {
            intervention_id: intervention.id.clone(),
            quality_score: Some(95),
            customer_satisfaction: Some(9),
            final_observations: Some("Excellent quality work".to_string()),
            actual_duration: Some(180),
        };

        let completed_intervention = workflow_service
            .complete_intervention(complete_request, "test_user")
            .await?;

        assert_eq!(
            completed_intervention.status,
            crate::models::intervention::InterventionStatus::Completed
        );
        assert_eq!(completed_intervention.quality_score, Some(95));
        assert_eq!(completed_intervention.customer_satisfaction, Some(9));
        assert_eq!(
            completed_intervention.final_observations,
            Some("Excellent quality work".to_string())
        );
        assert_eq!(completed_intervention.actual_duration, Some(180));
        assert!(completed_intervention.completed_at.is_some());

        Ok(())
    }

    #[test]
    fn test_complete_intervention_incomplete_steps() {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(title: "Incomplete steps test".to_string());
        let task = TestDataFactory::create_test_task(Some(task_request));

        let request = crate::models::intervention::CreateInterventionRequest {
            task_id: "task-123".to_string(),
            ppf_zones_config: Some("front".to_string()),
            film_type: Some("standard".to_string()),
            notes: None,
        };

        let intervention = workflow_service
            .start_intervention(request, &task, "test_user")
            .await
            .unwrap();

        // Try to complete intervention without completing all steps
        let complete_request = crate::models::intervention::CompleteInterventionRequest {
            intervention_id: intervention.id.clone(),
            quality_score: Some(85),
            customer_satisfaction: Some(8),
            final_observations: Some("Not all steps completed".to_string()),
            actual_duration: Some(120),
        };

        let result = workflow_service
            .complete_intervention(complete_request, "test_user")
            .await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("all steps must be completed"));

        Ok(())
    }

    #[test]
    fn test_cancel_intervention_success() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(title: "Intervention cancellation test".to_string());
        let task = TestDataFactory::create_test_task(Some(task_request));

        let request = crate::models::intervention::CreateInterventionRequest {
            task_id: "task-123".to_string(),
            ppf_zones_config: Some("front".to_string()),
            film_type: Some("standard".to_string()),
            notes: None,
        };

        let intervention = workflow_service
            .start_intervention(request, &task, "test_user")
            .await?;

        // Cancel intervention
        let cancel_request = crate::models::intervention::CancelInterventionRequest {
            intervention_id: intervention.id.clone(),
            reason: "Customer requested cancellation".to_string(),
            notes: Some("Customer changed mind about PPF installation".to_string()),
        };

        let cancelled_intervention = workflow_service
            .cancel_intervention(cancel_request, "test_user")
            .await?;

        assert_eq!(
            cancelled_intervention.status,
            crate::models::intervention::InterventionStatus::Cancelled
        );
        assert!(cancelled_intervention
            .notes
            .unwrap()
            .contains("Customer changed mind"));

        Ok(())
    }

    #[test]
    fn test_get_intervention_by_id() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(title: "Get intervention test".to_string());
        let task = TestDataFactory::create_test_task(Some(task_request));

        let request = crate::models::intervention::CreateInterventionRequest {
            task_id: "task-123".to_string(),
            ppf_zones_config: Some("front".to_string()),
            film_type: Some("standard".to_string()),
            notes: None,
        };

        let created_intervention = workflow_service
            .start_intervention(request, &task, "test_user")
            .await?;

        // Get intervention by ID
        let retrieved_intervention = workflow_service
            .get_intervention_by_id(&created_intervention.id)
            .await?;

        assert!(retrieved_intervention.is_some());
        let intervention = retrieved_intervention.unwrap();
        assert_eq!(intervention.id, created_intervention.id);
        assert_eq!(intervention.task_id, created_intervention.task_id);

        Ok(())
    }

    #[test]
    fn test_get_intervention_by_nonexistent_id() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        let retrieved_intervention = workflow_service
            .get_intervention_by_id("nonexistent-id")
            .await?;
        assert!(retrieved_intervention.is_none());

        Ok(())
    }

    #[test]
    fn test_list_interventions_empty() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        let interventions = workflow_service.list_interventions(10, 0).await?;
        assert!(interventions.is_empty());

        Ok(())
    }

    #[test]
    fn test_list_interventions_with_data() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        // Create multiple tasks and interventions
        for i in 1..=3 {
            let task_request = test_task!(title: format!("Task {}", i));
            let task = TestDataFactory::create_test_task(Some(task_request));

            let request = crate::models::intervention::CreateInterventionRequest {
                task_id: format!("task-{}", i),
                ppf_zones_config: Some("front".to_string()),
                film_type: Some("standard".to_string()),
                notes: None,
            };

            workflow_service
                .start_intervention(request, &task, "test_user")
                .await?;
        }

        // List interventions
        let interventions = workflow_service.list_interventions(10, 0).await?;
        assert_eq!(interventions.len(), 3);

        Ok(())
    }

    #[test]
    fn test_get_interventions_by_task() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(title: "Task-specific intervention test".to_string());
        let task = TestDataFactory::create_test_task(Some(task_request));

        let request = crate::models::intervention::CreateInterventionRequest {
            task_id: "task-123".to_string(),
            ppf_zones_config: Some("front".to_string()),
            film_type: Some("standard".to_string()),
            notes: None,
        };

        let created_intervention = workflow_service
            .start_intervention(request, &task, "test_user")
            .await?;

        // Get interventions for task
        let task_interventions = workflow_service
            .get_interventions_by_task("task-123")
            .await?;

        assert_eq!(task_interventions.len(), 1);
        assert_eq!(task_interventions[0].id, created_intervention.id);

        // Test with nonexistent task
        let empty_interventions = workflow_service
            .get_interventions_by_task("nonexistent-task")
            .await?;
        assert!(empty_interventions.is_empty());

        Ok(())
    }
}
