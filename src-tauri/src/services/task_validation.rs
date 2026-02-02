//! Task Validation Service Module
//!
//! This module provides validation logic for task assignments, availability checks,
//! and conflict detection to ensure proper task management and resource allocation.

use crate::db::{Database, FromSqlRow};
use crate::models::task::{Task, TaskPriority, TaskStatus};
use crate::services::settings::SettingsService;
use crate::services::task_constants::TASK_QUERY_COLUMNS;
use rusqlite::params;
use std::sync::Arc;

/// Validate that a task status transition is allowed according to business rules.
///
/// This function enforces the task lifecycle state machine, preventing invalid
/// transitions and ensuring proper workflow progression.
///
/// # Valid Transitions
///
/// - **Draft** → Pending, Scheduled, Cancelled
/// - **Pending** → InProgress, Scheduled, OnHold, Cancelled, Assigned
/// - **Scheduled** → InProgress, OnHold, Cancelled, Assigned
/// - **Assigned** → InProgress, OnHold, Cancelled
/// - **InProgress** → Completed, OnHold, Paused, Cancelled
/// - **Paused** → InProgress, Cancelled
/// - **OnHold** → Pending, Scheduled, InProgress, Cancelled
/// - **Completed** → Archived
///
/// # Terminal States
///
/// Tasks in the following states cannot transition further:
/// - **Cancelled** - Terminal state
/// - **Archived** - Terminal state (read-only)
///
/// # Arguments
///
/// * `current` - The current status of the task
/// * `new` - The proposed new status
///
/// # Returns
///
/// * `Ok(())` - Transition is valid
/// * `Err(String)` - Transition is invalid with explanation
///
/// # Examples
///
/// ```
/// use crate::models::task::TaskStatus;
///
/// assert!(validate_status_transition(&TaskStatus::Draft, &TaskStatus::Pending).is_ok());
/// assert!(validate_status_transition(&TaskStatus::Completed, &TaskStatus::Pending).is_err());
/// ```
pub fn validate_status_transition(current: &TaskStatus, new: &TaskStatus) -> Result<(), String> {
    match (current, new) {
        // Valid transitions from Draft
        (TaskStatus::Draft, TaskStatus::Pending) => Ok(()),
        (TaskStatus::Draft, TaskStatus::Scheduled) => Ok(()),
        (TaskStatus::Draft, TaskStatus::Cancelled) => Ok(()),

        // Valid transitions from Pending
        (TaskStatus::Pending, TaskStatus::InProgress) => Ok(()),
        (TaskStatus::Pending, TaskStatus::Scheduled) => Ok(()),
        (TaskStatus::Pending, TaskStatus::Cancelled) => Ok(()),
        (TaskStatus::Pending, TaskStatus::OnHold) => Ok(()),
        (TaskStatus::Pending, TaskStatus::Assigned) => Ok(()),

        // Valid transitions from Scheduled
        (TaskStatus::Scheduled, TaskStatus::InProgress) => Ok(()),
        (TaskStatus::Scheduled, TaskStatus::OnHold) => Ok(()),
        (TaskStatus::Scheduled, TaskStatus::Cancelled) => Ok(()),
        (TaskStatus::Scheduled, TaskStatus::Assigned) => Ok(()),

        // Valid transitions from Assigned
        (TaskStatus::Assigned, TaskStatus::InProgress) => Ok(()),
        (TaskStatus::Assigned, TaskStatus::OnHold) => Ok(()),
        (TaskStatus::Assigned, TaskStatus::Cancelled) => Ok(()),

        // Valid transitions from InProgress
        (TaskStatus::InProgress, TaskStatus::Completed) => Ok(()),
        (TaskStatus::InProgress, TaskStatus::OnHold) => Ok(()),
        (TaskStatus::InProgress, TaskStatus::Paused) => Ok(()),
        (TaskStatus::InProgress, TaskStatus::Cancelled) => Ok(()),

        // Valid transitions from Paused
        (TaskStatus::Paused, TaskStatus::InProgress) => Ok(()),
        (TaskStatus::Paused, TaskStatus::Cancelled) => Ok(()),

        // Valid transitions from OnHold
        (TaskStatus::OnHold, TaskStatus::Pending) => Ok(()),
        (TaskStatus::OnHold, TaskStatus::Scheduled) => Ok(()),
        (TaskStatus::OnHold, TaskStatus::InProgress) => Ok(()),
        (TaskStatus::OnHold, TaskStatus::Cancelled) => Ok(()),

        // Valid transition from Completed
        (TaskStatus::Completed, TaskStatus::Archived) => Ok(()),

        // Invalid transitions from Completed (can only go to Archived)
        (TaskStatus::Completed, TaskStatus::Pending) => {
            Err("Cannot move completed task back to pending".to_string())
        }
        (TaskStatus::Completed, TaskStatus::InProgress) => {
            Err("Cannot move completed task back to in progress".to_string())
        }
        (TaskStatus::Completed, TaskStatus::Scheduled) => {
            Err("Cannot move completed task back to scheduled".to_string())
        }

        // Invalid transitions from Cancelled (terminal state)
        (TaskStatus::Cancelled, TaskStatus::Pending) => {
            Err("Cannot move cancelled task back to pending".to_string())
        }
        (TaskStatus::Cancelled, TaskStatus::InProgress) => {
            Err("Cannot move cancelled task back to in progress".to_string())
        }
        (TaskStatus::Cancelled, TaskStatus::Scheduled) => {
            Err("Cannot move cancelled task back to scheduled".to_string())
        }

        // Invalid transitions from Archived (terminal state)
        (TaskStatus::Archived, TaskStatus::Pending) => {
            Err("Cannot move archived task back to pending".to_string())
        }
        (TaskStatus::Archived, TaskStatus::InProgress) => {
            Err("Cannot move archived task back to in progress".to_string())
        }

        // Catch-all for undefined transitions
        _ => Err(format!(
            "Invalid status transition from {:?} to {:?}",
            current, new
        )),
    }
}

