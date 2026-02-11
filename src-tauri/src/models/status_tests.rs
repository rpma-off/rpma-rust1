#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::status::TaskStatus;

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
