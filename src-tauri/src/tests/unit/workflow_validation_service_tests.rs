//! Unit tests for intervention workflow validation service
//!
//! Tests the core intervention validation logic including:
//! - Step advancement validation
//! - Intervention finalization validation
//! - Mandatory step checks
//! - Quality checkpoint validation

use crate::logging::{LogDomain, RPMARequestLogger};
use crate::models::intervention::{Intervention, InterventionStatus};
use crate::models::step::{InterventionStep, StepStatus, StepType};
use crate::domains::tasks::infrastructure::workflow_validation::WorkflowValidationService;
use crate::test_utils::TestDataFactory;
use crate::{test_client, test_db, test_intervention, test_task};
use std::sync::Arc;

#[cfg(test)]
mod tests {
    use super::*;

    fn create_validation_service() -> (
        WorkflowValidationService,
        Arc<crate::db::Database>,
        tempfile::TempDir,
    ) {
        let test_db = test_db!();
        let db = test_db.db();
        let service = WorkflowValidationService::new(Arc::clone(&db));
        (service, db, test_db.temp_dir)
    }

    fn create_logger() -> RPMARequestLogger {
        RPMARequestLogger::new(
            "test-correlation-id".to_string(),
            Some("test-user".to_string()),
            LogDomain::System,
        )
    }

    #[tokio::test]
    async fn test_validate_step_advancement_pending_to_in_progress() {
        let (validation_service, _db, _temp_dir) = create_validation_service();
        let logger = create_logger();
        let intervention = test_intervention!(status: InterventionStatus::InProgress);
        let step = TestDataFactory::create_test_step(&intervention.id, 1, None);

        let result = validation_service.validate_step_advancement(&intervention, &step, &logger);
        assert!(
            result.is_ok(),
            "Pending to InProgress should be valid for first step"
        );
    }

    #[tokio::test]
    async fn test_validate_step_advancement_intervention_mismatch() {
        let (validation_service, _db, _temp_dir) = create_validation_service();
        let logger = create_logger();
        let intervention = test_intervention!(status: InterventionStatus::InProgress);
        let other_intervention = test_intervention!(status: InterventionStatus::InProgress);
        let step = TestDataFactory::create_test_step(&other_intervention.id, 1, None);

        let result = validation_service.validate_step_advancement(&intervention, &step, &logger);
        assert!(result.is_err(), "Mismatched intervention should be invalid");
        assert!(result.unwrap_err().to_string().contains("Invalid step"));
    }

    #[tokio::test]
    async fn test_validate_step_advancement_invalid_completed_to_pending() {
        let (validation_service, _db, _temp_dir) = create_validation_service();
        let logger = create_logger();
        let intervention = test_intervention!(status: InterventionStatus::InProgress);
        let mut step = TestDataFactory::create_test_step(&intervention.id, 1, None);
        step.step_status = StepStatus::Completed;

        let result = validation_service.validate_step_advancement(&intervention, &step, &logger);
        assert!(result.is_err(), "Completed step cannot return to Pending");
        let error = result.unwrap_err();
        assert!(error.to_string().contains("already completed"));
    }

    #[tokio::test]
    async fn test_validate_step_advancement_sequence_validation() {
        let (validation_service, db, _temp_dir) = create_validation_service();
        let logger = create_logger();
        let intervention = test_intervention!(status: InterventionStatus::InProgress);

        let conn = db.get_connection().expect("Failed to get connection");
        conn.execute(
            "INSERT INTO intervention_steps (id, intervention_id, step_number, name, step_type, step_status, is_mandatory, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            [
                uuid::Uuid::new_v4().to_string(),
                intervention.id.clone(),
                "1".to_string(),
                "Step 1".to_string(),
                "inspection".to_string(),
                "in_progress".to_string(),
                "true".to_string(),
                chrono::Utc::now().to_string(),
                chrono::Utc::now().to_string(),
            ],
        )
        .expect("Failed to insert previous step");

