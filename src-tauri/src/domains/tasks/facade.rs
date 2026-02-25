use std::sync::Arc;

use crate::domains::tasks::domain::models::task::{
    AssignmentCheckResponse, AssignmentStatus, AvailabilityCheckResponse, AvailabilityStatus,
    Task, TaskStatus, ValidationResult,
};
use crate::domains::tasks::infrastructure::task::TaskService;
use crate::domains::tasks::infrastructure::task_import::TaskImportService;
use crate::shared::ipc::errors::AppError;

/// Facade for the Tasks bounded context.
///
/// Provides input validation, business-rule enforcement, and error mapping
/// on top of the underlying infrastructure services. IPC handlers should
/// prefer going through the facade for any operation that requires
/// domain-level validation.
#[derive(Debug)]
pub struct TasksFacade {
    task_service: Arc<TaskService>,
    import_service: Arc<TaskImportService>,
}

impl TasksFacade {
    pub fn new(task_service: Arc<TaskService>, import_service: Arc<TaskImportService>) -> Self {
        Self {
            task_service,
            import_service,
        }
    }

    pub fn is_ready(&self) -> bool {
        true
    }

    /// Access the underlying task service for operations that do not need
    /// additional facade-level validation.
    pub fn task_service(&self) -> &Arc<TaskService> {
        &self.task_service
    }

    /// Access the underlying import service.
    pub fn import_service(&self) -> &Arc<TaskImportService> {
        &self.import_service
    }

    /// Validate and parse a status string, returning a domain-level error on
    /// invalid input.
    pub fn parse_status(&self, status: &str) -> Result<TaskStatus, AppError> {
        TaskStatus::from_str(status)
            .ok_or_else(|| AppError::Validation(format!("Invalid task status: {}", status)))
    }

    /// Validate that a task note is non-empty and within acceptable length.
    pub fn validate_note(&self, note: &str) -> Result<String, AppError> {
        let trimmed = note.trim();
        if trimmed.is_empty() {
            return Err(AppError::Validation(
                "Task note cannot be empty".to_string(),
            ));
        }
        if trimmed.len() > 5000 {
            return Err(AppError::Validation(
                "Task note exceeds maximum length of 5000 characters".to_string(),
            ));
        }
        Ok(trimmed.to_string())
    }

    /// Validate that a task ID is present and well-formed.
    pub fn validate_task_id(&self, task_id: &str) -> Result<(), AppError> {
        if task_id.trim().is_empty() {
            return Err(AppError::Validation("task_id is required".to_string()));
        }
        Ok(())
    }

    /// Append a new entry to an existing task notes string.
    ///
    /// Entries are separated by a newline. If there are no existing notes the
    /// entry becomes the whole string.
    pub fn append_note(&self, existing_notes: Option<&str>, entry: &str) -> String {
        match existing_notes {
            Some(existing) if !existing.trim().is_empty() => {
                format!("{}\n{}", existing.trim_end(), entry)
            }
            _ => entry.to_string(),
        }
    }

    /// Build a timestamped note entry string.
    pub fn format_note_entry(&self, user_id: &str, note: &str) -> String {
        format!(
            "[{}][note][{}] {}",
            chrono::Utc::now().to_rfc3339(),
            user_id,
            note
        )
    }

    /// Build a timestamped issue entry string.
    pub fn format_issue_entry(
        &self,
        user_id: &str,
        issue_type: &str,
        severity: &str,
        description: &str,
    ) -> String {
        format!(
            "[{}][issue:{}][severity:{}][{}] {}",
            chrono::Utc::now().to_rfc3339(),
            issue_type,
            severity,
            user_id,
            description
        )
    }

    /// Evaluate whether a user can be assigned to a task and return a
    /// structured [`AssignmentCheckResponse`].
    ///
    /// The caller is responsible for fetching `max_tasks_per_user` from the
    /// settings service so that the facade remains independent of the settings
    /// domain.
    pub async fn evaluate_assignment_eligibility(
        &self,
        task: &Task,
        user_id: &str,
        max_tasks_per_user: usize,
    ) -> Result<AssignmentCheckResponse, AppError> {
        let current_assignee = task.technician_id.as_deref();
        let is_assigned_to_user = current_assignee == Some(user_id);

        let user_workload = self
            .task_service
            .get_user_assigned_tasks(user_id, None, None, None)
            .map_err(|e| AppError::db_sanitized("get_user_workload", &e))?;
        let current_task_count = user_workload.len();

        let has_capacity = is_assigned_to_user || current_task_count < max_tasks_per_user;

        let has_schedule_conflicts = if let (Some(duration), Some(scheduled_date)) =
            (task.estimated_duration, &task.scheduled_date)
        {
            self.task_service
                .check_schedule_conflicts(user_id, Some(scheduled_date.clone()), &Some(duration))
                .map_err(|e| AppError::db_sanitized("check_schedule_conflicts", &e))?
        } else {
            false
        };

        let is_currently_assigned_to_other =
            current_assignee.is_some() && !is_assigned_to_user;

        let status = if !has_capacity {
            AssignmentStatus::Unavailable
        } else if has_schedule_conflicts {
            AssignmentStatus::Unavailable
        } else if is_currently_assigned_to_other {
            AssignmentStatus::Assigned
        } else {
            AssignmentStatus::Available
        };

        let can_assign = matches!(status, AssignmentStatus::Available);
        let assigned_user_label = current_assignee
            .unwrap_or("unknown")
            .to_string();

        let reason = if can_assign {
            None
        } else {
            Some(match &status {
                AssignmentStatus::Unavailable => format!(
                    "User has {} tasks, maximum allowed is {}",
                    current_task_count, max_tasks_per_user
                ),
                AssignmentStatus::Assigned => format!(
                    "Task is already assigned to user: {}",
                    assigned_user_label
                ),
                _ => String::new(),
            })
        };

        Ok(AssignmentCheckResponse {
            task_id: task.id.clone(),
            user_id: user_id.to_string(),
            status,
            reason,
        })
    }

