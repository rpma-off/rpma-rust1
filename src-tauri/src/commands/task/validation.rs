//! Task validation functions
//!
//! This module handles task assignment validation and availability checking.

use crate::authenticate;
use crate::commands::{ApiResponse, AppError, AppState};
use crate::models::task::{
    AssignmentCheckResponse, AssignmentStatus, AvailabilityCheckResponse, AvailabilityStatus,
    ValidationResult,
};
use tracing::{debug, info};

/// Request for checking task assignment eligibility
#[derive(serde::Deserialize, Debug)]
pub struct CheckTaskAssignmentRequest {
    pub session_token: String,
    pub task_id: String,
    pub user_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for checking task availability
#[derive(serde::Deserialize, Debug)]
pub struct CheckTaskAvailabilityRequest {
    pub session_token: String,
    pub task_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Request for validating task assignment changes
#[derive(serde::Deserialize, Debug)]
pub struct ValidateTaskAssignmentChangeRequest {
    pub session_token: String,
    pub task_id: String,
    pub old_user_id: Option<String>,
    pub new_user_id: String,
    #[serde(default)]
    pub correlation_id: Option<String>,
}

/// Check task assignment eligibility
#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn check_task_assignment(
    request: CheckTaskAssignmentRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<AssignmentCheckResponse>, AppError> {
    debug!("Checking task assignment eligibility");

    // Authenticate user
    let session = authenticate!(&request.session_token, &state);

    // Validate task exists and get task details
    let task_option = state
        .task_service
        .get_task_async(&request.task_id)
        .await
        .map_err(|e| {
            debug!("Task not found: {}", e);
            AppError::NotFound(format!("Task not found: {}", request.task_id))
        })?;

    let task = task_option
        .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", request.task_id)))?;

    // Check if user is authorized to assign tasks
    if !matches!(
        session.role,
        crate::models::auth::UserRole::Admin | crate::models::auth::UserRole::Supervisor
    ) {
        return Err(AppError::Authorization(
            "User not authorized to assign tasks".to_string(),
        ));
    }

    // Check current assignment status
    let current_assignee = task.technician_id.as_ref();
    let is_currently_assigned = current_assignee.is_some();
    let is_assigned_to_user = current_assignee == Some(&request.user_id);

    // Check user workload
    let user_workload = state
        .task_service
        .get_user_assigned_tasks(&request.user_id, None, None, None)
        .map_err(|e| {
            debug!("Failed to get user workload: {}", e);
            AppError::Database(format!("Failed to get user workload: {}", e))
        })?;

    // Get max tasks per user from settings (configurable)
    let max_tasks_per_user = state
        .settings_service
        .get_max_tasks_per_user()
        .map_err(|e| {
            debug!("Failed to get max_tasks_per_user setting: {}", e);
            AppError::Database(format!("Failed to get settings: {}", e))
        })? as usize;
    let current_task_count = user_workload.len();

    // Check if user has capacity
    let has_capacity = if is_assigned_to_user {
        // User already has this task, so capacity check should consider current assignment
        true // Allow reassignment to same user
    } else {
        current_task_count < max_tasks_per_user
    };

    // Check task priority and user skills
    let _task_priority = task.priority.clone();
    // TODO: Add user skills validation when user.skills field is available
    // let user_skills = user.skills.clone();
    // let required_skills = task.required_skills.clone();
    // let has_required_skills = ValidationService::validate_user_skills(
    //     &user_skills,
    //     &required_skills,
    //     task_priority,
    let has_required_skills = true; // Temporary: allow assignment when skills not available
    let required_skills: Vec<String> = vec![]; // Temporary: empty skills list

    // Check task schedule conflicts
    let has_schedule_conflicts = if let (Some(duration), Some(scheduled_date)) =
        (task.estimated_duration, &task.scheduled_date)
    {
        state
            .task_service
            .check_schedule_conflicts(
                &request.user_id,
                Some(scheduled_date.clone()),
                &Some(duration),
            )
            .map_err(|e| {
                debug!("Failed to check schedule conflicts: {}", e);
                AppError::Database(format!("Failed to check schedule conflicts: {}", e))
            })?
    } else {
        false // No conflicts if no duration or scheduled date specified
    };

    // Determine assignment status
    let status = if !has_capacity {
        AssignmentStatus::Unavailable
    } else if !has_required_skills {
        AssignmentStatus::Restricted
    } else if has_schedule_conflicts {
        AssignmentStatus::Unavailable
    } else if is_currently_assigned && !is_assigned_to_user {
        AssignmentStatus::Assigned
    } else {
        AssignmentStatus::Available
    };

    let can_assign = matches!(status, AssignmentStatus::Available);

    // Build validation result
    let _validation_result = ValidationResult {
        is_valid: can_assign,
        errors: match status {
            AssignmentStatus::Unavailable => vec![format!(
                "User has {} tasks, maximum allowed is {}",
                current_task_count, max_tasks_per_user
            )],
            AssignmentStatus::Restricted => {
                vec![format!("User lacks required skills: {:?}", required_skills)]
            }
            AssignmentStatus::Assigned => vec![format!(
                "Task is already assigned to user: {}",
                current_assignee.as_ref().unwrap()
            )],
            AssignmentStatus::Available => vec![],
        },
        warnings: vec![], // Could add warnings for edge cases
    };

    let reason = if can_assign {
        None
    } else {
        Some(match status {
            AssignmentStatus::Unavailable => format!(
                "User has {} tasks, maximum allowed is {}",
                current_task_count, max_tasks_per_user
            ),
            AssignmentStatus::Restricted => {
                format!("User lacks required skills: {:?}", required_skills)
            }
            AssignmentStatus::Assigned => format!(
                "Task is already assigned to user: {}",
                current_assignee.as_ref().unwrap()
            ),
            AssignmentStatus::Available => "".to_string(),
        })
    };

    let response = AssignmentCheckResponse {
        task_id: request.task_id.clone(),
        user_id: request.user_id.clone(),
        status,
        reason,
    };

    info!(
        "Task assignment check completed for task {} and user {}",
        request.task_id, request.user_id
    );

    let correlation_id = request.correlation_id.clone();
    Ok(ApiResponse::success(response).with_correlation_id(correlation_id))
}

/// Check task availability
#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn check_task_availability(
    request: CheckTaskAvailabilityRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<AvailabilityCheckResponse>, AppError> {
    debug!("Checking task availability");

    // Authenticate user
    let _session = authenticate!(&request.session_token, &state);

    // Get task details
    let task_option = state
        .task_service
        .get_task_async(&request.task_id)
        .await
        .map_err(|e| {
            debug!("Task not found: {}", e);
            AppError::NotFound(format!("Task not found: {}", request.task_id))
        })?;

    let task = task_option
        .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", request.task_id)))?;

    // Check if task is available for assignment
    let is_available = match task.status {
        crate::models::task::TaskStatus::Pending => true,
        crate::models::task::TaskStatus::Draft => true,
        crate::models::task::TaskStatus::Scheduled => true,
        crate::models::task::TaskStatus::InProgress => false, // Task already in progress
        crate::models::task::TaskStatus::Completed => false,  // Task already completed
        crate::models::task::TaskStatus::Cancelled => false,  // Task cancelled
        crate::models::task::TaskStatus::OnHold => true,      // Can be reassigned
        crate::models::task::TaskStatus::Invalid => false,    // Invalid tasks can't be assigned
        crate::models::task::TaskStatus::Archived => false,   // Archived tasks are read-only
        crate::models::task::TaskStatus::Failed => false,     // Failed tasks need review
        crate::models::task::TaskStatus::Overdue => true,     // Can still be assigned
        crate::models::task::TaskStatus::Assigned => false,   // Already assigned
        crate::models::task::TaskStatus::Paused => true,      // Can be reassigned
    };

    // Check if task has expired
    let now = chrono::Utc::now();
    let has_expired = if let Some(scheduled_date_str) = &task.scheduled_date {
        if let Ok(scheduled_date) = chrono::DateTime::parse_from_rfc3339(scheduled_date_str) {
            scheduled_date < now && task.status != crate::models::task::TaskStatus::Completed
        } else {
            false // Invalid date format, assume not expired
        }
    } else {
        false // No scheduled date, can't be expired
    };

    // Check if task is blocked by dependencies
    let dependencies_satisfied = state
        .task_service
        .check_dependencies_satisfied(&request.task_id)
        .map_err(|e| {
            debug!("Failed to check dependencies: {}", e);
            AppError::Database(format!("Failed to check task dependencies: {}", e))
        })?;

    // Determine availability status
    let status = if !is_available {
        AvailabilityStatus::Unavailable
    } else if has_expired {
        AvailabilityStatus::Unavailable
    } else if !dependencies_satisfied {
        AvailabilityStatus::Locked
    } else {
        AvailabilityStatus::Available
    };

    let _can_assign = matches!(status, AvailabilityStatus::Available);

    // Get reason if not available
    let reason = match status {
        AvailabilityStatus::Unavailable => Some(format!("Task is in status: {:?}", task.status)),
        AvailabilityStatus::Locked => Some("Task dependencies are not satisfied".to_string()),
        AvailabilityStatus::ScheduledConflict => {
            Some("Task conflicts with existing schedule".to_string())
        }
        AvailabilityStatus::MaterialUnavailable => {
            Some("Required materials are unavailable".to_string())
        }
        AvailabilityStatus::Available => None,
    };

    let response = AvailabilityCheckResponse {
        task_id: request.task_id.clone(),
        status,
        reason,
    };

    info!(
        "Task availability check completed for task {}",
        request.task_id
    );

    let correlation_id = request.correlation_id.clone();
    Ok(ApiResponse::success(response).with_correlation_id(correlation_id))
}

/// Validate task assignment change
#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn validate_task_assignment_change(
    request: ValidateTaskAssignmentChangeRequest,
    state: AppState<'_>,
) -> Result<ApiResponse<ValidationResult>, AppError> {
    debug!("Validating task assignment change");

    // Authenticate user
    let session = authenticate!(&request.session_token, &state);

    // Validate user has permission to change assignments
    if !matches!(
        session.role,
        crate::models::auth::UserRole::Admin | crate::models::auth::UserRole::Supervisor
    ) {
        return Err(AppError::Authorization(
            "User not authorized to change task assignments".to_string(),
        ));
    }

    // Get task details
    let task_option = state
        .task_service
        .get_task_async(&request.task_id)
        .await
        .map_err(|e| {
            debug!("Task not found: {}", e);
            AppError::NotFound(format!("Task not found: {}", request.task_id))
        })?;

    let task = task_option
        .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", request.task_id)))?;

    // Note: User existence validation skipped - no user_service available
    // Assume user exists if we get this far (validation could be added later if needed)

    // Note: Old user validation skipped - no user_service available
    // Assume user exists if we get this far (validation could be added later if needed)

    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    // Check if task is in a changeable state
    let changeable_states = [
        crate::models::task::TaskStatus::Pending,
        crate::models::task::TaskStatus::OnHold,
    ];

    if !changeable_states.contains(&task.status) {
        errors.push(format!(
            "Task cannot be reassigned in status: {:?}",
            task.status
        ));
    }

    // Check new user's capacity
    let new_user_workload = state
        .task_service
        .get_user_assigned_tasks(&request.new_user_id, None, None, None)
        .map_err(|e| {
            debug!("Failed to get new user workload: {}", e);
            AppError::Database(format!("Failed to check user workload: {}", e))
        })?;

    // Get max tasks per user from settings (configurable)
    let max_tasks_per_user = state
        .settings_service
        .get_max_tasks_per_user()
        .map_err(|e| {
            debug!("Failed to get max_tasks_per_user setting: {}", e);
            AppError::Database(format!("Failed to get settings: {}", e))
        })? as usize;
    let new_user_task_count = new_user_workload.len();

    // If this is not a reassignment to the same user, check capacity
    let is_reassignment_to_same = request.old_user_id.as_ref() == Some(&request.new_user_id);
    if !is_reassignment_to_same && new_user_task_count >= max_tasks_per_user {
        errors.push(format!(
            "New user has {} tasks, maximum allowed is {}",
            new_user_task_count, max_tasks_per_user
        ));
    }

    // Check new user's skills (simplified - could be enhanced with actual skill validation)
    let has_required_skills = true; // Placeholder - skills validation could be implemented
                                    // Note: task.required_skills field doesn't exist in Task model
                                    // This validation would need to be implemented differently if skill requirements are needed

    if !has_required_skills {
        errors.push("New user lacks required skills".to_string());
    }

    // Check schedule conflicts for new user
    let has_schedule_conflicts = if let (Some(duration), Some(scheduled_date)) =
        (task.estimated_duration, &task.scheduled_date)
    {
        state
            .task_service
            .check_schedule_conflicts(
                &request.new_user_id,
                Some(scheduled_date.clone()),
                &Some(duration),
            )
            .map_err(|e| {
                debug!("Failed to check schedule conflicts: {}", e);
                AppError::Database(format!("Failed to check schedule conflicts: {}", e))
            })?
    } else {
        false // No conflicts if no duration or scheduled date specified
    };

    if has_schedule_conflicts {
        warnings.push("Task conflicts with new user's existing schedule".to_string());
    }

    // Check business rules for reassignment
    if let Some(old_user_id) = &request.old_user_id {
        if old_user_id == &request.new_user_id {
            warnings.push("Reassigning task to the same user".to_string());
        }

        // Check if old user will be under-utilized
        let old_user_workload = state
            .task_service
            .get_user_assigned_tasks(old_user_id, None, None, None)
            .map_err(|e| {
                debug!("Failed to get old user workload: {}", e);
                AppError::Database(format!("Failed to check old user workload: {}", e))
            })?;

        if old_user_workload.len() <= 1 {
            warnings.push("Removing task may leave old user under-utilized".to_string());
        }
    }

    let is_valid = errors.is_empty();

    let validation_result = ValidationResult {
        is_valid,
        errors,
        warnings,
    };

    info!(
        "Task assignment change validation completed for task {}",
        request.task_id
    );

    let correlation_id = request.correlation_id.clone();
    Ok(ApiResponse::success(validation_result).with_correlation_id(correlation_id))
}
