//! Task Rules Repository
//!
//! DB-backed rule checks for task assignments, availability checks,
//! and conflict detection. Named "repository" because it queries the database
//! to enforce business rules (not pure validation).

/// ADR-005: Repository Pattern
use crate::db::{Database, FromSqlRow};
use crate::domains::tasks::domain::models::task::{Task, TaskPriority, TaskStatus};
use crate::domains::tasks::infrastructure::task_constants::TASK_QUERY_COLUMNS;
use crate::shared::contracts::auth::UserRole;
use rusqlite::params;
use std::sync::Arc;

/// Validate that a task status transition is allowed according to business rules.
pub fn validate_status_transition(current: &TaskStatus, new: &TaskStatus) -> Result<(), String> {
    crate::domains::tasks::domain::services::task_state_machine::validate_status_transition(
        current, new,
    )
}

/// Return the list of statuses that `current` may transition to.
pub fn allowed_transitions(current: &TaskStatus) -> Vec<TaskStatus> {
    crate::domains::tasks::domain::services::task_state_machine::allowed_transitions(current)
}

/// Service for validating task assignments and availability
#[derive(Debug)]
pub struct TaskRulesRepository {
    db: Arc<Database>,
}

impl TaskRulesRepository {
    /// Create a new TaskRulesRepository instance
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    /// Get maximum tasks per user from settings (queries application_settings table directly).
    pub fn get_max_tasks_per_user(&self) -> Result<i32, String> {
        let conn = self.db.get_connection().map_err(|e| e.to_string())?;
        let result: Result<i32, _> = conn.query_row(
            "SELECT value FROM application_settings WHERE key = 'max_tasks_per_user'",
            [],
            |row| row.get(0),
        );
        Ok(result.unwrap_or(10))
    }

    /// Check if a user can be assigned to a task
    pub fn check_assignment_eligibility(
        &self,
        task_id: &str,
        user_id: &str,
    ) -> Result<bool, String> {
        // Get task details
        let task = self.get_task_by_id(task_id)?;
        let Some(task) = task else {
            return Err(format!("Task {} not found", task_id));
        };

        // Check if task status allows assignment
        if !self.is_task_assignable(&task.status) {
            return Ok(false);
        }

        // Check if user is already assigned to this task
        if task.technician_id.as_ref() == Some(&user_id.to_string()) {
            return Ok(true); // Already assigned, so eligible
        }

        // Check workload capacity
        if !self.check_workload_capacity(user_id, &task.scheduled_date)? {
            return Ok(false);
        }

        Ok(true)
    }

    /// Check if a task is available for assignment
    pub fn check_task_availability(&self, task_id: &str) -> Result<bool, String> {
        // Get task details
        let task = self.get_task_by_id(task_id)?;
        let Some(task) = task else {
            return Err(format!("Task {} not found", task_id));
        };

        // Check if task status allows assignment
        if !self.is_task_assignable(&task.status) {
            return Ok(false);
        }

        // Check for scheduling conflicts
        if self.has_scheduling_conflicts(&task)? {
            return Ok(false);
        }

        Ok(true)
    }

    /// Validate a task assignment change
    pub fn validate_assignment_change(
        &self,
        task_id: &str,
        _old_user_id: Option<&str>,
        new_user_id: &str,
    ) -> Result<Vec<String>, String> {
        let mut warnings = Vec::new();

        // Get task details
        let task = self.get_task_by_id(task_id)?;
        let Some(task) = task else {
            return Err(format!("Task {} not found", task_id));
        };

        // Check if new user is eligible
        if !self.check_assignment_eligibility(task_id, new_user_id)? {
            warnings.push(format!(
                "User {} is not eligible for this task",
                new_user_id
            ));
        }

        // Check for scheduling conflicts with new user
        if self.has_user_scheduling_conflicts(
            new_user_id,
            &task.scheduled_date,
            &task.start_time,
            &task.end_time,
        )? {
            warnings.push(format!(
                "User {} has scheduling conflicts for this time slot",
                new_user_id
            ));
        }

        Ok(warnings)
    }

    /// Check if a task status allows assignment
    fn is_task_assignable(&self, status: &TaskStatus) -> bool {
        matches!(
            status,
            TaskStatus::Draft
                | TaskStatus::Scheduled
                | TaskStatus::Pending
                | TaskStatus::Assigned
                | TaskStatus::OnHold
                | TaskStatus::Paused
        )
    }

