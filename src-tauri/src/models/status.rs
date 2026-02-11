use serde::{Deserialize, Serialize};
// Conditional import removed
use ts_rs::TS;

pub use crate::models::task::TaskStatus;
use crate::services::task_validation::validate_status_transition;

impl TaskStatus {
    pub fn can_transition_to(&self, new_status: &TaskStatus) -> bool {
        validate_status_transition(self, new_status).is_ok()
    }

    pub fn from_str(s: &str) -> Option<Self> {
        // Delegate parsing to TaskStatus's FromStr implementation.
        s.parse().ok()
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            TaskStatus::Draft => "draft",
            TaskStatus::Scheduled => "scheduled",
            TaskStatus::InProgress => "in_progress",
            TaskStatus::Completed => "completed",
            TaskStatus::Cancelled => "cancelled",
            TaskStatus::OnHold => "on_hold",
            TaskStatus::Pending => "pending",
            TaskStatus::Invalid => "invalid",
            TaskStatus::Archived => "archived",
            TaskStatus::Failed => "failed",
            TaskStatus::Overdue => "overdue",
            TaskStatus::Assigned => "assigned",
            TaskStatus::Paused => "paused",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct StatusTransitionRequest {
    pub task_id: String,
    pub new_status: String,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct StatusDistribution {
    pub quote: i32,
    pub scheduled: i32,
    pub in_progress: i32,
    pub paused: i32,
    pub completed: i32,
    pub cancelled: i32,
}