        let step = TestDataFactory::create_test_step(&intervention.id, 2, None);
        let result = validation_service.validate_step_advancement(&intervention, &step, &logger);
        assert!(
            result.is_err(),
            "Cannot advance when previous step is not completed"
        );
    }

    #[tokio::test]
    async fn test_validate_step_advancement_valid_sequence() {
        let (validation_service, db, _temp_dir) = create_validation_service();
        let logger = create_logger();
        let intervention = test_intervention!(status: InterventionStatus::InProgress);

        let conn = db.get_connection().expect("Failed to get connection");
        conn.execute(
            "INSERT INTO intervention_steps (id, intervention_id, step_number, name, step_type, step_status, is_mandatory, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            [
                uuid::Uuid::new_v4().to_string(),
                intervention.id.clone(),
                "1".to_string(),
                "Step 1".to_string(),
                "inspection".to_string(),
                "completed".to_string(),
                "true".to_string(),
                chrono::Utc::now().to_string(),
                chrono::Utc::now().to_string(),
            ],
        )
        .expect("Failed to insert previous step");

        let step2 = TestDataFactory::create_test_step(&intervention.id, 2, None);
        let result = validation_service.validate_step_advancement(&intervention, &step2, &logger);
        assert!(
            result.is_ok(),
            "Can advance to step 2 when step 1 is completed"
        );
    }

    #[tokio::test]
    async fn test_validate_intervention_finalization_all_steps_completed() {
        let (validation_service, db, _temp_dir) = create_validation_service();
        let logger = create_logger();
        let mut intervention = test_intervention!(status: InterventionStatus::InProgress);

        // Create and complete all required steps
        let conn = db.get_connection().expect("Failed to get connection");

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

        let result = validation_service.validate_intervention_finalization(&intervention, &logger);
        assert!(
            result.is_ok(),
            "Intervention with all steps completed should be finalizable"
        );
    }

    #[tokio::test]
    async fn test_validate_intervention_finalization_mandatory_step_incomplete() {
        let (validation_service, db, _temp_dir) = create_validation_service();
        let logger = create_logger();
        let mut intervention = test_intervention!(status: InterventionStatus::InProgress);

        // Create some completed steps and one incomplete mandatory step
        let conn = db.get_connection().expect("Failed to get connection");

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

        let result = validation_service.validate_intervention_finalization(&intervention, &logger);
        assert!(
            result.is_err(),
            "Intervention with incomplete mandatory steps should not be finalizable"
        );
        let error = result.unwrap_err();
        assert!(error.to_string().contains("mandatory steps incomplete"));
    }

    #[tokio::test]
    async fn test_validate_intervention_finalization_invalid_status() {
        let (validation_service, _db, _temp_dir) = create_validation_service();
        let logger = create_logger();
        let intervention = test_intervention!(status: InterventionStatus::Pending);

        let result = validation_service.validate_intervention_finalization(&intervention, &logger);
        assert!(result.is_err(), "Pending intervention cannot be finalized");
        let error = result.unwrap_err();
        assert!(error.to_string().contains("Cannot finalize intervention"));
    }

    #[tokio::test]
    async fn test_validate_intervention_comprehensive() {
        let (validation_service, db, _temp_dir) = create_validation_service();
        let logger = create_logger();

        // Create a comprehensive valid intervention
        let mut intervention = test_intervention!(
            status: InterventionStatus::InProgress,
            quality_score: Some(95.5),
            customer_satisfaction: Some(5),
            final_observations: Some("Excellent work completed".to_string()),
            completion_percentage: 100.0
        );

        // Insert completed steps
        let conn = db.get_connection().expect("Failed to get connection");

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

        let result = validation_service.validate_intervention_finalization(&intervention, &logger);
        assert!(
            result.is_ok(),
            "Comprehensive valid intervention should pass all validations"
        );
    }

    #[tokio::test]
    async fn test_validate_workflow_edge_cases() {
        let (validation_service, _db, _temp_dir) = create_validation_service();
        let logger = create_logger();

        // Test intervention with no steps
        let intervention = test_intervention!(status: InterventionStatus::InProgress);

        let result = validation_service.validate_intervention_finalization(&intervention, &logger);
        assert!(
            result.is_ok(),
            "Intervention with no mandatory steps is finalizable"
        );
    }
}
