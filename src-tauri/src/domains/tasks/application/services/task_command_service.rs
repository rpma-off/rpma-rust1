//! Application-layer orchestration for task IPC commands.
//!
//! Each method encapsulates the business logic that was previously embedded
//! inside `ipc/task/facade.rs` command handlers, so that IPC handlers remain
//! thin adapters (ADR-005).

use std::sync::Arc;

use tracing::{error, info, instrument, warn};

use crate::commands::AppError;
use crate::db::Database;
use crate::domains::tasks::application::services::task_policy_service;
use crate::domains::tasks::domain::models::task::{
    SortOrder, Task, TaskPriority, TaskQuery, TaskStatus, UpdateTaskRequest,
};
use crate::domains::tasks::infrastructure::task::TaskService;
use crate::domains::tasks::infrastructure::task_import::TaskImportService;
use crate::domains::tasks::ipc::task::types::BulkImportResponse;
use crate::domains::tasks::ipc::task_types::TaskFilter;
use crate::domains::tasks::TasksFacade;
use crate::shared::contracts::auth::UserSession;
use crate::shared::contracts::notification::NotificationSender;

/// Lightweight orchestration service constructed per-request by IPC handlers.
///
/// It borrows the long-lived `Arc` services from `AppState` and exposes
/// high-level operations that combine validation, persistence, and
/// side-effects (e.g. notification sending).
pub struct TaskCommandService {
    task_service: Arc<TaskService>,
    task_import_service: Arc<TaskImportService>,
    notification_sender: Arc<dyn NotificationSender>,
    db: Arc<Database>,
}

impl TaskCommandService {
    /// TODO: document
    pub fn new(
        task_service: Arc<TaskService>,
        task_import_service: Arc<TaskImportService>,
        notification_sender: Arc<dyn NotificationSender>,
        db: Arc<Database>,
    ) -> Self {
        Self {
            task_service,
            task_import_service,
            notification_sender,
            db,
        }
    }

    // ------------------------------------------------------------------
    // add_task_note
    // ------------------------------------------------------------------

    /// Validate, format, and persist a timestamped note on a task.
    #[instrument(skip(self, current_user, raw_note), fields(user_id = %current_user.user_id, task_id = %task_id))]
    pub async fn add_note(
        &self,
        current_user: &UserSession,
        task_id: &str,
        raw_note: &str,
    ) -> Result<String, AppError> {
        let note = raw_note.trim();
        if note.is_empty() {
            return Err(AppError::Validation("Note cannot be empty".to_string()));
        }

        let task = self.fetch_task(task_id).await?;
        task_policy_service::check_task_permissions(current_user, &task, "edit")?;

        let facade = self.facade();
        let note_entry = facade.format_note_entry(&current_user.user_id, note);
        let updated_notes = facade.append_note(task.notes.as_deref(), &note_entry);

        let update_request = UpdateTaskRequest {
            id: Some(task.id.clone()),
            notes: Some(updated_notes),
            ..Default::default()
        };

        self.task_service
            .update_task_async(update_request, &current_user.user_id)
            .await
            .map_err(|e| AppError::db_sanitized("tasks.add_note", e))?;

        info!(task_id = %task_id, "Note added to task");
        Ok(format!("Note added to task {}", task_id))
    }

    // ------------------------------------------------------------------
    // send_task_message
    // ------------------------------------------------------------------

    /// Validate a task-scoped message and route it through the notification
    /// service.
    #[instrument(skip(self, current_user, raw_body), fields(user_id = %current_user.user_id, task_id = %task_id))]
    pub async fn send_message(
        &self,
        current_user: &UserSession,
        task_id: &str,
        raw_body: &str,
        raw_message_type: Option<&str>,
        correlation_id: Option<String>,
    ) -> Result<String, AppError> {
        let body = raw_body.trim();
        if body.is_empty() {
            return Err(AppError::Validation("Message cannot be empty".to_string()));
        }

        let task = self.fetch_task(task_id).await?;
        task_policy_service::check_task_permissions(current_user, &task, "edit")?;

        let message_type = TasksFacade::validate_message_type(raw_message_type)?;

        let recipient_email = if message_type == "email" {
            task.customer_email.clone()
        } else {
            None
        };
        if message_type == "email" && recipient_email.is_none() {
            return Err(AppError::Validation(
                "Task has no customer email for email message".to_string(),
            ));
        }

        let recipient_phone = if message_type == "sms" {
            task.customer_phone.clone()
        } else {
            None
        };
        if message_type == "sms" && recipient_phone.is_none() {
            return Err(AppError::Validation(
                "Task has no customer phone for SMS message".to_string(),
            ));
        }

        let sent_message = self
            .notification_sender
            .send_message_raw(
                message_type,
                task.client_id.clone().or(task.technician_id.clone()),
                recipient_email,
                recipient_phone,
                Some(format!("Task {} update", task.task_number)),
                body.to_string(),
                Some(task.id.clone()),
                task.client_id.clone(),
                Some("normal".to_string()),
                None,
                correlation_id,
            )
            .await?;

        info!(task_id = %task_id, message_id = %sent_message.id, "Task message queued");
        Ok(format!("Message queued: {}", sent_message.id))
    }

