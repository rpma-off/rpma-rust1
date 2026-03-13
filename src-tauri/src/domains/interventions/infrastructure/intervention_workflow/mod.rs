//! Intervention Workflow Service — thin orchestrator
//!
//! The implementation is split across focused submodules:
//! - `workflow_engine`  — state machine: start, finalize, cancel
//! - `workflow_steps`   — step advancement, progress saving, completion requirements
//! - `workflow_queries` — read-only delegators to InterventionDataService

use std::sync::Arc;

use crate::db::Database;
use crate::domains::interventions::infrastructure::intervention_data::InterventionDataService;
use crate::domains::interventions::infrastructure::workflow_validation::WorkflowValidationService;

mod workflow_engine;
mod workflow_queries;
mod workflow_steps;

/// Service for managing PPF intervention workflows
#[derive(Debug)]
pub struct InterventionWorkflowService {
    pub(super) db: Arc<Database>,
    pub(super) data: InterventionDataService,
    pub(super) validation: WorkflowValidationService,
}

impl InterventionWorkflowService {
    /// Create new workflow service
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            data: InterventionDataService::new(db.clone()),
            validation: WorkflowValidationService::new(db.clone()),
            db,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::InterventionError;
    use crate::domains::interventions::domain::models::step::StepType;
    use crate::domains::interventions::domain::models::step::{InterventionStep, StepStatus};
    use crate::domains::interventions::infrastructure::intervention_types::{
        AdvanceStepRequest, SaveStepProgressRequest,
    };
    use crate::shared::contracts::common::TimestampString;
    use crate::shared::logging::{LogDomain, RPMARequestLogger};
    use crate::test_utils::TestDatabase;

    fn seed_intervention(db: &crate::db::Database, intervention_id: &str) {
        let now = chrono::Utc::now().timestamp_millis();
        let task_id = format!("task-for-{}", intervention_id);
        db.execute(
            "INSERT OR IGNORE INTO tasks (id, task_number, title, vehicle_plate, vehicle_model, ppf_zones, scheduled_date, status, priority, created_at, updated_at, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            rusqlite::params![task_id, "T-seed", "Seed task", "AA-000-AA", "Model X", r#"["front"]"#, "2025-01-01", "draft", "medium", now, now],
        ).expect("seed task");
        db.execute(
            "INSERT OR IGNORE INTO interventions (id, task_id, status, vehicle_plate, created_at, updated_at, synced)
             VALUES (?, ?, 'pending', 'TEST-00', ?, ?, 0)",
            rusqlite::params![intervention_id, task_id, now, now],
        ).expect("seed intervention");
    }

    fn test_logger() -> RPMARequestLogger {
        RPMARequestLogger::new("test-correlation".to_string(), None, LogDomain::Task)
    }

    #[test]
    fn test_apply_completion_requirements_requires_photos() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = InterventionWorkflowService::new(test_db.db());
        let mut step = InterventionStep::new(
            "intervention-1".to_string(),
            1,
            "Inspection".to_string(),
            StepType::Inspection,
        );
        step.requires_photos = true;
        step.min_photos_required = 2;
        step.photo_count = 1;

        let result = service.apply_completion_requirements(&mut step, &test_logger());

