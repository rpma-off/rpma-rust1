//! Unit tests for intervention workflow validation service
//!
//! Tests the core intervention validation logic including:
//! - Step advancement validation
//! - Intervention finalization validation
//! - Mandatory step checks
//! - Quality checkpoint validation

use crate::models::intervention::{
    Intervention, InterventionStatus, InterventionStep, StepStatus, StepType,
};
use crate::services::workflow_validation::WorkflowValidationService;
use crate::test_utils::{test_db, test_intervention, TestDataFactory};

#[cfg(test)]
mod tests {
    use super::*;

    fn create_validation_service() -> WorkflowValidationService {
        let test_db = test_db!();
        WorkflowValidationService::new(test_db.db())
    }

    #[test]
    fn test_validate_step_advancement_pending_to_in_progress() {
        let validation_service = create_validation_service();
        let mut intervention = test_intervention!(status: InterventionStatus::Pending);
        let step = TestDataFactory::create_test_step(&intervention.id, 1, None);

        let result = validation_service.validate_step_advancement(
            &intervention,
            &step,
            StepStatus::InProgress,
        );
        assert!(
            result.is_ok(),
            "Pending to InProgress should be valid for first step"
        );
    }

    #[test]
    fn test_validate_step_advancement_invalid_completed_to_pending() {
        let validation_service = create_validation_service();
        let mut intervention = test_intervention!(status: InterventionStatus::InProgress);
        let mut step = TestDataFactory::create_test_step(&intervention.id, 1, None);
        step.step_status = StepStatus::Completed;

        let result =
            validation_service.validate_step_advancement(&intervention, &step, StepStatus::Pending);
        assert!(result.is_err(), "Completed step cannot return to Pending");
        let error = result.unwrap_err();
        assert!(error.contains("Cannot transition from Completed to Pending"));
    }

    #[test]
    fn test_validate_step_advancement_sequence_validation() {
        let validation_service = create_validation_service();
        let mut intervention = test_intervention!(status: InterventionStatus::InProgress);
        intervention.current_step = 2;

        // Try to advance step 3 when step 2 is not completed
        let step = TestDataFactory::create_test_step(&intervention.id, 3, None);
        let result = validation_service.validate_step_advancement(
            &intervention,
            &step,
            StepStatus::InProgress,
        );
        assert!(
            result.is_err(),
            "Cannot advance to step 3 when step 2 is not completed"
        );
    }

    #[test]
    fn test_validate_step_advancement_valid_sequence() {
        let validation_service = create_validation_service();
        let mut intervention = test_intervention!(status: InterventionStatus::InProgress);
        intervention.current_step = 1;

        // Complete step 1 first
        let mut step1 = TestDataFactory::create_test_step(&intervention.id, 1, None);
        step1.step_status = StepStatus::Completed;

        // Now advance to step 2
        let step2 = TestDataFactory::create_test_step(&intervention.id, 2, None);
        let result = validation_service.validate_step_advancement(
            &intervention,
            &step2,
            StepStatus::InProgress,
        );
        assert!(
            result.is_ok(),
            "Can advance to step 2 when step 1 is completed"
        );
    }

    #[test]
    fn test_validate_step_advancement_mandatory_step_incomplete() {
        let validation_service = create_validation_service();
        let mut intervention = test_intervention!(status: InterventionStatus::InProgress);
        intervention.current_step = 1;

        // Create mandatory step that requires photos but doesn't have them
        let mut step = TestDataFactory::create_test_step(&intervention.id, 1, None);
        step.is_mandatory = true;
        step.requires_photos = true;
        step.min_photos_required = 2;
        step.step_status = StepStatus::InProgress;
        step.photos_taken = Some(1); // Only 1 photo, but 2 required

        let result = validation_service.validate_step_advancement(
            &intervention,
            &step,
            StepStatus::Completed,
        );
        assert!(
            result.is_err(),
            "Cannot complete mandatory step with insufficient photos"
        );
        let error = result.unwrap_err();
        assert!(error.contains("Required photos not uploaded"));
    }

    #[test]
    fn test_validate_step_advancement_quality_checkpoint_missing() {
        let validation_service = create_validation_service();
        let mut intervention = test_intervention!(status: InterventionStatus::InProgress);
        intervention.current_step = 1;

        // Create step with quality checkpoints that aren't validated
        let mut step = TestDataFactory::create_test_step(&intervention.id, 1, None);
        step.quality_checkpoints =
            Some(vec!["surface_clean".to_string(), "no_bubbles".to_string()]);
        step.quality_checkpoints_validated = Some(vec!["surface_clean".to_string()]); // Missing "no_bubbles"
        step.step_status = StepStatus::InProgress;

        let result = validation_service.validate_step_advancement(
            &intervention,
            &step,
            StepStatus::Completed,
        );
        assert!(
            result.is_err(),
            "Cannot complete step with missing quality checkpoints"
        );
        let error = result.unwrap_err();
        assert!(error.contains("Quality checkpoints not validated"));
    }