/// Service for validating task assignments and availability
#[derive(Debug)]
pub struct TaskValidationService {
    db: Arc<Database>,
    settings: SettingsService,
}

impl TaskValidationService {
    /// Create a new TaskValidationService instance
    pub fn new(db: Arc<Database>) -> Self {
        let settings = SettingsService::new(db.clone());
        Self { db, settings }
    }

    /// Get maximum tasks per user from settings
    fn get_max_tasks_per_user(&self) -> Result<i32, String> {
        self.settings
            .get_max_tasks_per_user()
            .map_err(|e| format!("Failed to get max_tasks_per_user setting: {}", e))
    }

    /// Check if a user can be assigned to a task
    ///
    /// Validates assignment eligibility based on:
    /// - User permissions and role
    /// - Task status allowing assignment
    /// - Technician qualifications for PPF zones
    /// - Workload capacity limits
    ///
    /// # Arguments
    /// * `task_id` - The task to check assignment for
    /// * `user_id` - The user to check assignment eligibility for
    ///
    /// # Returns
    /// * `Ok(true)` - User can be assigned to the task
    /// * `Ok(false)` - User cannot be assigned to the task
    /// * `Err(String)` - Error occurred during validation
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

        // Check technician qualifications for PPF zones
        if !self.check_technician_qualifications(user_id, &task.ppf_zones)? {
            return Ok(false);
        }

        // Check workload capacity
        if !self.check_workload_capacity(user_id, &task.scheduled_date)? {
            return Ok(false);
        }