    // ------------------------------------------------------------------
    // report_task_issue
    // ------------------------------------------------------------------

    /// Validate, format, persist a task issue, and optionally escalate.
    #[instrument(skip(self, current_user, raw_description), fields(user_id = %current_user.user_id, task_id = %task_id, issue_type = %raw_issue_type))]
    pub async fn report_issue(
        &self,
        current_user: &UserSession,
        task_id: &str,
        raw_issue_type: &str,
        raw_description: &str,
        raw_severity: Option<&str>,
        correlation_id: Option<String>,
    ) -> Result<String, AppError> {
        let issue_type = raw_issue_type.trim();
        let description = raw_description.trim();
        TasksFacade::validate_issue_fields(issue_type, description)?;
        let severity = TasksFacade::validate_severity(raw_severity)?;

        let task = self.fetch_task(task_id).await?;
        task_policy_service::check_task_permissions(current_user, &task, "edit")?;

        let facade = self.facade();
        let issue_entry =
            facade.format_issue_entry(&current_user.user_id, issue_type, &severity, description);
        let updated_notes = facade.append_note(task.notes.as_deref(), &issue_entry);

        let update_request = UpdateTaskRequest {
            id: Some(task.id.clone()),
            notes: Some(updated_notes),
            ..Default::default()
        };

        self.task_service
            .update_task_async(update_request, &current_user.user_id)
            .await
            .map_err(|e| AppError::db_sanitized("tasks.report_issue", e))?;

        if matches!(severity.as_str(), "high" | "critical") {
            if let Err(err) = self
                .notification_sender
                .send_message_raw(
                    "in_app".to_string(),
                    task.technician_id.clone(),
                    None,
                    None,
                    Some(format!("Task {} issue escalation", task.task_number)),
                    format!("{} (severity: {})", description, severity),
                    Some(task.id.clone()),
                    task.client_id.clone(),
                    Some("high".to_string()),
                    None,
                    correlation_id,
                )
                .await
            {
                warn!(
                    error = %err,
                    task_id = %task.id,
                    "Issue escalation message could not be sent"
                );
            }
        }

        info!(task_id = %task_id, severity = %severity, "Issue reported for task");
        Ok(format!("Issue reported for task {}", task_id))
    }

    // ------------------------------------------------------------------
    // export_tasks_csv
    // ------------------------------------------------------------------

    /// Build the export query from optional filters and produce CSV content.
    #[instrument(skip(self, filter))]
    pub fn export_csv(
        &self,
        filter: Option<&TaskFilter>,
        include_client_data: bool,
    ) -> Result<String, AppError> {
        let query = Self::build_export_query(filter);

        let tasks = self
            .task_service
            .get_tasks_for_export(query)
            .map_err(|e| AppError::db_sanitized("tasks.export.fetch", e))?;

        if tasks.is_empty() {
            warn!("No tasks found for export");
            return Ok(
                "ID,Title,Description,Status,Priority,Client Name,Client Email,Created At,Updated At\n"
                    .to_string(),
            );
        }

        let csv_content = self
            .task_service
            .export_to_csv(&tasks, include_client_data)
            .map_err(|e| AppError::db_sanitized("tasks.export.csv", e))?;

        info!("Successfully exported {} tasks to CSV", tasks.len());
        Ok(csv_content)
    }

    fn build_export_query(filter: Option<&TaskFilter>) -> TaskQuery {
        TaskQuery {
            page: Some(1),
            limit: Some(10000),
            status: filter
                .and_then(|f| f.status.as_ref())
                .and_then(|s| TaskStatus::from_str_opt(s)),
            technician_id: filter.and_then(|f| f.assigned_to.clone()),
            client_id: filter.and_then(|f| f.client_id.clone()),
            priority: filter
                .and_then(|f| f.priority.as_ref())
                .and_then(|p| TaskPriority::from_str_opt(p)),
            search: None,
            from_date: filter.and_then(|f| f.date_from.map(|d| d.to_rfc3339())),
            to_date: filter.and_then(|f| f.date_to.map(|d| d.to_rfc3339())),
            sort_by: "created_at".to_string(),
            sort_order: SortOrder::Desc,
        }
    }

    // ------------------------------------------------------------------
    // import_tasks_bulk
    // ------------------------------------------------------------------

    /// Validate role and delegate CSV import to the task service.
    #[instrument(skip(self, current_user, csv_data), fields(user_id = %current_user.user_id, update_existing = %update_existing))]
    pub async fn import_bulk(
        &self,
        current_user: &UserSession,
        csv_data: &str,
        update_existing: bool,
    ) -> Result<BulkImportResponse, AppError> {
        task_policy_service::ensure_assignment_management_role(current_user)?;

        let import_result = self
            .task_service
            .import_from_csv(csv_data, &current_user.user_id, update_existing)
            .await
            .map_err(|e| AppError::db_sanitized("tasks.import.bulk", e))?;

        let response = BulkImportResponse {
            total_processed: import_result.total_processed,
            successful: import_result.successful,
            failed: import_result.failed,
            errors: import_result.errors.clone(),
            duplicates_skipped: import_result.duplicates_skipped,
        };

        info!(
            "Bulk import completed: {} processed, {} successful, {} failed, {} duplicates skipped",
            response.total_processed,
            response.successful,
            response.failed,
            response.duplicates_skipped
        );

        Ok(response)
    }

