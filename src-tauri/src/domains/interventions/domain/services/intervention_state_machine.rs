use crate::domains::interventions::domain::models::intervention::InterventionStatus;

/// Returns the set of statuses that `current` may legally transition to.
///
/// Mirrors the task state machine's `allowed_transitions` so that callers can
/// enumerate valid next states (e.g. for UI badge rendering or audit logging)
/// without embedding the transition table in ad-hoc match arms.
pub fn allowed_transitions(current: &InterventionStatus) -> Vec<InterventionStatus> {
    match current {
        InterventionStatus::Pending => vec![
            InterventionStatus::InProgress,
            InterventionStatus::Cancelled,
            InterventionStatus::Paused,
        ],
        InterventionStatus::InProgress => vec![
            InterventionStatus::Paused,
            InterventionStatus::Completed,
            InterventionStatus::Cancelled,
        ],
        InterventionStatus::Paused => vec![
            InterventionStatus::InProgress,
            InterventionStatus::Cancelled,
            InterventionStatus::Completed,
        ],
        InterventionStatus::Completed => vec![],
        InterventionStatus::Cancelled => vec![],
        InterventionStatus::Archived => vec![],
    }
}

/// Validates that transitioning from `current` to `next` is permitted.
///
/// Same-status transitions are treated as no-ops and return `Ok(())`.
/// Use [`allowed_transitions`] to enumerate valid next states.
pub fn validate_transition(
    current: &InterventionStatus,
    next: &InterventionStatus,
) -> Result<(), String> {
    if current == next {
        return Ok(());
    }

    let allowed = allowed_transitions(current);

    if allowed.contains(next) {
        Ok(())
    } else {
        Err(format!(
            "Invalid intervention status transition from '{}' to '{}'",
            current, next
        ))
    }
}
