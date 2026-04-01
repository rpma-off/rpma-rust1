//! Application-layer orchestration for task IPC commands.
//!
//! Each method encapsulates the business logic that was previously embedded
//! inside `ipc/task/facade.rs` command handlers, so that IPC handlers remain
//! thin adapters (ADR-005).

/// ADR-001: Application Layer
use std::sync::Arc;

use tracing::{error, info, instrument, warn};

use crate::commands::AppError;
use crate::domains::tasks::application::services::task_policy_service;
use crate::domains::tasks::application::TaskFilter;
use crate::domains::tasks::domain::models::task::{
    BulkImportResponse, Task, TaskPriority, TaskQuery, TaskStatus, UpdateTaskRequest,
};
use crate::domains::tasks::infrastructure::task::TaskService;
use crate::domains::tasks::infrastructure::task_import::TaskImportService;
use crate::domains::tasks::TasksFacade;
use crate::shared::context::RequestContext;
use crate::shared::contracts::integration_sink::{IntegrationDispatchRequest, IntegrationEventSink};
use crate::shared::contracts::notification::NotificationSender;
use crate::shared::contracts::rules_engine::{BlockingRuleEngine, RuleCheckRequest};
use crate::shared::contracts::task_scheduler::TaskScheduler;
use crate::shared::services::event_bus::{event_factory, InMemoryEventBus};
use crate::shared::services::validation::ValidationService;

/// Lightweight orchestration service constructed per-request by IPC handlers.
///
/// It borrows the long-lived `Arc` services from `AppState` and exposes
/// high-level operations that combine validation, persistence, and
/// side-effects (e.g. notification sending).
pub struct TaskCommandService {
    pub(super) task_service: Arc<TaskService>,
    pub(super) task_import_service: Arc<TaskImportService>,
    pub(super) notification_sender: Arc<dyn NotificationSender>,
    pub(super) calendar_service: Arc<dyn TaskScheduler>,
    pub(super) event_bus: Arc<InMemoryEventBus>,
    pub(super) rules_engine: Arc<dyn BlockingRuleEngine>,
    pub(super) integration_sink: Arc<dyn IntegrationEventSink>,
}

impl TaskCommandService {
    /// Construct a per-request service with access to the shared event bus so
    /// that completed operations can emit `DomainEvent`s carrying the
    /// request's `correlation_id`.
    pub fn new(
        task_service: Arc<TaskService>,
        task_import_service: Arc<TaskImportService>,
        notification_sender: Arc<dyn NotificationSender>,
        calendar_service: Arc<dyn TaskScheduler>,
        event_bus: Arc<InMemoryEventBus>,
        rules_engine: Arc<dyn BlockingRuleEngine>,
        integration_sink: Arc<dyn IntegrationEventSink>,
    ) -> Self {
        Self {
            task_service,
            task_import_service,
            notification_sender,
            calendar_service,
            event_bus,
            rules_engine,
            integration_sink,
        }
    }

    // ------------------------------------------------------------------
    // add_task_note
    // ------------------------------------------------------------------

    /// Validate, format, and persist a timestamped note on a task.
    #[instrument(skip(self, ctx, raw_note), fields(user_id = %ctx.auth.user_id, task_id = %task_id))]
    pub async fn add_note(
        &self,
        ctx: &RequestContext,
        task_id: &str,
        raw_note: &str,
    ) -> Result<String, AppError> {
        let note = ValidationService::new()
            .validate_required_trimmed(raw_note, "Note cannot be empty")
            .map_err(|err| AppError::Validation(err.to_string()))?;

        let task = self.fetch_task(task_id).await?;
        task_policy_service::check_task_permissions(&ctx.auth, &task, "edit")?;

        let facade = self.facade();
        let note_entry = facade.format_note_entry(&ctx.auth.user_id, &note);
        let updated_notes = facade.append_note(task.notes.as_deref(), &note_entry);

        let update_request = UpdateTaskRequest {
            id: Some(task.id.clone()),
            notes: Some(updated_notes),
            ..Default::default()
        };

        self.task_service
            .update_task_async(update_request, &ctx.auth.user_id)
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
    ///
    /// # Boundary note
    /// `ctx.correlation_id` is the single authoritative trace ID for this
    /// request.  Do NOT add a separate `correlation_id` parameter here; doing
    /// so risks callers supplying a different value and silently splitting the
    /// trace (ADR-016).
    #[instrument(skip(self, ctx, raw_body), fields(user_id = %ctx.auth.user_id, task_id = %task_id))]
    pub async fn send_message(
        &self,
        ctx: &RequestContext,
        task_id: &str,
        raw_body: &str,
        raw_message_type: Option<&str>,
    ) -> Result<String, AppError> {
        let body = ValidationService::new()
            .validate_required_trimmed(raw_body, "Message cannot be empty")
            .map_err(|err| AppError::Validation(err.to_string()))?;

        let task = self.fetch_task(task_id).await?;
        task_policy_service::check_task_permissions(&ctx.auth, &task, "edit")?;

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
                None,
                task.client_id.clone().or(task.technician_id.clone()),
                recipient_email,
                recipient_phone,
                Some(format!("Task {} update", task.task_number)),
                body,
                Some(task.id.clone()),
                task.client_id.clone(),
                Some("normal".to_string()),
                None,
                Some(ctx.correlation_id.clone()),
            )
            .await?;

        info!(task_id = %task_id, message_id = %sent_message.id, "Task message queued");
        Ok(format!("Message queued: {}", sent_message.id))
    }

