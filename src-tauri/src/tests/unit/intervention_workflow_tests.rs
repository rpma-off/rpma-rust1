//! Unit tests for intervention workflow service
//!
//! This module tests the workflow orchestration, step management,
//! and state transitions in the intervention process.

use crate::commands::AppResult;
use crate::db::InterventionError;
use crate::models::intervention::InterventionStatus;
use crate::models::step::StepStatus;
use crate::services::intervention_types::{
    AdvanceStepRequest, FinalizeInterventionRequest, StartInterventionRequest,
};
use crate::services::intervention_workflow::InterventionWorkflowService;
use crate::{test_db, test_task};
use serde_json::json;

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper: build a default StartInterventionRequest
    fn default_start_request(task_id: &str) -> StartInterventionRequest {
        StartInterventionRequest {
            task_id: task_id.to_string(),
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
        }
    }

    #[tokio::test]
    async fn test_start_intervention_success() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        let request = default_start_request("task-123");
        let response =
            workflow_service.start_intervention(request, "test_user", "test-correlation-id")?;

        // Get first step
        let first_step = &response.steps[0];
        assert_eq!(first_step.step_status, StepStatus::Pending);

        // Start the step (no completion data ⇒ stays InProgress)
        let advance_request = AdvanceStepRequest {
            intervention_id: response.intervention.id.clone(),
            step_id: first_step.id.clone(),
            collected_data: json!({}),
            photos: None,
            notes: Some("Starting preparation".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        let advance_response = workflow_service
            .advance_step(advance_request, "test-correlation-id", Some("test_user"))
            .await?;

        assert_eq!(advance_response.step.step_status, StepStatus::InProgress);
        assert!(advance_response.step.started_at.inner().is_some());
        assert_eq!(
            advance_response.step.notes,
            Some("Starting preparation".to_string())
        );

        Ok(())
    }

    #[tokio::test]
    async fn test_advance_step_pending_with_completion_data() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        let request = default_start_request("task-123");
        let response = workflow_service
            .start_intervention(request, "test_user", "test-correlation-id")
            .unwrap();

        let first_step = &response.steps[0];

        // Advancing a Pending step with completion data should succeed
        // (transition Pending → InProgress → Completed in a single call)
        let complete_request = AdvanceStepRequest {
            intervention_id: response.intervention.id.clone(),
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
        let advance_response = result.unwrap();
        assert_eq!(advance_response.step.step_status, StepStatus::Completed);
        assert!(advance_response.step.started_at.inner().is_some());
        assert!(advance_response.step.completed_at.inner().is_some());

        Ok(())
    }

    #[tokio::test]
    async fn test_advance_step_in_progress_without_completion_data() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        let request = default_start_request("task-123");
        let response =
            workflow_service.start_intervention(request, "test_user", "test-correlation-id")?;

        let first_step = &response.steps[0];
        let start_request = AdvanceStepRequest {
            intervention_id: response.intervention.id.clone(),
            step_id: first_step.id.clone(),
            collected_data: json!({}),
            photos: None,
            notes: Some("Starting step".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        let started = workflow_service
            .advance_step(start_request, "test-correlation-id", Some("test_user"))
            .await?;

        assert_eq!(started.step.step_status, StepStatus::InProgress);

        let continue_request = AdvanceStepRequest {
            intervention_id: response.intervention.id.clone(),
            step_id: first_step.id.clone(),
            collected_data: json!({}),
            photos: None,
            notes: Some("Still working".to_string()),
            quality_check_passed: true,
            issues: None,
        };

        let in_progress = workflow_service
            .advance_step(continue_request, "test-correlation-id", Some("test_user"))
            .await?;

        assert_eq!(in_progress.step.step_status, StepStatus::InProgress);
        assert!(in_progress.step.completed_at.inner().is_none());

        Ok(())
    }

    #[tokio::test]
    async fn test_complete_intervention_success() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        let request = default_start_request("task-123");
        let response =
            workflow_service.start_intervention(request, "test_user", "test-correlation-id")?;

        // Complete all steps (supply completion data to advance Pending → Completed)
        for step in &response.steps {
            let complete_request = AdvanceStepRequest {
                intervention_id: response.intervention.id.clone(),
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

        // Finalize the intervention (finalize_intervention is sync)
        let finalize_request = FinalizeInterventionRequest {
            intervention_id: response.intervention.id.clone(),
            collected_data: Some(json!({"duration": 180})),
            photos: None,
            customer_satisfaction: Some(9),
            quality_score: Some(95),
            final_observations: Some(vec!["Excellent quality work".to_string()]),
            customer_signature: None,
            customer_comments: None,
        };

        let finalize_response = workflow_service.finalize_intervention(
            finalize_request,
            "test-correlation-id",
            Some("test_user"),
        )?;

        assert_eq!(
            finalize_response.intervention.status,
            InterventionStatus::Completed
        );
        assert_eq!(finalize_response.intervention.quality_score, Some(95));
        assert_eq!(
            finalize_response.intervention.customer_satisfaction,
            Some(9)
        );
        assert_eq!(
            finalize_response.intervention.final_observations,
            Some(vec!["Excellent quality work".to_string()])
        );
        assert!(finalize_response
            .intervention
            .completed_at
            .inner()
            .is_some());

        Ok(())
    }

    #[tokio::test]
    async fn test_finalize_fails_with_missing_mandatory_steps() {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        let request = default_start_request("task-123");
        let response = workflow_service
            .start_intervention(request, "test_user", "test-correlation-id")
            .unwrap();

        // Do NOT complete any steps – try to finalize immediately
        let finalize_request = FinalizeInterventionRequest {
            intervention_id: response.intervention.id.clone(),
            collected_data: Some(json!({"duration": 120})),
            photos: None,
            customer_satisfaction: Some(8),
            quality_score: Some(85),
            final_observations: Some(vec!["Not all steps completed".to_string()]),
            customer_signature: None,
            customer_comments: None,
        };

        let result = workflow_service.finalize_intervention(
            finalize_request,
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
    }

    #[tokio::test]
    async fn test_finalize_error_lists_incomplete_step_names() {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        let request = default_start_request("task-123");
        let response = workflow_service
            .start_intervention(request, "test_user", "test-correlation-id")
            .unwrap();

        // Do NOT complete any steps – try to finalize
        let finalize_request = FinalizeInterventionRequest {
            intervention_id: response.intervention.id.clone(),
            collected_data: None,
            photos: None,
            customer_satisfaction: None,
            quality_score: None,
            final_observations: None,
            customer_signature: None,
            customer_comments: None,
        };

        let result = workflow_service.finalize_intervention(
            finalize_request,
            "test-correlation-id",
            Some("test_user"),
        );
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();

        // The error message should list the names of incomplete mandatory steps
        // so the frontend can show actionable feedback
        let mandatory_non_finalization_steps: Vec<_> = response
            .steps
            .iter()
            .filter(|s| {
                s.is_mandatory && s.step_type != crate::models::step::StepType::Finalization
            })
            .collect();

        for step in &mandatory_non_finalization_steps {
            assert!(
                err_msg.contains(&step.step_name),
                "Error should mention step '{}', got: {}",
                step.step_name,
                err_msg
            );
        }
    }

    #[tokio::test]
    async fn test_step_out_of_order_is_rejected() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        let request = default_start_request("task-123");
        let response =
            workflow_service.start_intervention(request, "test_user", "test-correlation-id")?;

        // Need at least 2 steps to test ordering
        assert!(
            response.steps.len() >= 2,
            "Need at least 2 steps for ordering test, got {}",
            response.steps.len()
        );

        // Try to advance step 2 without completing step 1
        let second_step = &response.steps[1];
        let out_of_order_request = AdvanceStepRequest {
            intervention_id: response.intervention.id.clone(),
            step_id: second_step.id.clone(),
            collected_data: json!({"data": "test"}),
            photos: None,
            notes: None,
            quality_check_passed: true,
            issues: None,
        };

        let result = workflow_service
            .advance_step(
                out_of_order_request,
                "test-correlation-id",
                Some("test_user"),
            )
            .await;

        assert!(
            result.is_err(),
            "Advancing step 2 without completing step 1 should fail"
        );
        let err_msg = result.unwrap_err().to_string();
        assert!(
            err_msg.contains("previous step") || err_msg.contains("not completed"),
            "Error should mention previous step not completed, got: {}",
            err_msg
        );

        Ok(())
    }

    #[tokio::test]
    async fn test_cancel_intervention_success() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        let request = default_start_request("task-123");
        let response =
            workflow_service.start_intervention(request, "test_user", "test-correlation-id")?;

        // Cancel intervention
        let cancelled =
            workflow_service.cancel_intervention(&response.intervention.id, "test_user")?;

        assert_eq!(cancelled.status, InterventionStatus::Cancelled);

        Ok(())
    }

    #[tokio::test]
    async fn test_get_intervention_by_id() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        let request = default_start_request("task-123");
        let response =
            workflow_service.start_intervention(request, "test_user", "test-correlation-id")?;

        // Get intervention by ID
        let retrieved = workflow_service.get_intervention_by_id(&response.intervention.id)?;

        assert!(retrieved.is_some());
        let intervention = retrieved.unwrap();
        assert_eq!(intervention.id, response.intervention.id);
        assert_eq!(intervention.task_id, response.intervention.task_id);

        Ok(())
    }

    #[tokio::test]
    async fn test_get_intervention_by_nonexistent_id() -> AppResult<()> {
        let test_db = test_db!();
        let workflow_service = InterventionWorkflowService::new(test_db.db());

        let retrieved = workflow_service.get_intervention_by_id("nonexistent-id")?;
        assert!(retrieved.is_none());

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

        // Create multiple interventions
        for i in 1..=3 {
            let request = default_start_request(&format!("task-{}", i));
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

        let request = default_start_request("task-123");
        let response =
            workflow_service.start_intervention(request, "test_user", "test-correlation-id")?;

        // Get interventions for task
        let task_interventions = workflow_service.get_interventions_by_task("task-123")?;

        assert_eq!(task_interventions.len(), 1);
        assert_eq!(task_interventions[0].id, response.intervention.id);

        // Test with nonexistent task
        let empty = workflow_service.get_interventions_by_task("nonexistent-task")?;
        assert!(empty.is_empty());

        Ok(())
    }
}