    #[test]
    fn test_validate_intervention_finalization_all_steps_completed() {
        let validation_service = create_validation_service();
        let mut intervention = test_intervention!(status: InterventionStatus::InProgress);

        // Create and complete all required steps
        let conn = validation_service
            .db
            .get_connection()
            .expect("Failed to get connection");

        for i in 1..=3 {
            let mut step = TestDataFactory::create_test_step(&intervention.id, i, None);
            step.is_mandatory = true;
            step.step_status = StepStatus::Completed;
            step.photos_taken = Some(2);
            step.quality_checkpoints_validated = Some(vec!["surface_clean".to_string()]);

            conn.execute(
                "INSERT INTO intervention_steps (id, intervention_id, step_number, name, step_type, step_status, is_mandatory, photos_taken, quality_checkpoints_validated, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                [
                    uuid::Uuid::new_v4().to_string(),
                    intervention.id.clone(),
                    i.to_string(),
                    step.name,
                    "inspection".to_string(),
                    "completed".to_string(),
                    "true".to_string(),
                    "2".to_string(),
                    "[\"surface_clean\"]".to_string(),
                    chrono::Utc::now().to_string(),
                    chrono::Utc::now().to_string(),
                ],
            ).expect("Failed to insert test step");
        }

        intervention.total_steps = Some(3);
        intervention.completed_steps = Some(3);

