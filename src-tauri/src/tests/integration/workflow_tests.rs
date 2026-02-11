//! Integration tests for task-intervention workflow
//!
//! This module contains integration tests that verify the interaction
//! between tasks and interventions to ensure proper synchronization.

use crate::commands::AppResult;
use crate::models::intervention::InterventionStatus;
use crate::models::step::StepStatus;
use crate::services::audit_service::AuditService;
use crate::services::intervention_types::{
    AdvanceStepRequest, FinalizeInterventionRequest, StartInterventionRequest,
};
use crate::services::intervention_workflow::InterventionWorkflowService;
use crate::services::task_crud::TaskCrudService;
use crate::test_utils::{TestDataFactory, TestDatabase};
use crate::{test_client, test_db, test_intervention, test_task};
use chrono::Utc;
use serde_json::json;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_task_and_intervention_workflow() -> AppResult<()> {
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
        let intervention_request = StartInterventionRequest {
            task_id: created_task.id.clone(),
            intervention_number: None,
            ppf_zones: vec!["front".to_string(), "rear".to_string()],
            custom_zones: None,
            film_type: "premium".to_string(),
            film_brand: None,
            film_model: None,
            weather_condition: "clear".to_string(),
            lighting_condition: "good".to_string(),
            work_location: "shop".to_string(),
            temperature: None,
            humidity: None,
            technician_id: "test_user".to_string(),
            assistant_ids: None,
            scheduled_start: chrono::Utc::now().to_rfc3339(),
            estimated_duration: 120,
            gps_coordinates: None,
            address: None,
            notes: Some("Standard PPF installation".to_string()),
            customer_requirements: None,
            special_instructions: None,
        };

        let intervention = intervention_service.start_intervention(
            intervention_request,
            "test_user",
            "test-correlation-id",
        )?;

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

    #[tokio::test]
    async fn test_intervention_step_progression() -> AppResult<()> {
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

        let intervention_request = StartInterventionRequest {
            task_id: created_task.id.clone(),
            intervention_number: None,
            ppf_zones: vec!["full".to_string()],
            custom_zones: None,
            film_type: "premium".to_string(),
            film_brand: None,
            film_model: None,
            weather_condition: "clear".to_string(),
            lighting_condition: "good".to_string(),
            work_location: "shop".to_string(),
            temperature: None,
            humidity: None,
            technician_id: "test_user".to_string(),
            assistant_ids: None,
            scheduled_start: chrono::Utc::now().to_rfc3339(),
            estimated_duration: 120,
            gps_coordinates: None,
            address: None,
            notes: Some("Full PPF installation".to_string()),
            customer_requirements: None,
            special_instructions: None,
        };

        let intervention = intervention_service.start_intervention(
            intervention_request,
            "test_user",
            "test-correlation-id",
        )?;

        // Get first step
        let first_step = &intervention.steps[0];
        assert_eq!(first_step.step_status, StepStatus::Pending);

        // Start first step
        let advance_request = AdvanceStepRequest {
            intervention_id: intervention.id.clone(),
            step_id: first_step.id.clone(),
            collected_data: json!({}),
            photos: None,
            notes: Some("Starting preparation step".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        let updated_step = intervention_service
            .advance_step(advance_request, "test-correlation-id", Some("test_user"))
            .await?;

        assert_eq!(updated_step.step_status, StepStatus::InProgress);
        assert!(updated_step.started_at.is_some());
        assert_eq!(updated_step.location_lat, Some(40.7128));
        assert_eq!(updated_step.location_lon, Some(-74.0060));

        Ok(())
    }

    #[tokio::test]
    async fn test_intervention_completion_updates_task() -> AppResult<()> {
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

        let intervention_request = StartInterventionRequest {
            task_id: created_task.id.clone(),
            intervention_number: None,
            ppf_zones: vec!["rear".to_string()],
            custom_zones: None,
            film_type: "premium".to_string(),
            film_brand: None,
            film_model: None,
            weather_condition: "clear".to_string(),
            lighting_condition: "good".to_string(),
            work_location: "shop".to_string(),
            temperature: None,
            humidity: None,
            technician_id: "test_user".to_string(),
            assistant_ids: None,
            scheduled_start: chrono::Utc::now().to_rfc3339(),
            estimated_duration: 120,
            gps_coordinates: None,
            address: None,
            notes: None,
            customer_requirements: None,
            special_instructions: None,
        };

        let mut intervention = intervention_service.start_intervention(
            intervention_request,
            "test_user",
            "test-correlation-id",
        )?;

        // Complete all steps
        for step in &intervention.steps {
            // First start the step
            let start_request = AdvanceStepRequest {
                intervention_id: intervention.id.clone(),
                step_id: step.id.clone(),
                collected_data: json!({}),
                photos: None,
                notes: None,
                quality_check_passed: true,
                issues: None,
            };

            intervention_service
                .advance_step(start_request, "test-correlation-id", Some("test_user"))
                .await?;

            // Then complete the step
            let step_complete_request = AdvanceStepRequest {
                intervention_id: intervention.id.clone(),
                step_id: step.id.clone(),
                collected_data: json!({"duration": 45}),
                photos: None,
                notes: Some("Step completed successfully".to_string()),
                quality_check_passed: true,
                issues: None,
            };

            intervention_service
                .advance_step(
                    step_complete_request,
                    "test-correlation-id",
                    Some("test_user"),
                )
                .await?;
        }

        // Complete intervention
        let finalize_request = FinalizeInterventionRequest {
            intervention_id: intervention.id.clone(),
            collected_data: Some(json!({"duration": 180})),
            photos: None,
            customer_satisfaction: Some(9),
            quality_score: Some(95),
            final_observations: Some(vec!["High quality installation".to_string()]),
            customer_signature: None,
            customer_comments: None,
        };

        intervention_service
            .finalize_intervention(finalize_request, "test-correlation-id", Some("test_user"))
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

    #[tokio::test]
    async fn test_intervention_cancellation_cleans_up_task() -> AppResult<()> {
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

        let intervention_request = StartInterventionRequest {
            task_id: created_task.id.clone(),
            intervention_number: None,
            ppf_zones: vec!["front".to_string()],
            custom_zones: None,
            film_type: "standard".to_string(),
            film_brand: None,
            film_model: None,
            weather_condition: "clear".to_string(),
            lighting_condition: "good".to_string(),
            work_location: "shop".to_string(),
            temperature: None,
            humidity: None,
            technician_id: "test_user".to_string(),
            assistant_ids: None,
            scheduled_start: chrono::Utc::now().to_rfc3339(),
            estimated_duration: 120,
            gps_coordinates: None,
            address: None,
            notes: None,
            customer_requirements: None,
            special_instructions: None,
        };

        let intervention = intervention_service.start_intervention(
            intervention_request,
            "test_user",
            "test-correlation-id",
        )?;

        // Cancel intervention
        intervention_service.cancel_intervention(&intervention.id, "test_user")?;

        // Verify task is marked as cancelled
        let updated_task = task_service
            .get_task_by_id_async(&created_task.id)
            .await?
            .unwrap();
        assert_eq!(updated_task.status, "cancelled");

        Ok(())
    }

    #[tokio::test]
    async fn test_duplicate_intervention_prevention() {
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
        let intervention_request = StartInterventionRequest {
            task_id: created_task.id.clone(),
            intervention_number: None,
            ppf_zones: vec!["front".to_string()],
            custom_zones: None,
            film_type: "standard".to_string(),
            film_brand: None,
            film_model: None,
            weather_condition: "clear".to_string(),
            lighting_condition: "good".to_string(),
            work_location: "shop".to_string(),
            temperature: None,
            humidity: None,
            technician_id: "test_user".to_string(),
            assistant_ids: None,
            scheduled_start: chrono::Utc::now().to_rfc3339(),
            estimated_duration: 120,
            gps_coordinates: None,
            address: None,
            notes: None,
            customer_requirements: None,
            special_instructions: None,
        };

        let first_intervention = intervention_service
            .start_intervention(intervention_request, "test_user", "test-correlation-id")
            .unwrap();

        // Try to start second intervention (should fail)
        let second_intervention_request = StartInterventionRequest {
            task_id: created_task.id.clone(),
            intervention_number: None,
            ppf_zones: vec!["rear".to_string()],
            custom_zones: None,
            film_type: "premium".to_string(),
            film_brand: None,
            film_model: None,
            weather_condition: "clear".to_string(),
            lighting_condition: "good".to_string(),
            work_location: "shop".to_string(),
            temperature: None,
            humidity: None,
            technician_id: "test_user".to_string(),
            assistant_ids: None,
            scheduled_start: chrono::Utc::now().to_rfc3339(),
            estimated_duration: 120,
            gps_coordinates: None,
            address: None,
            notes: None,
            customer_requirements: None,
            special_instructions: None,
        };

        let result = intervention_service
            .start_intervention(
                second_intervention_request,
                "test_user",
                "test-correlation-id",
            )
            .await;

        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("already has an active intervention"));

        Ok(())
    }

    #[tokio::test]
    async fn test_workflow_step_validation() -> AppResult<()> {
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

        let intervention_request = StartInterventionRequest {
            task_id: created_task.id.clone(),
            intervention_number: None,
            ppf_zones: vec!["front".to_string()],
            custom_zones: None,
            film_type: "standard".to_string(),
            film_brand: None,
            film_model: None,
            weather_condition: "clear".to_string(),
            lighting_condition: "good".to_string(),
            work_location: "shop".to_string(),
            temperature: None,
            humidity: None,
            technician_id: "test_user".to_string(),
            assistant_ids: None,
            scheduled_start: chrono::Utc::now().to_rfc3339(),
            estimated_duration: 120,
            gps_coordinates: None,
            address: None,
            notes: None,
            customer_requirements: None,
            special_instructions: None,
        };

        let intervention = intervention_service.start_intervention(
            intervention_request,
            "test_user",
            "test-correlation-id",
        )?;

        // Try to complete step without starting it (should fail)
        let first_step = &intervention.steps[0];
        let advance_request = AdvanceStepRequest {
            intervention_id: intervention.id.clone(),
            step_id: first_step.id.clone(),
            collected_data: json!({"duration": 30}),
            photos: None,
            notes: Some("Trying to complete without starting".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        let result = intervention_service
            .advance_step(advance_request, "test-correlation-id", Some("test_user"))
            .await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("before completion data can be provided"));

        Ok(())
    }
}
