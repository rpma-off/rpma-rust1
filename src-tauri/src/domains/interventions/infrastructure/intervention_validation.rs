//! Intervention Validation Service - Handles all validation logic
//!
//! This service centralizes validation logic for PPF interventions including:
//! - Request validation
//! - Business rule validation
//! - Permission validation
//! - Data integrity checks

use crate::db::Database;
use crate::db::{InterventionError, InterventionResult};
use crate::domains::interventions::domain::models::intervention::{
    Intervention, InterventionStatus,
};
use crate::domains::interventions::domain::models::step::{InterventionStep, StepStatus};
use crate::domains::interventions::infrastructure::intervention_types::StartInterventionRequest;

use std::str::FromStr;
use std::sync::Arc;

/// Service for validating intervention operations
pub struct InterventionValidationService {
    db: Arc<Database>,
}

impl InterventionValidationService {
    /// Create new validation service
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Validate start intervention request
    pub fn validate_start_request(
        &self,
        request: &StartInterventionRequest,
        user_id: &str,
    ) -> InterventionResult<()> {
        // Validate task_id is a valid UUID
        if uuid::Uuid::parse_str(&request.task_id).is_err() {
            return Err(InterventionError::Validation(format!(
                "Invalid task_id format: {} - must be a valid UUID",
                request.task_id
            )));
        }

        // Validate task exists and is not deleted
        let task_exists: bool = self.db.query_single_value(
            "SELECT EXISTS(SELECT 1 FROM tasks WHERE id = ? AND deleted_at IS NULL)",
            [request.task_id.as_str()],
        )?;
        if !task_exists {
            return Err(InterventionError::Validation(format!(
                "Task {} does not exist or has been deleted",
                request.task_id
            )));
        }

        // Validate no active intervention exists for this task
        self.validate_no_active_intervention(&request.task_id)?;

        // Validate technician permissions
        self.validate_technician_permissions(user_id, &request.technician_id)?;

        // Validate GPS coordinates
        if let Some(gps) = &request.gps_coordinates {
            if gps.latitude < -90.0
                || gps.latitude > 90.0
                || gps.longitude < -180.0
                || gps.longitude > 180.0
            {
                return Err(InterventionError::Validation(
                    "Invalid GPS coordinates".to_string(),
                ));
            }
        }

        // Validate scheduled start is in future
        self.validate_datetime(&request.scheduled_start)?;

        Ok(())
    }

    /// Validate no active intervention exists for task
    pub fn validate_no_active_intervention(&self, task_id: &str) -> InterventionResult<()> {
        let active_count: i64 = self.db.query_single_value(
            "SELECT COUNT(*) FROM interventions
             WHERE task_id = ?
             AND status IN ('pending', 'in_progress', 'paused')",
            [task_id],
        )?;

        if active_count > 0 {
            return Err(InterventionError::BusinessRule(
                "Task already has an active intervention".to_string(),
            ));
        }

        Ok(())
    }

    /// Validate technician permissions
    pub fn validate_technician_permissions(
        &self,
        user_id: &str,
        technician_id: &str,
    ) -> InterventionResult<()> {
        // Check if technician exists
        let technician_exists: bool = self.db.query_single_value(
            "SELECT EXISTS(SELECT 1 FROM users WHERE id = ?)",
            [technician_id],
        )?;
        if !technician_exists {
            return Err(InterventionError::Validation(format!(
                "Technician {} does not exist",
                technician_id
            )));
        }

        // Get user role
        let user_role: String = self
            .db
            .query_single_value("SELECT role FROM users WHERE id = ?", [user_id])?;
        let user_role = crate::shared::contracts::auth::UserRole::from_str(&user_role)
            .map_err(|_| InterventionError::Validation("Invalid user role".to_string()))?;

        // Permission check: Admin/Supervisor can assign any technician, Technician can only assign themselves
        match user_role {
            crate::shared::contracts::auth::UserRole::Admin
            | crate::shared::contracts::auth::UserRole::Supervisor => {
                // Can assign any technician
            }
            crate::shared::contracts::auth::UserRole::Technician => {
                if user_id != technician_id {
                    return Err(InterventionError::BusinessRule(
                        "Technicians can only start interventions for themselves".to_string(),
                    ));
                }
            }
            crate::shared::contracts::auth::UserRole::Viewer => {
                return Err(InterventionError::BusinessRule(
                    "Viewers cannot start interventions".to_string(),
                ));
            }
        }

        Ok(())
    }

    /// Validate datetime format and business rules
    pub fn validate_datetime(&self, scheduled_start: &str) -> InterventionResult<()> {
        // Parse the datetime - allow current time or future times
        match chrono::DateTime::parse_from_rfc3339(scheduled_start) {
            Ok(dt) => {
                let now = chrono::Utc::now();
                // Allow up to 5 minutes in the past for immediate starts
                let five_minutes_ago = now - chrono::Duration::minutes(5);
                if dt < five_minutes_ago {
                    return Err(InterventionError::Validation(
                        "Scheduled start time cannot be more than 5 minutes in the past"
                            .to_string(),
                    ));
                }
            }
            Err(_) => {
                return Err(InterventionError::Validation(
                    "Invalid datetime format for scheduled_start".to_string(),
                ));
            }
        }
        Ok(())
    }

    /// Validate step advancement
    pub fn validate_step_advancement(
        &self,
        intervention: &Intervention,
        step: &InterventionStep,
    ) -> InterventionResult<()> {
        // Check if intervention is in progress
        if intervention.status != InterventionStatus::InProgress {
            return Err(InterventionError::Workflow(
                "Intervention not in progress".to_string(),
            ));
        }

        // Check if step is the current step
        if intervention.current_step != step.step_number {
            return Err(InterventionError::Workflow(format!(
                "Cannot advance step {} when completed steps count is {}",
                step.step_number, intervention.current_step
            )));
        }

        // Check if step can be advanced (must be pending or in_progress)
        if step.step_status != StepStatus::Pending && step.step_status != StepStatus::InProgress {
            return Err(InterventionError::Workflow(
                "Step cannot be advanced - invalid status".to_string(),
            ));
        }

        Ok(())
    }

    /// Validate finalization
    pub fn validate_finalization(&self, intervention: &Intervention) -> InterventionResult<()> {
        // Check if all mandatory steps are completed
        let steps = self
            .db
            .query_as::<InterventionStep>(
                "SELECT * FROM intervention_steps WHERE intervention_id = ? ORDER BY step_number",
                [intervention.id.as_str()],
            )
            .map_err(|e| {
                InterventionError::Database(format!("Failed to get intervention steps: {}", e))
            })?;

        let incomplete_mandatory = steps
            .iter()
            .filter(|s| s.is_mandatory && s.step_status != StepStatus::Completed)
            .count();

        if incomplete_mandatory > 0 {
            return Err(InterventionError::BusinessRule(format!(
                "{} mandatory steps not completed",
                incomplete_mandatory
            )));
        }

        Ok(())
    }
}