    // ------------------------------------------------------------------
    // delay_task
    // ------------------------------------------------------------------

    /// Reschedule a task via the calendar service and optionally update notes.
    #[instrument(skip(self, current_user, additional_notes), fields(user_id = %current_user.user_id, task_id = %task_id, new_date = %new_scheduled_date))]
    pub async fn delay_task(
        &self,
        current_user: &UserSession,
        task_id: &str,
        new_scheduled_date: String,
        additional_notes: Option<String>,
    ) -> Result<Task, AppError> {
        let task = self.fetch_task(task_id).await?;
        task_policy_service::check_task_permissions(current_user, &task, "edit")?;

        let calendar_service =
            crate::shared::services::cross_domain::CalendarService::new(self.db.clone());
        calendar_service
            .schedule_task(
                task_id.to_string(),
                new_scheduled_date.clone(),
                None,
                None,
                &current_user.user_id,
            )
            .await
            .map_err(|e| {
                error!("Task delay failed: {}", e);
                AppError::db_sanitized("tasks.delay", e)
            })?;

        if additional_notes.is_some() {
            let update_request = UpdateTaskRequest {
                id: Some(task_id.to_string()),
                notes: additional_notes,
                ..Default::default()
            };
            self.task_service
                .update_task_async(update_request, &current_user.user_id)
                .await
                .map_err(|e| {
                    error!("Task notes update failed: {}", e);
                    AppError::db_sanitized("tasks.delay.update_notes", e)
                })?;
        }

        let updated_task = self
            .task_service
            .get_task_async(task_id)
            .await
            .map_err(|e| {
                error!("Failed to re-fetch task: {}", e);
                AppError::db_sanitized("tasks.delay.refetch", e)
            })?
            .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", task_id)))?;

        info!("Task {} delayed to {}", task_id, new_scheduled_date);
        Ok(updated_task)
    }

    // ------------------------------------------------------------------
    // edit_task
    // ------------------------------------------------------------------

    /// Apply field-level restrictions, validate status transitions, and persist
    /// an edit.
    #[instrument(skip(self, current_user, data), fields(user_id = %current_user.user_id, task_id = %task_id))]
    pub async fn edit_task(
        &self,
        current_user: &UserSession,
        task_id: &str,
        data: &UpdateTaskRequest,
    ) -> Result<Task, AppError> {
        let task = self.fetch_task(task_id).await?;
        task_policy_service::check_task_permissions(current_user, &task, "edit")?;

        if current_user.role == crate::shared::contracts::auth::UserRole::Technician {
            task_policy_service::enforce_technician_field_restrictions(data)?;
        }

        let update_request = UpdateTaskRequest {
            id: Some(task_id.to_string()),
            title: data.title.clone(),
            description: data.description.clone(),
            priority: data.priority.clone(),
            status: data.status.clone(),
            vehicle_plate: data.vehicle_plate.clone(),
            vehicle_model: data.vehicle_model.clone(),
            vehicle_year: data.vehicle_year.clone(),
            vehicle_make: data.vehicle_make.clone(),
            vin: data.vin.clone(),
            ppf_zones: data.ppf_zones.clone(),
            custom_ppf_zones: data.custom_ppf_zones.clone(),
            client_id: data.client_id.clone(),
            customer_name: data.customer_name.clone(),
            customer_email: data.customer_email.clone(),
            customer_phone: data.customer_phone.clone(),
            customer_address: data.customer_address.clone(),
            scheduled_date: data.scheduled_date.clone(),
            estimated_duration: data.estimated_duration,
            notes: data.notes.clone(),
            tags: data.tags.clone(),
            technician_id: data.technician_id.clone(),
            ..Default::default()
        };

        if let Some(new_status) = &update_request.status {
            task_policy_service::validate_status_change(&task.status, new_status)?;
        }

        let updated_task = self
            .task_service
            .update_task_async(update_request, &current_user.user_id)
            .await
            .map_err(|e| {
                error!("Task update failed: {}", e);
                AppError::db_sanitized("tasks.edit", e)
            })?;

        info!("Task {} updated successfully", task_id);
        Ok(updated_task)
    }

    // ------------------------------------------------------------------
    // task_crud helpers - notification side-effects
    // ------------------------------------------------------------------

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

    // ------------------------------------------------------------------
    // Private helpers
    // ------------------------------------------------------------------

    async fn fetch_task(&self, task_id: &str) -> Result<Task, AppError> {
        self.task_service
            .get_task_async(task_id)
            .await
            .map_err(|e| AppError::db_sanitized("tasks.fetch_task", e))?
            .ok_or_else(|| AppError::NotFound(format!("Task not found: {}", task_id)))
    }

    fn facade(&self) -> TasksFacade {
        TasksFacade::new(self.task_service.clone(), self.task_import_service.clone())
    }
}
