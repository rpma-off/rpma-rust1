//! CRUD lifecycle orchestration for tasks.
//!
//! Extracted from `task_command_service.rs` so the core command service can
//! keep non-CRUD operations separate from validation + event publication for
//! create/update/delete flows.

use tracing::{error, info, instrument, warn};

use crate::commands::{AppError, TaskAction};
use crate::domains::tasks::domain::models::task::{CreateTaskRequest, Task, UpdateTaskRequest};
use crate::shared::auth_middleware::AuthMiddleware;
use crate::shared::context::RequestContext;
use crate::shared::services::event_bus::{event_factory, EventPublisher};
use crate::shared::services::validation::ValidationService;

use super::task_command_service::TaskCommandService;

impl TaskCommandService {
    /// Validate and create a task, sending assignment notification afterward.
    #[instrument(skip(self, ctx, data), fields(user_id = %ctx.auth.user_id, correlation_id = %ctx.correlation_id))]
    pub async fn create_task(
        &self,
        ctx: &RequestContext,
        data: CreateTaskRequest,
    ) -> Result<Task, AppError> {
        if !AuthMiddleware::can_perform_task_operation(&ctx.auth.role, "create") {
            return Err(AppError::Authorization(
                "Insufficient permissions to create tasks".to_string(),
            ));
        }

        let validator = ValidationService::new();
        let validated_action = validator
            .validate_task_action(TaskAction::Create { data })
            .await
            .map_err(|e| {
                warn!(correlation_id = %ctx.correlation_id, "Task validation failed: {}", e);
                AppError::Validation(format!("Task validation failed: {}", e))
            })?;

        let validated_data = match validated_action {
            TaskAction::Create {
                data: validated_data,
            } => validated_data,
            _ => {
                return Err(AppError::Validation(
                    "Invalid task action after validation".to_string(),
                ))
            }
        };

        let task = self
            .task_service
            .create_task_async(validated_data, &ctx.auth.user_id)
            .await
            .map_err(|e| {
                error!(correlation_id = %ctx.correlation_id, "Task creation failed: {}", e);
                AppError::db_sanitized("tasks.create", e)
            })?;

        let domain_event = event_factory::task_created_with_ctx(
            task.id.clone(),
            task.task_number.clone(),
            task.title.clone(),
            ctx.auth.user_id.clone(),
            ctx.correlation_id.clone(),
        );
        if let Err(e) = self.event_bus.publish(domain_event) {
            warn!(
                correlation_id = %ctx.correlation_id,
                task_id = %task.id,
                "Failed to publish TaskCreated event: {}",
                e
            );
        }

        self.notify_assignment(&task, &ctx.auth.user_id, &ctx.correlation_id)
            .await;

        info!(
            action = "CREATE_TASK",
            task_id = %task.id,
            correlation_id = %ctx.correlation_id,
            "Task created"
        );
        Ok(task)
    }

    /// Validate and update a task, sending notifications afterward.
    #[instrument(skip(self, ctx, data), fields(user_id = %ctx.auth.user_id, correlation_id = %ctx.correlation_id))]
    pub async fn update_task_crud(
        &self,
        ctx: &RequestContext,
        id: String,
        data: UpdateTaskRequest,
    ) -> Result<Task, AppError> {
        if !AuthMiddleware::can_perform_task_operation(&ctx.auth.role, "update") {
            return Err(AppError::Authorization(
                "Insufficient permissions to update tasks".to_string(),
            ));
        }

        let existing_task = self.fetch_task(&id).await?;
        let status_updated = data.status.is_some();

        let validator = ValidationService::new();
        let validated_action = validator
            .validate_task_action(TaskAction::Update {
                id: id.clone(),
                data: data.clone(),
            })
            .await
            .map_err(|e| {
                warn!(correlation_id = %ctx.correlation_id, "Task validation failed: {}", e);
                AppError::Validation(format!("Task validation failed: {}", e))
            })?;

        let validated_data = match validated_action {
            TaskAction::Update {
                data: validated_data,
                ..
            } => validated_data,
            _ => {
                return Err(AppError::Validation(
                    "Invalid task action after validation".to_string(),
                ))
            }
        };

        let task = self
            .task_service
            .update_task_async(validated_data, &ctx.auth.user_id)
            .await
            .map_err(|e| {
                error!(correlation_id = %ctx.correlation_id, "Task update failed: {}", e);
                AppError::db_sanitized("tasks.update", e)
            })?;

        let changed_fields = changed_fields_from_update_request(&data);
        let updated_event = event_factory::task_updated_with_ctx(
            task.id.clone(),
            changed_fields,
            ctx.auth.user_id.clone(),
            ctx.correlation_id.clone(),
        );
        if let Err(e) = self.event_bus.publish(updated_event) {
            warn!(
                correlation_id = %ctx.correlation_id,
                task_id = %task.id,
                "Failed to publish TaskUpdated event: {}",
                e
            );
        }

        if status_updated && existing_task.status != task.status {
            let status_event = event_factory::task_status_changed_with_ctx(
                task.id.clone(),
                existing_task.status.to_string(),
                task.status.to_string(),
                ctx.auth.user_id.clone(),
                ctx.correlation_id.clone(),
                None,
            );
            if let Err(e) = self.event_bus.publish(status_event) {
                warn!(
                    correlation_id = %ctx.correlation_id,
                    task_id = %task.id,
                    "Failed to publish TaskStatusChanged event: {}",
                    e
                );
            }
        }

        self.notify_assignment(&task, &ctx.auth.user_id, &ctx.correlation_id)
            .await;

        if status_updated {
            self.notify_status_change(&task, &ctx.auth.user_id, &ctx.correlation_id)
                .await;
        }

        info!(
            action = "UPDATE_TASK",
            task_id = %task.id,
            correlation_id = %ctx.correlation_id,
            "Task updated"
        );
        Ok(task)
    }

