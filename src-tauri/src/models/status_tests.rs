#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::status::TaskStatus;

    #[test]
    fn test_task_status_can_transition_to() {
        // Test valid transitions
        assert!(TaskStatus::Quote.can_transition_to(&TaskStatus::Scheduled));
        assert!(TaskStatus::Quote.can_transition_to(&TaskStatus::Cancelled));
        assert!(TaskStatus::Scheduled.can_transition_to(&TaskStatus::InProgress));
        assert!(TaskStatus::Scheduled.can_transition_to(&TaskStatus::Cancelled));
        assert!(TaskStatus::InProgress.can_transition_to(&TaskStatus::Completed));
        assert!(TaskStatus::InProgress.can_transition_to(&TaskStatus::Paused));
        assert!(TaskStatus::InProgress.can_transition_to(&TaskStatus::Cancelled));
        assert!(TaskStatus::Paused.can_transition_to(&TaskStatus::InProgress));
        assert!(TaskStatus::Paused.can_transition_to(&TaskStatus::Cancelled));

        // Test invalid transitions
        assert!(!TaskStatus::Quote.can_transition_to(&TaskStatus::InProgress));
        assert!(!TaskStatus::Quote.can_transition_to(&TaskStatus::Completed));
        assert!(!TaskStatus::Scheduled.can_transition_to(&TaskStatus::Quote));
        assert!(!TaskStatus::Completed.can_transition_to(&TaskStatus::InProgress));
        assert!(!TaskStatus::Cancelled.can_transition_to(&TaskStatus::InProgress));
    }

    #[test]
    fn test_task_status_from_str() {
        assert_eq!(TaskStatus::from_str("quote"), Some(TaskStatus::Quote));
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
        assert_eq!(TaskStatus::from_str("invalid"), None);
    }

    #[test]
    fn test_task_status_to_str() {
        assert_eq!(TaskStatus::Quote.to_str(), "quote");
        assert_eq!(TaskStatus::Scheduled.to_str(), "scheduled");
        assert_eq!(TaskStatus::InProgress.to_str(), "in_progress");
        assert_eq!(TaskStatus::Paused.to_str(), "paused");
        assert_eq!(TaskStatus::Completed.to_str(), "completed");
        assert_eq!(TaskStatus::Cancelled.to_str(), "cancelled");
    }
}