    // ------------------------------------------------------------------
    // report_task_issue
    // ------------------------------------------------------------------

    /// Validate, format, persist a task issue, and optionally escalate.
    ///
    /// # Boundary note
    /// Use `ctx.correlation_id` for trace continuity.  The parameter was
    /// removed to prevent trace-splitting (see `send_message` note above).
    #[instrument(skip(self, ctx, raw_description), fields(user_id = %ctx.auth.user_id, task_id = %task_id, issue_type = %raw_issue_type))]
    pub async fn report_issue(
        &self,
        ctx: &RequestContext,
        task_id: &str,
        raw_issue_type: &str,
        raw_description: &str,
        raw_severity: Option<&str>,
    ) -> Result<String, AppError> {
        let issue_type = raw_issue_type.trim();
        let description = raw_description.trim();
        TasksFacade::validate_issue_fields(issue_type, description)?;
        let severity = TasksFacade::validate_severity(raw_severity)?;

        let task = self.fetch_task(task_id).await?;
        task_policy_service::check_task_permissions(&ctx.auth, &task, "edit")?;

        let facade = self.facade();
        let issue_entry = facade.format_issue_entry(
            &ctx.auth.user_id,
            issue_type,
            &severity.to_string(),
            description,
        );
        let updated_notes = facade.append_note(task.notes.as_deref(), &issue_entry);

        let update_request = UpdateTaskRequest {
            id: Some(task.id.clone()),
            notes: Some(updated_notes),
            ..Default::default()
        };

        self.task_service
            .update_task_async(update_request, &ctx.auth.user_id)
            .await
            .map_err(|e| AppError::db_sanitized("tasks.report_issue", e))?;

        if severity.requires_escalation() {
            if let Err(err) = self
                .notification_sender
                .send_message_raw(
                    "in_app".to_string(),
                    Some("system_alert".to_string()),
                    task.technician_id.clone(),
                    None,
                    None,
                    Some(format!("Task {} issue escalation", task.task_number)),
                    format!("{} (severity: {})", description, severity),
                    Some(task.id.clone()),
                    task.client_id.clone(),
                    Some(severity.notification_priority().to_string()),
                    None,
                    Some(ctx.correlation_id.clone()),
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
            pagination: crate::shared::repositories::base::PaginationParams {
                page: Some(1),
                page_size: Some(10000),
                sort_by: Some("created_at".to_string()),
                sort_order: Some("desc".to_string()),
            },
            status: filter
                .and_then(|f| f.status.as_ref())
                .and_then(|s| TaskStatus::from_str_opt(s)),
            technician_id: filter.and_then(|f| f.assigned_to.clone()),
            client_id: filter.and_then(|f| f.client_id.clone()),
            priority: filter
                .and_then(|f| f.priority.as_ref())
                .and_then(|p| TaskPriority::from_str_opt(p)),
            search: None,
            from_date: filter.and_then(|f| f.date_from.clone()),
            to_date: filter.and_then(|f| f.date_to.clone()),
        }
    }

    // ------------------------------------------------------------------
    // import_tasks_bulk
    // ------------------------------------------------------------------

    /// Validate role and delegate CSV import to the task service.
    #[instrument(skip(self, ctx, csv_data), fields(user_id = %ctx.auth.user_id, update_existing = %update_existing))]
    pub async fn import_bulk(
        &self,
        ctx: &RequestContext,
        csv_data: &str,
        update_existing: bool,
    ) -> Result<BulkImportResponse, AppError> {
        task_policy_service::ensure_assignment_management_role(&ctx.auth)?;

        let import_result = self
            .task_service
            .import_from_csv(csv_data, &ctx.auth.user_id, update_existing)
            .await
            .map_err(|e| AppError::db_sanitized("tasks.import.bulk", e))?;

        let response = BulkImportResponse {
            total_processed: import_result.total_processed,
            successful: import_result.successful,
            failed: import_result.failed,
            errors: import_result.errors,
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
    #[instrument(skip(self, ctx, additional_notes), fields(user_id = %ctx.auth.user_id, task_id = %task_id, new_date = %new_scheduled_date))]
    pub async fn delay_task(
        &self,
        ctx: &RequestContext,
        task_id: &str,
        new_scheduled_date: &str,
        additional_notes: Option<String>,
    ) -> Result<Task, AppError> {
        let task = self.fetch_task(task_id).await?;
        task_policy_service::check_task_permissions(&ctx.auth, &task, "edit")?;

        self.calendar_service
            .schedule_task(
                task_id.to_string(),
                new_scheduled_date.to_string(),
                None,
                None,
                &ctx.auth.user_id,
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
                .update_task_async(update_request, &ctx.auth.user_id)
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
    #[instrument(skip(self, ctx, data), fields(user_id = %ctx.auth.user_id, task_id = %task_id))]
    pub async fn edit_task(
        &self,
        ctx: &RequestContext,
        task_id: &str,
        data: &UpdateTaskRequest,
    ) -> Result<Task, AppError> {
        let task = self.fetch_task(task_id).await?;
        task_policy_service::check_task_permissions(&ctx.auth, &task, "edit")?;

        if ctx.auth.role == crate::shared::contracts::auth::UserRole::Technician {
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
            .update_task_async(update_request, &ctx.auth.user_id)
            .await
            .map_err(|e| {
                error!("Task update failed: {}", e);
                AppError::db_sanitized("tasks.edit", e)
            })?;

        info!("Task {} updated successfully", task_id);
        Ok(updated_task)
    }

    // ------------------------------------------------------------------
    // task_crud orchestration (extracted from facade.rs — ADR-018)
    // ------------------------------------------------------------------

    /// Retrieve a single task by ID.
    #[instrument(skip(self))]
    pub async fn get_task(&self, task_id: &str) -> Result<Option<Task>, AppError> {
        self.task_service
            .get_task_async(task_id)
            .await
            .map_err(|e| {
                error!("Task retrieval failed: {}", e);
                AppError::db_sanitized("tasks.get", e)
            })
    }

    // ------------------------------------------------------------------
    // transition_status
    // ------------------------------------------------------------------

    /// Validate and apply a status transition for a task.
    ///
    /// Orchestrates the full pipeline:
    /// 1. Fetch the task once (avoids double-fetch that was in the IPC layer).
    /// 2. Enforce technician assignment policy for Technician-role callers.
    /// 3. Evaluate the blocking rules engine for the `task_status_changed` trigger.
    /// 4. Persist the new status via the domain service.
    /// 5. Emit a `TaskStatusChanged` domain event.
    /// 6. Dispatch an integration notification.
    ///
    /// Returns the updated [`Task`] on success.
    #[instrument(skip(self, ctx), fields(user_id = %ctx.auth.user_id, task_id = %task_id))]
    pub async fn transition_status(
        &self,
        ctx: &RequestContext,
        task_id: &str,
        new_status: &str,
        reason: Option<&str>,
    ) -> Result<Task, AppError> {
        // Single fetch — shared by both the permission check and the transition.
        let task = self.fetch_task(task_id).await?;
        let old_status = task.status.to_string();

        // Technician callers may only transition tasks they are assigned to.
        task_policy_service::check_task_permissions(&ctx.auth, &task, "edit")?;

        // Evaluate configurable business rules before mutating state.
        let rule_check = self
            .rules_engine
            .evaluate(&RuleCheckRequest {
                trigger: "task_status_changed".to_string(),
                entity_id: Some(task_id.to_string()),
                payload: serde_json::json!({
                    "old_status": old_status,
                    "new_status": new_status,
                }),
                user_id: ctx.auth.user_id.clone(),
                correlation_id: ctx.correlation_id.clone(),
            })
            .await?;
        if !rule_check.allowed {
            return Err(AppError::Validation(
                rule_check
                    .message
                    .unwrap_or_else(|| "Task status change blocked by active rule".to_string()),
            ));
        }

        let task = self
            .task_service
            .transition_status(task_id, new_status, reason, &ctx.auth.user_id)?;

        // Publish domain event — best-effort; a failed publish must not abort the transition.
        let status_event = event_factory::task_status_changed_with_ctx(
            task.id.clone(),
            old_status.clone(),
            task.status.to_string(),
            ctx.auth.user_id.clone(),
            ctx.correlation_id.clone(),
            reason.map(String::from),
        );
        if let Err(e) = self.event_bus.publish(status_event) {
            warn!(
                task_id = %task.id,
                correlation_id = %ctx.correlation_id,
                "Failed to publish TaskStatusChanged event: {}",
                e
            );
        }

        let _ = self
            .integration_sink
            .enqueue(IntegrationDispatchRequest {
                event_name: "task_status_changed".to_string(),
                payload: serde_json::json!({
                    "task_id": task.id,
                    "old_status": old_status,
                    "new_status": task.status.to_string(),
                }),
                correlation_id: ctx.correlation_id.clone(),
                requested_integration_ids: None,
            })
            .await;

        info!("Task {} transitioned to {}", task_id, new_status);
        Ok(task)
    }

    // ------------------------------------------------------------------
    // Private helpers
    // ------------------------------------------------------------------

    pub(super) async fn fetch_task(&self, task_id: &str) -> Result<Task, AppError> {
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