        assert!(matches!(result, Err(InterventionError::Workflow(_))));
        assert!(!step.required_photos_completed);
    }

    #[test]
    fn test_apply_completion_requirements_marks_completed() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        let service = InterventionWorkflowService::new(test_db.db());
        let mut step = InterventionStep::new(
            "intervention-1".to_string(),
            1,
            "Inspection".to_string(),
            StepType::Inspection,
        );
        step.requires_photos = true;
        step.min_photos_required = 2;
        step.photo_count = 2;

        let result = service.apply_completion_requirements(&mut step, &test_logger());

        assert!(result.is_ok());
        assert!(step.required_photos_completed);
    }

    #[test]
    fn test_has_completion_data_with_empty_collected_data_and_no_media() {
        let request = AdvanceStepRequest {
            intervention_id: "int-1".to_string(),
            step_id: "step-1".to_string(),
            collected_data: serde_json::Value::Object(Default::default()),
            photos: None,
            notes: None,
            quality_check_passed: true,
            issues: None,
        };

        assert!(!InterventionWorkflowService::has_completion_data(&request));
    }

    #[test]
    fn test_has_completion_data_with_collected_data_or_media() {
        let mut request = AdvanceStepRequest {
            intervention_id: "int-1".to_string(),
            step_id: "step-1".to_string(),
            collected_data: serde_json::json!({"k": "v"}),
            photos: None,
            notes: None,
            quality_check_passed: true,
            issues: None,
        };

        assert!(InterventionWorkflowService::has_completion_data(&request));

        request.collected_data = serde_json::Value::Null;
        request.photos = Some(vec!["photo-1".to_string()]);
        assert!(InterventionWorkflowService::has_completion_data(&request));

        request.photos = None;
        request.issues = Some(vec!["issue-1".to_string()]);
        assert!(InterventionWorkflowService::has_completion_data(&request));
    }

    #[test]
    fn test_save_step_progress_mirrors_collected_data_to_step_data() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        seed_intervention(&test_db.db(), "intervention-1");
        let service = InterventionWorkflowService::new(test_db.db());
        let step = InterventionStep::new(
            "intervention-1".to_string(),
            1,
            "Inspection".to_string(),
            StepType::Inspection,
        );
        let step_id = step.id.clone();
        service
            .data
            .save_step(&step)
            .expect("Failed to seed step in database");

        let request = SaveStepProgressRequest {
            step_id: step_id.clone(),
            collected_data: serde_json::json!({
                "checklist": { "clean_dry": true },
                "notes": "saved draft"
            }),
            notes: Some("saved note".to_string()),
            photos: None,
        };

        let runtime = tokio::runtime::Runtime::new().expect("Failed to create runtime");
        let updated = runtime
            .block_on(service.save_step_progress(request, "test-correlation", Some("tech-1")))
            .expect("Failed to save step progress");

        assert_eq!(updated.collected_data, updated.step_data);

        let persisted = service
            .data
            .get_step(&step_id)
            .expect("Failed to fetch saved step")
            .expect("Step should exist");
        assert_eq!(persisted.collected_data, persisted.step_data);
    }

    #[test]
    fn test_save_step_progress_keeps_completed_status() {
        let test_db = TestDatabase::new().expect("Failed to create test database");
        seed_intervention(&test_db.db(), "intervention-1");
        let service = InterventionWorkflowService::new(test_db.db());
        let mut step = InterventionStep::new(
            "intervention-1".to_string(),
            1,
            "Inspection".to_string(),
            StepType::Inspection,
        );
        step.step_status = StepStatus::Completed;
        step.completed_at = TimestampString::now();
        let step_id = step.id.clone();

        service
            .data
            .save_step(&step)
            .expect("Failed to seed completed step");

        let request = SaveStepProgressRequest {
            step_id: step_id.clone(),
            collected_data: serde_json::json!({
                "checklist": { "clean_dry": true }
            }),
            notes: Some("edited after completion".to_string()),
            photos: Some(vec!["/tmp/completed-edit.jpg".to_string()]),
        };

        let runtime = tokio::runtime::Runtime::new().expect("Failed to create runtime");
        let updated = runtime
            .block_on(service.save_step_progress(request, "test-correlation", Some("tech-1")))
            .expect("Failed to save completed step progress");

        assert_eq!(updated.step_status, StepStatus::Completed);

        let persisted = service
            .data
            .get_step(&step_id)
            .expect("Failed to fetch saved step")
            .expect("Step should exist");
        assert_eq!(persisted.step_status, StepStatus::Completed);
        assert_eq!(persisted.collected_data, persisted.step_data);
    }
}