    /// Evaluate whether a task is currently available for assignment and return
    /// a structured [`AvailabilityCheckResponse`].
    pub fn evaluate_task_availability(
        &self,
        task: &Task,
    ) -> Result<AvailabilityCheckResponse, AppError> {
        let is_available = matches!(
            task.status,
            TaskStatus::Pending
                | TaskStatus::Draft
                | TaskStatus::Scheduled
                | TaskStatus::OnHold
                | TaskStatus::Overdue
                | TaskStatus::Paused
        );

        let has_expired = if let Some(scheduled_date_str) = &task.scheduled_date {
            if let Ok(scheduled_date) = chrono::DateTime::parse_from_rfc3339(scheduled_date_str) {
                scheduled_date < chrono::Utc::now()
                    && task.status != TaskStatus::Completed
            } else {
                false
            }
        } else {
            false
        };

        let dependencies_satisfied = self
            .task_service
            .check_dependencies_satisfied(&task.id)
            .map_err(|e| AppError::db_sanitized("check_task_dependencies", &e))?;

        let status = if !is_available || has_expired {
            AvailabilityStatus::Unavailable
        } else if !dependencies_satisfied {
            AvailabilityStatus::Locked
        } else {
            AvailabilityStatus::Available
        };

        let reason = match &status {
            AvailabilityStatus::Unavailable => {
                Some(format!("Task is in status: {:?}", task.status))
            }
            AvailabilityStatus::Locked => {
                Some("Task dependencies are not satisfied".to_string())
            }
            AvailabilityStatus::ScheduledConflict => {
                Some("Task conflicts with existing schedule".to_string())
            }
            AvailabilityStatus::MaterialUnavailable => {
                Some("Required materials are unavailable".to_string())
            }
            AvailabilityStatus::Available => None,
        };

        Ok(AvailabilityCheckResponse {
            task_id: task.id.clone(),
            status,
            reason,
        })
    }

    /// Validate a proposed reassignment and return a structured
    /// [`ValidationResult`] describing any errors or warnings.
    ///
    /// The caller is responsible for fetching `max_tasks_per_user` from the
    /// settings service.
    pub fn evaluate_assignment_change(
        &self,
        task: &Task,
        old_user_id: Option<&str>,
        new_user_id: &str,
        max_tasks_per_user: usize,
    ) -> Result<ValidationResult, AppError> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        let changeable_states = [TaskStatus::Pending, TaskStatus::OnHold];
        if !changeable_states.contains(&task.status) {
            errors.push(format!(
                "Task cannot be reassigned in status: {:?}",
                task.status
            ));
        }

        let new_user_workload = self
            .task_service
            .get_user_assigned_tasks(new_user_id, None, None, None)
            .map_err(|e| AppError::db_sanitized("check_user_workload", &e))?;

        let is_same_user = old_user_id == Some(new_user_id);
        if !is_same_user && new_user_workload.len() >= max_tasks_per_user {
            errors.push(format!(
                "New user has {} tasks, maximum allowed is {}",
                new_user_workload.len(),
                max_tasks_per_user
            ));
        }

        let has_schedule_conflicts = if let (Some(duration), Some(scheduled_date)) =
            (task.estimated_duration, &task.scheduled_date)
        {
            self.task_service
                .check_schedule_conflicts(
                    new_user_id,
                    Some(scheduled_date.clone()),
                    &Some(duration),
                )
                .map_err(|e| AppError::db_sanitized("check_schedule_conflicts", &e))?
        } else {
            false
        };

        if has_schedule_conflicts {
            warnings.push("Task conflicts with new user's existing schedule".to_string());
        }

        if let Some(old_id) = old_user_id {
            if old_id == new_user_id {
                warnings.push("Reassigning task to the same user".to_string());
            }

            let old_user_workload = self
                .task_service
                .get_user_assigned_tasks(old_id, None, None, None)
                .map_err(|e| AppError::db_sanitized("check_old_user_workload", &e))?;

            if old_user_workload.len() <= 1 {
                warnings.push(
                    "Removing task may leave old user under-utilized".to_string(),
                );
            }
        }

        Ok(ValidationResult {
            is_valid: errors.is_empty(),
            errors,
            warnings,
        })
    }
}
