use crate::domains::interventions::domain::models::intervention::InterventionStatus;

/// TODO: document
pub fn validate_transition(
    current: &InterventionStatus,
    next: &InterventionStatus,
) -> Result<(), String> {
    if current == next {
        return Ok(());
    }

    let allowed = match current {
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
    };

    if allowed.contains(next) {
        Ok(())
    } else {
        Err(format!(
            "Invalid intervention status transition from '{}' to '{}'",
            current, next
        ))
    }
}