        Ok(true)
    }

    /// Check if a task is available for assignment
    ///
    /// Validates task availability based on:
    /// - Task not being locked by another user
    /// - Task status allowing new assignments
    /// - No scheduling conflicts
    ///
    /// # Arguments
    /// * `task_id` - The task to check availability for
    ///
    /// # Returns
    /// * `Ok(true)` - Task is available for assignment
    /// * `Ok(false)` - Task is not available for assignment
    /// * `Err(String)` - Error occurred during validation
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

        // Check material availability (if applicable)
        if !self.check_material_availability(&task)? {
            return Ok(false);
        }

        Ok(true)
    }

    /// Validate a task assignment change
    ///
    /// Checks for conflicts when changing task assignments between users.
    ///
    /// # Arguments
    /// * `task_id` - The task being reassigned
    /// * `old_user_id` - Current assignee (None if unassigned)
    /// * `new_user_id` - New assignee
    ///
    /// # Returns
    /// * `Ok(Vec<String>)` - List of validation warnings/conflicts (empty if valid)
    /// * `Err(String)` - Error occurred during validation
    pub fn validate_assignment_change(
        &self,
        task_id: &str,
        old_user_id: Option<&str>,
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

        // Check priority conflicts
        if let Some(old_user) = old_user_id {
            if task.priority == TaskPriority::Urgent && old_user != new_user_id {
                warnings
                    .push("Reassigning urgent priority task may impact response time".to_string());
            }
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

    /// Check technician qualifications for PPF zones
    fn check_technician_qualifications(
        &self,
        user_id: &str,
        ppf_zones: &Option<Vec<String>>,
    ) -> Result<bool, String> {
        // For now, implement basic qualification check
        // In a full implementation, this would check user certifications, training records, etc.

        let Some(zones) = ppf_zones else {
            return Ok(true); // No PPF zones specified, assume qualified
        };

        if zones.is_empty() {
            return Ok(true);
        }

        // Check if user has PPF certification
        // This is a simplified check - in production, you'd query user certifications table
        let conn = self.db.get_connection()?;
        let mut stmt = conn.prepare(
            "SELECT COUNT(*) FROM users WHERE id = ? AND role IN ('technician', 'admin', 'manager')"
        ).map_err(|e| e.to_string())?;
        let count: i64 = stmt
            .query_row(params![user_id], |row| row.get(0))
            .map_err(|e| e.to_string())?;

        // For now, allow any technician/admin/manager to work on PPF tasks
        // In production, you'd check specific certifications
        Ok(count > 0)
    }

    /// Validate technician assignment for a task
    ///
    /// Public method to validate if a technician can be assigned to a task based on:
    /// - User role (must be technician, admin, or manager)
    /// - User must be active
    /// - PPF zone complexity (logs warnings for complex zones)
    ///
    /// # Arguments
    /// * `technician_id` - The technician user ID to validate
    /// * `ppf_zones` - Optional list of PPF zones for the task
    ///
    /// # Returns
    /// * `Ok(())` - Technician is qualified for the task
    /// * `Err(String)` - Validation error with details
    pub fn validate_technician_assignment(
        &self,
        technician_id: &str,
        ppf_zones: &Option<Vec<String>>,
    ) -> Result<(), String> {
        let conn = self.db.get_connection()?;

        // Check if user exists and is active
        let mut stmt = conn
            .prepare("SELECT role, is_active FROM users WHERE id = ?")
            .map_err(|e| format!("Failed to query user: {}", e))?;

        let (role, is_active): (String, i32) = stmt
            .query_row(params![technician_id], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|_| format!("Technician with ID {} not found", technician_id))?;

        // Check if user is active
        if is_active == 0 {
            return Err(format!("Technician {} is not active", technician_id));
        }

        // Check if user has valid role
        let valid_roles = ["technician", "admin", "manager", "supervisor"];
        if !valid_roles.contains(&role.as_str()) {
            return Err(format!(
                "User {} has role '{}' which cannot be assigned to tasks. Valid roles: {:?}",
                technician_id, role, valid_roles
            ));
        }

        // Check PPF zone complexity
        if let Some(zones) = ppf_zones {
            if !zones.is_empty() {
                self.validate_ppf_zone_complexity(technician_id, zones)?;
            }
        }

        Ok(())
    }

    /// Validate PPF zone complexity and log warnings for complex zones
    ///
    /// # Arguments
    /// * `technician_id` - The technician being assigned
    /// * `zones` - List of PPF zones to validate
    ///
    /// # Returns
    /// * `Ok(())` - Zones are valid
    /// * `Err(String)` - Validation error
    fn validate_ppf_zone_complexity(
        &self,
        technician_id: &str,
        zones: &[String],
    ) -> Result<(), String> {
        // Define complex zones that require special training
        let complex_zones = vec![
            "hood",
            "fenders",
            "bumper",
            "mirror",
            "door",
            "door_cups",
            "a_pillar",
            "c_pillar",
            "quarter_panel",
            "rocker_panel",
            "roof",
        ];

        // Check for complex zones
        let mut complex_count = 0;
        for zone in zones {
            let zone_lower = zone.to_lowercase();
            if complex_zones.iter().any(|cz| zone_lower.contains(cz)) {
                complex_count += 1;
            }
        }

        // If there are many complex zones, log a warning
        if complex_count >= 3 {
            tracing::warn!(
                "Technician {} assigned to task with {} complex PPF zones. Ensure proper training.",
                technician_id,
                complex_count
            );
        }

        // Validate zone names (basic check)
        for zone in zones {
            if zone.trim().is_empty() {
                return Err("PPF zone cannot be empty".to_string());
            }
            if zone.len() > 100 {
                return Err(format!(
                    "PPF zone '{}' exceeds maximum length (100 characters)",
                    zone
                ));
            }
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

        // Check concurrent tasks for the user on the same day
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

        // Allow maximum 3 concurrent tasks per day per technician
        Ok(concurrent_tasks < 3)
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

        // Check for overlapping tasks
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

    /// Check material availability for a task
    fn check_material_availability(&self, _task: &Task) -> Result<bool, String> {
        // For now, assume materials are always available
        // In a full implementation, this would check inventory levels
        // against materials required for PPF zones
        Ok(true)
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
