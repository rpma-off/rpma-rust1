use crate::domains::interventions::domain::models::intervention::{
    Intervention, InterventionStatus, InterventionWorkflowState, WorkflowAnomaly,
    WorkflowAnomalyCode, WorkflowIntegrityStatus,
};
use crate::domains::interventions::domain::models::step::{InterventionStep, StepStatus};

fn anomaly(code: WorkflowAnomalyCode, message: impl Into<String>) -> WorkflowAnomaly {
    WorkflowAnomaly {
        code,
        message: message.into(),
    }
}

fn push_unique(anomalies: &mut Vec<WorkflowAnomaly>, next: WorkflowAnomaly) {
    if !anomalies.iter().any(|existing| existing.code == next.code) {
        anomalies.push(next);
    }
}

fn is_structural_anomaly(
    intervention: &Intervention,
    code: &WorkflowAnomalyCode,
    _all_mandatory_completed: bool,
) -> bool {
    match code {
        WorkflowAnomalyCode::LegacyCompletedStepsMismatch => false,
        WorkflowAnomalyCode::InterventionStatusMismatch => matches!(
            intervention.status,
            InterventionStatus::Completed
                | InterventionStatus::Cancelled
                | InterventionStatus::Archived
                | InterventionStatus::Paused
        ),
        _ => true,
    }
}

pub fn build_workflow_state(
    intervention: &Intervention,
    steps: &[InterventionStep],
) -> InterventionWorkflowState {
    let mut ordered_steps = steps.to_vec();
    ordered_steps.sort_by_key(|step| step.step_number);

    let mut anomalies = Vec::new();

    if ordered_steps.is_empty() {
        push_unique(
            &mut anomalies,
            anomaly(
                WorkflowAnomalyCode::NoSteps,
                format!("Intervention {} has no workflow steps", intervention.id),
            ),
        );
    }

    for pair in ordered_steps.windows(2) {
        let previous = &pair[0];
        let current = &pair[1];
        if previous.step_number == current.step_number {
            push_unique(
                &mut anomalies,
                anomaly(
                    WorkflowAnomalyCode::DuplicateStepNumber,
                    format!(
                        "Duplicate step number {} detected in intervention {}",
                        current.step_number, intervention.id
                    ),
                ),
            );
        } else if current.step_number != previous.step_number + 1 {
            push_unique(
                &mut anomalies,
                anomaly(
                    WorkflowAnomalyCode::MissingStepNumber,
                    format!(
                        "Missing step number between {} and {} in intervention {}",
                        previous.step_number, current.step_number, intervention.id
                    ),
                ),
            );
        }
    }

    let completed_steps = ordered_steps
        .iter()
        .filter(|step| step.step_status == StepStatus::Completed)
        .count() as i32;
    let pending_steps = ordered_steps
        .iter()
        .filter(|step| step.step_status == StepStatus::Pending)
        .count() as i32;
    let in_progress_steps = ordered_steps
        .iter()
        .filter(|step| step.step_status == StepStatus::InProgress)
        .count() as i32;

    if in_progress_steps > 1 {
        push_unique(
            &mut anomalies,
            anomaly(
                WorkflowAnomalyCode::MultipleInProgressSteps,
                format!(
                    "Intervention {} has {} steps marked in_progress",
                    intervention.id, in_progress_steps
                ),
            ),
        );
    }

    for (index, step) in ordered_steps.iter().enumerate() {
        if step.step_status == StepStatus::Pending
            && ordered_steps
                .iter()
                .skip(index + 1)
                .any(|later| later.step_status == StepStatus::Completed)
        {
            push_unique(
                &mut anomalies,
                anomaly(
                    WorkflowAnomalyCode::PendingAfterCompletedLaterStep,
                    format!(
                        "Step {} is pending while a later step is already completed",
                        step.step_number
                    ),
                ),
            );
        }
    }

    if let Some(final_step) = ordered_steps.last() {
        if final_step.step_status == StepStatus::Completed
            && ordered_steps.iter().any(|step| {
                step.is_mandatory
                    && step.step_number < final_step.step_number
                    && step.step_status != StepStatus::Completed
            })
        {
            push_unique(
                &mut anomalies,
                anomaly(
                    WorkflowAnomalyCode::FinalStepCompletedBeforeMandatorySteps,
                    format!(
                        "Final step {} is completed while earlier mandatory steps remain incomplete",
                        final_step.step_number
                    ),
                ),
            );
        }
    }

    let all_mandatory_completed = ordered_steps
        .iter()
        .filter(|step| step.is_mandatory)
        .all(|step| step.step_status == StepStatus::Completed);

    let status_mismatch = match intervention.status {
        InterventionStatus::Completed => !all_mandatory_completed,
        InterventionStatus::Pending => ordered_steps.iter().any(|step| {
            matches!(step.step_status, StepStatus::InProgress | StepStatus::Completed)
        }),
        InterventionStatus::Cancelled | InterventionStatus::Archived => ordered_steps
            .iter()
            .any(|step| step.step_status == StepStatus::InProgress),
        InterventionStatus::Paused => in_progress_steps > 0,
        InterventionStatus::InProgress => false,
    };

    if status_mismatch {
        push_unique(
            &mut anomalies,
            anomaly(
                WorkflowAnomalyCode::InterventionStatusMismatch,
                format!(
                    "Intervention status {} is incompatible with current step statuses",
                    intervention.status
                ),
            ),
        );
    }

    if intervention.current_step != completed_steps {
        push_unique(
            &mut anomalies,
            anomaly(
                WorkflowAnomalyCode::LegacyCompletedStepsMismatch,
                format!(
                    "Legacy current_step {} does not match {} completed steps",
                    intervention.current_step, completed_steps
                ),
            ),
        );
    }

    let active_candidate = if in_progress_steps == 1 {
        ordered_steps
            .iter()
            .find(|step| step.step_status == StepStatus::InProgress)
    } else if in_progress_steps > 1 {
        ordered_steps
            .iter()
            .filter(|step| step.step_status == StepStatus::InProgress)
            .min_by_key(|step| step.step_number)
    } else {
        ordered_steps.iter().find(|step| {
            step.step_status == StepStatus::Pending
                && ordered_steps
                    .iter()
                    .filter(|previous| previous.step_number < step.step_number)
                    .all(|previous| previous.step_status == StepStatus::Completed)
        })
    };

    let is_complete = !ordered_steps.is_empty() && all_mandatory_completed;

    let next_allowed_step_ids = ordered_steps
        .iter()
        .find(|step| {
            step.step_status != StepStatus::Completed
                && ordered_steps
                    .iter()
                    .filter(|previous| previous.step_number < step.step_number)
                    .all(|previous| previous.step_status == StepStatus::Completed)
        })
        .map(|step| vec![step.id.clone()])
        .unwrap_or_default();

    let total_steps = ordered_steps.len() as i32;
    let progress_percentage = if total_steps > 0 {
        ((completed_steps as f32 / total_steps as f32) * 100.0).clamp(0.0, 100.0)
    } else {
        0.0
    };

    let integrity_status = if anomalies
        .iter()
        .any(|item| is_structural_anomaly(intervention, &item.code, all_mandatory_completed))
    {
        WorkflowIntegrityStatus::Invalid
    } else if anomalies.is_empty() {
        WorkflowIntegrityStatus::Healthy
    } else {
        WorkflowIntegrityStatus::Degraded
    };

    InterventionWorkflowState {
        active_step_id: active_candidate.map(|step| step.id.clone()),
        active_step_type: active_candidate.map(|step| step.step_type.clone()),
        active_step_number: active_candidate.map(|step| step.step_number),
        total_steps,
        completed_steps,
        pending_steps,
        in_progress_steps,
        completed_step_ids: ordered_steps
            .iter()
            .filter(|step| step.step_status == StepStatus::Completed)
            .map(|step| step.id.clone())
            .collect(),
        next_allowed_step_ids,
        is_complete,
        progress_percentage,
        integrity_status,
        anomalies,
    }
}

