//! Unit tests for intervention workflow service
//!
//! This module tests the workflow orchestration, step management,
//! and state transitions in the intervention process.

use crate::commands::AppResult;
use crate::models::intervention::InterventionStatus;
use crate::models::step::StepStatus;
use crate::services::audit_service::AuditService;
use crate::services::intervention_data::InterventionDataService;
use crate::services::intervention_types::{
    AdvanceStepRequest, FinalizeInterventionRequest, StartInterventionRequest,
};
use crate::services::intervention_workflow::InterventionWorkflowService;
use crate::test_utils::{TestDataFactory, TestDatabase};
use crate::{test_client, test_db, test_intervention, test_task};
use chrono::Utc;
use serde_json::json;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_start_intervention_success() -> AppResult<()> {
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
        let request = StartInterventionRequest {
            task_id: "task-123".to_string(),
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
            notes: Some("Standard installation".to_string()),
            customer_requirements: None,
            special_instructions: None,
        };

        let intervention =
            workflow_service.start_intervention(request, "test_user", "test-correlation-id")?;

        // Get first step
        let first_step = &intervention.steps[0];
        assert_eq!(first_step.step_status, StepStatus::Pending);

        // Start the step
        let advance_request = AdvanceStepRequest {
            intervention_id: intervention.id.clone(),
            step_id: first_step.id.clone(),
            collected_data: json!({}),
            photos: None,
            notes: Some("Starting preparation".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        let updated_step = workflow_service
            .advance_step(advance_request, "test-correlation-id", Some("test_user"))
            .await?;

        assert_eq!(updated_step.step_status, StepStatus::InProgress);
        assert!(updated_step.started_at.is_some());
        assert_eq!(updated_step.location_lat, Some(40.7128));
        assert_eq!(updated_step.notes, Some("Starting preparation".to_string()));

        Ok(())
    }

    #[tokio::test]
    async fn test_advance_step_complete() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(title: "Intervention cancellation test".to_string());
        let task = TestDataFactory::create_test_task(Some(task_request));

        let request = StartInterventionRequest {
            task_id: "task-123".to_string(),
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

        let intervention =
            workflow_service.start_intervention(request, "test_user", "test-correlation-id")?;

        // Cancel intervention
        let cancelled_intervention =
            workflow_service.cancel_intervention(&intervention.id, "test_user")?;

        let first_step = &intervention.steps[0];

        // First start the step
        let start_request = AdvanceStepRequest {
            intervention_id: intervention.id.clone(),
            step_id: first_step.id.clone(),
            collected_data: json!({}),
            photos: None,
            notes: None,
            quality_check_passed: true,
            issues: None,
        };

        workflow_service
            .advance_step(start_request, "test-correlation-id", Some("test_user"))
            .await?;

        // Then complete the step
        let complete_request = AdvanceStepRequest {
            intervention_id: intervention.id.clone(),
            step_id: first_step.id.clone(),
            collected_data: json!({"duration": 45}),
            photos: Some(vec!["photo-1".to_string()]),
            notes: Some("Step completed successfully".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        // Then complete the step
        let step_complete_request = AdvanceStepRequest {
            intervention_id: intervention.id.clone(),
            step_id: first_step.id.clone(),
            collected_data: serde_json::json!({"duration": 45}),
            photos: Some(vec!["photo-1".to_string()]),
            notes: Some("Step completed successfully".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        let completed_step = workflow_service
            .advance_step(step_complete_request, "test_user")
            .await?;

        assert_eq!(completed_step.step_status, StepStatus::Completed);
        assert!(completed_step.completed_at.is_some());
        assert_eq!(completed_step.actual_duration, Some(45));
        assert_eq!(completed_step.photos_taken, 1);

        Ok(())
    }

    #[tokio::test]
    async fn test_advance_step_pending_with_completion_data() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(title: "Pending with data test".to_string());
        let task = TestDataFactory::create_test_task(Some(task_request));

        let request = StartInterventionRequest {
            task_id: "task-123".to_string(),
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

        let intervention = workflow_service
            .start_intervention(request, "test_user", "test-correlation-id")
            .unwrap();

        let first_step = &intervention.steps[0];

        // Advancing a Pending step with completion data should succeed
        // (transition Pending → InProgress → Completed in a single call)
        let complete_request = AdvanceStepRequest {
            intervention_id: intervention.id.clone(),
            step_id: first_step.id.clone(),
            collected_data: json!({"duration": 30}),
            photos: None,
            notes: Some("Completing from pending".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        let result = workflow_service
            .advance_step(complete_request, "test-correlation-id", Some("test_user"))
            .await;
        assert!(result.is_ok());
        let response = result.unwrap();
        assert_eq!(response.step.step_status, StepStatus::Completed);
        assert!(response.step.started_at.inner().is_some());
        assert!(response.step.completed_at.inner().is_some());

        Ok(())
    }

    #[tokio::test]
    async fn test_advance_step_in_progress_without_completion_data() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(title: "In-progress step test".to_string());
        let task = TestDataFactory::create_test_task(Some(task_request));

        let request = StartInterventionRequest {
            task_id: "task-123".to_string(),
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

        let intervention =
            workflow_service.start_intervention(request, "test_user", "test-correlation-id")?;

        let first_step = &intervention.steps[0];
        let start_request = AdvanceStepRequest {
            intervention_id: intervention.id.clone(),
            step_id: first_step.id.clone(),
            collected_data: json!({}),
            photos: None,
            notes: Some("Starting step".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        let started_step = workflow_service
            .advance_step(start_request, "test-correlation-id", Some("test_user"))
            .await?;

        assert_eq!(started_step.step_status, StepStatus::InProgress);

        let continue_request = AdvanceStepRequest {
            intervention_id: intervention.id.clone(),
            step_id: first_step.id.clone(),
            collected_data: json!({}),
            photos: None,
            notes: Some("Still working".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        let in_progress_step = workflow_service
            .advance_step(continue_request, "test-correlation-id", Some("test_user"))
            .await?;

        assert_eq!(in_progress_step.step_status, StepStatus::InProgress);
        assert!(in_progress_step.completed_at.is_none());

        Ok(())
    }

    #[tokio::test]
    async fn test_complete_intervention_success() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(title: "Intervention completion test".to_string());
        let task = TestDataFactory::create_test_task(Some(task_request));

        let request = StartInterventionRequest {
            task_id: "task-123".to_string(),
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

        let intervention = workflow_service
            .start_intervention(request, "test_user", "test-correlation-id")
            .await?;

        // Complete all steps
        for step in &intervention.steps {
            let start_request = AdvanceStepRequest {
                intervention_id: intervention.id.clone(),
                step_id: step.id.clone(),
                collected_data: json!({}),
                photos: None,
                notes: None,
                quality_check_passed: true,
                issues: None,
            };

            workflow_service
                .advance_step(start_request, "test_user")
                .await?;

            let complete_request = AdvanceStepRequest {
                intervention_id: intervention.id.clone(),
                step_id: step.id.clone(),
                collected_data: json!({"duration": 30}),
                photos: None,
                notes: Some("Step completed".to_string()),
                quality_check_passed: true,
                issues: None,
            };

            workflow_service
                .advance_step(complete_request, "test-correlation-id", Some("test_user"))
                .await?;
        }

        // Complete intervention
        let complete_request = FinalizeInterventionRequest {
            intervention_id: intervention.id.clone(),
            collected_data: Some(json!({"duration": 180})),
            photos: None,
            customer_satisfaction: Some(9),
            quality_score: Some(95),
            final_observations: Some(vec!["Excellent quality work".to_string()]),
            customer_signature: None,
            customer_comments: None,
        };

        let completed_intervention = workflow_service
            .finalize_intervention(complete_request, "test-correlation-id", Some("test_user"))
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

    #[tokio::test]
    async fn test_complete_intervention_incomplete_steps() {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(title: "Incomplete steps test".to_string());
        let task = TestDataFactory::create_test_task(Some(task_request));

        let request = StartInterventionRequest {
            task_id: "task-123".to_string(),
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

        let intervention = workflow_service
            .start_intervention(request, "test_user", "test-correlation-id")
            .unwrap();

        // Try to complete intervention without completing all steps
        let complete_request = FinalizeInterventionRequest {
            intervention_id: intervention.id.clone(),
            collected_data: Some(json!({"duration": 120})),
            photos: None,
            customer_satisfaction: Some(8),
            quality_score: Some(85),
            final_observations: Some(vec!["Not all steps completed".to_string()]),
            customer_signature: None,
            customer_comments: None,
        };

        let result = workflow_service.finalize_intervention(
            complete_request,
            "test-correlation-id",
            Some("test_user"),
        );
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(
            err_msg.contains("mandatory steps incomplete"),
            "Expected error about mandatory steps incomplete, got: {}",
            err_msg
        );

        Ok(())
    }

    #[tokio::test]
    async fn test_cancel_intervention_success() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(title: "Intervention completion test".to_string());
        let task = TestDataFactory::create_test_task(Some(task_request));

        let request = StartInterventionRequest {
            task_id: "task-123".to_string(),
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

        let mut intervention =
            workflow_service.start_intervention(request, "test_user", "test-correlation-id")?;

        // Cancel intervention
        let cancelled_intervention =
            workflow_service.cancel_intervention(&intervention.id, "test_user")?;

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

    #[tokio::test]
    async fn test_get_intervention_by_id() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(title: "Get intervention test".to_string());
        let task = TestDataFactory::create_test_task(Some(task_request));

        let request = crate::services::intervention_types::StartInterventionRequest {
            task_id: task.id.clone(),
            intervention_number: None,
            ppf_zones: vec!["front".to_string()],
            custom_zones: None,
            film_type: "standard".to_string(),
            film_brand: None,
            film_model: None,
            weather_condition: "indoor".to_string(),
            lighting_condition: "good".to_string(),
            work_location: "shop".to_string(),
            temperature: None,
            humidity: None,
            technician_id: "test_technician".to_string(),
            assistant_ids: None,
            scheduled_start: chrono::Utc::now().to_rfc3339(),
            estimated_duration: 120,
            gps_coordinates: None,
        };

        let created_intervention =
            workflow_service.start_intervention(request, "test_user", "test-correlation-id")?;

        // Get intervention by ID
        let retrieved_intervention =
            workflow_service.get_intervention_by_id(&created_intervention.id)?;

        assert!(retrieved_intervention.is_some());
        let intervention = retrieved_intervention.unwrap();
        assert_eq!(intervention.id, created_intervention.id);
        assert_eq!(intervention.task_id, created_intervention.task_id);

        Ok(())
    }

    #[tokio::test]
    async fn test_get_intervention_by_nonexistent_id() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        let retrieved_intervention = workflow_service.get_intervention_by_id("nonexistent-id")?;
        assert!(retrieved_intervention.is_none());

        Ok(())
    }

    #[tokio::test]
    async fn test_list_interventions_empty() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        let interventions = workflow_service.list_interventions(10, 0)?;
        assert!(interventions.is_empty());

        Ok(())
    }

    #[tokio::test]
    async fn test_list_interventions_with_data() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        // Create multiple tasks and interventions
        for i in 1..=3 {
            let task_request = test_task!(title: format!("Task {}", i));
            let task = TestDataFactory::create_test_task(Some(task_request));

            let request = StartInterventionRequest {
                task_id: format!("task-{}", i),
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

            let intervention =
                workflow_service.start_intervention(request, "test_user", "test-correlation-id")?;
        }

        // List interventions
        let interventions = workflow_service.list_interventions(10, 0)?;
        assert_eq!(interventions.len(), 3);

        Ok(())
    }

    #[tokio::test]
    async fn test_get_interventions_by_task() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        // Create task and intervention
        let task_request = test_task!(title: "Task-specific intervention test".to_string());
        let task = TestDataFactory::create_test_task(Some(task_request));

        let request = StartInterventionRequest {
            task_id: "task-123".to_string(),
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

        let created_intervention =
            workflow_service.start_intervention(request, "test_user", "test-correlation-id")?;

        // Get interventions for task
        let task_interventions = workflow_service.get_interventions_by_task("task-123")?;

        assert_eq!(task_interventions.len(), 1);
        assert_eq!(task_interventions[0].id, created_intervention.id);

        // Test with nonexistent task
        let empty_interventions = workflow_service.get_interventions_by_task("nonexistent-task")?;
        assert!(empty_interventions.is_empty());

        Ok(())
    }
}
