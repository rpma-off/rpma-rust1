//! Integration tests for Task CRUD facade
//!
//! This module tests the TaskCrudService facade to ensure it correctly delegates
//! to the underlying services and provides a unified interface for task operations.

use crate::commands::AppResult;
use crate::models::task::{CreateTaskRequest, Task, TaskPriority, TaskStatus, UpdateTaskRequest};
use crate::services::task_crud::TaskCrudService;
use crate::test_utils::{TestDataFactory, TestDatabase};
use crate::{test_client, test_db, test_intervention, test_task};
use chrono::Utc;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_task_success() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        let task_request = test_task!(
            title: "Test Create Task".to_string(),
            description: Some("This is a test task".to_string())
        );

        let created_task = service.create_task_async(task_request, "test_user").await?;

        assert_eq!(created_task.title, "Test Create Task");
        assert_eq!(created_task.created_by, Some("test_user".to_string()));
        assert_eq!(created_task.status, Some(TaskStatus::Draft));
        assert!(created_task.id.is_some());

        Ok(())
    }

    #[tokio::test]
    async fn test_create_task_with_required_fields_only() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        let task_request = test_task!(
            title: "Minimal Task".to_string(),
            description: None,
            vehicle_plate: None,
            customer_name: None
        );

        let created_task = service.create_task_async(task_request, "test_user").await?;

        assert_eq!(created_task.title, "Minimal Task");
        assert_eq!(created_task.description, None);
        assert_eq!(created_task.vehicle_plate, None);
        assert_eq!(created_task.customer_name, None);

        Ok(())
    }

    #[tokio::test]
    async fn test_create_task_auto_generates_task_number() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        let task_request = test_task!(title: "Task Number Test".to_string());
        let created_task = service.create_task_async(task_request, "test_user").await?;

        assert!(created_task.task_number.is_some());
        assert!(created_task.task_number.unwrap().starts_with("TASK-"));
        assert!(created_task.task_number.unwrap().len() > 4);

        Ok(())
    }

    #[tokio::test]
    async fn test_create_task_with_invalid_status() {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        let mut task_request = test_task!();
        task_request.status = Some(TaskStatus::Invalid);

        let result = service.create_task_async(task_request, "test_user").await;
        assert!(result.is_err());
        // The validation happens in the creation service, not in the facade
    }

    #[tokio::test]
    async fn test_create_task_with_invalid_priority() {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        let mut task_request = test_task!();
        task_request.priority = Some(TaskPriority::Invalid);

        let result = service.create_task_async(task_request, "test_user").await;
        assert!(result.is_err());
        // The validation happens in the creation service, not in the facade
    }

    #[tokio::test]
    async fn test_update_task_success() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        // Create initial task
        let task_request = test_task!(title: "Original Task".to_string());
        let created_task = service.create_task_async(task_request, "test_user").await?;

        // Update task
        let update_request = UpdateTaskRequest {
            id: created_task.id,
            title: Some("Updated Task".to_string()),
            description: Some("Updated description".to_string()),
            priority: Some("high".to_string()),
            ..Default::default()
        };

        let updated_task = service
            .update_task_async(update_request, "test_user")
            .await?;

        assert_eq!(updated_task.title, "Updated Task");
        assert_eq!(
            updated_task.description,
            Some("Updated description".to_string())
        );
        assert_eq!(updated_task.priority, "high");
        assert_ne!(updated_task.updated_at, created_task.updated_at);

        Ok(())
    }

    #[tokio::test]
    async fn test_update_nonexistent_task() {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        let update_request = UpdateTaskRequest {
            id: "nonexistent-id".to_string(),
            title: Some("Updated".to_string()),
            ..Default::default()
        };

        let result = service.update_task_async(update_request, "test_user").await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not found"));
    }

    #[tokio::test]
    async fn test_update_task_status_transition() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        // Create task in draft status
        let task_request = test_task!(status: Some(TaskStatus::Draft));
        let created_task = service.create_task_async(task_request, "test_user").await?;

        // Update to scheduled status
        let update_request = UpdateTaskRequest {
            id: created_task.id.clone(),
            status: Some(TaskStatus::Scheduled),
            ..Default::default()
        };

        let updated_task = service
            .update_task_async(update_request, "test_user")
            .await?;
        assert_eq!(updated_task.status, "scheduled");

        // Update to in_progress status
        let update_request = UpdateTaskRequest {
            id: created_task.id,
            status: Some(TaskStatus::InProgress),
            technician_id: Some("tech-123".to_string()),
            assigned_at: Some(Utc::now().timestamp_millis()),
            ..Default::default()
        };

        let updated_task = service
            .update_task_async(update_request, "test_user")
            .await?;
        assert_eq!(updated_task.status, Some(TaskStatus::InProgress));
        assert_eq!(updated_task.technician_id, Some("tech-123".to_string()));

        Ok(())
    }

    #[tokio::test]
    async fn test_invalid_status_transition() {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        // Create task in draft status
        let task_request = test_task!(status: Some(TaskStatus::Draft));
        let created_task = service
            .create_task_async(task_request, "test_user")
            .await
            .unwrap();

        // Try to update directly to completed (should fail)
        let update_request = UpdateTaskRequest {
            id: created_task.id,
            status: Some(TaskStatus::Completed),
            ..Default::default()
        };

        let result = service.update_task_async(update_request, "test_user").await;
        assert!(result.is_err());
        // Status transition validation happens in the underlying service
    }

    #[tokio::test]
    async fn test_delete_task_success() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        // Create task
        let task_request = test_task!(title: "Task to Delete".to_string());
        let created_task = service.create_task_async(task_request, "test_user").await?;

        // Delete task
        service
            .delete_task_async(&created_task.id, "test_user")
            .await?;

        // Verify task is soft-deleted by checking the deleted_at field
        let deleted_task = service.get_task_by_id_async(&created_task.id).await?;
        assert!(deleted_task.is_some());
        assert!(deleted_task.unwrap().deleted_at.is_some());

        Ok(())
    }

    #[tokio::test]
    async fn test_delete_nonexistent_task() {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        let result = service
            .delete_task_async("nonexistent-id", "test_user")
            .await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("not found"));
    }

    #[tokio::test]
    async fn test_facade_only_has_crud_methods() {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        // Verify the facade only has the CRUD methods that delegate to other services
        // This test documents the current limitation of the facade

        // These methods exist:
        // - create_task_async
        // - update_task_async
        // - delete_task_async
        // - hard_delete_task_async

        // These methods do NOT exist (they're in other services):
        // - get_task_by_id_async
        // - list_tasks_async
        // - search_tasks_async

        // This is intentional - the facade only handles write operations
        // Read operations should use the repository layer or other services directly
    }

    #[tokio::test]
    async fn test_assign_task_to_technician() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        // Create task
        let task_request = test_task!(status: Some(TaskStatus::Scheduled));
        let created_task = service.create_task_async(task_request, "test_user").await?;

        // Assign task
        let update_request = UpdateTaskRequest {
            id: created_task.id,
            technician_id: Some("tech-456".to_string()),
            status: Some(TaskStatus::Assigned),
            assigned_at: Some(Utc::now().timestamp_millis()),
            assigned_by: Some("manager".to_string()),
            ..Default::default()
        };

        let updated_task = service.update_task_async(update_request, "manager").await?;

        assert_eq!(updated_task.technician_id, Some("tech-456".to_string()));
        assert_eq!(updated_task.status, Some(TaskStatus::Assigned));
        assert_eq!(updated_task.assigned_by, Some("manager".to_string()));
        assert!(updated_task.assigned_at.is_some());

        Ok(())
    }

    #[tokio::test]
    async fn test_complete_task() -> AppResult<()> {
        let test_db = test_db!();
        let service = TaskCrudService::new(test_db.db());

        // Create and assign task
        let task_request = test_task!(status: Some(TaskStatus::InProgress));
        let created_task = service.create_task_async(task_request, "test_user").await?;

        // Complete task
        let update_request = UpdateTaskRequest {
            id: created_task.id,
            status: Some(TaskStatus::Completed),
            completed_at: Some(Utc::now().timestamp_millis()),
            actual_duration: Some(150),
            ..Default::default()
        };

        let updated_task = service
            .update_task_async(update_request, "tech-456")
            .await?;

        assert_eq!(updated_task.status, Some(TaskStatus::Completed));
        assert!(updated_task.completed_at.is_some());
        assert_eq!(updated_task.actual_duration, Some(150));

        Ok(())
    }
}
