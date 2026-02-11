use crate::commands::{ApiError, AppState};
use crate::db::FromSqlRow;
use crate::models::status::{StatusDistribution, StatusTransitionRequest, TaskStatus};
use crate::models::task::Task;
use crate::services::task_validation::validate_status_transition;

/// Transition a task to a new status with validation
#[tauri::command]
pub async fn task_transition_status(
    request: StatusTransitionRequest,
    state: AppState<'_>,
) -> Result<Task, AppError> {
    // Use TaskService to get current task
    let task = state
        .task_service
        .get_task(&request.task_id)
        .await
        .map_err(|e| AppError::Database(format!("Failed to get task: {}", e)))?
        .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", request.task_id)))?;

    // Validate status transition using TaskService
    let current_status = TaskStatus::from_str(&task.status)
        .ok_or_else(|| AppError::Validation("Unknown current status".to_string()))?;
    
    let new_status = TaskStatus::from_str(&request.new_status)
        .ok_or_else(|| AppError::Validation("Unknown new status".to_string()))?;

    state
        .task_service
        .validate_status_transition(&current_status, &new_status)
        .map_err(|e| {
            AppError::Validation(format!(
                "Cannot transition from {} to {}: {}",
                current_status.to_str(),
                new_status.to_str(),
                e
            ))
        })?;

    // Update task with new status
    let update_request = UpdateTaskRequest {
        status: Some(request.new_status.clone()),
        ..Default::default()
    };

    let updated_task = state
        .task_service
        .update_task_async(&request.task_id, update_request)
        .await
        .map_err(|e| AppError::Database(format!("Failed to update task status: {}", e)))?;

    // Validate transition
    validate_status_transition(&current, &new).map_err(|message| ApiError {
        message,
        code: "INVALID_TRANSITION".to_string(),
        details: None,
    })?;

    Ok(updated_task)
}

/// Get status distribution for all tasks
#[tauri::command]
pub async fn task_get_status_distribution(
    state: AppState<'_>,
) -> Result<StatusDistribution, AppError> {
    let conn = state.db.get_connection().map_err(|e| {
        AppError::Database(format!("Failed to get database connection: {}", e))
    })?;

    let mut stmt = conn
        .prepare(
            "SELECT status, COUNT(*) as count
         FROM tasks
         WHERE deleted_at IS NULL
         GROUP BY status",
        )
        .map_err(|e| AppError::Database(format!("Failed to prepare query: {}", e)))?;

    let mut distribution = StatusDistribution {
        quote: 0,
        scheduled: 0,
        in_progress: 0,
        paused: 0,
        completed: 0,
        cancelled: 0,
    };

    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
        })
        .map_err(|e| AppError::Database(format!("Query failed: {}", e)))?;

    for row in rows {
        let (status, count) = row.map_err(|e| {
            AppError::Database(format!("Failed to map row: {}", e))
        })?;
        match status.as_str() {
            "draft" | "pending" => distribution.quote += count,
            "scheduled" | "assigned" | "overdue" => distribution.scheduled += count,
            "in_progress" => distribution.in_progress += count,
            "paused" | "on_hold" => distribution.paused += count,
            "completed" | "archived" => distribution.completed += count,
            "cancelled" | "failed" | "invalid" => distribution.cancelled += count,
            _ => {}
        }
    }

    Ok(distribution)
}
