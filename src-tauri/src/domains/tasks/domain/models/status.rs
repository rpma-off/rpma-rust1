use serde::{Deserialize, Serialize};
use ts_rs::TS;

pub use crate::domains::tasks::domain::models::task::TaskStatus;
use crate::domains::tasks::infrastructure::task_validation::validate_status_transition;

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
    #[serde(default)]
    pub correlation_id: Option<String>,
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

#[cfg(test)]
mod tests {
    use super::TaskStatus;

    #[test]
    fn test_task_status_can_transition_to() {
        // Test valid transitions
        assert!(TaskStatus::Draft.can_transition_to(&TaskStatus::Pending));
        assert!(TaskStatus::Pending.can_transition_to(&TaskStatus::Scheduled));
        assert!(TaskStatus::Scheduled.can_transition_to(&TaskStatus::InProgress));
        assert!(TaskStatus::InProgress.can_transition_to(&TaskStatus::Completed));
        assert!(TaskStatus::InProgress.can_transition_to(&TaskStatus::Paused));
        assert!(TaskStatus::Paused.can_transition_to(&TaskStatus::InProgress));
        assert!(TaskStatus::Completed.can_transition_to(&TaskStatus::Archived));

        // Test invalid transitions
        assert!(!TaskStatus::Draft.can_transition_to(&TaskStatus::Completed));
        assert!(!TaskStatus::Completed.can_transition_to(&TaskStatus::Pending));
        assert!(!TaskStatus::Cancelled.can_transition_to(&TaskStatus::InProgress));
        assert!(!TaskStatus::Invalid.can_transition_to(&TaskStatus::Scheduled));
        assert!(!TaskStatus::Archived.can_transition_to(&TaskStatus::Scheduled));
    }

    #[test]
    fn test_task_status_from_str() {
        assert_eq!(TaskStatus::from_str("draft"), Some(TaskStatus::Draft));
        assert_eq!(
            TaskStatus::from_str("scheduled"),
            Some(TaskStatus::Scheduled)
        );
        assert_eq!(
            TaskStatus::from_str("in_progress"),
            Some(TaskStatus::InProgress)
        );
        assert_eq!(TaskStatus::from_str("paused"), Some(TaskStatus::Paused));
        assert_eq!(
            TaskStatus::from_str("completed"),
            Some(TaskStatus::Completed)
        );
        assert_eq!(
            TaskStatus::from_str("cancelled"),
            Some(TaskStatus::Cancelled)
        );
        assert_eq!(TaskStatus::from_str("pending"), Some(TaskStatus::Pending));
        assert_eq!(TaskStatus::from_str("invalid"), Some(TaskStatus::Invalid));
        assert_eq!(TaskStatus::from_str("unknown-status"), None);
    }

    #[test]
    fn test_task_status_to_str() {
        assert_eq!(TaskStatus::Draft.to_str(), "draft");
        assert_eq!(TaskStatus::Scheduled.to_str(), "scheduled");
        assert_eq!(TaskStatus::InProgress.to_str(), "in_progress");
        assert_eq!(TaskStatus::Paused.to_str(), "paused");
        assert_eq!(TaskStatus::Completed.to_str(), "completed");
        assert_eq!(TaskStatus::Cancelled.to_str(), "cancelled");
        assert_eq!(TaskStatus::Assigned.to_str(), "assigned");
        assert_eq!(TaskStatus::Invalid.to_str(), "invalid");
    }
}