    /// Delete a task by ID.
    #[instrument(skip(self, ctx), fields(user_id = %ctx.auth.user_id, correlation_id = %ctx.correlation_id))]
    pub async fn delete_task(&self, ctx: &RequestContext, task_id: &str) -> Result<(), AppError> {
        if !AuthMiddleware::can_perform_task_operation(&ctx.auth.role, "delete") {
            return Err(AppError::Authorization(
                "Insufficient permissions to delete tasks".to_string(),
            ));
        }

        let existing_task = self.fetch_task(task_id).await?;
        self.task_service
            .delete_task_async(task_id, &ctx.auth.user_id)
            .await
            .map_err(|e| {
                error!(correlation_id = %ctx.correlation_id, "Task deletion failed: {}", e);
                AppError::db_sanitized("tasks.delete", e)
            })?;

        let deleted_event = event_factory::task_deleted_with_ctx(
            task_id.to_string(),
            Some(existing_task.task_number),
            ctx.auth.user_id.clone(),
            ctx.correlation_id.clone(),
        );
        if let Err(e) = self.event_bus.publish(deleted_event) {
            warn!(
                correlation_id = %ctx.correlation_id,
                task_id = %task_id,
                "Failed to publish TaskDeleted event: {}",
                e
            );
        }

        info!(
            action = "DELETE_TASK",
            task_id = %task_id,
            correlation_id = %ctx.correlation_id,
            "Task deleted"
        );
        Ok(())
    }
}

fn changed_fields_from_update_request(request: &UpdateTaskRequest) -> Vec<String> {
    let mut changed = Vec::new();
    macro_rules! track {
        ($field:ident) => {
            if request.$field.is_some() {
                changed.push(stringify!($field).to_string());
            }
        };
    }

    track!(title);
    track!(description);
    track!(priority);
    track!(status);
    track!(vehicle_plate);
    track!(vehicle_model);
    track!(vehicle_year);
    track!(vehicle_make);
    track!(vin);
    track!(ppf_zones);
    track!(custom_ppf_zones);
    track!(client_id);
    track!(customer_name);
    track!(customer_email);
    track!(customer_phone);
    track!(customer_address);
    track!(scheduled_date);
    if request.estimated_duration.is_some() {
        changed.push("estimated_duration".to_string());
    }
    track!(notes);
    track!(tags);
    track!(technician_id);

    changed
}

#[cfg(test)]
mod tests {
    use super::changed_fields_from_update_request;
    use crate::domains::tasks::domain::models::task::{TaskStatus, UpdateTaskRequest};

    #[test]
    fn test_changed_fields_from_update_request_tracks_only_present_fields() {
        let request = UpdateTaskRequest {
            title: Some("Updated".to_string()),
            status: Some(TaskStatus::InProgress),
            estimated_duration: Some(45),
            notes: Some("Bring extra film".to_string()),
            ..Default::default()
        };

        let changed_fields = changed_fields_from_update_request(&request);

        assert_eq!(
            changed_fields,
            vec![
                "title".to_string(),
                "status".to_string(),
                "estimated_duration".to_string(),
                "notes".to_string(),
            ]
        );
    }

    #[test]
    fn test_changed_fields_from_update_request_ignores_absent_fields() {
        let request = UpdateTaskRequest::default();

        let changed_fields = changed_fields_from_update_request(&request);

        assert!(changed_fields.is_empty());
    }
}