        let result = validation_service.validate_intervention_finalization(&intervention);
        assert!(
            result.is_ok(),
            "Intervention with all steps completed should be finalizable"
        );
    }

    #[test]
    fn test_validate_intervention_finalization_mandatory_step_incomplete() {
        let validation_service = create_validation_service();
        let mut intervention = test_intervention!(status: InterventionStatus::InProgress);

        // Create some completed steps and one incomplete mandatory step
        let conn = validation_service
            .db
            .get_connection()
            .expect("Failed to get connection");

        for i in 1..=2 {
            conn.execute(
                "INSERT INTO intervention_steps (id, intervention_id, step_number, name, step_type, step_status, is_mandatory, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                [
                    uuid::Uuid::new_v4().to_string(),
                    intervention.id.clone(),
                    i.to_string(),
                    format!("Step {}", i),
                    "inspection".to_string(),
                    "completed".to_string(),
                    "true".to_string(),
                    chrono::Utc::now().to_string(),
                    chrono::Utc::now().to_string(),
                ],
            ).expect("Failed to insert test step");
        }

        // Incomplete mandatory step
        conn.execute(
            "INSERT INTO intervention_steps (id, intervention_id, step_number, name, step_type, step_status, is_mandatory, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            [
                uuid::Uuid::new_v4().to_string(),
                intervention.id.clone(),
                "3".to_string(),
                "Step 3".to_string(),
                "inspection".to_string(),
                "pending".to_string(),
                "true".to_string(),
                chrono::Utc::now().to_string(),
                chrono::Utc::now().to_string(),
            ],
        ).expect("Failed to insert incomplete step");

        intervention.total_steps = Some(3);
        intervention.completed_steps = Some(2);

        let result = validation_service.validate_intervention_finalization(&intervention);
        assert!(
            result.is_err(),
            "Intervention with incomplete mandatory steps should not be finalizable"
        );
        let error = result.unwrap_err();
        assert!(error.contains("Mandatory steps not completed"));
    }

    #[test]
    fn test_validate_intervention_finalization_invalid_status() {
        let validation_service = create_validation_service();
        let intervention = test_intervention!(status: InterventionStatus::Pending);

        let result = validation_service.validate_intervention_finalization(&intervention);
        assert!(result.is_err(), "Pending intervention cannot be finalized");
        let error = result.unwrap_err();
        assert!(error.contains("Only in-progress interventions can be finalized"));
    }

    #[test]
    fn test_validate_intervention_finalization_missing_quality_metrics() {
        let validation_service = create_validation_service();
        let mut intervention = test_intervention!(status: InterventionStatus::InProgress);

        // Complete all steps but don't set quality metrics
        let conn = validation_service
            .db
            .get_connection()
            .expect("Failed to get connection");

        for i in 1..=2 {
            conn.execute(
                "INSERT INTO intervention_steps (id, intervention_id, step_number, name, step_type, step_status, is_mandatory, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                [
                    uuid::Uuid::new_v4().to_string(),
                    intervention.id.clone(),
                    i.to_string(),
                    format!("Step {}", i),
                    "inspection".to_string(),
                    "completed".to_string(),
                    "true".to_string(),
                    chrono::Utc::now().to_string(),
                    chrono::Utc::now().to_string(),
                ],
            ).expect("Failed to insert test step");
        }

        intervention.total_steps = Some(2);
        intervention.completed_steps = Some(2);
        intervention.quality_score = None; // Missing quality score

        let result = validation_service.validate_intervention_finalization(&intervention);
        assert!(
            result.is_err(),
            "Intervention missing quality score should not be finalizable"
        );
        let error = result.unwrap_err();
        assert!(error.contains("Quality score is required"));
    }

    #[test]
    fn test_validate_step_photo_requirements() {
        let validation_service = create_validation_service();
        let mut intervention = test_intervention!(status: InterventionStatus::InProgress);
        intervention.current_step = 1;

        // Test step with photo requirements
        let mut step = TestDataFactory::create_test_step(&intervention.id, 1, None);
        step.requires_photos = true;
        step.min_photos_required = 3;
        step.max_photos_allowed = 5;

        // Test with insufficient photos
        step.photos_taken = Some(2);
        let result = validation_service.validate_step_advancement(
            &intervention,
            &step,
            StepStatus::Completed,
        );
        assert!(result.is_err(), "Should fail with insufficient photos");

        // Test with too many photos
        step.photos_taken = Some(6);
        let result = validation_service.validate_step_advancement(
            &intervention,
            &step,
            StepStatus::Completed,
        );
        assert!(result.is_err(), "Should fail with too many photos");

        // Test with correct number of photos
        step.photos_taken = Some(4);
        let result = validation_service.validate_step_advancement(
            &intervention,
            &step,
            StepStatus::Completed,
        );
        assert!(result.is_ok(), "Should succeed with correct photo count");
    }

    #[test]
    fn test_validate_step_duration_requirements() {
        let validation_service = create_validation_service();
        let mut intervention = test_intervention!(status: InterventionStatus::InProgress);
        intervention.current_step = 1;

        // Test step with minimum duration requirement
        let mut step = TestDataFactory::create_test_step(&intervention.id, 1, None);
        step.estimated_duration_seconds = Some(300); // 5 minutes minimum

        // Test with insufficient time
        step.started_at = crate::models::common::TimestampString::new(None);
        step.started_at
            .set_timestamp(chrono::Utc::now().timestamp() - 200); // Only 200 seconds

        let result = validation_service.validate_step_advancement(
            &intervention,
            &step,
            StepStatus::Completed,
        );
        assert!(result.is_err(), "Should fail with insufficient duration");

        // Test with sufficient time
        step.started_at
            .set_timestamp(chrono::Utc::now().timestamp() - 400); // 400 seconds

        let result = validation_service.validate_step_advancement(
            &intervention,
            &step,
            StepStatus::Completed,
        );
        assert!(result.is_ok(), "Should succeed with sufficient duration");
    }

    #[test]
    fn test_validate_intervention_comprehensive() {
        let validation_service = create_validation_service();

        // Create a comprehensive valid intervention
        let mut intervention = test_intervention!(
            status: InterventionStatus::InProgress,
            quality_score: Some(95.5),
            customer_satisfaction: Some(5),
            final_observations: Some("Excellent work completed".to_string()),
            completion_percentage: 100.0
        );

        // Insert completed steps
        let conn = validation_service
            .db
            .get_connection()
            .expect("Failed to get connection");

        for i in 1..=3 {
            let mut step = TestDataFactory::create_test_step(&intervention.id, i, None);
            step.is_mandatory = true;
            step.step_status = StepStatus::Completed;
            step.photos_taken = Some(2);
            step.quality_checkpoints_validated =
                Some(vec!["surface_clean".to_string(), "no_bubbles".to_string()]);

            conn.execute(
                "INSERT INTO intervention_steps (id, intervention_id, step_number, name, step_type, step_status, is_mandatory, photos_taken, quality_checkpoints_validated, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                [
                    uuid::Uuid::new_v4().to_string(),
                    intervention.id.clone(),
                    i.to_string(),
                    step.name,
                    "inspection".to_string(),
                    "completed".to_string(),
                    "true".to_string(),
                    "2".to_string(),
                    "[\"surface_clean\", \"no_bubbles\"]".to_string(),
                    chrono::Utc::now().to_string(),
                    chrono::Utc::now().to_string(),
                ],
            ).expect("Failed to insert test step");
        }

        intervention.total_steps = Some(3);
        intervention.completed_steps = Some(3);

        let result = validation_service.validate_intervention_finalization(&intervention);
        assert!(
            result.is_ok(),
            "Comprehensive valid intervention should pass all validations"
        );
    }

    #[test]
    fn test_validate_workflow_edge_cases() {
        let validation_service = create_validation_service();

        // Test intervention with no steps
        let intervention = test_intervention!(status: InterventionStatus::InProgress);
        intervention.total_steps = Some(0);

        let result = validation_service.validate_intervention_finalization(&intervention);
        assert!(
            result.is_err(),
            "Intervention with no steps should not be finalizable"
        );
        let error = result.unwrap_err();
        assert!(error.contains("No steps found for intervention"));

        // Test step with invalid step number
        let mut invalid_intervention = test_intervention!(status: InterventionStatus::InProgress);
        invalid_intervention.current_step = -1; // Invalid step number

        let step = TestDataFactory::create_test_step(&invalid_intervention.id, 1, None);
        let result = validation_service.validate_step_advancement(
            &invalid_intervention,
            &step,
            StepStatus::InProgress,
        );
        assert!(
            result.is_err(),
            "Invalid step number should fail validation"
        );
    }
}
