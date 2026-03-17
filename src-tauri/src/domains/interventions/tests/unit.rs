//! Unit tests for `interventions` domain services.
//!
//! Oracle references:
//! - ADR-008 (centralized validation and status transition guards)

#[cfg(test)]
mod state_machine_tests {
    use crate::domains::interventions::domain::models::intervention::InterventionStatus;
    use crate::domains::interventions::domain::services::intervention_state_machine::{
        allowed_transitions, validate_transition,
    };

    // ── allowed_transitions ────────────────────────────────────────────────

    #[test]
    fn test_allowed_transitions_pending_returns_correct_set() {
        let allowed = allowed_transitions(&InterventionStatus::Pending);
        assert!(allowed.contains(&InterventionStatus::InProgress));
        assert!(allowed.contains(&InterventionStatus::Cancelled));
        assert!(allowed.contains(&InterventionStatus::Paused));
        assert!(!allowed.contains(&InterventionStatus::Completed));
    }

    #[test]
    fn test_allowed_transitions_completed_is_empty() {
        assert!(allowed_transitions(&InterventionStatus::Completed).is_empty());
    }

    #[test]
    fn test_allowed_transitions_cancelled_is_empty() {
        assert!(allowed_transitions(&InterventionStatus::Cancelled).is_empty());
    }

    // ── validate_transition ────────────────────────────────────────────────

    #[test]
    fn test_validate_transition_valid_returns_ok() {
        assert!(validate_transition(
            &InterventionStatus::Pending,
            &InterventionStatus::InProgress
        )
        .is_ok());
        assert!(
            validate_transition(&InterventionStatus::InProgress, &InterventionStatus::Paused)
                .is_ok()
        );
        assert!(
            validate_transition(&InterventionStatus::Paused, &InterventionStatus::Completed)
                .is_ok()
        );
        assert!(validate_transition(
            &InterventionStatus::InProgress,
            &InterventionStatus::Completed
        )
        .is_ok());
    }

    #[test]
    fn test_validate_transition_invalid_returns_err() {
        assert!(
            validate_transition(&InterventionStatus::Completed, &InterventionStatus::Pending)
                .is_err()
        );
        assert!(validate_transition(
            &InterventionStatus::Cancelled,
            &InterventionStatus::InProgress
        )
        .is_err());
        assert!(
            validate_transition(&InterventionStatus::Pending, &InterventionStatus::Completed)
                .is_err()
        );
    }

    #[test]
    fn test_validate_transition_same_status_returns_ok() {
        assert!(validate_transition(
            &InterventionStatus::InProgress,
            &InterventionStatus::InProgress
        )
        .is_ok());
        assert!(
            validate_transition(&InterventionStatus::Pending, &InterventionStatus::Pending).is_ok()
        );
    }
}
