//! Notification side-effects for task lifecycle events.
//!
//! Extracted from `task_command_service.rs` so that command orchestration
//! focuses on business logic and delegates notification scheduling here.
//! Follows the same `impl Super` in submodule pattern used by `quote_totals.rs`.

use tracing::{error, instrument};

use crate::domains::tasks::domain::models::task::Task;

use super::task_command_service::TaskCommandService;

impl TaskCommandService {
    /// Send an in-app notification when a task is assigned to a technician
    /// other than the current user.
    #[instrument(skip(self), fields(task_id = %task.id, user_id = %current_user_id))]
    pub async fn notify_assignment(
        &self,
        task: &Task,
        current_user_id: &str,
        correlation_id: &str,
    ) {
        if let Some(technician_id) = &task.technician_id {
            if technician_id != current_user_id {
                if let Err(e) = self
                    .notification_sender
                    .send_message_raw(
                        "in_app".to_string(),
                        Some(technician_id.clone()),
                        None,
                        None,
                        Some(format!("Nouvelle tache assignee: {}", task.title)),
                        format!("La tache '{}' vous a ete assignee.", task.title),
                        Some(task.id.clone()),
                        task.client_id.clone(),
                        Some("normal".to_string()),
                        None,
                        Some(correlation_id.to_string()),
                    )
                    .await
                {
                    error!("Failed to create task assignment notification: {}", e);
                }
            }
        }
    }

    /// Send an in-app notification when a task's status changes.
    #[instrument(skip(self), fields(task_id = %task.id, user_id = %current_user_id))]
    pub async fn notify_status_change(
        &self,
        task: &Task,
        current_user_id: &str,
        correlation_id: &str,
    ) {
        let status = task.status.to_string();
        if let Err(e) = self
            .notification_sender
            .send_message_raw(
                "in_app".to_string(),
                Some(current_user_id.to_string()),
                None,
                None,
                Some(format!("Statut de tache mis a jour: {}", task.title)),
                format!(
                    "Le statut de la tache '{}' est maintenant '{}'.",
                    task.title, status
                ),
                Some(task.id.clone()),
                task.client_id.clone(),
                Some("normal".to_string()),
                None,
                Some(correlation_id.to_string()),
            )
            .await
        {
            error!("Failed to create task update notification: {}", e);
        }
    }
}