    /// Validate technician assignment for a task
    pub fn validate_technician_assignment(
        &self,
        technician_id: &str,
        _ppf_zones: &Option<Vec<String>>,
    ) -> Result<(), String> {
        let conn = self.db.get_connection()?;

        // Check if user exists and is active
        let mut stmt = conn
            .prepare("SELECT role, is_active FROM users WHERE id = ? AND deleted_at IS NULL")
            .map_err(|e| format!("Failed to query user: {}", e))?;

        let (role, is_active): (String, i32) = stmt
            .query_row(params![technician_id], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|_| format!("Technician with ID {} not found", technician_id))?;

        // Check if user is active
        if is_active == 0 {
            return Err(format!("Technician {} is not active", technician_id));
        }

        // Check if user has valid role for task assignment
        let can_be_assigned = role
            .parse::<UserRole>()
            .map(|r| {
                matches!(
                    r,
                    UserRole::Technician | UserRole::Admin | UserRole::Supervisor
                )
            })
            .unwrap_or(false);
        if !can_be_assigned {
            return Err(format!(
                "User {} has role '{}' which cannot be assigned to tasks.",
                technician_id, role
            ));
        }

        Ok(())
    }

    /// Check user workload capacity
    fn check_workload_capacity(
        &self,
        user_id: &str,
        scheduled_date: &Option<String>,
    ) -> Result<bool, String> {
        let Some(date) = scheduled_date else {
            return Ok(true); // No date specified, assume capacity available
        };

        let conn = self.db.get_connection()?;
        let mut stmt = conn
            .prepare(
                r#"
            SELECT COUNT(*) FROM tasks
            WHERE technician_id = ?
            AND scheduled_date = ?
            AND status IN ('scheduled', 'in_progress', 'assigned')
            AND deleted_at IS NULL
            "#,
            )
            .map_err(|e| e.to_string())?;
        let concurrent_tasks: i64 = stmt
            .query_row(params![user_id, date], |row| row.get(0))
            .map_err(|e| e.to_string())?;

        let max_tasks = self.get_max_tasks_per_user().unwrap_or(3);
        Ok(concurrent_tasks < max_tasks as i64)
    }

    /// Check for scheduling conflicts
    fn has_scheduling_conflicts(&self, task: &Task) -> Result<bool, String> {
        let Some(technician_id) = &task.technician_id else {
            return Ok(false); // No technician assigned, no conflicts
        };

        self.has_user_scheduling_conflicts(
            technician_id,
            &task.scheduled_date,
            &task.start_time,
            &task.end_time,
        )
    }

    /// Check if a user has scheduling conflicts
    fn has_user_scheduling_conflicts(
        &self,
        user_id: &str,
        scheduled_date: &Option<String>,
        start_time: &Option<String>,
        end_time: &Option<String>,
    ) -> Result<bool, String> {
        let (Some(date), Some(start), Some(end)) = (scheduled_date, start_time, end_time) else {
            return Ok(false); // No scheduling info, no conflicts
        };

        let conn = self.db.get_connection()?;
        let mut stmt = conn
            .prepare(
                r#"
            SELECT COUNT(*) FROM tasks
            WHERE technician_id = ?
            AND scheduled_date = ?
            AND status IN ('scheduled', 'in_progress', 'assigned')
            AND deleted_at IS NULL
            AND (
                (start_time <= ? AND end_time > ?) OR
                (start_time < ? AND end_time >= ?) OR
                (start_time >= ? AND end_time <= ?)
            )
            "#,
            )
            .map_err(|e| e.to_string())?;
        let conflicts: i64 = stmt
            .query_row(
                params![user_id, date, start, start, end, end, start, end],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        Ok(conflicts > 0)
    }

    /// Check for scheduling conflicts for a user at a specific date and duration
    pub fn check_schedule_conflicts(
        &self,
        user_id: &str,
        scheduled_date: Option<String>,
        _duration: &Option<i32>,
    ) -> Result<bool, String> {
        // For now, implement basic check
        // In full implementation, this would check calendar conflicts
        let Some(_date) = scheduled_date else {
            return Ok(false); // No date, no conflicts
        };

        // Check concurrent tasks
        self.check_workload_capacity(user_id, &Some(_date))
    }

    /// Check if task dependencies are satisfied
    pub fn check_dependencies_satisfied(&self, _task_id: &str) -> Result<bool, String> {
        // For now, assume no dependencies or they are satisfied
        // In full implementation, this would check task dependency graph
        Ok(true)
    }

    /// Get a task by ID
    fn get_task_by_id(&self, task_id: &str) -> Result<Option<Task>, String> {
        let conn = self.db.get_connection()?;
        let mut stmt = conn
            .prepare(&format!(
                r#"
            SELECT{}
            FROM tasks
            WHERE id = ? AND deleted_at IS NULL
            "#,
                TASK_QUERY_COLUMNS
            ))
            .map_err(|e| e.to_string())?;
        let task = stmt.query_row(params![task_id], |row| Task::from_row(row));

        match task {
            Ok(task) => Ok(Some(task)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(format!("Database error: {}", e)),
        }
    }
}
