use crate::domains::tasks::domain::models::task::TaskStatus;

/// TODO: document
pub fn validate_status_transition(current: &TaskStatus, new: &TaskStatus) -> Result<(), String> {
    if current == new {
        return Err(format!("Task is already in status '{}'", current));
    }

    let allowed = allowed_transitions(current);
    if allowed.contains(new) {
        Ok(())
    } else {
        Err(format!(
            "Cannot transition from '{}' to '{}'. Allowed transitions: {}",
            current,
            new,
            allowed
                .iter()
                .map(|s| format!("'{}'", s))
                .collect::<Vec<_>>()
                .join(", ")
        ))
    }
}

/// TODO: document
pub fn allowed_transitions(current: &TaskStatus) -> Vec<TaskStatus> {
    match current {
        TaskStatus::Draft => vec![
            TaskStatus::Pending,
            TaskStatus::Scheduled,
            TaskStatus::Cancelled,
        ],
        TaskStatus::Pending => vec![
            TaskStatus::InProgress,
            TaskStatus::Scheduled,
            TaskStatus::OnHold,
            TaskStatus::Cancelled,
            TaskStatus::Assigned,
        ],
        TaskStatus::Scheduled => vec![
            TaskStatus::InProgress,
            TaskStatus::OnHold,
            TaskStatus::Cancelled,
            TaskStatus::Assigned,
        ],
        TaskStatus::Assigned => vec![
            TaskStatus::InProgress,
            TaskStatus::OnHold,
            TaskStatus::Cancelled,
        ],
        TaskStatus::InProgress => vec![
            TaskStatus::Completed,
            TaskStatus::OnHold,
            TaskStatus::Paused,
            TaskStatus::Cancelled,
        ],
        TaskStatus::Paused => vec![TaskStatus::InProgress, TaskStatus::Cancelled],
        TaskStatus::OnHold => vec![
            TaskStatus::Pending,
            TaskStatus::Scheduled,
            TaskStatus::InProgress,
            TaskStatus::Cancelled,
        ],
        TaskStatus::Completed => vec![TaskStatus::Archived],
        TaskStatus::Cancelled => vec![],
        TaskStatus::Archived => vec![],
        TaskStatus::Failed => vec![TaskStatus::Cancelled],
        TaskStatus::Overdue => vec![TaskStatus::InProgress, TaskStatus::Cancelled],
        TaskStatus::Invalid => vec![TaskStatus::Cancelled],
    }
}