#[cfg(test)]
mod tests {
    use super::build_workflow_state;
    use crate::domains::interventions::domain::models::intervention::{
        Intervention, InterventionStatus, WorkflowAnomalyCode, WorkflowIntegrityStatus,
    };
    use crate::domains::interventions::domain::models::step::{InterventionStep, StepStatus, StepType};

    fn intervention() -> Intervention {
        let mut intervention = Intervention::new(
            crate::shared::utils::uuid::generate_uuid_string(),
            "TASK-001".to_string(),
            "AA-123-AA".to_string(),
        );
        intervention.status = InterventionStatus::InProgress;
        intervention
    }

    fn step(step_number: i32, step_type: StepType, status: StepStatus) -> InterventionStep {
        let mut step = InterventionStep::new(
            "intervention-1".to_string(),
            step_number,
            format!("Step {step_number}"),
            step_type,
        );
        step.is_mandatory = true;
        step.step_status = status;
        step
    }

    #[test]
    fn builds_active_step_from_single_in_progress_step() {
        let intervention = intervention();
        let steps = vec![
            step(1, StepType::Inspection, StepStatus::Completed),
            step(2, StepType::Preparation, StepStatus::InProgress),
            step(3, StepType::Installation, StepStatus::Pending),
        ];

        let state = build_workflow_state(&intervention, &steps);

        assert_eq!(state.active_step_number, Some(2));
        assert_eq!(state.completed_steps, 1);
        assert_eq!(state.integrity_status, WorkflowIntegrityStatus::Degraded);
        assert!(state
            .anomalies
            .iter()
            .any(|item| item.code == WorkflowAnomalyCode::LegacyCompletedStepsMismatch));
    }

    #[test]
    fn flags_multiple_in_progress_steps_as_invalid() {
        let mut intervention = intervention();
        intervention.current_step = 1;
        let steps = vec![
            step(1, StepType::Inspection, StepStatus::InProgress),
            step(2, StepType::Preparation, StepStatus::InProgress),
        ];

        let state = build_workflow_state(&intervention, &steps);

        assert_eq!(state.active_step_number, Some(1));
        assert_eq!(state.integrity_status, WorkflowIntegrityStatus::Invalid);
        assert!(state
            .anomalies
            .iter()
            .any(|item| item.code == WorkflowAnomalyCode::MultipleInProgressSteps));
    }

    #[test]
    fn marks_completed_workflow_without_active_step() {
        let mut intervention = intervention();
        intervention.status = InterventionStatus::Completed;
        intervention.current_step = 3;
        let steps = vec![
            step(1, StepType::Inspection, StepStatus::Completed),
            step(2, StepType::Preparation, StepStatus::Completed),
            step(3, StepType::Installation, StepStatus::Completed),
        ];

        let state = build_workflow_state(&intervention, &steps);

        assert!(state.is_complete);
        assert_eq!(state.active_step_number, None);
        assert_eq!(state.integrity_status, WorkflowIntegrityStatus::Healthy);
    }
}
