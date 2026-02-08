use crate::commands::{ApiError, AppState};
use crate::db::FromSqlRow;
use crate::models::status::*;
use crate::models::task::Task;

/// Transition a task to a new status with validation
#[tauri::command]
pub async fn task_transition_status(
    request: StatusTransitionRequest,
    state: AppState<'_>,
) -> Result<Task, ApiError> {
    let conn = state.db.get_connection().map_err(|e| ApiError {
        message: e.to_string(),
        code: "DATABASE_ERROR".to_string(),
        details: None,
    })?;

    // Get current task status
    let current_status: String = conn
        .query_row(
            "SELECT status FROM tasks WHERE id = ?1",
            [&request.task_id],
            |row| row.get(0),
        )
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "TASK_NOT_FOUND".to_string(),
            details: None,
        })?;

    let current = TaskStatus::from_str(&current_status).ok_or_else(|| ApiError {
        message: "Unknown current status".to_string(),
        code: "INVALID_STATUS".to_string(),
        details: None,
    })?;

    let new = TaskStatus::from_str(&request.new_status).ok_or_else(|| ApiError {
        message: "Unknown new status".to_string(),
        code: "INVALID_STATUS".to_string(),
        details: None,
    })?;

    // Validate transition
    if !current.can_transition_to(&new) {
        return Err(ApiError {
            message: format!(
                "Cannot transition from {} to {}",
                current.to_str(),
                new.to_str()
            ),
            code: "INVALID_TRANSITION".to_string(),
            details: None,
        });
    }

    // Update status
    conn.execute(
        "UPDATE tasks SET status = ?1, updated_at = ?2 WHERE id = ?3",
        rusqlite::params![
            request.new_status,
            chrono::Utc::now().timestamp(),
            request.task_id
        ],
    )
    .map_err(|e| ApiError {
        message: e.to_string(),
        code: "UPDATE_ERROR".to_string(),
        details: None,
    })?;

    // Log transition in history (if table exists)
    conn.execute(
        "INSERT OR IGNORE INTO task_history (task_id, old_status, new_status, reason, changed_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![
            request.task_id,
            current_status,
            request.new_status,
            request.reason,
            chrono::Utc::now().timestamp()
        ],
    )
    .ok(); // Optional logging, don't fail transaction

    // Fetch updated task
    let updated_task: Task = conn
        .query_row(
            "SELECT * FROM tasks WHERE id = ?1",
            [&request.task_id],
            Task::from_row,
        )
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "FETCH_ERROR".to_string(),
            details: None,
        })?;

    Ok(updated_task)
}

/// Get status distribution for all tasks
#[tauri::command]
pub async fn task_get_status_distribution(
    state: AppState<'_>,
) -> Result<StatusDistribution, ApiError> {
    let conn = state.db.get_connection().map_err(|e| ApiError {
        message: e.to_string(),
        code: "DATABASE_ERROR".to_string(),
        details: None,
    })?;

    let mut stmt = conn
        .prepare(
            "SELECT status, COUNT(*) as count
         FROM tasks
         WHERE deleted_at IS NULL
         GROUP BY status",
        )
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "QUERY_ERROR".to_string(),
            details: None,
        })?;

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
        .map_err(|e| ApiError {
            message: e.to_string(),
            code: "QUERY_ERROR".to_string(),
            details: None,
        })?;

    for row in rows {
        let (status, count) = row.map_err(|e| ApiError {
            message: e.to_string(),
            code: "MAPPING_ERROR".to_string(),
            details: None,
        })?;
        match status.as_str() {
            "quote" => distribution.quote = count,
            "scheduled" => distribution.scheduled = count,
            "in_progress" => distribution.in_progress = count,
            "paused" => distribution.paused = count,
            "completed" => distribution.completed = count,
            "cancelled" => distribution.cancelled = count,
            _ => {}
        }
    }

    Ok(distribution)
}
