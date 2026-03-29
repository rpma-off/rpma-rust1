use super::InterventionDataService;
use crate::db::{InterventionError, InterventionResult};
use crate::domains::interventions::domain::models::intervention::InterventionStatus;
use crate::shared::contracts::common::now;
use crate::shared::contracts::task_status::TaskStatus;
use rusqlite::{params, OptionalExtension, Transaction};
use tracing::warn;

pub(super) fn link_task_to_intervention_with_tx(
    _service: &InterventionDataService,
    tx: &Transaction,
    task_id: &str,
    intervention_id: &str,
    first_step_id: &str,
) -> InterventionResult<()> {
    let task_number: Option<String> = tx
        .query_row(
            "SELECT task_number FROM tasks WHERE id = ?",
            params![task_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| InterventionError::Database(format!("Failed to get task number: {}", e)))?;

    if task_number.is_none() {
        return Err(InterventionError::NotFound(format!(
            "Task {} not found",
            task_id
        )));
    }

    let result = tx.execute(
        "UPDATE tasks SET
            workflow_id = ?,
            current_workflow_step_id = ?,
            status = 'in_progress',
            started_at = ?
        WHERE id = ?",
        params![intervention_id, first_step_id, now(), task_id],
    )?;

    if let Some(task_num) = task_number {
        tx.execute(
            "UPDATE interventions SET task_number = ? WHERE id = ?",
            params![task_num, intervention_id],
        )
        .map_err(|e| {
            InterventionError::Database(format!(
                "Failed to update intervention task number: {}",
                e
            ))
        })?;
    }

    if result == 0 {
        return Err(InterventionError::Database(format!(
            "Failed to update task {} - no rows affected",
            task_id
        )));
    }

    Ok(())
}

pub(super) fn reconcile_task_intervention_state(
    service: &InterventionDataService,
    task_id: &str,
) -> InterventionResult<()> {
    let workflow_id: Option<String> = service
        .db
        .query_single_value("SELECT workflow_id FROM tasks WHERE id = ?", params![task_id])?;
    let current_step_id: Option<String> = service.db.query_single_value(
        "SELECT current_workflow_step_id FROM tasks WHERE id = ?",
        params![task_id],
    )?;
    let task_status: String = service
        .db
        .query_single_value("SELECT status FROM tasks WHERE id = ?", params![task_id])?;

    if let Some(intervention_id) = &workflow_id {
        let intervention_count: i64 = service.db.query_single_value(
            "SELECT COUNT(*) FROM interventions WHERE id = ? AND status IN ('pending', 'in_progress', 'paused') AND deleted_at IS NULL",
            params![intervention_id],
        )?;

        if intervention_count == 0 {
            warn!(
                "Intervention {} not found or not active, cleaning up task {} references",
                intervention_id, task_id
            );
            service.db.get_connection()?.execute(
                "UPDATE tasks SET workflow_id = NULL, current_workflow_step_id = NULL, status = ? WHERE id = ?",
                params![TaskStatus::Draft.to_string(), task_id],
            )?;
            return Ok(());
        }

        if let Some(step_id) = &current_step_id {
            let step_count: i64 = service.db.query_single_value(
                "SELECT COUNT(*) FROM intervention_steps WHERE id = ? AND intervention_id = ?",
                params![step_id, intervention_id],
            )?;

            if step_count == 0 {
                warn!(
                    "Current step {} invalid for task {}, clearing reference",
                    step_id, task_id
                );
                service.db.get_connection()?.execute(
                    "UPDATE tasks SET current_workflow_step_id = NULL WHERE id = ?",
                    params![task_id],
                )?;
            }
        }

        let intervention_status: Option<String> = service.db.query_single_value(
            "SELECT status FROM interventions WHERE id = ? AND deleted_at IS NULL",
            params![intervention_id],
        )?;

        if let Some(int_status) = intervention_status {
            let intervention_status_enum = int_status
                .parse::<InterventionStatus>()
                .unwrap_or(InterventionStatus::InProgress);

            let expected_task_status = match intervention_status_enum {
                InterventionStatus::Completed => TaskStatus::Completed,
                InterventionStatus::Cancelled => TaskStatus::Cancelled,
                InterventionStatus::Paused => TaskStatus::Paused,
                _ => TaskStatus::InProgress,
            };

            if task_status != expected_task_status.to_string() {
                service.db.get_connection()?.execute(
                    "UPDATE tasks SET status = ? WHERE id = ?",
                    params![expected_task_status.to_string(), task_id],
                )?;
            }
        }
    } else if current_step_id.is_some() {
        warn!(
            "Task {} has current_workflow_step_id but no workflow_id, clearing step reference",
            task_id
        );
        service.db.get_connection()?.execute(
            "UPDATE tasks SET current_workflow_step_id = NULL WHERE id = ?",
            params![task_id],
        )?;
    }

    Ok(())
}
